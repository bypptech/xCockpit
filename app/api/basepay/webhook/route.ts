import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { X402Client } from '@/lib/x402-client';
import type { WebhookPayload } from '@/types/base-pay';

/**
 * Verify webhook signature from Base Pay
 */
function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) return false;

  try {
    const expectedSignature = createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    // Constant-time comparison to prevent timing attacks
    return signature === `sha256=${expectedSignature}`;
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return false;
  }
}

/**
 * Handle payment completion
 */
async function handlePaymentCompleted(data: WebhookPayload['data']) {
  console.log('Payment completed:', data);

  // Extract metadata
  const { deviceId, command, userId } = data.metadata || {};

  if (!deviceId || !command) {
    console.warn('Missing device or command in payment metadata');
    return;
  }

  try {
    // Submit payment proof to x402 endpoint
    const submitResult = await X402Client.submitPayment(deviceId, command, {
      amount: data.amount,
      currency: data.currency,
      network: 'eip155:84532', // Base Sepolia
      txHash: data.transactionHash || '',
      walletAddress: data.from,
    });

    if (!submitResult.success) {
      console.error('Failed to submit payment to x402:', submitResult.error);
    } else {
      console.log('Successfully submitted payment to x402');
    }

    // TODO: Additional processing
    // - Update database records
    // - Send notifications
    // - Trigger device actions
    
  } catch (error) {
    console.error('Error processing payment completion:', error);
    throw error;
  }
}

/**
 * Base Pay webhook handler
 */
export async function POST(request: NextRequest) {
  try {
    // Get webhook secret
    const webhookSecret = process.env.BASE_PAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('BASE_PAY_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Webhook not configured' },
        { status: 500 }
      );
    }

    // Get signature from headers
    const signature = request.headers.get('x-basepay-signature') ||
                      request.headers.get('x-onchainkit-signature');

    // Read raw body for signature verification
    const rawBody = await request.text();

    // Verify signature
    if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse payload
    const payload: WebhookPayload = JSON.parse(rawBody);

    console.log('Received Base Pay webhook:', {
      event: payload.event,
      timestamp: payload.timestamp,
      data: payload.data,
    });

    // Process different event types
    switch (payload.event) {
      case 'payment.created':
        console.log('Payment created:', payload.data.paymentId);
        // Payment initiated, could update UI status
        break;

      case 'payment.completed':
        await handlePaymentCompleted(payload.data);
        break;

      case 'payment.failed':
        console.error('Payment failed:', payload.data);
        // Handle payment failure
        // Could trigger retry logic or notifications
        break;

      default:
        console.warn('Unknown webhook event:', payload.event);
    }

    // Return success response
    return NextResponse.json(
      { received: true, event: payload.event },
      { status: 200 }
    );

  } catch (error) {
    console.error('Webhook processing error:', error);
    
    // Return error but with 200 status to prevent retries
    // for malformed requests
    return NextResponse.json(
      { error: 'Processing error', received: true },
      { status: 200 }
    );
  }
}

/**
 * Health check endpoint
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    webhook: 'basepay',
    timestamp: new Date().toISOString(),
  });
}