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
    walletAddress: string,
    txHash?: string
  ): Promise<{ success: boolean; payment?: PaymentResponse; error?: string }> {
    try {
      // First attempt without payment header to get 402 response
      let response;
      
      try {
        response = await apiRequest('POST', `/api/devices/${deviceId}/commands/${command}`, {
          walletAddress
        });
      } catch (error: any) {
        // Check if it's a 402 Payment Required response
        if (error.message.includes('402')) {
          // Extract payment requirements from error response
          // In a real implementation, this would parse the 402 response body
          const paymentRequired = await this.handle402Response(deviceId, command, walletAddress);
          return paymentRequired;
        }
        throw error;
      }

      // If we get here, payment was already processed
      const paymentResponseHeader = response.headers.get('X-PAYMENT-RESPONSE');
      if (paymentResponseHeader) {
        const paymentResponse = JSON.parse(atob(paymentResponseHeader));
        return { success: true, payment: paymentResponse };
      }

      return { success: true };

    } catch (error: any) {
      console.error('X402 payment error:', error);
      return { success: false, error: error.message };
    }
  }

  private static async handle402Response(
    deviceId: string, 
    command: string, 
    walletAddress: string
  ): Promise<{ success: boolean; error: string }> {
    // This would trigger the payment modal in the UI
    // For now, return an error that the UI can handle
    return {
      success: false,
      error: 'PAYMENT_REQUIRED'
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
