import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🔔 Farcaster webhook received:', body);
    
    // Handle different webhook events
    const { event, data } = body;
    
    switch (event) {
      case 'miniapp.added':
        console.log('📱 Mini app added:', data);
        // Handle mini app installation
        break;
        
      case 'miniapp.removed':
        console.log('🗑️ Mini app removed:', data);
        // Handle mini app uninstallation
        break;
        
      case 'notification.enabled':
        console.log('🔔 Notifications enabled:', data);
        // Handle notification enablement
        break;
        
      case 'notification.disabled':
        console.log('🔕 Notifications disabled:', data);
        // Handle notification disablement
        break;
        
      case 'user.authenticated':
        console.log('👤 User authenticated:', data);
        // Handle user authentication
        break;
        
      default:
        console.log('❓ Unknown webhook event:', event);
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Webhook processed successfully' 
    });
    
  } catch (error) {
    console.error('❌ Farcaster webhook error:', error);
    return NextResponse.json(
      { success: false, error: 'Webhook processing failed' }, 
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Farcaster webhook endpoint ready",
    version: "1.0.0"
  });
}