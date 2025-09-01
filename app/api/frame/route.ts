import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { untrustedData, trustedData } = body;
    
    console.log('Frame interaction received:', { untrustedData, trustedData });
    
    // Return frame response to launch the Mini App
    return NextResponse.json({
      type: "frame",
      version: "vNext",
      image: "/frame-image.png",
      buttons: [
        {
          text: "🚀 Launch xCockpit",
          action: "link",
          target: process.env.NODE_ENV === 'production' 
            ? "https://xcockpit.replit.app" 
            : "http://localhost:3000"
        }
      ],
      postUrl: "/api/frame"
    });
  } catch (error) {
    console.error('Frame API error:', error);
    return NextResponse.json(
      { error: "Frame processing failed" }, 
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Frame endpoint ready",
    version: "vNext"
  });
}