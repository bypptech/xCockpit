import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { walletService } from '@/lib/coinbase-wallet';

interface WalletConnectionProps {
  walletAddress: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
}

export default function WalletConnection({ walletAddress, onConnect, onDisconnect }: WalletConnectionProps) {
  const [usdcBalance, setUsdcBalance] = useState<string>('0.00');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (walletAddress) {
      loadBalance();
    }
  }, [walletAddress]);

  const loadBalance = async () => {
    if (!walletAddress) return;
    
    try {
      const balance = await walletService.getUSDCBalance(walletAddress);
      setUsdcBalance(balance);
    } catch (error) {
      console.error('Failed to load USDC balance:', error);
    }
  };

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      await onConnect();
    } finally {
      setIsLoading(false);
    }
  };

  if (!walletAddress) {
    return (
      <Button 
        onClick={handleConnect}
        disabled={isLoading}
        className="bg-primary hover:bg-primary/90 text-primary-foreground"
        data-testid="button-connect-wallet"
      >
        <i className="fas fa-wallet mr-2"></i>
        {isLoading ? 'Connecting...' : 'Connect Wallet'}
      </Button>
    );
  }

  return (
    <div className="flex items-center space-x-3 bg-secondary px-4 py-2 rounded-lg" data-testid="wallet-connected">
      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
      <div className="flex flex-col">
        <span className="text-sm font-medium text-secondary-foreground" data-testid="text-wallet-address">
          {`${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`}
        </span>
        <span className="text-xs text-muted-foreground" data-testid="text-usdc-balance">
          {usdcBalance} USDC
        </span>
      </div>
      <button 
        className="text-muted-foreground hover:text-foreground"
        onClick={onDisconnect}
        data-testid="button-disconnect-wallet"
      >
        <i className="fas fa-times"></i>
      </button>
    </div>
  );
}
