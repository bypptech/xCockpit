'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
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
  const [switching, setSwitching] = useState(false);
  const [message, setMessage] = useState<string>('');

  const loadNetworkInfo = async () => {
    if (!walletAddress) return;

    try {
      const info = await walletService.getCurrentNetwork();
      setNetworkInfo(info);
      console.log('Current network:', info);
    } catch (error) {
      console.error('Failed to load network info:', error);
      setMessage('Failed to load network info');
    }
  };

  useEffect(() => {
    loadNetworkInfo();
  }, [walletAddress]);


  const switchToBaseSepolia = async () => {
    setSwitching(true);
    setMessage('Switching to Base Sepolia...');
    
    try {
      await walletService.switchNetwork('base-sepolia');
      setMessage('✅ Successfully switched to Base Sepolia!');
      setTimeout(() => setMessage(''), 3000);
      await loadNetworkInfo();
    } catch (error: any) {
      console.error('Failed to switch network:', error);
      setMessage(`❌ Failed to switch: ${error.message}`);
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setSwitching(false);
    }
  };

  const switchToSepoliaEthereum = async () => {
    setSwitching(true);
    setMessage('Switching to ETH Sepolia...');
    
    try {
      await walletService.switchNetwork('sepolia-ethereum');
      setMessage('✅ Successfully switched to ETH Sepolia!');
      setTimeout(() => setMessage(''), 3000);
      await loadNetworkInfo();
    } catch (error: any) {
      console.error('Failed to switch network:', error);
      setMessage(`❌ Failed to switch: ${error.message}`);
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setSwitching(false);
    }
  };

  const isBaseNetwork = () => {
    if (!networkInfo) return false;
    const chainId = networkInfo.chainId.toLowerCase();
    return chainId === '0x14a34'; // Base Sepolia
  };

  const isSepoliaEthereum = () => {
    if (!networkInfo) return false;
    return networkInfo.chainId.toLowerCase() === '0xaa36a7'; // Sepolia Ethereum
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
        {isBaseNetwork() ? (
          <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
            ℹ️ Connected to Base Sepolia. Basenames will be looked up via Base Mainnet.
          </div>
        ) : isSepoliaEthereum() ? (
          <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
            ℹ️ Connected to ETH Sepolia. Switch to Base networks for Basename support.
          </div>
        ) : (
          <div className="text-sm text-orange-600 bg-orange-50 p-2 rounded">
            ⚠️ Switch to supported network to view features
          </div>
        )}

        {/* Network Switch Buttons */}
        {!isBaseNetwork() && !isSepoliaEthereum() && (
          <div className="space-y-2">
            <Button
              onClick={switchToBaseSepolia}
              disabled={switching}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              size="sm"
            >
              {switching ? '🔄 Switching...' : '🧪 Switch to Base Sepolia'}
            </Button>
            <Button
              onClick={switchToSepoliaEthereum}
              disabled={switching}
              variant="outline"
              className="w-full"
              size="sm"
            >
              {switching ? '🔄 Switching...' : '🔗 Switch to ETH Sepolia'}
            </Button>
          </div>
        )}

        {/* Message Display */}
        {message && (
          <div className="text-xs p-2 bg-gray-100 rounded">
            {message}
          </div>
        )}

        {/* Debug Info */}
        <div className="text-xs text-gray-400 border-t pt-2">
          {isSepoliaEthereum() && (
            <div>💡 You're on ETH Sepolia. Basenames work on Base networks.</div>
          )}
          {isBaseNetwork() && networkInfo?.chainId.toLowerCase() === '0x14a34' && (
            <div>🔄 Base Sepolia uses Base Mainnet for Basename lookups.</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}