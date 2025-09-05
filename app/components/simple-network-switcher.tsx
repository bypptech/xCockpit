'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { walletService } from '@/lib/coinbase-wallet';

interface NetworkSwitcherProps {
  walletAddress: string | null;
  className?: string;
}

interface NetworkInfo {
  chainId: string;
  name: string;
}

export function SimpleNetworkSwitcher({ walletAddress, className = '' }: NetworkSwitcherProps) {
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);

  const loadNetworkInfo = async () => {
    if (!walletAddress) return;

    try {
      const info = await walletService.getCurrentNetwork();
      setNetworkInfo(info);
      console.log('Current network:', info);
    } catch (error) {
      console.error('Failed to load network info:', error);
    }
  };

  useEffect(() => {
    loadNetworkInfo();
  }, [walletAddress]);

  const isBaseSepoliaNetwork = () => {
    if (!networkInfo) return false;
    return networkInfo.chainId.toLowerCase() === '0x14a34'; // Base Sepolia
  };

  if (!walletAddress) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          🌐 Network Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Network */}
        <div>
          <div className="text-sm font-medium">
            Current: {networkInfo?.name || 'Loading...'}
          </div>
          <div className="text-xs text-gray-500">
            Chain ID: {networkInfo?.chainId || 'Unknown'}
          </div>
        </div>

        {/* Status Message */}
        {isBaseSepoliaNetwork() ? (
          <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
            ✅ Connected to Base Sepolia (correct network)
          </div>
        ) : (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
            ❌ Wrong network! Please switch to Base Sepolia in your wallet
          </div>
        )}

        {/* Help Text */}
        <div className="text-xs text-gray-400 border-t pt-2">
          {isBaseSepoliaNetwork() ? (
            <div>💡 xCockpit is ready to use on Base Sepolia testnet.</div>
          ) : (
            <div>⚠️ This app only works on Base Sepolia. Please switch in your wallet settings.</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}