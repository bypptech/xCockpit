'use client';

import { useState, useEffect } from 'react';
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

export function WalletBalance({ walletAddress, className = '' }: WalletBalanceProps) {
  const [balance, setBalance] = useState<BalanceInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [showBalance, setShowBalance] = useState(true);
  const { toast } = useToast();
  const { basename, loading: basenameLoading } = useBasename(walletAddress);

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
    } else {
      setBalance(null);
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
          <BasenameDisplay 
            address={walletAddress} 
            variant="default"
            showCopyButton={false}
            showExternalLink={true}
          />
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
        </div>

        {/* 最終更新時刻 */}
        {balance && (
          <div className="text-xs text-muted-foreground text-center pt-2 border-t">
            Updated {formatLastUpdated(balance.lastUpdated)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}