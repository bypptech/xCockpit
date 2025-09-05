import { 
  Transaction,
  TransactionButton,
  TransactionStatus,
  TransactionStatusLabel,
  TransactionStatusAction
} from '@coinbase/onchainkit/transaction';
import type { 
  BasePayConfig, 
  PaymentRequest, 
  PaymentResult, 
  PaymentError,
  OnchainKitTransaction,
  TransactionQuote 
} from '@/types/base-pay';

// Constants for Base Sepolia
const CHAIN_ID = 84532; // Base Sepolia
const USDC_ADDRESS_BASE_SEPOLIA = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
const USDC_DECIMALS = 6;

export class BasePayService {
  private config: BasePayConfig;
  private provider: any;

  constructor(config?: Partial<BasePayConfig>) {
    this.config = {
      projectId: config?.projectId || process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_ID || '',
      apiKey: config?.apiKey || process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY || '',
      network: config?.network || 'base-sepolia',
      usdcAddress: config?.usdcAddress || USDC_ADDRESS_BASE_SEPOLIA,
    };
  }

  /**
   * Create a payment transaction
   */
  async createPayment(request: PaymentRequest): Promise<OnchainKitTransaction> {
    try {
      console.log('Creating Base Pay payment:', request);

      // Validate request
      if (!request.amount || parseFloat(request.amount) <= 0) {
        throw new Error('Invalid payment amount');
      }

      if (!request.recipient || !request.recipient.startsWith('0x')) {
        throw new Error('Invalid recipient address');
      }

      // Build transaction based on currency
      if (request.currency === 'ETH') {
        return this.createETHTransaction(request);
      } else {
        return this.createUSDCTransaction(request);
      }
    } catch (error) {
      console.error('Failed to create payment:', error);
      throw this.formatError(error);
    }
  }

  /**
   * Create ETH transaction
   */
  private createETHTransaction(request: PaymentRequest): OnchainKitTransaction {
    const amountInWei = this.parseEthToWei(request.amount);

    return {
      to: request.recipient as `0x${string}`,
      value: amountInWei,
      chainId: CHAIN_ID,
    };
  }

  /**
   * Create USDC transaction
   */
  private createUSDCTransaction(request: PaymentRequest): OnchainKitTransaction {
    const amountInUnits = this.parseUsdcToUnits(request.amount);
    
    // ERC-20 transfer function signature
    const transferFunctionSignature = '0xa9059cbb';
    
    // Encode the recipient address (32 bytes, left-padded)
    const recipientEncoded = request.recipient.slice(2).padStart(64, '0');
    
    // Encode the amount (32 bytes, left-padded)
    const amountEncoded = amountInUnits.toString(16).padStart(64, '0');
    
    // Combine to create the data field
    const data = `${transferFunctionSignature}${recipientEncoded}${amountEncoded}` as `0x${string}`;

    return {
      to: this.config.usdcAddress as `0x${string}`,
      data,
      chainId: CHAIN_ID,
    };
  }

  /**
   * Verify a payment transaction
   */
  async verifyPayment(transactionHash: string): Promise<boolean> {
    try {
      // In a real implementation, this would check the blockchain
      // For now, we'll implement a basic verification
      console.log('Verifying payment:', transactionHash);
      
      // TODO: Implement actual blockchain verification
      // This would typically involve:
      // 1. Getting transaction receipt
      // 2. Verifying status
      // 3. Checking logs for correct events
      
      return true;
    } catch (error) {
      console.error('Failed to verify payment:', error);
      return false;
    }
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(transactionHash: string): Promise<PaymentResult> {
    try {
      // TODO: Implement actual status checking from blockchain
      console.log('Getting payment status:', transactionHash);
      
      return {
        transactionHash,
        status: 'pending',
        timestamp: Date.now(),
        from: '0x0000000000000000000000000000000000000000',
        to: '0x0000000000000000000000000000000000000000',
        amount: '0',
        currency: 'USDC',
        network: this.config.network,
      };
    } catch (error) {
      console.error('Failed to get payment status:', error);
      throw this.formatError(error);
    }
  }

  /**
   * Estimate gas for a transaction
   */
  async estimateGas(transaction: OnchainKitTransaction): Promise<TransactionQuote> {
    try {
      // TODO: Implement actual gas estimation
      console.log('Estimating gas for transaction:', transaction);
      
      // Default estimates for Base Sepolia
      const estimatedGas = transaction.data ? '80000' : '21000';
      const gasPrice = '1000000000'; // 1 Gwei
      
      const totalCostInWei = BigInt(estimatedGas) * BigInt(gasPrice);
      const totalCostInEth = (Number(totalCostInWei) / 1e18).toFixed(6);
      
      return {
        estimatedGas,
        gasPrice,
        totalCostInWei: totalCostInWei.toString(),
        totalCostInEth,
      };
    } catch (error) {
      console.error('Failed to estimate gas:', error);
      throw this.formatError(error);
    }
  }

  /**
   * Format transaction for display
   */
  formatTransactionForDisplay(transaction: OnchainKitTransaction): string {
    const displayData: any = {
      to: transaction.to,
      chainId: transaction.chainId,
    };

    if (transaction.value) {
      displayData.value = `${this.formatWeiToEth(transaction.value)} ETH`;
    }

    if (transaction.data) {
      displayData.data = transaction.data.slice(0, 10) + '...';
    }

    return JSON.stringify(displayData, null, 2);
  }

  /**
   * Parse USDC amount to smallest units (6 decimals)
   */
  private parseUsdcToUnits(amount: string): bigint {
    const amountFloat = parseFloat(amount);
    const amountInUnits = Math.floor(amountFloat * Math.pow(10, USDC_DECIMALS));
    return BigInt(amountInUnits);
  }

  /**
   * Parse ETH amount to wei (18 decimals)
   */
  private parseEthToWei(amount: string): bigint {
    const amountFloat = parseFloat(amount);
    const amountInWei = Math.floor(amountFloat * 1e18);
    return BigInt(amountInWei);
  }

  /**
   * Format wei to ETH for display
   */
  private formatWeiToEth(wei: bigint): string {
    return (Number(wei) / 1e18).toFixed(6);
  }

  /**
   * Format error for consistent error handling
   */
  private formatError(error: any): PaymentError {
    return {
      code: error.code || 'UNKNOWN_ERROR',
      message: error.message || 'An unexpected error occurred',
      details: error,
    };
  }

  /**
   * Check if Base Pay is available
   */
  isAvailable(): boolean {
    return !!(this.config.projectId && this.config.apiKey);
  }

  /**
   * Get current configuration
   */
  getConfig(): BasePayConfig {
    return { ...this.config };
  }
}

// Singleton instance
export const basePayService = new BasePayService();