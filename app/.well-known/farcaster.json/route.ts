import { NextResponse } from 'next/server';

export async function GET() {
  console.log('🔍 Farcaster manifest requested at:', new Date().toISOString());
  console.log('🔄 Redirecting to Farcaster Hosted Manifest');

  // Temporary redirect (307) to Farcaster Hosted Manifest
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