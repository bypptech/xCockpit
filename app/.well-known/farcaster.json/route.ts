import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('🔍 Farcaster manifest requested at:', new Date().toISOString());

  const { searchParams } = new URL(request.url);
  const direct = searchParams.get('direct');

  // If direct=true, return manifest directly (fallback mode)
  if (direct === 'true') {
    console.log('📋 Returning direct manifest (fallback mode)');

    const manifest = {
      "version": "1.0.0",
      "name": "Nagesen Gacha Live",
      "description": "Live-streamed Gacha machine controllable via USDC tipping",
      "icon": "https://202509vibecodingminihackerson.bypp.tech/icon.svg",
      "homeUrl": "https://202509vibecodingminihackerson.bypp.tech",
      "webhookUrl": "https://202509vibecodingminihackerson.bypp.tech/api/webhooks/farcaster",
      "accountAssociation": {
        "header": "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9",
        "payload": "eyJkb21haW4iOiIyMDI1MDl2aWJlY29kaW5nbWluaWhhY2tlcnNvbi5ieXBwLnRlY2giLCJzdWJqZWN0IjoiZmlkOjEzMjIwNDYiLCJpYXQiOjE3NTcxMzYwMzUsImV4cCI6MTc4ODY3MjAzNX0",
        "signature": "REQUIRES_FARCASTER_PRIVATE_KEY_SIGNATURE"
      },
      "miniApps": [
        {
          "version": "1",
          "name": "Nagesen Gacha Live",
          "homeUrl": "https://202509vibecodingminihackerson.bypp.tech",
          "iconUrl": "https://202509vibecodingminihackerson.bypp.tech/icon.svg",
          "subtitle": "Live Gacha with USDC Tips",
          "description": "Live-streamed Gacha machine controllable via USDC tipping. Viewers send USDC tips from their devices, trigger the Gacha machine to operate remotely, and receive capsule prizes.",
          "splashImageUrl": "https://202509vibecodingminihackerson.bypp.tech/icon.svg",
          "splashBackgroundColor": "#7c3aed",
          "webhookUrl": "https://202509vibecodingminihackerson.bypp.tech/api/webhooks/farcaster"
        }
      ]
    };

    console.log('📤 Returning manifest:', JSON.stringify(manifest, null, 2));

    return NextResponse.json(manifest, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  }

  // Default: redirect to Farcaster Hosted Manifest
  console.log('🔄 Redirecting to Farcaster Hosted Manifest');
  const hostedManifestUrl = 'https://api.farcaster.xyz/miniapps/hosted-manifest/01991e66-62f2-0168-5f13-ffa509eae12c';

  return NextResponse.redirect(hostedManifestUrl, {
    status: 307,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
}