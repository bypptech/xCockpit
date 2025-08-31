export interface X402PaymentRequest {
  amount: string;
  currency: string;
  network: string;
  recipient: string;
  metadata?: any;
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
  static create402Response(paymentRequest: X402PaymentRequest) {
    return {
      status: 402,
      headers: {
        'Content-Type': 'application/json',
        'WWW-Authenticate': 'Payment'
      },
      body: {
        message: 'Payment Required',
        payment: {
          accepts: [{
            scheme: 'exact',
            network: 'eip155:84532', // Base Sepolia
            asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC
            amount: paymentRequest.amount,
            recipient: paymentRequest.recipient
          }],
          metadata: paymentRequest.metadata
        }
      }
    };
  }

  static parsePaymentHeader(paymentHeader: string): X402PaymentRequest | null {
    try {
      const decoded = Buffer.from(paymentHeader, 'base64').toString('utf-8');
      const payment = JSON.parse(decoded);
      
      if (!payment.amount || !payment.currency || !payment.network || !payment.txHash) {
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

  static async verifyPayment(payment: X402PaymentRequest): Promise<boolean> {
    // In a real implementation, this would verify the transaction on-chain
    // For now, we'll simulate verification based on the presence of required fields
    return !!(payment.amount && payment.currency && payment.network && payment.metadata?.txHash);
  }
}
