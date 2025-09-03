import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Path to the device fees file
const FEES_FILE_PATH = join(process.cwd(), 'device-fees.json');

// In-memory storage for fees (in production, use a database)
let deviceFees: Record<string, number> = {
  'ESP32_001': 0.01,  // Default fee for Smart Gacha #001
  'ESP32_002': 0.005, // Default fee for Smart Gacha #002
};

// Load fees from file on startup
try {
  const fileContent = readFileSync(FEES_FILE_PATH, 'utf8');
  const persistedFees = JSON.parse(fileContent);
  
  // Convert persisted format to simple number format
  for (const [deviceId, feeData] of Object.entries(persistedFees)) {
    if (typeof feeData === 'object' && feeData !== null && 'price' in feeData) {
      deviceFees[deviceId] = parseFloat((feeData as any).price);
    }
  }
  console.log('📁 Loaded fees from file:', deviceFees);
} catch (error) {
  console.log('📁 No fee file found, using defaults');
}

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

    // Block fee changes for ESP32_002 (fixed fee device)
    if (deviceId === 'ESP32_002') {
      return NextResponse.json(
        { error: 'Fee cannot be changed for this device - fixed at 0.005 USDC' },
        { status: 403 }
      );
    }

    // Validate fee
    if (typeof fee !== 'number' || fee < 0.001 || fee > 999) {
      return NextResponse.json(
        { error: 'Invalid fee. Must be between 0.001 and 999 USDC' },
        { status: 400 }
      );
    }

    // In production, you would verify wallet ownership/permissions here
    console.log(`Fee update request from wallet: ${walletAddress}`);

    // Update the fee in memory
    deviceFees[deviceId] = fee;

    // Save to file
    try {
      let persistedFees = {};
      try {
        const fileContent = readFileSync(FEES_FILE_PATH, 'utf8');
        persistedFees = JSON.parse(fileContent);
      } catch (error) {
        // File doesn't exist, start with empty object
      }

      persistedFees[deviceId] = {
        price: fee.toString(),
        customFee: true,
        updatedBy: walletAddress,
        updatedAt: new Date().toISOString()
      };

      writeFileSync(FEES_FILE_PATH, JSON.stringify(persistedFees, null, 2));
      console.log(`💾 Saved fee ${fee} USDC for ${deviceId} to file`);
    } catch (fileError) {
      console.error('Failed to save fee to file:', fileError);
    }

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