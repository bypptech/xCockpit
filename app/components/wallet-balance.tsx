'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Copy, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { walletService } from '@/lib/coinbase-wallet';
import { balanceEvents } from '@/lib/balance-events';
import { BasenameDisplay } from '@/components/basename-display';
import { useBasename } from '@/hooks/use-basenames';

interface WalletBalanceProps {
  walletAddress: string | null;
  className?: string;
}

interface BalanceInfo {
  usdc: string;
  eth: string;
  lastUpdated: Date;
}

interface NetworkInfo {
  chainId: string;
  name: string;
}

export function WalletBalance({ walletAddress, className = '' }: WalletBalanceProps) {
  const [balance, setBalance] = useState<BalanceInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [showBalance, setShowBalance] = useState(true);
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [switching, setSwitching] = useState(false);
  const { toast } = useToast();
  const { basename, ownedBasename, hasReverseRecord, loading: basenameLoading } = useBasename(walletAddress);

  // デバッグ用ログ
  useEffect(() => {
    console.log('🔍 WalletBalance - Basename data:', { 
      basename, 
      ownedBasename, 
      hasReverseRecord, 
      basenameLoading, 
      walletAddress 
    });
  }, [basename, ownedBasename, hasReverseRecord, basenameLoading, walletAddress]);

  const loadNetworkInfo = async () => {
    if (!walletAddress) return;

    try {
      const info = await walletService.getCurrentNetwork();
      setNetworkInfo(info);
    } catch (error) {
      console.error('Failed to load network info:', error);
    }
  };

  const loadBalance = async () => {
    if (!walletAddress) return;

    setLoading(true);
    try {
      // USDC残高を取得
      const usdcBalance = await walletService.getUSDCBalance(walletAddress);

      // ETH残高を取得  
      const ethBalance = await walletService.getETHBalance(walletAddress);

      setBalance({
        usdc: usdcBalance,
        eth: ethBalance,
        lastUpdated: new Date()
      });
    } catch (error) {
      console.error('Failed to load balance:', error);
      toast({
        title: 'Failed to load balance',
        description: 'Could not retrieve wallet balance',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // 初回読み込み
  useEffect(() => {
    if (walletAddress) {
      loadBalance();
      loadNetworkInfo();
    } else {
      setBalance(null);
      setNetworkInfo(null);
    }
  }, [walletAddress]);

  // 残高更新イベントを監視
  useEffect(() => {
    const unsubscribe = balanceEvents.onBalanceUpdate(() => {
      if (walletAddress) {
        loadBalance();
      }
    });

    return unsubscribe;
  }, [walletAddress]);

  // 10秒ごとに自動更新
  useEffect(() => {
    if (!walletAddress) return;

    const interval = setInterval(() => {
      loadBalance();
    }, 10000); // 10秒

    return () => clearInterval(interval);
  }, [walletAddress]);

  const handleCopyAddress = async () => {
    if (!walletAddress) return;

    try {
      await navigator.clipboard.writeText(walletAddress);
      toast({
        title: 'Address copied!',
        description: 'Wallet address copied to clipboard',
      });
    } catch (error) {
      toast({
        title: 'Failed to copy',
        description: 'Could not copy address to clipboard',
        variant: 'destructive',
      });
    }
  };

  const handleRefresh = () => {
    loadBalance();
  };

  const toggleBalanceVisibility = () => {
    setShowBalance(!showBalance);
  };

  const switchToBaseSepolia = async () => {
    setSwitching(true);
    try {
      await walletService.switchNetwork('base-sepolia');
      toast({
        title: 'Network switched!',
        description: 'Successfully switched to Base Sepolia',
      });
      await loadNetworkInfo();
      await loadBalance();
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
        description: 'Successfully switched to Sepolia Ethereum',
      });
      await loadNetworkInfo();
      await loadBalance();
    } catch (error) {
      console.error('Failed to switch network:', error);
      toast({
        title: 'Failed to switch network',
        description: 'Could not switch to Sepolia Ethereum',
        variant: 'destructive',
      });
    } finally {
      setSwitching(false);
    }
  };

  const formatLastUpdated = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);

    if (diffSeconds < 60) {
      return `${diffSeconds}s ago`;
    } else if (diffSeconds < 3600) {
      const diffMinutes = Math.floor(diffSeconds / 60);
      return `${diffMinutes}m ago`;
    } else {
      const diffHours = Math.floor(diffSeconds / 3600);
      return `${diffHours}h ago`;
    }
  };

  if (!walletAddress) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Wallet Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            <p className="text-sm">Connect wallet to view balance</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Wallet Balance</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleBalanceVisibility}
              className="h-6 w-6 p-0"
            >
              {showBalance ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
              className="h-6 w-6 p-0"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* アドレス表示（Basenameサポート） */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Address</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyAddress}
              className="h-6 w-6 p-0"
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
          <div className="min-h-[40px] flex items-center">
            <BasenameDisplay 
              address={walletAddress} 
              variant="default"
              showCopyButton={false}
              showExternalLink={true}
              className="w-full"
            />
          </div>
          {/* Basename情報表示 */}
          {basename && (
            <div className="text-xs text-green-600 bg-green-50 p-2 rounded border">
              ✅ Basename: {basename}
            </div>
          )}
          {!basename && !basenameLoading && walletAddress && (
            <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded border">
              💡 No Basename found. <a href="https://www.base.org/names" target="_blank" className="underline">Get one here</a>
            </div>
          )}
          {basenameLoading && (
            <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded border">
              🔍 Looking up Basename...
            </div>
          )}
        </div>

        {/* 残高表示 */}
        <div className="space-y-3">
          {/* USDC残高 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">USDC</Badge>
              <span className="text-xs text-muted-foreground">Base</span>
            </div>
            <div className="text-right">
              {loading ? (
                <Skeleton className="h-4 w-16" />
              ) : showBalance && balance ? (
                <div className="font-mono">
                  <div className="font-semibold">${balance.usdc}</div>
                </div>
              ) : (
                <div className="font-mono">****</div>
              )}
            </div>
          </div>

          {/* ETH残高 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">ETH</Badge>
              <span className="text-xs text-muted-foreground">Base</span>
            </div>
            <div className="text-right">
              {loading ? (
                <Skeleton className="h-4 w-16" />
              ) : showBalance && balance ? (
                <div className="font-mono">
                  <div className="font-semibold">{parseFloat(balance.eth).toFixed(4)} ETH</div>
                </div>
              ) : (
                <div className="font-mono">****</div>
              )}
            </div>
          </div>

          {/* Chain ID表示 */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">Chain ID</Badge>
            </div>
            <div className="text-right">
              <div className="font-mono text-sm font-medium">
                {networkInfo?.chainId ? parseInt(networkInfo.chainId, 16) : 'Unknown'}
              </div>
            </div>
          </div>
        </div>

        {/* ネットワーク切り替えボタン */}
        <div className="pt-3 border-t">
          <div className="text-xs text-muted-foreground mb-2">Switch Network</div>
          <div className="flex gap-2">
            <Button
              onClick={switchToBaseSepolia}
              disabled={switching}
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
            >
              {switching ? 'Switching...' : 'Base Sepolia'}
            </Button>
            <Button
              onClick={switchToSepoliaEthereum}
              disabled={switching}
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
            >
              {switching ? 'Switching...' : 'ETH Sepolia'}
            </Button>
          </div>
        </div>

        {/* Basenameまたはアドレス表示 */}
        {walletAddress && (
          <div className="text-xs text-center pt-2 border-t">
            {basename ? (
              <span className="text-blue-600 font-medium">{basename}</span>
            ) : basenameLoading ? (
              <span className="text-gray-400 italic">Loading basename...</span>
            ) : (
              <span className="text-muted-foreground font-mono">
                {`${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}