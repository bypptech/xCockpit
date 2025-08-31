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
  static calculateDevicePrice(deviceId: string, command: string): string {
    // Device-specific pricing
    const devicePricing: Record<string, string> = {
      'ESP32_001': '0.01',  // Smart Gacha #001
      'ESP32_002': '0.005', // Smart Gacha #002
    };
    
    // Time-based pricing (peak hours multiplier)
    const hour = new Date().getHours();
    const peakHourMultiplier = (hour >= 18 && hour <= 22) ? 1.5 : 1.0;
    
    const basePrice = devicePricing[deviceId] || '0.01';
    const price = parseFloat(basePrice) * peakHourMultiplier;
    return price.toFixed(3);
  }

  static create402Response(deviceId: string, command: string) {
    const amount = this.calculateDevicePrice(deviceId, command);
    const recipient = process.env.PAYMENT_RECIPIENT || '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238';
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
            asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // USDC on Base Sepolia
            amount: amount,
            recipient: recipient
          }],
          metadata: {
            deviceId,
            command,
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

  static async verifyPayment(payment: X402PaymentRequest): Promise<boolean> {
    // In a real implementation, this would verify the transaction on-chain
    // For now, we'll simulate verification based on the presence of required fields
    return !!(payment.amount && payment.currency && payment.network && payment.metadata?.txHash);
  }
}
