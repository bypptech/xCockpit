import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import WalletConnection from '@/components/wallet-connection';
import BalanceCard from '@/components/balance-card';
import DeviceCard from '@/components/device-card';
import PaymentModal from '@/components/payment-modal';
import TransactionHistory from '@/components/transaction-history';
import SystemStatus from '@/components/system-status';
import SocialFeatures from '@/components/social-features';
import VideoStream from '@/components/video-stream';
import { useWebSocket } from '@/lib/websocket';
import { walletService } from '@/lib/coinbase-wallet';
import { X402Client } from '@/lib/x402-client';
import { useMiniApp } from '@/providers/MiniAppProvider';
import { useViralSharing } from '@/hooks/use-viral-sharing';
import { type Device } from '@shared/schema';

export default function Dashboard() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [paymentState, setPaymentState] = useState<'idle' | 'checking' | 'payment_required' | 'processing'>('idle');
  const [paymentModalData, setPaymentModalData] = useState<{
    device: Device;
    command: string;
    amount: string;
    recipient: string;
  } | null>(null);
  const [hasSharedFirstUse, setHasSharedFirstUse] = useState(false);

  const { isConnected: wsConnected, lastMessage } = useWebSocket();
  const { user, isFrameReady, setFrameReady, isMiniApp } = useMiniApp();
  const { triggerAutoShare, shareDeviceInteraction } = useViralSharing();

  // Fetch devices
  const { data: devices = [], isLoading } = useQuery({
    queryKey: ['/api/devices'],
    enabled: true,
    select: (fetchedDevices: Device[]) => {
      return fetchedDevices.map(device => {
        if (device.id === 'Smart Gacha #001') {
          return { ...device, name: 'Nagesen Gacha Live' };
        }
        if (device.id === 'Smart Gacha #002') {
          return { ...device, name: 'Gacha Live Demo' };
        }
        return device;
      });
    }
  });

  // Fetch payment history when wallet is connected
  const { data: paymentHistory = [] } = useQuery({
    queryKey: ['/api/payments', walletAddress],
    enabled: !!walletAddress,
    queryFn: async () => {
      if (!walletAddress) return [];

      const response = await fetch(`/api/payments/${walletAddress}`, {
        credentials: 'include'
      });

      // Handle 404 gracefully - user doesn't exist yet
      if (response.status === 404) {
        return [];
      }

      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }

      return response.json();
    }
  });

  useEffect(() => {
    // Initialize Mini App frame
    if (isMiniApp && !isFrameReady) {
      setFrameReady();
    }

    // Check if wallet is already connected
    const currentAccount = walletService.getCurrentAccount();
    if (currentAccount) {
      setWalletAddress(currentAccount);
    }

    // Listen for account changes
    walletService.onAccountsChanged((accounts: string[]) => {
      setWalletAddress(accounts.length > 0 ? accounts[0] : null);
    });
  }, [isMiniApp, isFrameReady, setFrameReady]);

  // Share first use when wallet connects for the first time
  useEffect(() => {
    if (walletAddress && !hasSharedFirstUse && isMiniApp) {
      triggerAutoShare({ type: 'first_use' });
      setHasSharedFirstUse(true);
    }
  }, [walletAddress, hasSharedFirstUse, isMiniApp, triggerAutoShare]);

  const handleWalletConnect = async () => {
    try {
      const accounts = await walletService.connect();
      if (accounts.length > 0) {
        setWalletAddress(accounts[0]);
      }
    } catch (error: any) {
      console.error('Failed to connect wallet:', error);

      // Show user-friendly error messages based on environment
      if (error.name === 'WebViewConnectionError' || error.name === 'WebViewTimeoutError') {
        alert(`⚠️ ウォレット接続エラー\n\n${error.message}\n\nモバイルアプリ内では一部機能が制限される場合があります。`);
      } else if (error.name === 'MobileConnectionError') {
        alert(`📱 モバイル接続エラー\n\n${error.message}\n\nCoinbase Walletアプリをインストールするか、デフォルトブラウザで開いてください。`);
      } else if (error.name === 'MobileNetworkError') {
        alert(`🌐 ネットワークエラー\n\n${error.message}\n\n接続環境を確認してください。`);
      } else {
        alert(`ウォレット接続に失敗しました。\n\nエラー: ${error.message || 'Unknown error'}\n\n再試行してください。`);
      }
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

  const handleDeviceCommand = async (device: Device, command: string) => {
    if (!walletAddress) {
      alert('Please connect your wallet first');
      return;
    }

    setPaymentState('checking');

    try {
      // Phase 1: x402 flow - initial request
      console.log(`🔄 Initiating x402 flow for ${device.name} - ${command}`);
      const result = await X402Client.executeDeviceCommand(device.id, command, walletAddress);

      if (result.success) {
        // Payment not required (already paid or free operation)
        console.log('✅ Command executed successfully:', result.payment);
        setPaymentState('idle');
        alert(`${command} executed successfully!`);

        // Auto-share device interaction success
        if (isMiniApp) {
          triggerAutoShare({
            type: 'device_interaction',
            deviceName: device.name,
            context: command
          });
        }
        return;
      }

      if (result.paymentRequired && result.paymentInfo) {
        // Phase 2: Payment required - show PaymentModal
        console.log('💰 Payment required:', result.paymentInfo);
        setPaymentModalData({
          device,
          command,
          amount: result.paymentInfo.amount,
          recipient: result.paymentInfo.recipient
        });
        setPaymentState('payment_required');
      } else {
        // Error case
        console.error('❌ Device command failed:', result.error);
        alert(result.error || 'Command failed');
        setPaymentState('idle');
      }
    } catch (error) {
      console.error('❌ Device command error:', error);
      alert('Failed to execute command');
      setPaymentState('idle');
    }
  };

  const closePaymentModal = () => {
    setPaymentModalData(null);
    setPaymentState('idle');
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
              <div className="flex items-center">
                <span className="font-bold text-xl text-foreground">xCockpit</span>
              </div>

              {/* Network Status Badge */}
              <div className="flex items-center space-x-2 bg-secondary px-3 py-1 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-secondary-foreground">Base Sepolia</span>
              </div>
            </div>

            <div className="flex items-center space-x-4">
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
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">

          {/* Left Column: Video Stream (2x width) */}
          <div className="xl:col-span-2">
            <VideoStream className="sticky top-4" />
          </div>

          {/* Center Column: Balance & Device Controls */}
          <div className="xl:col-span-2 space-y-6">
            {/* Balance Card - Always visible at the top */}
            <BalanceCard walletAddress={walletAddress} />

            {/* Device Cards */}
            {(devices as Device[]).map((device: Device) => (
              <DeviceCard
                key={device.id}
                device={device}
                onCommand={handleDeviceCommand}
                isWalletConnected={!!walletAddress}
                userSessions={[]}
                data-testid={`device-card-${device.id}`}
              />
            ))}
          </div>

          {/* Right Column: Social, History & Status */}
          <div className="xl:col-span-1 space-y-6">
            {/* Social Features - only show when wallet connected or in Mini App */}
            {(walletAddress || isMiniApp) && (
              <SocialFeatures
                walletAddress={walletAddress}
                totalPayments={paymentHistory.length}
                totalAmount={paymentHistory.reduce((sum: number, p: any) => sum + parseFloat(p.amount || '0'), 0).toFixed(3)}
                deviceInteractions={paymentHistory.length}
              />
            )}

            <TransactionHistory
              transactions={paymentHistory}
              devices={devices as Device[]}
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
          recipient={paymentModalData.recipient}
          walletAddress={walletAddress!}
          onClose={closePaymentModal}
          data-testid="payment-modal"
        />
      )}

    </div>
  );
}