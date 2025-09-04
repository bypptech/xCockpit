import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { walletService } from '@/lib/coinbase-wallet';
import { balanceEvents } from '@/lib/balance-events';
import { RefreshCw, Wallet, TrendingUp, TrendingDown, Network } from 'lucide-react';
import { BasenameDisplay } from '@/components/basename-display';
// import { BasenameSetup } from '@/components/basename-setup';
// import { useBasename } from '@/hooks/use-basenames';

interface BalanceCardProps {
  walletAddress: string | null;
}

export default function BalanceCard({ walletAddress }: BalanceCardProps) {
  const [usdcBalance, setUsdcBalance] = useState<string>('0.0000');
  const [ethBalance, setEthBalance] = useState<string>('0.0000');
  const [previousUsdcBalance, setPreviousUsdcBalance] = useState<string>('0.0000');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [networkInfo, setNetworkInfo] = useState<{ chainId: string; name: string } | null>(null);
  const [isSwitchingNetwork, setIsSwitchingNetwork] = useState(false);
  const [walletInfo, setWalletInfo] = useState<{
    address: string | null;
    isSmartWallet: boolean;
    walletType: string;
  } | null>(null);

  // Basename hook for displaying .base.eth names
  // Temporarily commented out to debug React Hook error
  const basename = null;
  const ownedBasename = null;
  const hasReverseRecord = false;
  const basenameLoading = false;

  // const { 
  //   basename, 
  //   ownedBasename, 
  //   hasReverseRecord, 
  //   loading: basenameLoading 
  // } = useBasename(walletAddress);

  console.log('🎯 BalanceCard - Basename Hook Result:', { 
    basename, 
    ownedBasename, 
    hasReverseRecord, 
    basenameLoading, 
    walletAddress 
  });

  useEffect(() => {
    if (walletAddress) {
      loadBalances();
      // Auto-refresh balance every 30 seconds
      const interval = setInterval(() => {
        loadBalances();
      }, 30000);

      // Listen for balance update events (e.g., after payment)
      const unsubscribe = balanceEvents.onBalanceUpdate(() => {
        console.log('🔄 Balance update event triggered - refreshing balances...');
        // Multiple attempts to ensure balance is updated on Base Sepolia (84532)
        setTimeout(loadBalances, 500);    // 0.5 seconds
        setTimeout(loadBalances, 1500);   // 1.5 seconds  
        setTimeout(loadBalances, 3000);   // 3 seconds
        setTimeout(loadBalances, 6000);   // 6 seconds
        setTimeout(loadBalances, 12000);  // 12 seconds
      });

      return () => {
        clearInterval(interval);
        unsubscribe();
      };
    }
  }, [walletAddress]);

  const loadBalances = async () => {
    if (!walletAddress) return;

    try {
      const [usdc, eth, network, wallet] = await Promise.all([
        walletService.getUSDCBalance(walletAddress),
        walletService.getETHBalance(walletAddress),
        walletService.getCurrentNetwork(),
        walletService.getWalletInfo()
      ]);

      setPreviousUsdcBalance(usdcBalance);
      setUsdcBalance(usdc);
      setEthBalance(eth);
      setNetworkInfo(network);
      setWalletInfo(wallet);
      setLastUpdated(new Date());

      console.log('💰 Balance Update:', {
        walletAddress,
        usdcBalance: usdc,
        ethBalance: eth,
        network: network.name,
        chainId: network.chainId,
        walletInfo: wallet
      });
    } catch (error) {
      console.error('Failed to load balances:', error);
    }
  };

  const handleRefreshBalance = async () => {
    setIsRefreshing(true);
    console.log('🔄 Manual refresh triggered for chain 84532 (Base Sepolia)');
    await loadBalances();
    // Force balance events to trigger for any listeners
    balanceEvents.triggerBalanceUpdate();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleNetworkSwitch = async (network: 'base-sepolia' | 'sepolia-ethereum') => {
    setIsSwitchingNetwork(true);
    try {
      await walletService.switchNetwork(network);
      await loadBalances(); // Refresh balances after network switch
    } catch (error) {
      console.error('Failed to switch network:', error);
    } finally {
      setIsSwitchingNetwork(false);
    }
  };

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  const getBalanceChange = () => {
    const current = parseFloat(usdcBalance);
    const previous = parseFloat(previousUsdcBalance);
    if (current > previous) return 'increase';
    if (current < previous) return 'decrease';
    return 'same';
  };

  const hasInsufficientGas = () => {
    const ethAmount = parseFloat(ethBalance);
    return ethAmount < 0.001; // Warning if less than 0.001 ETH
  };

  const getNetworkInfo = () => {
    if (!networkInfo?.chainId) return { name: 'Unknown', chainId: 'Unknown', shortName: 'Unknown' };

    const chainMap: Record<string, { name: string; shortName: string; chainId: string }> = {
      '0x14a34': { name: 'Base Sepolia', shortName: 'Base Sep', chainId: '84532' },
      '0x14A34': { name: 'Base Sepolia', shortName: 'Base Sep', chainId: '84532' },
      '0xaa36a7': { name: 'Sepolia Ethereum', shortName: 'ETH Sep', chainId: '11155111' },
      '0xAA36A7': { name: 'Sepolia Ethereum', shortName: 'ETH Sep', chainId: '11155111' },
      '0x2105': { name: 'Base Mainnet', shortName: 'Base', chainId: '8453' },
      '0x1': { name: 'Ethereum Mainnet', shortName: 'Ethereum', chainId: '1' },
    };

    return chainMap[networkInfo.chainId] || { 
      name: networkInfo.name, 
      shortName: networkInfo.name.slice(0, 8), 
      chainId: networkInfo.chainId 
    };
  };

  if (!walletAddress) {
    return (
      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Wallet Balance
            </span>
          </CardTitle>
          <CardDescription>Connect your wallet to view balance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-2">
            <div className="text-center py-8 text-muted-foreground">
              <Wallet className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No wallet connected</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const balanceChange = getBalanceChange();
  const currentNetwork = getNetworkInfo();

  return (
    <Card className="bg-card border-border/50 hover:border-primary/50 transition-colors">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            <span>Wallet Balance</span>
            {walletInfo?.isSmartWallet && (
              <span className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 px-2 py-0.5 rounded-full">
                Smart
              </span>
            )}
          </div>
          <button
            onClick={handleRefreshBalance}
            className="text-muted-foreground hover:text-primary transition-all duration-200 hover:scale-110"
            title="Refresh balances"
            disabled={isRefreshing}
          >
            <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </CardTitle>
        <CardDescription className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BasenameDisplay 
              address={walletAddress || ''} 
              variant="inline"
              className="text-sm font-medium"
            />
            {walletInfo?.walletType && (
              <span className="text-xs text-muted-foreground">
                ({walletInfo.walletType})
              </span>
            )}
          </div>
          <span className="text-xs">Updated {formatTimeAgo(lastUpdated)}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* USDC Balance */}
          <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-muted-foreground">USDC Balance</span>
                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                  {currentNetwork.shortName}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-primary">
                  ${parseFloat(usdcBalance).toFixed(4)}
                </span>
                {balanceChange === 'increase' && (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                )}
                {balanceChange === 'decrease' && (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-xs text-muted-foreground">Chain ID</span>
              <span className="text-sm font-medium text-primary">
                {currentNetwork.chainId}
              </span>
              <span className="text-xs text-green-500 mt-1">Available</span>
            </div>
          </div>

          {/* ETH Balance */}
          <div className={`flex items-center justify-between p-3 rounded-lg ${hasInsufficientGas() ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' : 'bg-secondary'}`}>
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-muted-foreground">ETH Balance</span>
                <span className="text-xs bg-secondary-foreground/20 text-secondary-foreground px-2 py-0.5 rounded-full">
                  {currentNetwork.shortName}
                </span>
                {hasInsufficientGas() && (
                  <span className="text-xs bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 px-2 py-0.5 rounded-full">
                    Low Gas
                  </span>
                )}
              </div>
              <span className={`text-lg font-semibold ${hasInsufficientGas() ? 'text-red-600 dark:text-red-400' : 'text-secondary-foreground'}`}>
                {ethBalance} ETH
              </span>
              {hasInsufficientGas() && (
                <span className="text-xs text-red-600 dark:text-red-400 mt-1">
                  ⚠️ Need ETH for gas fees
                </span>
              )}
            </div>
            <div className="flex flex-col items-end">
              <span className="text-xs text-muted-foreground">Chain ID</span>
              <span className="text-sm font-medium text-secondary-foreground">
                {currentNetwork.chainId}
              </span>
              <span className="text-xs text-muted-foreground mt-1">Gas fees</span>
              {hasInsufficientGas() && (
                <a 
                  href="https://blog.thirdweb.com/faucet-guides/how-to-get-free-sepolia-ether-eth-from-base-sepolia-testnet-faucet-3/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1"
                >
                  Get Testnet ETH
                </a>
              )}
            </div>
          </div>

          </div>
      </CardContent>
    </Card>
  );
}