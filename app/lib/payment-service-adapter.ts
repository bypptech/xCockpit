import { walletService } from './coinbase-wallet';
import { basePayService } from './base-pay-service';
import type { PaymentResult, PaymentRequest } from '@/types/base-pay';

export class PaymentServiceAdapter {
  private useBasePay: boolean;

  constructor() {
    this.useBasePay = process.env.NEXT_PUBLIC_USE_BASE_PAY === 'true';
  }

  /**
   * Check if Base Pay should be used based on feature flags and rollout
   */
  private shouldUseBasePay(userId?: string): boolean {
    // First check global feature flag
    if (!this.useBasePay) {
      return false;
    }

    // Check rollout percentage if userId provided
    if (userId) {
      const rolloutPercentage = parseInt(
        process.env.BASE_PAY_ROLLOUT_PERCENTAGE || '0'
      );
      
      if (rolloutPercentage === 0) return false;
      if (rolloutPercentage >= 100) return true;
      
      // Simple hash-based rollout
      const userHash = this.hashUserId(userId);
      return (userHash % 100) < rolloutPercentage;
    }

    return this.useBasePay;
  }

  /**
   * Send payment using appropriate service
   */
  async sendPayment(
    to: string,
    amount: string,
    metadata?: {
      deviceId?: string;
      command?: string;
      userId?: string;
    }
  ): Promise<string> {
    try {
      const shouldUseBasePay = this.shouldUseBasePay(metadata?.userId);
      
      console.log(`Payment method: ${shouldUseBasePay ? 'Base Pay' : 'Legacy Wallet'}`);

      if (shouldUseBasePay) {
        // Use Base Pay service
        const request: PaymentRequest = {
          amount,
          currency: 'USDC',
          recipient: to,
          metadata: metadata as any,
        };

        const transaction = await basePayService.createPayment(request);
        
        // For Base Pay, we return a transaction object that needs to be executed
        // This will be handled by the OnchainKit TransactionButton component
        return JSON.stringify(transaction);
      } else {
        // Use legacy wallet service
        return await walletService.sendUSDCPayment(to, amount);
      }
    } catch (error) {
      console.error('Payment failed:', error);
      throw error;
    }
  }

  /**
   * Get current wallet balance
   */
  async getBalance(address: string, currency: 'ETH' | 'USDC' = 'USDC'): Promise<string> {
    try {
      if (currency === 'ETH') {
        return await walletService.getETHBalance(address);
      } else {
        return await walletService.getUSDCBalance(address);
      }
    } catch (error) {
      console.error('Failed to get balance:', error);
      return '0.0000';
    }
  }

  /**
   * Connect wallet
   */
  async connectWallet(): Promise<string[]> {
    // Always use the existing wallet service for connection
    return await walletService.connect();
  }

  /**
   * Disconnect wallet
   */
  async disconnectWallet(): Promise<void> {
    return await walletService.disconnect();
  }

  /**
   * Get current account
   */
  getCurrentAccount(): string | null {
    return walletService.getCurrentAccount();
  }

  /**
   * Check if wallet is connected
   */
  isConnected(): boolean {
    return walletService.isConnected();
  }

  /**
   * Switch network
   */
  async switchNetwork(network: 'base-sepolia' | 'sepolia-ethereum'): Promise<void> {
    return await walletService.switchNetwork(network);
  }

  /**
   * Get current network
   */
  async getCurrentNetwork(): Promise<{ chainId: string; name: string }> {
    return await walletService.getCurrentNetwork();
  }

  /**
   * Verify payment transaction
   */
  async verifyPayment(transactionHash: string): Promise<boolean> {
    if (this.shouldUseBasePay()) {
      return await basePayService.verifyPayment(transactionHash);
    }
    
    // For legacy payments, we assume success if we have a transaction hash
    return !!transactionHash;
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(transactionHash: string): Promise<PaymentResult | null> {
    if (this.shouldUseBasePay()) {
      return await basePayService.getPaymentStatus(transactionHash);
    }
    
    // Legacy system doesn't have detailed status tracking
    return null;
  }

  /**
   * Simple hash function for user ID based rollout
   */
  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Get current payment method
   */
  getPaymentMethod(userId?: string): 'base-pay' | 'legacy' {
    return this.shouldUseBasePay(userId) ? 'base-pay' : 'legacy';
  }

  /**
   * Check if Base Pay is available
   */
  isBasePayAvailable(): boolean {
    return basePayService.isAvailable();
  }
}

// Singleton instance
export const paymentService = new PaymentServiceAdapter();