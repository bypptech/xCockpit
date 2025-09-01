import { walletService } from './coinbase-wallet';

export interface WhitelistEntry {
  id: string;
  userAddress: string;
  recipientAddress: string;
  recipientLabel: string;
  maxAmount: string;
  isActive: boolean;
  createdAt: string;
  lastUsed?: string;
  usageCount: number;
}

export interface WhitelistPaymentResult {
  success: boolean;
  method: 'whitelisted_payment' | 'direct_payment';
  whitelistId?: string;
  txHash?: string;
  error?: string;
  executionTime: number;
}

/**
 * Transaction Whitelisting System
 * 信頼できる送金先を事前登録し、詐欺警告を回避
 */
export class TransactionWhitelistService {
  private static STORAGE_KEY = 'xCockpit_transaction_whitelist';
  private static BACKEND_SPENDER = '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238';

  /**
   * 信頼できる送金先をホワイトリストに追加
   */
  static async addToWhitelist(
    userAddress: string,
    recipientAddress: string,
    recipientLabel: string,
    maxAmount: string
  ): Promise<{
    success: boolean;
    whitelistId?: string;
    error?: string;
  }> {
    try {
      const whitelistId = `whitelist_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      
      // Create whitelist authorization message
      const whitelistMessage = {
        action: 'add_to_payment_whitelist',
        whitelistId,
        userAddress,
        recipientAddress,
        recipientLabel,
        maxAmount,
        timestamp: Date.now(),
        terms: `I trust ${recipientLabel} (${recipientAddress}) for payments up to ${maxAmount} USDC`
      };

      console.log('🔐 Adding to payment whitelist:', whitelistMessage);

      // User signs the whitelist addition
      const signature = await walletService['provider'].request({
        method: 'personal_sign',
        params: [JSON.stringify(whitelistMessage), userAddress]
      });

      const whitelistEntry: WhitelistEntry = {
        id: whitelistId,
        userAddress,
        recipientAddress,
        recipientLabel,
        maxAmount,
        isActive: true,
        createdAt: new Date().toISOString(),
        usageCount: 0
      };

      // Save locally and register with backend
      this.saveWhitelistEntry(whitelistEntry);
      await this.syncWhitelistToBackend(whitelistEntry, whitelistMessage, signature);

      console.log('✅ Recipient added to whitelist successfully');

      return { success: true, whitelistId };

    } catch (error) {
      console.error('Failed to add to whitelist:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * ホワイトリスト経由の高速支払い
   */
  static async executeWhitelistedPayment(
    userAddress: string,
    recipientAddress: string,
    amount: string,
    deviceId: string,
    command: string
  ): Promise<WhitelistPaymentResult> {
    const startTime = Date.now();

    try {
      // Find matching whitelist entry
      const whitelistEntry = this.findWhitelistEntry(userAddress, recipientAddress, amount);
      
      if (!whitelistEntry) {
        // Fallback to direct payment
        return await this.executeDirectPayment(recipientAddress, amount, startTime);
      }

      // Create quick signature for whitelisted payment
      const paymentMessage = `Whitelisted payment: ${amount} USDC to ${whitelistEntry.recipientLabel} for ${command} on ${deviceId}`;
      
      const quickSignature = await walletService['provider'].request({
        method: 'personal_sign',
        params: [paymentMessage, userAddress]
      });

      // Submit to backend for execution
      const response = await fetch('/api/payments/whitelisted-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          whitelistId: whitelistEntry.id,
          recipientAddress,
          amount,
          deviceId,
          command,
          quickSignature,
          paymentMessage
        }),
        credentials: 'include'
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Whitelisted payment failed');
      }

      // Update usage count
      this.updateWhitelistUsage(whitelistEntry.id);

      const executionTime = Date.now() - startTime;

      console.log(`⚡ Whitelisted payment completed in ${executionTime}ms`);

      return {
        success: true,
        method: 'whitelisted_payment',
        whitelistId: whitelistEntry.id,
        txHash: result.txHash,
        executionTime
      };

    } catch (error) {
      console.error('Whitelisted payment failed, falling back to direct:', error);
      return await this.executeDirectPayment(recipientAddress, amount, startTime);
    }
  }

  /**
   * Pre-configured recipient suggestions (xCockpit service addresses)
   */
  static getServiceRecipients(): Array<{
    address: string;
    label: string;
    description: string;
    suggestedMaxAmount: string;
    category: 'service' | 'device' | 'partner';
  }> {
    return [
      {
        address: '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238',
        label: 'xCockpit Service Wallet',
        description: 'Main service wallet for IoT device payments',
        suggestedMaxAmount: '50.00',
        category: 'service'
      },
      {
        address: '0x742d35Cc6634C0532925a3b8D2d3A1b8f0e4C0d5',
        label: 'xCockpit Backup Wallet',
        description: 'Backup service wallet for redundancy',
        suggestedMaxAmount: '25.00',
        category: 'service'
      }
      // Add more service recipients as needed
    ];
  }

  /**
   * Get user's whitelist entries
   */
  static getUserWhitelist(userAddress: string): WhitelistEntry[] {
    const whitelist = this.getLocalWhitelist();
    return Object.values(whitelist)
      .filter(entry => entry.userAddress === userAddress && entry.isActive)
      .sort((a, b) => b.usageCount - a.usageCount); // Sort by usage frequency
  }

  /**
   * Check if recipient is whitelisted for the amount
   */
  static isWhitelisted(
    userAddress: string,
    recipientAddress: string,
    amount: string
  ): {
    isWhitelisted: boolean;
    entry?: WhitelistEntry;
    reason: string;
  } {
    const entry = this.findWhitelistEntry(userAddress, recipientAddress, amount);
    
    if (entry) {
      return {
        isWhitelisted: true,
        entry,
        reason: `Trusted recipient: ${entry.recipientLabel} (used ${entry.usageCount} times)`
      };
    }

    return {
      isWhitelisted: false,
      reason: 'Recipient not in whitelist or amount exceeds limit'
    };
  }

  /**
   * Quick setup for xCockpit service addresses
   */
  static async quickSetupServiceWhitelist(userAddress: string): Promise<{
    success: boolean;
    addedCount: number;
    errors: string[];
  }> {
    const serviceRecipients = this.getServiceRecipients();
    const errors: string[] = [];
    let addedCount = 0;

    for (const recipient of serviceRecipients) {
      try {
        const result = await this.addToWhitelist(
          userAddress,
          recipient.address,
          recipient.label,
          recipient.suggestedMaxAmount
        );
        
        if (result.success) {
          addedCount++;
        } else {
          errors.push(`Failed to add ${recipient.label}: ${result.error}`);
        }
      } catch (error) {
        errors.push(`Error adding ${recipient.label}: ${error}`);
      }
    }

    return {
      success: addedCount > 0,
      addedCount,
      errors
    };
  }

  // Private helper methods
  private static findWhitelistEntry(
    userAddress: string,
    recipientAddress: string,
    amount: string
  ): WhitelistEntry | null {
    const whitelist = this.getUserWhitelist(userAddress);
    
    return whitelist.find(entry =>
      entry.recipientAddress.toLowerCase() === recipientAddress.toLowerCase() &&
      parseFloat(amount) <= parseFloat(entry.maxAmount)
    ) || null;
  }

  private static async executeDirectPayment(
    recipient: string,
    amount: string,
    startTime: number
  ): Promise<WhitelistPaymentResult> {
    try {
      const txHash = await walletService.sendUSDCPayment(recipient, amount);
      
      return {
        success: true,
        method: 'direct_payment',
        txHash,
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        method: 'direct_payment',
        error: error instanceof Error ? error.message : 'Direct payment failed',
        executionTime: Date.now() - startTime
      };
    }
  }

  private static saveWhitelistEntry(entry: WhitelistEntry): void {
    try {
      const whitelist = this.getLocalWhitelist();
      whitelist[entry.id] = entry;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(whitelist));
    } catch (error) {
      console.warn('Failed to save whitelist entry:', error);
    }
  }

  private static getLocalWhitelist(): Record<string, WhitelistEntry> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  private static updateWhitelistUsage(whitelistId: string): void {
    try {
      const whitelist = this.getLocalWhitelist();
      if (whitelist[whitelistId]) {
        whitelist[whitelistId].usageCount++;
        whitelist[whitelistId].lastUsed = new Date().toISOString();
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(whitelist));
      }
    } catch (error) {
      console.warn('Failed to update whitelist usage:', error);
    }
  }

  private static async syncWhitelistToBackend(
    entry: WhitelistEntry,
    originalMessage: any,
    signature: string
  ): Promise<void> {
    try {
      await fetch('/api/payments/register-whitelist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entry,
          originalMessage,
          signature
        }),
        credentials: 'include'
      });
    } catch (error) {
      console.warn('Failed to sync whitelist to backend:', error);
      // Continue without backend sync
    }
  }
}