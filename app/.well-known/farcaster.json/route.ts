import { NextResponse } from 'next/server';

export async function GET() {
  console.log('🔍 Farcaster manifest requested at:', new Date().toISOString());
  
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