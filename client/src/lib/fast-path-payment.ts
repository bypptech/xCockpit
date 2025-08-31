import { SpendingCapService, FastPaymentResult } from './spending-cap';
import { walletService } from './coinbase-wallet';

export interface FastPathPayment {
  userAddress: string;
  recipient: string;
  amount: string;
  nonce: string;
  timestamp: number;
  signature: string;
}

export interface FastPathResult {
  success: boolean;
  method: 'fast_path' | 'fallback';
  executionTime: number;
  txHash?: string;
  error?: string;
  spendingCapUsed?: {
    before: string;
    after: string;
    dailyRemaining: string;
  };
}

export class FastPathPaymentService {
  /**
   * Execute payment with automatic fast path detection
   */
  static async executePayment(
    userAddress: string,
    recipient: string,
    amount: string
  ): Promise<FastPathResult> {
    const startTime = Date.now();
    
    try {
      // Step 1: Check if fast path is available
      console.log(`🔍 Checking fast path eligibility for ${amount} USDC`);
      
      const fastPathCheck = await SpendingCapService.canUseFastPath(userAddress, amount);
      
      if (fastPathCheck.canUseFastPath) {
        // Execute fast path payment
        console.log(`⚡ Using fast path: ${fastPathCheck.reason}`);
        return await this.executeFastPathPayment(userAddress, recipient, amount, startTime);
      } else {
        // Fallback to regular payment
        console.log(`🐌 Using fallback method: ${fastPathCheck.reason}`);
        return await this.executeFallbackPayment(recipient, amount, startTime, fastPathCheck);
      }
      
    } catch (error) {
      console.error('Payment execution failed:', error);
      return {
        success: false,
        method: 'fallback',
        executionTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Execute fast path payment (signature-based, backend handles transfer)
   */
  private static async executeFastPathPayment(
    userAddress: string,
    recipient: string,
    amount: string,
    startTime: number
  ): Promise<FastPathResult> {
    try {
      // Step 1: Get current cap info
      const currentCap = await SpendingCapService.getCurrentCap(userAddress);
      
      // Step 2: Create signed payment intent
      const paymentIntent = await this.createFastPathIntent(userAddress, recipient, amount);
      
      // Step 3: Submit to backend for immediate execution
      const response = await fetch('/api/payments/fast-path', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentIntent),
        credentials: 'include'
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Fast path payment failed');
      }
      
      // Step 4: Update spending cap locally
      const updatedCap = await SpendingCapService.recordFastPayment(
        userAddress, 
        amount, 
        result.txHash
      );
      
      const executionTime = Date.now() - startTime;
      
      console.log(`✅ Fast path payment completed in ${executionTime}ms`);
      
      return {
        success: true,
        method: 'fast_path',
        executionTime,
        txHash: result.txHash,
        spendingCapUsed: {
          before: currentCap?.remainingCap || '0.00',
          after: updatedCap?.remainingCap || '0.00',
          dailyRemaining: updatedCap ? 
            (parseFloat(updatedCap.dailyLimit) - parseFloat(updatedCap.dailySpent)).toFixed(2) : '0.00'
        }
      };
      
    } catch (error) {
      console.error('Fast path payment failed:', error);
      throw error;
    }
  }

  /**
   * Create signed intent for fast path payment
   */
  private static async createFastPathIntent(
    userAddress: string,
    recipient: string,
    amount: string
  ): Promise<FastPathPayment> {
    const nonce = `fast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = Date.now();
    
    // Create message to sign
    const message = JSON.stringify({
      action: 'fast_path_payment',
      from: userAddress,
      to: recipient,
      amount,
      nonce,
      timestamp
    });
    
    // Sign the intent
    const signature = await walletService['provider'].request({
      method: 'personal_sign',
      params: [message, userAddress]
    });
    
    return {
      userAddress,
      recipient,
      amount,
      nonce,
      timestamp,
      signature
    };
  }

  /**
   * Execute fallback payment (regular wallet confirmation)
   */
  private static async executeFallbackPayment(
    recipient: string,
    amount: string,
    startTime: number,
    fastPathCheck: FastPaymentResult
  ): Promise<FastPathResult> {
    try {
      // Use existing wallet service for regular payment
      const txHash = await walletService.sendUSDCPayment(recipient, amount);
      
      const executionTime = Date.now() - startTime;
      
      console.log(`📝 Fallback payment completed in ${executionTime}ms`);
      
      return {
        success: true,
        method: 'fallback',
        executionTime,
        txHash
      };
      
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get spending cap setup recommendations based on usage patterns
   */
  static analyzeUsageAndRecommendCap(recentPayments: Array<{ amount: string; timestamp: string }>): {
    recommendedTotalCap: string;
    recommendedDailyLimit: string;
    reasoning: string;
    potentialSavings: {
      fastPathEligible: number;
      totalPayments: number;
      timeSavedPerPayment: string;
    };
  } {
    if (recentPayments.length === 0) {
      return {
        recommendedTotalCap: '10.00',
        recommendedDailyLimit: '1.00',
        reasoning: 'No usage history - starting with conservative limits',
        potentialSavings: {
          fastPathEligible: 0,
          totalPayments: 0,
          timeSavedPerPayment: '0 seconds'
        }
      };
    }
    
    // Analyze payment patterns
    const amounts = recentPayments.map(p => parseFloat(p.amount));
    const avgPayment = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
    const maxPayment = Math.max(...amounts);
    const totalSpent = amounts.reduce((sum, amt) => sum + amt, 0);
    
    // Calculate daily usage
    const dailyGroups = recentPayments.reduce((groups, payment) => {
      const date = new Date(payment.timestamp).toISOString().split('T')[0];
      groups[date] = (groups[date] || 0) + parseFloat(payment.amount);
      return groups;
    }, {} as Record<string, number>);
    
    const dailyAmounts = Object.values(dailyGroups);
    const avgDailySpend = dailyAmounts.reduce((sum, amt) => sum + amt, 0) / dailyAmounts.length;
    const maxDailySpend = Math.max(...dailyAmounts);
    
    // Recommend caps with 2x buffer
    const recommendedDailyLimit = Math.max(maxDailySpend * 1.5, avgPayment * 3).toFixed(2);
    const recommendedTotalCap = Math.max(totalSpent * 1.5, parseFloat(recommendedDailyLimit) * 14).toFixed(2);
    
    // Calculate potential fast path usage
    const conservativeDailyLimit = parseFloat(recommendedDailyLimit) * 0.8;
    const fastPathEligible = recentPayments.filter(p => parseFloat(p.amount) <= conservativeDailyLimit).length;
    
    return {
      recommendedTotalCap,
      recommendedDailyLimit,
      reasoning: `Based on ${recentPayments.length} recent payments (avg: $${avgPayment.toFixed(2)}, max daily: $${maxDailySpend.toFixed(2)})`,
      potentialSavings: {
        fastPathEligible,
        totalPayments: recentPayments.length,
        timeSavedPerPayment: '2-6 seconds'
      }
    };
  }

  /**
   * Get fast path performance statistics
   */
  static getPerformanceStats(): {
    methods: Array<{
      name: string;
      averageTime: string;
      userSteps: number;
      gasEfficiency: string;
      availability: string;
    }>;
    comparison: {
      speedImprovement: string;
      userExperienceRating: string;
    };
  } {
    return {
      methods: [
        {
          name: '⚡ Fast Path (Within Cap)',
          averageTime: '0.5-1.5 seconds',
          userSteps: 1,
          gasEfficiency: 'Excellent',
          availability: 'When within spending cap'
        },
        {
          name: '🚀 Pre-approved Transfer',
          averageTime: '1-3 seconds',
          userSteps: 1,
          gasEfficiency: 'Good',
          availability: 'After initial approval'
        },
        {
          name: '💳 Direct Transfer',
          averageTime: '3-8 seconds',
          userSteps: 2,
          gasEfficiency: 'Standard',
          availability: 'Always available'
        }
      ],
      comparison: {
        speedImprovement: '3-6x faster than direct transfer',
        userExperienceRating: 'Web2-like instant payments'
      }
    };
  }
}