import { walletService } from './coinbase-wallet';
import { ERC20ApprovalService } from './erc20-approve';

export interface SpendingCap {
  userAddress: string;
  totalCap: string; // Total approved amount
  remainingCap: string; // Remaining available amount  
  dailyLimit: string; // Daily spending limit
  dailySpent: string; // Amount spent today
  lastResetDate: string; // Last daily reset date
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FastPaymentResult {
  canUseFastPath: boolean;
  reason: string;
  currentCap: SpendingCap | null;
  suggestedAction?: 'increase_cap' | 'wait_reset' | 'setup_cap';
}

export class SpendingCapService {
  private static STORAGE_KEY = 'xCockpit_spending_caps';
  private static BACKEND_SPENDER = '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238';

  /**
   * Get current spending cap for user
   */
  static async getCurrentCap(userAddress: string): Promise<SpendingCap | null> {
    try {
      // Try to get from localStorage first (client-side cache)
      const localCaps = this.getLocalSpendingCaps();
      const localCap = localCaps[userAddress.toLowerCase()];
      
      if (localCap && this.isValidCap(localCap)) {
        // Reset daily limit if needed
        const updatedCap = this.resetDailyLimitIfNeeded(localCap);
        if (updatedCap !== localCap) {
          this.saveLocalSpendingCap(userAddress, updatedCap);
        }
        return updatedCap;
      }
      
      // Fallback: Check on-chain allowance
      const allowance = await ERC20ApprovalService.getCurrentAllowance(userAddress);
      const allowanceAmount = parseFloat(allowance);
      
      if (allowanceAmount > 0) {
        // Create cap from existing allowance
        const cap: SpendingCap = {
          userAddress,
          totalCap: allowance,
          remainingCap: allowance,
          dailyLimit: Math.min(allowanceAmount, 10).toFixed(2), // Default daily limit
          dailySpent: '0.00',
          lastResetDate: new Date().toISOString().split('T')[0],
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        this.saveLocalSpendingCap(userAddress, cap);
        return cap;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get spending cap:', error);
      return null;
    }
  }

  /**
   * Setup new spending cap with user approval
   */
  static async setupSpendingCap(
    userAddress: string,
    totalCap: string,
    dailyLimit: string
  ): Promise<{ success: boolean; cap?: SpendingCap; txHash?: string; error?: string }> {
    try {
      console.log(`💰 Setting up spending cap: ${totalCap} USDC (daily: ${dailyLimit})`);
      
      // Step 1: Approve the total cap amount
      const txHash = await ERC20ApprovalService.approveSpending(totalCap);
      
      // Step 2: Create spending cap record
      const cap: SpendingCap = {
        userAddress,
        totalCap,
        remainingCap: totalCap,
        dailyLimit,
        dailySpent: '0.00',
        lastResetDate: new Date().toISOString().split('T')[0],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Step 3: Save locally and to backend
      this.saveLocalSpendingCap(userAddress, cap);
      await this.syncCapToBackend(cap);
      
      console.log('✅ Spending cap setup completed:', cap);
      
      return {
        success: true,
        cap,
        txHash
      };
      
    } catch (error) {
      console.error('Failed to setup spending cap:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check if payment can use fast path (within spending cap)
   */
  static async canUseFastPath(
    userAddress: string, 
    paymentAmount: string
  ): Promise<FastPaymentResult> {
    try {
      const cap = await this.getCurrentCap(userAddress);
      const amount = parseFloat(paymentAmount);
      
      // No cap setup
      if (!cap) {
        return {
          canUseFastPath: false,
          reason: 'No spending cap configured',
          currentCap: null,
          suggestedAction: 'setup_cap'
        };
      }
      
      // Cap inactive
      if (!cap.isActive) {
        return {
          canUseFastPath: false,
          reason: 'Spending cap is inactive',
          currentCap: cap,
          suggestedAction: 'setup_cap'
        };
      }
      
      // Check remaining cap
      const remaining = parseFloat(cap.remainingCap);
      if (amount > remaining) {
        return {
          canUseFastPath: false,
          reason: `Insufficient remaining cap: ${remaining} USDC < ${amount} USDC`,
          currentCap: cap,
          suggestedAction: 'increase_cap'
        };
      }
      
      // Check daily limit
      const dailyRemaining = parseFloat(cap.dailyLimit) - parseFloat(cap.dailySpent);
      if (amount > dailyRemaining) {
        return {
          canUseFastPath: false,
          reason: `Daily limit exceeded: ${dailyRemaining} USDC remaining today`,
          currentCap: cap,
          suggestedAction: 'wait_reset'
        };
      }
      
      // All checks passed - can use fast path!
      return {
        canUseFastPath: true,
        reason: `Within spending limits (${amount} USDC)`,
        currentCap: cap
      };
      
    } catch (error) {
      console.error('Failed to check fast path eligibility:', error);
      return {
        canUseFastPath: false,
        reason: 'Error checking spending cap',
        currentCap: null
      };
    }
  }

  /**
   * Record a fast path payment (update spending tracking)
   */
  static async recordFastPayment(
    userAddress: string,
    paymentAmount: string,
    txHash: string
  ): Promise<SpendingCap | null> {
    try {
      const cap = await this.getCurrentCap(userAddress);
      if (!cap) return null;
      
      const amount = parseFloat(paymentAmount);
      const newRemainingCap = (parseFloat(cap.remainingCap) - amount).toFixed(2);
      const newDailySpent = (parseFloat(cap.dailySpent) + amount).toFixed(2);
      
      const updatedCap: SpendingCap = {
        ...cap,
        remainingCap: newRemainingCap,
        dailySpent: newDailySpent,
        updatedAt: new Date().toISOString()
      };
      
      // Save locally and sync to backend
      this.saveLocalSpendingCap(userAddress, updatedCap);
      await this.syncCapToBackend(updatedCap);
      
      console.log(`📊 Fast payment recorded: -${amount} USDC (${newRemainingCap} remaining)`);
      
      return updatedCap;
      
    } catch (error) {
      console.error('Failed to record fast payment:', error);
      return null;
    }
  }

  /**
   * Get recommended spending cap amounts
   */
  static getRecommendedCaps(): {
    conservative: { total: string; daily: string; description: string };
    moderate: { total: string; daily: string; description: string };
    generous: { total: string; daily: string; description: string };
  } {
    return {
      conservative: {
        total: '10.00',
        daily: '1.00', 
        description: 'Safe for occasional use (10 USDC total, 1 USDC/day)'
      },
      moderate: {
        total: '50.00',
        daily: '5.00',
        description: 'Regular usage (50 USDC total, 5 USDC/day)'
      },
      generous: {
        total: '200.00',
        daily: '25.00',
        description: 'Heavy usage (200 USDC total, 25 USDC/day)'
      }
    };
  }

  /**
   * Estimate time savings with fast path
   */
  static getTimeSavingsEstimate(): {
    currentFlow: string;
    fastPath: string;
    savings: string;
    description: string;
  } {
    return {
      currentFlow: '3-8 seconds',
      fastPath: '0.5-1.5 seconds',
      savings: '2-6 seconds',
      description: 'Skip wallet confirmation for cap-approved payments'
    };
  }

  // Private helper methods
  private static getLocalSpendingCaps(): Record<string, SpendingCap> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  private static saveLocalSpendingCap(userAddress: string, cap: SpendingCap): void {
    try {
      const caps = this.getLocalSpendingCaps();
      caps[userAddress.toLowerCase()] = cap;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(caps));
    } catch (error) {
      console.warn('Failed to save spending cap locally:', error);
    }
  }

  private static isValidCap(cap: SpendingCap): boolean {
    return cap.isActive && 
           parseFloat(cap.remainingCap) > 0 &&
           new Date(cap.updatedAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days
  }

  private static resetDailyLimitIfNeeded(cap: SpendingCap): SpendingCap {
    const today = new Date().toISOString().split('T')[0];
    
    if (cap.lastResetDate !== today) {
      return {
        ...cap,
        dailySpent: '0.00',
        lastResetDate: today,
        updatedAt: new Date().toISOString()
      };
    }
    
    return cap;
  }

  private static async syncCapToBackend(cap: SpendingCap): Promise<void> {
    try {
      await fetch('/api/users/spending-cap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cap),
        credentials: 'include'
      });
    } catch (error) {
      console.warn('Failed to sync spending cap to backend:', error);
      // Continue without backend sync - local storage is sufficient
    }
  }
}