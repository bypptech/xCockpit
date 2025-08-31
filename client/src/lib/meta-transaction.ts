import { ERC20ApprovalService, ApprovalState } from './erc20-approve';
import { EIP2612PermitService, PermitSignature } from './eip2612-permit';
import { walletService } from './coinbase-wallet';

export type PaymentMethod = 'direct' | 'approve_transfer' | 'permit_transfer';

export interface PaymentIntent {
  method: PaymentMethod;
  from: string;
  to: string;
  amount: string;
  nonce: string;
  deadline: number;
  signature?: string;
  permitData?: PermitSignature;
}

export interface PaymentResult {
  success: boolean;
  txHash?: string;
  method: PaymentMethod;
  gasUsed?: number;
  error?: string;
}

export class MetaTransactionService {
  /**
   * Determine the best payment method based on current state
   */
  static async selectOptimalPaymentMethod(
    userAddress: string,
    amount: string
  ): Promise<{
    recommendedMethod: PaymentMethod;
    approvalState: ApprovalState;
    supportsPermit: boolean;
  }> {
    try {
      // Check current approval status
      const approvalState = await ERC20ApprovalService.checkApprovalStatus(userAddress, amount);
      
      // Check permit support
      const supportsPermit = await EIP2612PermitService.supportsPermit();
      
      // Decision logic
      let recommendedMethod: PaymentMethod;
      
      if (supportsPermit) {
        // Prefer permit for gas efficiency (no pre-approval needed)
        recommendedMethod = 'permit_transfer';
      } else if (approvalState.isApproved) {
        // Use transferFrom if already approved
        recommendedMethod = 'approve_transfer';
      } else {
        // Fallback to direct transfer
        recommendedMethod = 'direct';
      }
      
      return {
        recommendedMethod,
        approvalState,
        supportsPermit
      };
      
    } catch (error) {
      console.error('Failed to select payment method:', error);
      return {
        recommendedMethod: 'direct',
        approvalState: {
          spender: '',
          allowance: '0.00',
          isApproved: false,
          needsApproval: true
        },
        supportsPermit: false
      };
    }
  }

  /**
   * Execute payment using the optimal method
   */
  static async executeOptimizedPayment(
    userAddress: string,
    recipient: string,
    amount: string
  ): Promise<PaymentResult> {
    try {
      const { recommendedMethod, approvalState, supportsPermit } = 
        await this.selectOptimalPaymentMethod(userAddress, amount);
      
      console.log(`🚀 Executing ${recommendedMethod} payment for ${amount} USDC`);
      
      switch (recommendedMethod) {
        case 'permit_transfer':
          return await this.executePermitTransfer(userAddress, recipient, amount);
          
        case 'approve_transfer':
          return await this.executeApproveTransfer(userAddress, recipient, amount, approvalState);
          
        case 'direct':
        default:
          return await this.executeDirectTransfer(recipient, amount);
      }
      
    } catch (error) {
      console.error('Payment execution failed:', error);
      return {
        success: false,
        method: 'direct',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Method 1: Direct transfer (current implementation)
   */
  private static async executeDirectTransfer(
    recipient: string,
    amount: string
  ): Promise<PaymentResult> {
    try {
      const txHash = await walletService.sendUSDCPayment(recipient, amount);
      
      return {
        success: true,
        txHash,
        method: 'direct'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Method 2: Approve + TransferFrom pattern
   */
  private static async executeApproveTransfer(
    userAddress: string,
    recipient: string,
    amount: string,
    approvalState: ApprovalState
  ): Promise<PaymentResult> {
    try {
      // Check if additional approval is needed
      if (approvalState.needsApproval) {
        const recommendedAmount = ERC20ApprovalService.getRecommendedApprovalAmount(amount);
        
        console.log(`📝 Approving ${recommendedAmount} USDC for future transactions`);
        await ERC20ApprovalService.approveSpending(recommendedAmount);
        
        // Wait for approval confirmation (in production, you'd wait for block confirmation)
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // Create signed intent for backend to execute transferFrom
      const paymentIntent = await this.createTransferFromIntent(userAddress, recipient, amount);
      
      // Send to backend for execution
      const response = await fetch('/api/payments/execute-transfer-from', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentIntent),
        credentials: 'include'
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'TransferFrom execution failed');
      }
      
      return {
        success: true,
        txHash: result.txHash,
        method: 'approve_transfer',
        gasUsed: result.gasUsed
      };
      
    } catch (error) {
      throw error;
    }
  }

  /**
   * Method 3: Permit + TransferFrom (gasless approval)
   */
  private static async executePermitTransfer(
    userAddress: string,
    recipient: string,
    amount: string
  ): Promise<PaymentResult> {
    try {
      console.log('🔏 Creating permit signature...');
      
      // Create permit signature and payment intent
      const { permitSignature, paymentIntent } = 
        await EIP2612PermitService.createPaymentIntentWithPermit(userAddress, amount);
      
      console.log('📤 Sending permit payment to backend...');
      
      // Send to backend for permit + transferFrom execution
      const response = await fetch('/api/payments/execute-permit-transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentIntent,
          permitSignature,
          recipient
        }),
        credentials: 'include'
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Permit transfer execution failed');
      }
      
      return {
        success: true,
        txHash: result.txHash,
        method: 'permit_transfer',
        gasUsed: result.gasUsed
      };
      
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create signed intent for transferFrom
   */
  private static async createTransferFromIntent(
    userAddress: string,
    recipient: string,
    amount: string
  ): Promise<PaymentIntent> {
    const nonce = `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes
    
    // Create simple message to sign
    const message = `Transfer ${amount} USDC to ${recipient} (nonce: ${nonce}, deadline: ${deadline})`;
    
    // Sign the message
    const signature = await walletService['provider'].request({
      method: 'personal_sign',
      params: [message, userAddress]
    });
    
    return {
      method: 'approve_transfer',
      from: userAddress,
      to: recipient,
      amount,
      nonce,
      deadline,
      signature
    };
  }

  /**
   * Get payment method performance stats
   */
  static getMethodPerformanceStats(): Record<PaymentMethod, {
    avgTime: string;
    gasEfficiency: string;
    userSteps: number;
    description: string;
  }> {
    return {
      direct: {
        avgTime: '3-8 seconds',
        gasEfficiency: 'Standard',
        userSteps: 2,
        description: 'User confirms each transaction'
      },
      approve_transfer: {
        avgTime: '1-3 seconds (after initial approval)',
        gasEfficiency: 'Good',
        userSteps: 1,
        description: 'One-time approval, then signature only'
      },
      permit_transfer: {
        avgTime: '1-2 seconds',
        gasEfficiency: 'Best',
        userSteps: 1,
        description: 'Gasless approval via signature'
      }
    };
  }
}