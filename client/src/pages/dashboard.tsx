import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import WalletConnection from '@/components/wallet-connection';
import DeviceCard from '@/components/device-card';
import PaymentModal from '@/components/payment-modal';
import PaymentStatus from '@/components/payment-status';
import TransactionHistory from '@/components/transaction-history';
import SystemStatus from '@/components/system-status';
import { useWebSocket } from '@/lib/websocket';
import { walletService } from '@/lib/coinbase-wallet';
import { type Device } from '@shared/schema';

export default function Dashboard() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [paymentModalData, setPaymentModalData] = useState<{
    device: Device;
    command: string;
    amount: string;
  } | null>(null);
  
  const { isConnected: wsConnected, lastMessage } = useWebSocket();

  // Fetch devices
  const { data: devices = [], isLoading } = useQuery({
    queryKey: ['/api/devices'],
    enabled: true
  });

  // Fetch user data when wallet is connected
  const { data: userData } = useQuery({
    queryKey: ['/api/users', walletAddress],
    enabled: !!walletAddress
  });

  useEffect(() => {
    // Check if wallet is already connected
    const currentAccount = walletService.getCurrentAccount();
    if (currentAccount) {
      setWalletAddress(currentAccount);
    }

    // Listen for account changes
    walletService.onAccountsChanged((accounts: string[]) => {
      setWalletAddress(accounts.length > 0 ? accounts[0] : null);
    });
  }, []);

  const handleWalletConnect = async () => {
    try {
      const accounts = await walletService.connect();
      if (accounts.length > 0) {
        setWalletAddress(accounts[0]);
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  const handleWalletDisconnect = async () => {
    try {
      await walletService.disconnect();
      setWalletAddress(null);
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
    }
  };

  const handleDeviceCommand = (device: Device, command: string) => {
    if (!walletAddress) {
      alert('Please connect your wallet first');
      return;
    }

    const deviceMetadata = device.metadata as { price?: string } | null;
    const amount = deviceMetadata?.price || '10.00';
    setPaymentModalData({ device, command, amount });
  };

  const closePaymentModal = () => {
    setPaymentModalData(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading devices...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <i className="fas fa-microchip text-2xl text-primary"></i>
                <span className="font-bold text-xl text-foreground">IoT Gateway</span>
              </div>
              
              {/* Network Status Badge */}
              <div className="flex items-center space-x-2 bg-secondary px-3 py-1 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-secondary-foreground">Base Sepolia</span>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* WebSocket Status */}
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm text-muted-foreground">WebSocket</span>
              </div>

              {/* Wallet Connection */}
              <WalletConnection
                walletAddress={walletAddress}
                onConnect={handleWalletConnect}
                onDisconnect={handleWalletDisconnect}
                data-testid="wallet-connection"
              />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Device Controls */}
          <div className="lg:col-span-2 space-y-6">
            {(devices as Device[]).map((device: Device) => (
              <DeviceCard
                key={device.id}
                device={device}
                onCommand={handleDeviceCommand}
                isWalletConnected={!!walletAddress}
                userSessions={(userData as any)?.activeSessions || []}
                data-testid={`device-card-${device.id}`}
              />
            ))}
          </div>

          {/* Right Column: Status & History */}
          <div className="space-y-6">
            <PaymentStatus data-testid="payment-status" />
            
            <TransactionHistory 
              transactions={(userData as any)?.paymentHistory || []}
              data-testid="transaction-history"
            />
            
            <SystemStatus
              wsConnected={wsConnected}
              connectedDevices={(devices as Device[]).filter((d: Device) => d.isOnline).length}
              totalDevices={(devices as Device[]).length}
              walletAddress={walletAddress}
              data-testid="system-status"
            />
          </div>
        </div>
      </main>

      {/* Payment Modal */}
      {paymentModalData && (
        <PaymentModal
          device={paymentModalData.device}
          command={paymentModalData.command}
          amount={paymentModalData.amount}
          walletAddress={walletAddress!}
          onClose={closePaymentModal}
          data-testid="payment-modal"
        />
      )}
    </div>
  );
}
