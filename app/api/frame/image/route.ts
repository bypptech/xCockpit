import { NextRequest, NextResponse } from 'next/server';
import { ImageResponse } from 'next/og';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'welcome';
    const fid = searchParams.get('fid') || '0';

    let title = 'Nagesen Gacha Live';
    let subtitle = 'USDC投げ銭でガチャマシンを操作';
    let emoji = '🎰';
    let bgColor = '#6B46C1';

    switch (action) {
      case 'payment':
        title = 'Payment Ready';
        subtitle = `FID ${fid} - Ready to tip USDC`;
        emoji = '💰';
        bgColor = '#059669';
        break;
      case 'stats':
        title = 'User Stats';
        subtitle = `FID ${fid} - View your activity`;
        emoji = '📊';
        bgColor = '#DC2626';
        break;
      case 'error':
        title = 'Error Occurred';
        subtitle = 'Please try again';
        emoji = '❌';
        bgColor = '#DC2626';
        break;
      case 'success':
        title = 'Payment Success!';
        subtitle = 'Gacha triggered! 🎉';
        emoji = '✅';
        bgColor = '#059669';
        break;
    }

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: bgColor,
            backgroundImage: 'linear-gradient(45deg, rgba(0,0,0,0.1) 25%, transparent 25%, transparent 75%, rgba(0,0,0,0.1) 75%, rgba(0,0,0,0.1))',
            backgroundSize: '20px 20px',
          }}
        >
          {/* Main emoji */}
          <div style={{
            fontSize: 120,
            marginBottom: 20,
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))'
          }}>
            {emoji}
          </div>
          
          {/* Title */}
          <div style={{
            fontSize: 48,
            fontWeight: 'bold',
            color: 'white',
            textAlign: 'center',
            marginBottom: 10,
            textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
          }}>
            {title}
          </div>
          
          {/* Subtitle */}
          <div style={{
            fontSize: 28,
            color: 'rgba(255,255,255,0.9)',
            textAlign: 'center',
            maxWidth: '80%',
            lineHeight: 1.2,
            textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
          }}>
            {subtitle}
          </div>

          {/* Gacha machine illustration for welcome */}
          {action === 'welcome' && (
            <div style={{
              position: 'absolute',
              bottom: 40,
              right: 40,
              fontSize: 80,
              opacity: 0.3,
            }}>
              🎰
            </div>
          )}

          {/* USDC symbol */}
          <div style={{
            position: 'absolute',
            top: 40,
            right: 40,
            width: 60,
            height: 60,
            borderRadius: '50%',
            backgroundColor: '#2775CA',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            fontWeight: 'bold',
            color: 'white',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          }}>
            $
          </div>

          {/* Timestamp */}
          <div style={{
            position: 'absolute',
            bottom: 20,
            left: 40,
            fontSize: 16,
            color: 'rgba(255,255,255,0.7)',
          }}>
            {new Date().toLocaleString()}
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error) {
    console.error('Frame image generation error:', error);
    
    // Fallback error image
    return new ImageResponse(
      (
        <div style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#DC2626',
          color: 'white',
          fontSize: 32,
          fontWeight: 'bold'
        }}>
          ❌ Image Generation Failed
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  }
}