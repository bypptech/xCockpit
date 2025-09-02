'use client';

import { useState, useEffect } from 'react';
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

  const switchToBaseMainnet = async () => {
    setSwitching(true);
    setMessage('Switching to Base Mainnet...');
    
    try {
      await walletService.switchNetwork('base-mainnet');
      setMessage('✅ Successfully switched to Base Mainnet!');
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

  const isBaseNetwork = () => {
    if (!networkInfo) return false;
    const chainId = networkInfo.chainId.toLowerCase();
    return chainId === '0x2105' || chainId === '0x14a34'; // Base Mainnet or Base Sepolia
  };

  const isEthereumMainnet = () => {
    if (!networkInfo) return false;
    return networkInfo.chainId.toLowerCase() === '0x1';
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
          networkInfo?.chainId.toLowerCase() === '0x2105' ? (
            <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
              ✅ Basenames are fully supported on Base Mainnet!
            </div>
          ) : (
            <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
              ℹ️ Connected to Base Sepolia. Basenames will be looked up via Base Mainnet.
            </div>
          )
        ) : (
          <div className="text-sm text-orange-600 bg-orange-50 p-2 rounded">
            ⚠️ Switch to Base network to view Basenames
          </div>
        )}

        {/* Network Switch Buttons */}
        {!isBaseNetwork() && (
          <div className="space-y-2">
            <Button
              onClick={switchToBaseMainnet}
              disabled={switching}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              size="sm"
            >
              {switching ? '🔄 Switching...' : '🚀 Switch to Base Mainnet'}
            </Button>
            <Button
              onClick={switchToBaseSepolia}
              disabled={switching}
              variant="outline"
              className="w-full"
              size="sm"
            >
              {switching ? '🔄 Switching...' : '🧪 Switch to Base Sepolia (Testnet)'}
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
          {isEthereumMainnet() && (
            <div>💡 You're on Ethereum Mainnet. Basenames work on Base networks.</div>
          )}
          {isBaseNetwork() && networkInfo?.chainId.toLowerCase() === '0x2105' && (
            <div>✨ Base Mainnet has native Basename support.</div>
          )}
          {isBaseNetwork() && networkInfo?.chainId.toLowerCase() === '0x14a34' && (
            <div>🔄 Base Sepolia uses Base Mainnet for Basename lookups.</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}