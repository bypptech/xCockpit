import { NextResponse } from 'next/server';

export async function GET() {
  const manifest = {
    name: "Nagesen Gacha Live",
    description: "Live-streamed Gacha machine controllable via USDC tipping. Viewers send USDC tips from their devices, trigger the Gacha machine to operate remotely, and receive capsule prizes.",
    icon: "🎰",
    version: "1.0.3",
    url: "https://202509vibecodingminihackerson.bypp.tech",
    miniapp: {
      version: "vNext",
      permissions: ["wallet", "cast", "authenticate"],
      fid: 1322046,
      verifiedDomain: "202509vibecodingminihackerson.bypp.tech"
    },
    frame: {
      version: "vNext",
      image: "https://202509vibecodingminihackerson.bypp.tech/api/frame/image",
      buttons: [
        {
          text: "💰 Pay & Play Gacha",
          action: "post"
        },
        {
          text: "📊 View Leaderboard",
          action: "post"
        },
        {
          text: "🎬 Watch Live Stream",
          action: "link"
        }
      ],
      postUrl: "https://202509vibecodingminihackerson.bypp.tech/api/frame"
    }
  };
  
  return NextResponse.json(manifest);
}