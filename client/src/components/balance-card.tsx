import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { walletService } from '@/lib/coinbase-wallet';
import { balanceEvents } from '@/lib/balance-events';
import { RefreshCw, Wallet, TrendingUp, TrendingDown, Network } from 'lucide-react';

interface BalanceCardProps {
  walletAddress: string | null;
}

export default function BalanceCard({ walletAddress }: BalanceCardProps) {
  const [usdcBalance, setUsdcBalance] = useState<string>('0.00');
  const [ethBalance, setEthBalance] = useState<string>('0.0000');
  const [previousUsdcBalance, setPreviousUsdcBalance] = useState<string>('0.00');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [networkInfo, setNetworkInfo] = useState<{ chainId: string; name: string } | null>(null);
  const [isSwitchingNetwork, setIsSwitchingNetwork] = useState(false);
  const [walletInfo, setWalletInfo] = useState<{
    address: string | null;
    isSmartWallet: boolean;
    walletType: string;
  } | null>(null);

  useEffect(() => {
    if (walletAddress) {
      loadBalances();
      // Auto-refresh balance every 30 seconds
      const interval = setInterval(() => {
        loadBalances();
      }, 30000);
      
      // Listen for balance update events (e.g., after payment)
      const unsubscribe = balanceEvents.onBalanceUpdate(() => {
        setTimeout(loadBalances, 1000); // Delay to ensure transaction is confirmed
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
      
      console.log('Wallet Info:', wallet);
    } catch (error) {
      console.error('Failed to load balances:', error);
    }
  };

  const handleRefreshBalance = async () => {
    setIsRefreshing(true);
    await loadBalances();
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
            <span>{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
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
                  ${usdcBalance}
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

          {/* Network Info & Controls */}
          <div className="pt-3 border-t border-border/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-muted-foreground">
                  Connected to {currentNetwork.name}
                </span>
              </div>
              <span className="text-xs font-medium text-primary">
                ID: {currentNetwork.chainId}
              </span>
            </div>
            
            {/* Network Switching */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={currentNetwork.name === 'Base Sepolia' ? 'default' : 'outline'}
                onClick={() => handleNetworkSwitch('base-sepolia')}
                disabled={isSwitchingNetwork || currentNetwork.name === 'Base Sepolia'}
                className="text-xs h-7 px-2"
              >
                <Network size={12} className="mr-1" />
                Base Sepolia
                <span className="ml-1 text-[10px] opacity-70">84532</span>
              </Button>
              <Button
                size="sm"
                variant={currentNetwork.name === 'Sepolia Ethereum' ? 'default' : 'outline'}
                onClick={() => handleNetworkSwitch('sepolia-ethereum')}
                disabled={isSwitchingNetwork || currentNetwork.name === 'Sepolia Ethereum'}
                className="text-xs h-7 px-2"
              >
                <Network size={12} className="mr-1" />
                Sepolia ETH
                <span className="ml-1 text-[10px] opacity-70">11155111</span>
              </Button>
            </div>
            
            {/* Wallet Info */}
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex items-center justify-between">
                <span>Wallet Type:</span>
                <span className="font-medium">
                  {walletInfo?.walletType || 'Loading...'}
                  {walletInfo?.isSmartWallet && ' 🔮'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Address:</span>
                <span className="font-mono text-[10px]">
                  {walletAddress.slice(0, 10)}...
                </span>
              </div>
              {walletInfo?.isSmartWallet && (
                <div className="bg-purple-50 dark:bg-purple-900/20 p-2 rounded text-[10px] text-purple-700 dark:text-purple-300">
                  ✨ Smart Wallet detected - Enhanced security features available
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div>
                  <span className="opacity-50">Network:</span>
                  <span className="ml-1 font-medium">{currentNetwork.shortName}</span>
                </div>
                <div>
                  <span className="opacity-50">Chain:</span>
                  <span className="ml-1 font-medium">{currentNetwork.chainId}</span>
                </div>
                <div>
                  <span className="opacity-50">Type:</span>
                  <span className="ml-1 font-medium">
                    {walletInfo?.isSmartWallet ? 'Smart' : 'EOA'}
                  </span>
                </div>
                <div>
                  <span className="opacity-50">Status:</span>
                  <span className="ml-1 font-medium text-green-500">Active</span>
                </div>
              </div>
              <p className="text-[10px] opacity-50">Check console for detailed contract info</p>
            </div>
            
            {/* Smart Wallet Debug Panel */}
            <div className="bg-muted/30 p-3 rounded-lg space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">Debug Panel:</span>
                <button
                  onClick={() => {
                    console.log('🔍 Smart Wallet Debug Info:', {
                      walletInfo,
                      networkInfo,
                      balances: { usdc: usdcBalance, eth: ethBalance },
                      address: walletAddress
                    });
                  }}
                  className="text-primary hover:underline"
                >
                  Log Details
                </button>
              </div>
              <div className="grid grid-cols-1 gap-1 text-[11px] text-muted-foreground">
                <div className="flex justify-between">
                  <span>Smart Wallet:</span>
                  <span className={walletInfo?.isSmartWallet ? 'text-purple-500' : 'text-gray-500'}>
                    {walletInfo?.isSmartWallet ? 'Yes 🔮' : 'No (EOA)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Balance Status:</span>
                  <span className={parseFloat(usdcBalance) > 0 ? 'text-green-500' : 'text-red-500'}>
                    {parseFloat(usdcBalance) > 0 ? 'Has USDC ✅' : 'No USDC ❌'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Network Ready:</span>
                  <span className="text-green-500">Connected ✅</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}