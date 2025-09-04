import { NextRequest, NextResponse } from 'next/server';
import { FarcasterVerifier, validateFarcasterEnvVars } from '../../../server/lib/farcaster-verify';

const APP_URL = process.env.FARCASTER_APP_URL || 'https://202509vibecodingminihackerson.bypp.tech';
const verifier = new FarcasterVerifier(APP_URL);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { untrustedData, trustedData } = body;
    
    console.log('🔵 Frame POST received:', { untrustedData, trustedData });
    
    // 1. 環境変数の検証
    const envValidation = validateFarcasterEnvVars();
    if (!envValidation.isValid) {
      console.error('❌ Environment validation failed:', envValidation.errors);
    }

    // 2. Frame メッセージ検証
    const frameValidation = await verifier.verifyFrameMessage({
      untrustedData,
      trustedData
    });
    
    if (!frameValidation.isValid) {
      console.error('❌ Frame validation failed:', frameValidation.errors);
    }

    // 3. JWTペイロード検証（環境変数が設定されている場合）
    if (envValidation.header && envValidation.payload) {
      const payloadValidation = verifier.verifyPayload(
        envValidation.header,
        envValidation.payload
      );
      
      if (!payloadValidation.isValid) {
        console.error('❌ Payload validation failed:', payloadValidation.errors);
      } else {
        console.log('✅ Payload validation passed');
      }
    }

    // 4. ボタンアクションによる分岐
    const buttonIndex = untrustedData?.buttonIndex;
    const fid = untrustedData?.fid;
    
    console.log(`🔵 Button ${buttonIndex} pressed by FID ${fid}`);

    let responseData;
    let shouldRedirect = false;

    switch (buttonIndex) {
      case 1: // 💰 Tip & Trigger Gacha
        responseData = {
          type: "frame",
          version: "vNext",
          image: `${APP_URL}/api/frame/image?action=payment&fid=${fid}`,
          buttons: [
            {
              text: "💵 Pay 0.100 USDC",
              action: "post",
              target: `${APP_URL}/api/frame/payment`
            },
            {
              text: "🎬 Watch Live",
              action: "link", 
              target: APP_URL
            }
          ],
          input: {
            text: "Enter tip amount (USDC)"
          },
          postUrl: `${APP_URL}/api/frame/payment`
        };
        break;

      case 2: // 📊 View Stats
        responseData = {
          type: "frame",
          version: "vNext",
          image: `${APP_URL}/api/frame/image?action=stats&fid=${fid}`,
          buttons: [
            {
              text: "🔄 Refresh Stats",
              action: "post"
            },
            {
              text: "💰 Make Payment",
              action: "post"
            },
            {
              text: "🎬 Watch Live",
              action: "link",
              target: APP_URL
            }
          ],
          postUrl: `${APP_URL}/api/frame`
        };
        break;

      case 3: // 🎬 Watch Live (Link)
        shouldRedirect = true;
        break;

      default: // Initial frame
        responseData = {
          type: "frame",
          version: "vNext", 
          image: `${APP_URL}/api/frame/image?action=welcome&fid=${fid}`,
          buttons: [
            {
              text: "💰 Tip & Trigger Gacha",
              action: "post"
            },
            {
              text: "📊 View Stats", 
              action: "post"
            },
            {
              text: "🎬 Watch Live",
              action: "link",
              target: APP_URL
            }
          ],
          postUrl: `${APP_URL}/api/frame`
        };
    }

    if (shouldRedirect) {
      return NextResponse.redirect(APP_URL);
    }

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('❌ Frame API error:', error);
    
    // エラー時のフォールバック Frame
    return NextResponse.json({
      type: "frame",
      version: "vNext",
      image: `${APP_URL}/api/frame/image?action=error`,
      buttons: [
        {
          text: "🔄 Try Again",
          action: "post"
        },
        {
          text: "🎬 Visit Site",
          action: "link",
          target: APP_URL
        }
      ],
      postUrl: `${APP_URL}/api/frame`
    });
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Frame endpoint ready",
    version: "vNext"
  });
}