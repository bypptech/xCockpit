'use client';

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Globe } from 'lucide-react';
import { walletService } from '@/lib/coinbase-wallet';

interface NetworkSwitcherProps {
  walletAddress: string | null;
  className?: string;
}

interface NetworkInfo {
  chainId: string;
  name: string;
  isBaseNetwork: boolean;
}

export function NetworkSwitcher({ walletAddress, className = '' }: NetworkSwitcherProps) {
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);

  const loadNetworkInfo = async () => {
    if (!walletAddress) return;

    try {
      const info = await walletService.getCurrentNetwork();
      const isBaseNetwork = info.chainId.toLowerCase() === '0x14a34'; // Base Sepolia only

      setNetworkInfo({
        ...info,
        isBaseNetwork
      });
    } catch (error) {
      console.error('Failed to load network info:', error);
    }
  };

  useEffect(() => {
    loadNetworkInfo();
  }, [walletAddress]);

  // ネットワーク変更を監視
  useEffect(() => {
    if (!walletAddress) return;

    const handleNetworkChange = () => {
      loadNetworkInfo();
    };

    // MetaMaskのネットワーク変更イベントを監視
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      (window as any).ethereum.on('chainChanged', handleNetworkChange);

      return () => {
        (window as any).ethereum.removeListener('chainChanged', handleNetworkChange);
      };
    }
  }, [walletAddress]);

  if (!walletAddress) {
    return null;
  }

  const getNetworkStatus = () => {
    if (!networkInfo) return { variant: 'secondary' as const, icon: Globe, text: 'Loading...' };

    if (networkInfo.isBaseNetwork) {
      return { 
        variant: 'default' as const, 
        icon: CheckCircle, 
        text: `Connected to Base Sepolia` 
      };
    } else {
      return { 
        variant: 'destructive' as const, 
        icon: Globe, 
        text: `❌ Wrong Network - Base Sepolia Required` 
      };
    }
  };

  const status = getNetworkStatus();
  const StatusIcon = status.icon;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Globe className="h-4 w-4" />
          Network Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Network Status */}
        <div className="flex items-center gap-2">
          <Badge variant={status.variant} className="flex items-center gap-1 text-xs">
            <StatusIcon className="h-3 w-3" />
            {networkInfo?.name || 'Unknown'}
          </Badge>
        </div>

        {/* Network Description */}
        <div className="text-xs text-muted-foreground">
          {networkInfo?.isBaseNetwork ? (
            <div className="text-green-600">
              ✅ Connected to Base Sepolia testnet
            </div>
          ) : (
            <div className="text-red-600">
              ❌ Please switch to Base Sepolia in your wallet
            </div>
          )}
        </div>

        {/* Help Text */}
        <div className="text-xs text-muted-foreground text-center">
          {networkInfo?.isBaseNetwork ? (
            'Ready to use xCockpit features'
          ) : (
            'This app only works on Base Sepolia testnet'
          )}
        </div>
      </CardContent>
    </Card>
  );
}