import { NextResponse } from 'next/server';

export async function GET() {
  const manifest = {
    name: "xCockpit",
    description: "Web3 IoT Control Dashboard",
    icon: "🚀",
    version: "1.0.0",
    url: process.env.NODE_ENV === 'production' 
      ? "https://xcockpit.replit.app" 
      : "http://localhost:3000",
    frame: {
      version: "vNext",
      image: "/frame-image.png",
      buttons: [
        {
          text: "🚀 Launch xCockpit",
          action: "link"
        }
      ]
    }
  };
  
  return NextResponse.json(manifest);
}