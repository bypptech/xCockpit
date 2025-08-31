import { apiRequest } from './queryClient';

export interface PaymentRequest {
  amount: string;
  currency: string;
  network: string;
  recipient: string;
  metadata?: any;
}

export interface PaymentResponse {
  paymentId: string;
  txHash: string;
  amount: string;
  currency: string;
  network: string;
  timestamp: string;
}

export class X402Client {
  static async executeDeviceCommand(
    deviceId: string, 
    command: string, 
    walletAddress: string
  ): Promise<{
    success: boolean;
    paymentRequired?: boolean;
    paymentInfo?: {
      amount: string;
      currency: string;
      network: string;
      recipient: string;
    };
    payment?: PaymentResponse;
    error?: string;
  }> {
    try {
      // Phase 1: Initial request without payment header
      const response = await fetch(`/api/devices/${deviceId}/commands/${command}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress
        }),
        credentials: 'include'
      });

      if (response.ok) {
        // Payment not required or already processed
        const result = await response.json();
        const paymentResponseHeader = response.headers.get('X-PAYMENT-RESPONSE');
        
        if (paymentResponseHeader) {
          const paymentResponse = JSON.parse(atob(paymentResponseHeader));
          return { success: true, payment: paymentResponse };
        }

        return { success: true };
      }

      if (response.status === 402) {
        // Payment Required - parse 402 response
        const responseBody = await response.json();
        const paymentInfo = this.parse402Response(responseBody);
        
        return {
          success: false,
          paymentRequired: true,
          paymentInfo
        };
      }

      // Other error cases
      const errorText = await response.text();
      throw new Error(`${response.status}: ${errorText}`);

    } catch (error: any) {
      console.error('X402 payment error:', error);
      return { success: false, error: error.message };
    }
  }

  private static parse402Response(responseBody: any): {
    amount: string;
    currency: string;
    network: string;
    recipient: string;
  } {
    const payment = responseBody.payment;
    if (payment?.accepts && payment.accepts.length > 0) {
      const acceptedPayment = payment.accepts[0];
      return {
        amount: acceptedPayment.amount,
        currency: 'USDC', // Infer from acceptedPayment.asset
        network: acceptedPayment.network,
        recipient: acceptedPayment.recipient
      };
    }
    
    // Fallback values
    return {
      amount: '0.01',
      currency: 'USDC',
      network: 'eip155:84532',
      recipient: '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238'
    };
  }

  static async submitPayment(
    deviceId: string,
    command: string,
    paymentData: {
      amount: string;
      currency: string;
      network: string;
      txHash: string;
      walletAddress: string;
    }
  ): Promise<{ success: boolean; payment?: PaymentResponse; error?: string }> {
    try {
      // Create payment header
      const paymentHeader = btoa(JSON.stringify({
        amount: paymentData.amount,
        currency: paymentData.currency,
        network: paymentData.network,
        recipient: paymentData.walletAddress,
        metadata: {
          txHash: paymentData.txHash,
          walletAddress: paymentData.walletAddress
        }
      }));

      // Make request with X-PAYMENT header
      const response = await fetch(`/api/devices/${deviceId}/commands/${command}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-PAYMENT': paymentHeader
        },
        body: JSON.stringify({
          walletAddress: paymentData.walletAddress
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`${response.status}: ${await response.text()}`);
      }

      const result = await response.json();
      
      // Extract payment response from header
      const paymentResponseHeader = response.headers.get('X-PAYMENT-RESPONSE');
      let paymentResponse;
      
      if (paymentResponseHeader) {
        paymentResponse = JSON.parse(atob(paymentResponseHeader));
      }

      return {
        success: true,
        payment: paymentResponse
      };

    } catch (error: any) {
      console.error('Payment submission error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}
