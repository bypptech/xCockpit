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
      console.log(`🔄 X402 Request: POST /api/devices/${deviceId}/commands/${command}`, {
        walletAddress,
        timestamp: new Date().toISOString()
      });
      
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

      console.log(`📡 X402 Response:`, {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        url: response.url
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
        console.log('💰 402 Payment Required detected');
        const responseBody = await response.json();
        console.log('📄 402 Response body:', responseBody);
        const paymentInfo = this.parse402Response(responseBody);
        console.log('🎯 Parsed payment info:', paymentInfo);
        
        return {
          success: false,
          paymentRequired: true,
          paymentInfo
        };
      }

      // Other error cases - try JSON first, fallback to text
      let errorMessage: string;
      const responseClone = response.clone();
      
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || 'Unknown error';
      } catch {
        // If JSON parsing fails, try text from cloned response
        try {
          const errorText = await responseClone.text();
          errorMessage = errorText || `HTTP ${response.status}`;
        } catch {
          errorMessage = `HTTP ${response.status}`;
        }
      }
      throw new Error(`${response.status}: ${errorMessage}`);

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
      console.log(`💳 X402 Payment Request: POST /api/devices/${deviceId}/commands/${command}`, {
        hasPaymentHeader: !!paymentHeader,
        paymentHeaderLength: paymentHeader.length,
        walletAddress: paymentData.walletAddress
      });
      
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

      console.log(`💳 X402 Payment Response:`, {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        url: response.url
      });

      if (!response.ok) {
        let errorMessage: string;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || 'Unknown error';
        } catch {
          errorMessage = `HTTP ${response.status}`;
        }
        throw new Error(`${response.status}: ${errorMessage}`);
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
