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
        "manifestVersion": "1.0.0",
        "name": "Nagesen Gacha Live",
        "description": "Live-streamed Gacha machine controllable via USDC tipping. Viewers send USDC tips from their devices, trigger the Gacha machine to operate remotely, and receive capsule prizes.",
        "icon": "https://202509vibecodingminihackerson.bypp.tech/icon.svg",
        "homeUrl": "https://202509vibecodingminihackerson.bypp.tech",
        "splashImageUrl": "https://202509vibecodingminihackerson.bypp.tech/icon.svg",
        "splashBackgroundColor": "#7c3aed",
        "webhookUrl": "https://202509vibecodingminihackerson.bypp.tech/api/webhooks/farcaster",
        "requiredChains": ["ethereum", "base"],
        "requiredCapabilities": [
          "wallet",
          "ethereum"
        ],
        "metadata": {
          "author": "Nagesen Gacha Live Team",
          "version": "1.0.0",
          "category": "gaming",
          "keywords": ["gacha", "live-streaming", "usdc", "tipping", "gaming", "farcaster"],
          "supportUrl": "https://202509vibecodingminihackerson.bypp.tech/support",
          "privacyUrl": "https://202509vibecodingminihackerson.bypp.tech/privacy"
        }
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