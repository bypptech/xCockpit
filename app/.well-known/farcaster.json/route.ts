import { NextResponse } from 'next/server';

export async function GET() {
  const manifest = {
    "version": "1.0.0",
    "accountAssociation": {
      "header": "eyJmaWQiOjEzMjIwNDYsInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHgxQUZFNjc2RDBCRjAyYzk2OTM2YzREMzQ3MTc5MDY0QkRiMWU5RUY4In0",
      "payload": "eyJkb21haW4iOiIyMDI1MDl2aWJlY29kaW5nbWluaWhhY2tlcnNvbi5ieXBwLnRlY2gifQ",
      "signature": "MHg1MDhhNWVlMGIwMmMxMmQxYmQxZDhmMDhkZWJiMTQyODZhOWE1YjhlOGFhNTJiNzE5NWMyOGVmODBjNjNiNDMyNTFjOGJjMzYwODVlMGE3NjU4NWU1ZmJjNjAzNzcxNTRiOGM0ZWNlNGRkNDEyMzhhZGNiNjgwM2ZjMTlkNjY5YzFj"
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
        "webhookUrl": "https://202509vibecodingminihackerson.bypp.tech/api/webhooks/farcaster",
        "primaryCategory": "games",
        "tags": ["gacha", "live-streaming", "usdc", "tipping", "gaming"],
        "tagline": "Tip to Win Real Prizes!",
        "ogTitle": "Nagesen Gacha Live",
        "ogDescription": "Control a live Gacha machine with USDC tips and win real capsule prizes delivered to your door!",
        "ogImageUrl": "https://202509vibecodingminihackerson.bypp.tech/icon.svg",
        "heroImageUrl": "https://202509vibecodingminihackerson.bypp.tech/icon.svg",
        "requiredChains": ["ethereum", "base"],
        "requiredCapabilities": [
          "wallet",
          "ethereum"
        ],
        "canonicalDomain": "202509vibecodingminihackerson.bypp.tech"
      }
    ]
  };

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}