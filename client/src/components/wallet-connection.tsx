import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { walletService } from '@/lib/coinbase-wallet';

interface WalletConnectionProps {
  walletAddress: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
}

export default function WalletConnection({ walletAddress, onConnect, onDisconnect }: WalletConnectionProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [networkInfo, setNetworkInfo] = useState<{ chainId: string; name: string } | null>(null);

  useEffect(() => {
    if (walletAddress) {
      loadNetworkInfo();
    }
  }, [walletAddress]);

  const loadNetworkInfo = async () => {
    try {
      const network = await walletService.getCurrentNetwork();
      setNetworkInfo(network);
    } catch (error) {
      console.error('Failed to load network info:', error);
    }
  };

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      onConnect();
    } finally {
      setIsLoading(false);
    }
  };

  if (!walletAddress) {
    return (
      <Button 
        onClick={handleConnect}
        disabled={isLoading}
        className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto"
        data-testid="button-connect-wallet"
      >
        <i className="fas fa-wallet mr-2"></i>
        {isLoading ? '接続中...' : 'Connect Wallet'}
      </Button>
    );
  }

  return (
    <div className="flex items-center space-x-3 bg-secondary px-3 py-2 rounded-lg" data-testid="wallet-connected">
      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
      <div className="flex flex-col">
        <span className="text-sm font-medium text-secondary-foreground" data-testid="text-wallet-address">
          {`${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`}
        </span>
        <span className="text-xs text-muted-foreground">
          {networkInfo?.name || 'Loading...'}
        </span>
      </div>
      <button 
        className="text-muted-foreground hover:text-destructive transition-colors"
        onClick={onDisconnect}
        data-testid="button-disconnect-wallet"
        title="Disconnect wallet"
      >
        <i className="fas fa-times"></i>
      </button>
    </div>
  );
}
