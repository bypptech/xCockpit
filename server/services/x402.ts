import { BlockchainVerifier } from './blockchain-verifier';
import { orderManager, OrderValidation } from './order-manager';
import { signatureVerifier, PaymentRequirements } from './signature-verifier';

export interface X402PaymentRequest {
  amount: string;
  currency: string;
  network: string;
  recipient: string;
  metadata?: {
    txHash?: string;
    orderId?: string;
    nonce?: string;
    [key: string]: any;
  };
  minConfirmations?: number;
}

export interface X402PaymentResponse {
  paymentId: string;
  txHash: string;
  amount: string;
  currency: string;
  network: string;
  timestamp: string;
}

export class X402Service {
  private static blockchainVerifier: BlockchainVerifier | null = null;
  
  static initialize(network: 'mainnet' | 'sepolia' = 'sepolia') {
    this.blockchainVerifier = new BlockchainVerifier(network);
  }
  
  static calculateDevicePrice(deviceId: string, command: string): string {
    const devicePricing: Record<string, string> = {
      'ESP32_001': '0.01',  // Gacha #001のfeeを$0.01 USDCに設定
      'ESP32_002': '0.005', // Gacha #002のfeeを$0.005USDCに設定
    };
    
    const hour = new Date().getHours();
    const peakHourMultiplier = (hour >= 18 && hour <= 22) ? 1.5 : 1.0;
    
    const basePrice = devicePricing[deviceId] || '0.01';
    const price = parseFloat(basePrice) * peakHourMultiplier;
    return price.toFixed(3);
  }

  static create402Response(deviceId: string, command: string, ttlMinutes: number = 5) {
    const amount = this.calculateDevicePrice(deviceId, command);
    const recipient = process.env.PAYMENT_RECIPIENT || '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238';
    const network = process.env.NETWORK || 'sepolia';
    const isMainnet = network === 'mainnet';
    
    const { orderId, nonce, nonceExp } = orderManager.generateOrder(ttlMinutes, {
      deviceId,
      command,
      amount
    });
    
    const requirements: PaymentRequirements = {
      scheme: 'x402-exact',
      chain: isMainnet ? 'eip155:8453' : 'eip155:84532',
      token: isMainnet 
        ? 'erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' 
        : 'erc20:0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      amount: amount,
      currency: 'USDC',
      to: recipient,
      minConfirmations: 0,
      orderId,
      nonce,
      nonceExp,
      callback: process.env.PAYMENT_CALLBACK_URL
    };
    
    const { requirementsHeader, signature } = signatureVerifier.signPaymentRequirements(requirements);
    
    return {
      status: 402,
      headers: {
        'Content-Type': 'application/json',
        'WWW-Authenticate': 'Payment',
        'X-Payment-Requirements': requirementsHeader,
        'X-Payment-Signature': signature
      },
      body: {
        message: 'Payment Required',
        orderId,
        nonce,
        expiresAt: nonceExp,
        payment: {
          accepts: [{
            scheme: 'x402-exact',
            network: requirements.chain,
            asset: requirements.token,
            amount: amount,
            recipient: recipient,
            minConfirmations: 0
          }],
          metadata: {
            deviceId,
            command,
            orderId,
            timestamp: new Date().toISOString()
          }
        }
      }
    };
  }

  static parsePaymentHeader(paymentHeader: string): X402PaymentRequest | null {
    try {
      const decoded = Buffer.from(paymentHeader, 'base64').toString('utf-8');
      const payment = JSON.parse(decoded);
      
      if (!payment.amount || !payment.currency || !payment.network || !payment.recipient) {
        return null;
      }
      
      return payment;
    } catch (error) {
      return null;
    }
  }

  static createPaymentResponse(payment: X402PaymentRequest, paymentId: string): X402PaymentResponse {
    return {
      paymentId,
      txHash: payment.metadata?.txHash || '',
      amount: payment.amount,
      currency: payment.currency,
      network: payment.network,
      timestamp: new Date().toISOString()
    };
  }

  static async verifyPayment(
    payment: X402PaymentRequest, 
    requirementsHeader?: string,
    signatureHeader?: string
  ): Promise<{
    verified: boolean;
    error?: string;
    confirmations?: number;
    orderValidation?: OrderValidation;
    blockchainResult?: any;
  }> {
    try {
      if (process.env.ENHANCED_X402 !== 'true') {
        return {
          verified: !!(payment.amount && payment.currency && payment.network && payment.metadata?.txHash)
        };
      }
      
      if (!this.blockchainVerifier) {
        this.initialize(process.env.NETWORK as 'mainnet' | 'sepolia' || 'sepolia');
      }
      
      if (requirementsHeader && signatureHeader) {
        if (!signatureVerifier.verifyPaymentRequirements(requirementsHeader, signatureHeader)) {
          return { verified: false, error: 'Invalid signature' };
        }
      }
      
      const { orderId, nonce, txHash } = payment.metadata || {};
      
      if (!orderId || !nonce) {
        return { verified: false, error: 'Missing order ID or nonce' };
      }
      
      const orderValidation = orderManager.validateOrder(orderId, nonce);
      if (!orderValidation.valid) {
        return { 
          verified: false, 
          error: orderValidation.error,
          orderValidation 
        };
      }
      
      if (!txHash) {
        return { verified: false, error: 'Missing transaction hash' };
      }
      
      const blockchainResult = await this.blockchainVerifier!.verifyUSDCTransfer({
        txHash,
        expectedTo: payment.recipient,
        minAmount: payment.amount,
        minConfirmations: payment.minConfirmations || 0
      });
      
      if (!blockchainResult.verified) {
        return { 
          verified: false, 
          error: blockchainResult.error,
          confirmations: blockchainResult.confirmations,
          blockchainResult 
        };
      }
      
      const consumed = orderManager.consumeOrder(orderId, nonce, txHash);
      if (!consumed) {
        return { verified: false, error: 'Failed to consume order' };
      }
      
      return {
        verified: true,
        confirmations: blockchainResult.confirmations,
        orderValidation,
        blockchainResult
      };
      
    } catch (error) {
      console.error('Payment verification error:', error);
      return { 
        verified: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
  
  static async waitForConfirmations(
    txHash: string,
    targetConfirmations: number,
    maxWaitTime: number = 60000
  ): Promise<boolean> {
    if (!this.blockchainVerifier) {
      this.initialize();
    }
    
    return this.blockchainVerifier!.waitForConfirmations(
      txHash, 
      targetConfirmations, 
      maxWaitTime
    );
  }
  
  static generatePaymentStateHeader(
    txHash: string,
    confirmations: number,
    network?: string
  ): string {
    const chain = network === 'mainnet' ? 'eip155:8453' : 'eip155:84532';
    return signatureVerifier.generatePaymentStateHeader(txHash, confirmations, chain);
  }
}
