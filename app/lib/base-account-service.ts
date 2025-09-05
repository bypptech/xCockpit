import { pay, getPaymentStatus } from '@base-org/account';

export interface BaseAccountPaymentRequest {
  amount: string;
  recipient: string;
  testnet?: boolean;
  metadata?: {
    deviceId?: string;
    command?: string;
    userId?: string;
  };
  payerInfo?: {
    email?: { optional?: boolean };
    phone?: { optional?: boolean };
    name?: { optional?: boolean };
    address?: { optional?: boolean };
  };
}

export interface BaseAccountPaymentResult {
  id: string;
  status: 'pending' | 'completed' | 'failed';
  transactionHash?: string;
  amount: string;
  recipient: string;
  timestamp: number;
}

export class BaseAccountService {
  private testnet: boolean;

  constructor(testnet: boolean = true) {
    this.testnet = testnet;
  }

  /**
   * Create and execute a payment using Base Account
   */
  async createPayment(request: BaseAccountPaymentRequest): Promise<BaseAccountPaymentResult> {
    try {
      console.log('Creating Base Account payment:', {
        amount: request.amount,
        recipient: request.recipient,
        testnet: request.testnet ?? this.testnet,
      });

      // Execute payment using Base Account SDK
      const payment = await pay({
        amount: request.amount,
        to: request.recipient,
        testnet: request.testnet ?? this.testnet,
        // Add payer info if requested
        ...(request.payerInfo && { payerInfo: request.payerInfo }),
        // Add metadata for tracking
        metadata: request.metadata,
      });

      console.log('Payment created:', payment);

      // Return payment result
      return {
        id: payment.id,
        status: 'pending',
        transactionHash: payment.transactionHash,
        amount: request.amount,
        recipient: request.recipient,
        timestamp: Date.now(),
      };
    } catch (error: any) {
      console.error('Base Account payment failed:', error);
      throw new Error(`Payment failed: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Check payment status
   */
  async checkPaymentStatus(paymentId: string): Promise<BaseAccountPaymentResult> {
    try {
      const { status, transactionHash } = await getPaymentStatus({
        id: paymentId,
        testnet: this.testnet,
      });

      return {
        id: paymentId,
        status: status as 'pending' | 'completed' | 'failed',
        transactionHash,
        amount: '',
        recipient: '',
        timestamp: Date.now(),
      };
    } catch (error: any) {
      console.error('Failed to get payment status:', error);
      throw new Error(`Status check failed: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Poll payment status until completion
   */
  async waitForPaymentCompletion(
    paymentId: string,
    maxAttempts: number = 30,
    intervalMs: number = 2000
  ): Promise<BaseAccountPaymentResult> {
    let attempts = 0;

    while (attempts < maxAttempts) {
      const status = await this.checkPaymentStatus(paymentId);

      if (status.status === 'completed' || status.status === 'failed') {
        return status;
      }

      attempts++;
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    throw new Error('Payment status check timed out');
  }

  /**
   * Get current network mode
   */
  isTestnet(): boolean {
    return this.testnet;
  }

  /**
   * Switch network mode
   */
  setTestnet(testnet: boolean): void {
    this.testnet = testnet;
  }
}

// Singleton instance for Base Sepolia
export const baseAccountService = new BaseAccountService(true);