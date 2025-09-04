'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Globe, Wifi } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { walletService } from '@/lib/coinbase-wallet';

interface NetworkSwitcherProps {
  walletAddress: string | null;
  className?: string;
}

interface NetworkInfo {
  chainId: string;
  name: string;
  isBaseNetwork: boolean;
  isSupported: boolean;
}

export function NetworkSwitcher({ walletAddress, className = '' }: NetworkSwitcherProps) {
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [switching, setSwitching] = useState(false);
  const { toast } = useToast();

  const loadNetworkInfo = async () => {
    if (!walletAddress) return;

    try {
      const info = await walletService.getCurrentNetwork();
      const isBaseNetwork = ['0x14a34'].includes(info.chainId.toLowerCase());
      const isSupported = ['0x14a34', '0xaa36a7'].includes(info.chainId.toLowerCase());
      
      setNetworkInfo({
        ...info,
        isBaseNetwork,
        isSupported
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


  const switchToBaseSepolia = async () => {
    setSwitching(true);
    try {
      await walletService.switchNetwork('base-sepolia');
      toast({
        title: 'Network switched!',
        description: 'Successfully switched to Base Sepolia',
      });
      await loadNetworkInfo();
    } catch (error) {
      console.error('Failed to switch network:', error);
      toast({
        title: 'Failed to switch network',
        description: 'Could not switch to Base Sepolia',
        variant: 'destructive',
      });
    } finally {
      setSwitching(false);
    }
  };

  const switchToSepoliaEthereum = async () => {
    setSwitching(true);
    try {
      await walletService.switchNetwork('sepolia-ethereum');
      toast({
        title: 'Network switched!',
        description: 'Successfully switched to ETH Sepolia',
      });
      await loadNetworkInfo();
    } catch (error) {
      console.error('Failed to switch network:', error);
      toast({
        title: 'Failed to switch network',
        description: 'Could not switch to ETH Sepolia',
        variant: 'destructive',
      });
    } finally {
      setSwitching(false);
    }
  };

  const getNetworkStatus = () => {
    if (!networkInfo) return { variant: 'secondary' as const, icon: Globe, text: 'Loading...' };

    if (networkInfo.isBaseNetwork) {
      return { 
        variant: 'default' as const, 
        icon: CheckCircle, 
        text: `Connected to ${networkInfo.name}` 
      };
    } else {
      return { 
        variant: 'destructive' as const, 
        icon: AlertCircle, 
        text: `⚠️ ${networkInfo.name} - Basenames not supported` 
      };
    }
  };

  if (!walletAddress) {
    return null;
  }

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
              ✅ Basenames are supported on this network
            </div>
          ) : (
            <div className="text-orange-600">
              ⚠️ Switch to Base network to view Basenames
            </div>
          )}
        </div>

        {/* Network Switch Buttons */}
        <div className="space-y-2">
          {!networkInfo?.isBaseNetwork && (
            <Button
              onClick={switchToBaseSepolia}
              disabled={switching}
              className="w-full"
              size="sm"
            >
              {switching ? 'Switching...' : 'Switch to Base Sepolia'}
            </Button>
          )}
          {networkInfo?.chainId?.toLowerCase() !== '0xaa36a7' && (
            <Button
              onClick={switchToSepoliaEthereum}
              disabled={switching}
              variant="outline"
              className="w-full"
              size="sm"
            >
              {switching ? 'Switching...' : 'Switch to ETH Sepolia'}
            </Button>
          )}
        </div>

        {/* Help Text */}
        <div className="text-xs text-muted-foreground text-center">
          {networkInfo?.isBaseNetwork ? (
            'Your Basenames will be displayed automatically'
          ) : (
            'Basenames only work on Base networks'
          )}
        </div>
      </CardContent>
    </Card>
  );
}