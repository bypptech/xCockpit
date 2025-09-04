import { NextResponse } from 'next/server';

export async function GET() {
  const manifest = {
    name: "Nagesen Gacha Live",
    description: "Live-streamed Gacha machine controllable via USDC tipping. Viewers send USDC tips from their devices, trigger the Gacha machine to operate remotely, and receive capsule prizes.",
    icon: "🎰",
    version: "1.0.1",
    url: "https://202509vibecodingminihackerson.bypp.tech",
    frame: {
      version: "vNext",
      image: "https://202509vibecodingminihackerson.bypp.tech/api/frame/image",
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
          action: "link"
        }
      ],
      postUrl: "https://202509vibecodingminihackerson.bypp.tech/api/frame"
    }
  };
  
  return NextResponse.json(manifest);
}