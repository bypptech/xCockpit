import { NextRequest, NextResponse } from 'next/server';

// In-memory storage for fees (in production, use a database)
const deviceFees: Record<string, number> = {
  'ESP32_001': 0.01,  // Default fee for Smart Gacha #001
  'ESP32_002': 0.005, // Default fee for Smart Gacha #002
};

// GET: Retrieve current fee for a device
export async function GET(
  request: NextRequest,
  { params }: { params: { deviceId: string } }
) {
  const deviceId = params.deviceId;
  
  // Check if device exists
  if (!deviceFees.hasOwnProperty(deviceId)) {
    return NextResponse.json(
      { error: 'Device not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    deviceId,
    currentFee: deviceFees[deviceId],
    currency: 'USDC',
    lastUpdated: new Date().toISOString()
  });
}

// POST: Update fee for a device
export async function POST(
  request: NextRequest,
  { params }: { params: { deviceId: string } }
) {
  const deviceId = params.deviceId;
  
  // Check if device exists
  if (!deviceFees.hasOwnProperty(deviceId)) {
    return NextResponse.json(
      { error: 'Device not found' },
      { status: 404 }
    );
  }

  try {
    const body = await request.json();
    const { fee, walletAddress } = body;

    // Validate fee
    if (typeof fee !== 'number' || fee < 0.001 || fee > 999) {
      return NextResponse.json(
        { error: 'Invalid fee. Must be between 0.001 and 999 USDC' },
        { status: 400 }
      );
    }

    // In production, you would verify wallet ownership/permissions here
    console.log(`Fee update request from wallet: ${walletAddress}`);

    // Update the fee
    deviceFees[deviceId] = fee;

    return NextResponse.json({
      success: true,
      deviceId,
      newFee: fee,
      currency: 'USDC',
      updatedBy: walletAddress,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating fee:', error);
    return NextResponse.json(
      { error: 'Failed to update fee' },
      { status: 500 }
    );
  }
}