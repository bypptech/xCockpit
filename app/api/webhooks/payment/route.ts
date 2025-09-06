import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { txHash, amount, deviceId, userId, status } = body;
    
    console.log('🔔 Payment webhook received:', {
      txHash,
      amount,
      deviceId,
      userId,
      status,
      timestamp: new Date().toISOString()
    });

    // Here you would typically:
    // 1. Verify the webhook signature
    // 2. Update your database
    // 3. Trigger any side effects (like device actions)
    // 4. Send notifications to users

    // For now, just log the event
    if (status === 'completed') {
      console.log('✅ Payment completed successfully');
      // Trigger device action here if needed
    } else if (status === 'failed') {
      console.log('❌ Payment failed');
      // Handle failed payment
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Webhook processed successfully' 
    });

  } catch (error) {
    console.error('❌ Webhook processing failed:', error);
    return NextResponse.json(
      { success: false, error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}