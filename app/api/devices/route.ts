import { NextResponse } from 'next/server';

// Mock devices data
const devices = [
  {
    id: "ESP32_001",
    name: "Smart Gacha #001",
    type: "gacha",
    description: "ESP32-powered gacha machine with servo motor and LED indicators",
    commands: ['play'],
    pricing: {
      play: { amount: "0.5", currency: "USDC", recipient: "0x742d35C4F7c8806FF6e5de0e1e5E93D4b0C4FED7" }
    },
    status: "online",
    location: "Tokyo Maker Space"
  }
];

export async function GET() {
  return NextResponse.json(devices);
}