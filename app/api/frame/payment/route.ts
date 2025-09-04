import { NextRequest, NextResponse } from 'next/server';
import { FarcasterVerifier } from '../../../../server/lib/farcaster-verify';

const APP_URL = process.env.FARCASTER_APP_URL || 'https://202509vibecodingminihackerson.bypp.tech';
const verifier = new FarcasterVerifier(APP_URL);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { untrustedData, trustedData } = body;
    
    console.log('🔵 Frame Payment POST received:', { untrustedData, trustedData });
    
    // Frame メッセージ検証
    const frameValidation = await verifier.verifyFrameMessage({
      untrustedData,
      trustedData
    });
    
    const fid = untrustedData?.fid || 0;
    const inputText = untrustedData?.inputText || '';
    const buttonIndex = untrustedData?.buttonIndex;
    
    // 入力された金額のパース
    const tipAmount = parseFloat(inputText) || 0.100; // デフォルト 0.100 USDC
    
    console.log(`💰 Payment request: FID ${fid}, Amount: ${tipAmount} USDC, Button: ${buttonIndex}`);

    // x402 Payment Required レスポンスの生成
    const paymentData = {
      scheme: "x402-exact",
      network: "eip155:8453", // Base Mainnet
      token: "erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC
      amount: tipAmount.toFixed(6),
      currency: "USDC",
      recipient: process.env.PAYMENT_RECIPIENT || "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238",
      minConfirmations: 0,
      orderId: `gacha_${fid}_${Date.now()}`,
      nonce: `nx_${Math.random().toString(36).substr(2, 8)}`,
      deviceId: "GACHA_001",
      command: "dispense",
      description: `Nagesen Gacha Live - Tip from FID ${fid}`
    };

    // 支払い開始のFrame応答
    if (buttonIndex === 1) {
      // 支払い確認画面
      return NextResponse.json({
        type: "frame",
        version: "vNext",
        image: `${APP_URL}/api/frame/image?action=payment&fid=${fid}&amount=${tipAmount}`,
        buttons: [
          {
            text: "✅ Confirm Payment",
            action: "tx",
            target: `${APP_URL}/api/frame/transaction`,
            postUrl: `${APP_URL}/api/frame/success`
          },
          {
            text: "❌ Cancel",
            action: "post"
          }
        ],
        postUrl: `${APP_URL}/api/frame`
      });
    }

    // デフォルト: 支払い入力画面
    return NextResponse.json({
      type: "frame",
      version: "vNext",
      image: `${APP_URL}/api/frame/image?action=payment&fid=${fid}`,
      buttons: [
        {
          text: "💵 Send Tip",
          action: "post"
        },
        {
          text: "🔙 Back",
          action: "post",
          target: `${APP_URL}/api/frame`
        }
      ],
      input: {
        text: "Enter USDC amount (e.g., 0.100)"
      },
      postUrl: `${APP_URL}/api/frame/payment`
    });

  } catch (error) {
    console.error('❌ Frame Payment API error:', error);
    
    return NextResponse.json({
      type: "frame",
      version: "vNext",
      image: `${APP_URL}/api/frame/image?action=error`,
      buttons: [
        {
          text: "🔄 Try Again",
          action: "post",
          target: `${APP_URL}/api/frame`
        }
      ],
      postUrl: `${APP_URL}/api/frame`
    });
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Frame payment endpoint ready",
    supportedActions: ["tip", "payment"],
    version: "vNext"
  });
}