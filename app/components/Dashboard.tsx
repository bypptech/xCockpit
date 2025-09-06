'use client'

import React, { useState, useEffect } from 'react';
import { MiniAppProvider, useMiniApp } from './MiniAppProvider';
import { Providers } from '../providers';
import { GachaFeeCustomizer } from './gacha-fee-customizer';
import { MiniAppWalletConnector } from './miniapp-wallet-connector';
import { MiniAppPaymentProcessor } from './miniapp-payment-processor';

// Simple placeholder components
const SimpleBasenameDisplay = ({ address, className }: { address: string; className?: string }) => (
  <div className={className}>
    {address.slice(0, 6)}...{address.slice(-4)}
  </div>
);

const WalletConnection = ({ walletAddress, onConnect, onDisconnect }: any) => (
  <div className="space-y-3">
    {walletAddress ? (
      <>
        <div className="text-sm text-gray-600">Connected</div>
        <button
          onClick={onDisconnect}
          className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
        >
          Disconnect
        </button>
      </>
    ) : (
      <button
        onClick={onConnect}
        className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
      >
        Connect Wallet
      </button>
    )}
  </div>
);

const WalletBalance = ({ walletAddress, className }: any) => (
  <div className={`rounded-2xl p-6 ${className}`}>
    <h3 className="text-lg font-semibold mb-4">Balance</h3>
    {walletAddress ? (
      <div className="text-2xl font-bold">0.00 USDC</div>
    ) : (
      <div className="text-gray-500">Connect wallet to view balance</div>
    )}
  </div>
);

const SimpleNetworkSwitcher = ({ walletAddress, className }: any) => (
  <div className={`rounded-2xl p-6 ${className}`}>
    <h3 className="text-lg font-semibold mb-4">Network</h3>
    <div className="text-sm text-gray-600">Base Sepolia</div>
  </div>
);

const BasenameSetup = ({ address, onBasenameSet }: any) => null;

// Simplified Device type for demonstration
interface Device {
  id: string;
  name: string;
  type: string;
  description: string;
  commands: string[];
  pricing: Record<string, { amount: string; currency: string; recipient: string }>;
  status: string;
  location: string;
}

function DashboardContent() {
  console.log('🚀 DASHBOARD COMPONENT RENDERING');
  
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [gachaFees, setGachaFees] = useState<{ [deviceId: string]: number }>({});
  const [isPlayingGacha, setIsPlayingGacha] = useState<{ [deviceId: string]: boolean }>({});
  
  // Use MiniApp context for enhanced functionality
  const { 
    isMiniApp, 
    isWalletConnected, 
    user, 
    isFrameReady,
    shareCast 
  } = useMiniApp();
  
  // ウォレットアドレスが変わるたびにログ出力
  useEffect(() => {
    console.log('🎯 DASHBOARD WALLET ADDRESS CHANGED:', walletAddress);
  }, [walletAddress]);

  // Load wallet address on component mount
  useEffect(() => {
    console.log('🔄 DASHBOARD useEffect TRIGGERED - Loading wallet address');
    
    const loadWalletAddress = async () => {
      try {
        // Simulate wallet connection for testing
        const address = null;
        console.log('💰 Dashboard wallet address:', address);
        setWalletAddress(address);
        
        // 開発環境でBasenamesテスト用にテストアドレスを設定
        // ウォレットが接続されていない場合、あなたの実際のアドレスでテスト
        if (!address && process.env.NODE_ENV === 'development') {
          console.log('🧪 Testing with user wallet address for Basename verification');
          // ユーザーの実際のウォレットアドレスでテスト
          setWalletAddress('0xe5e28ce1f8eeae58bf61d1e22fcf9954327bfd1b');
        }

        // Load initial fee data for Smart Gacha devices
        loadGachaFees();
      } catch (error) {
        console.log('No wallet connected');
      }
    };

    console.log('📞 CALLING loadWalletAddress function');
    loadWalletAddress();
  }, []);

  // Load gacha fees on component mount
  useEffect(() => {
    console.log('🔄 LOADING initial gacha fees');
    loadGachaFees();
  }, []);

  // Mock devices data for now - will be replaced with API call
  const devices: Device[] = [
    {
      id: "ESP32_001",
      name: "Smart Gacha #001",
      type: "gacha",
      description: "ESP32-powered gacha machine with servo motor and LED indicators",
      commands: ['play'],
      pricing: {
        play: { amount: "0.01", currency: "USDC", recipient: "0x742d35C4F7c8806FF6e5de0e1e5E93D4b0C4FED7" }
      },
      status: "online",
      location: "Tokyo Maker Space"
    },
    {
      id: "ESP32_002",
      name: "Smart Gacha #002",
      type: "gacha", 
      description: "Second ESP32-powered gacha machine with advanced features",
      commands: ['play'],
      pricing: {
        play: { amount: "0.005", currency: "USDC", recipient: "0x742d35C4F7c8806FF6e5de0e1e5E93D4b0C4FED7" }
      },
      status: "online",
      location: "Tokyo Maker Space"
    }
  ];

  const handleWalletConnect = async () => {
    console.log('🔗 Simulating wallet connection...');
    // Simulate wallet connection with a test address
    const testAddress = '0x742d35C4F7c8806FF6e5de0e1e5E93D4b0C4FED7';
    setWalletAddress(testAddress);
    console.log('💰 Set wallet address to:', testAddress);
  };

  const loadGachaFees = async () => {
    try {
      // Load fees for all gacha devices
      const deviceIds = ['ESP32_001', 'ESP32_002'];
      
      for (const deviceId of deviceIds) {
        console.log(`🔄 Loading fee for ${deviceId}...`);
        try {
          const response = await fetch(`/api/devices/${deviceId}/fee`);
          if (response.ok) {
            const data = await response.json();
            console.log(`✅ Fee data for ${deviceId}:`, data);
            setGachaFees(prev => ({
              ...prev,
              [deviceId]: data.currentFee
            }));
          } else {
            const errorData = await response.json();
            console.warn(`❌ Failed to load fee for ${deviceId}:`, errorData);
            // Set default fee if API call fails
            setGachaFees(prev => ({
              ...prev,
              [deviceId]: deviceId === 'ESP32_001' ? 0.5 : 0.123
            }));
          }
        } catch (fetchError) {
          console.error(`💥 Network error loading fee for ${deviceId}:`, fetchError);
          setGachaFees(prev => ({
            ...prev,
            [deviceId]: deviceId === 'ESP32_001' ? 0.5 : 0.123
          }));
        }
      }
    } catch (error) {
      console.error('💥 Failed to load gacha fees:', error);
      // Set default fees on error
      setGachaFees({
        'ESP32_001': 0.5,
        'ESP32_002': 0.005
      });
    }
  };

  const handleWalletDisconnect = async () => {
    try {
      // Simulate wallet disconnect
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
    alert(`Executing ${command} on ${device.name} - Mini App ready!`);
  };

  // Handle fee change for gacha devices
  const handleFeeChange = async (deviceId: string, newFee: number) => {
    try {
      const response = await fetch(`/api/devices/${deviceId}/fee`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fee: newFee,
          walletAddress: walletAddress
        })
      });

      if (response.ok) {
        setGachaFees(prev => ({
          ...prev,
          [deviceId]: newFee
        }));
        alert(`Fee updated to ${newFee} USDC!`);
      } else {
        const error = await response.json();
        alert(`Failed to update fee: ${error.message}`);
      }
    } catch (error) {
      console.error('Fee update error:', error);
      alert('Failed to update fee. Please try again.');
    }
  };

  // Handle gacha play with custom fee
  const handlePlayGacha = async (deviceId: string, fee: number) => {
    if (!walletAddress) {
      alert('Please connect your wallet first');
      return;
    }

    setIsPlayingGacha(prev => ({
      ...prev,
      [deviceId]: true
    }));

    try {
      // Simulate gacha play
      setTimeout(() => {
        setIsPlayingGacha(prev => ({
          ...prev,
          [deviceId]: false
        }));
        alert(`🎉 Gacha played with ${fee} USDC! Check your rewards!`);
      }, 3000);
    } catch (error) {
      setIsPlayingGacha(prev => ({
        ...prev,
        [deviceId]: false
      }));
      console.error('Gacha play error:', error);
      alert('Failed to play gacha. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            xCockpit
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Web3-Powered IoT Control Dashboard
          </p>
          
          {/* Wallet Address / Basename Display */}
          {walletAddress && (
            <div className="mt-4 flex flex-col items-center gap-2">
              <div className="bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-6 py-3 rounded-lg border border-blue-200 dark:border-blue-700">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Connected Wallet</div>
                <SimpleBasenameDisplay 
                  address={walletAddress}
                  className="text-base font-medium"
                />
              </div>
              
              {/* Debug Info for testing */}
              <div className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded">
                Address: {walletAddress}
              </div>
            </div>
          )}
          
          <div className="mt-4 flex justify-center gap-4">
            <div className={`px-4 py-2 rounded-full text-sm font-medium ${
              isMiniApp 
                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
            }`}>
              {isMiniApp ? '🚀 Farcaster Mini App' : '🌐 Web App'}
            </div>
            
            {user && (
              <div className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 px-4 py-2 rounded-full text-sm font-medium">
                👤 {user.displayName}
              </div>
            )}
            
            {isFrameReady && (
              <div className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 px-4 py-2 rounded-full text-sm font-medium">
                ⚡ Frame Ready
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Wallet & Controls */}
          <div className="lg:col-span-1 space-y-6">
            {/* Enhanced Mini App Wallet Connection */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <MiniAppWalletConnector 
                onConnect={(address) => {
                  setWalletAddress(address);
                  console.log('🎯 Wallet connected via Mini App:', address);
                }}
                onDisconnect={() => {
                  setWalletAddress(null);
                  console.log('🔌 Wallet disconnected');
                }}
                showBalance={true}
              />
            </div>
            
            {/* Wallet Balance Card */}
            <WalletBalance 
              walletAddress={walletAddress}
              className="bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700"
            />

            {/* Network Switcher Card */}
            <SimpleNetworkSwitcher 
              walletAddress={walletAddress}
              className="bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700"
            />

            {/* Enhanced Mini App Payment Processor */}
            {(walletAddress || isWalletConnected) && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <MiniAppPaymentProcessor
                  defaultAmount="0.001"
                  tokenSymbol="ETH"
                  onSuccess={(txHash) => {
                    console.log('💰 Payment successful:', txHash);
                    if (isMiniApp) {
                      shareCast(`🎉 Just made a payment via @xCockpit! Tx: ${txHash.slice(0, 10)}...`);
                    }
                  }}
                  onError={(error) => {
                    console.error('💥 Payment failed:', error);
                  }}
                />
              </div>
            )}
          </div>

          {/* Right Column - Devices */}
          <div className="lg:col-span-2">
            {/* Wallet Info Bar */}
            {walletAddress && (
              <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Active Wallet</div>
                      <SimpleBasenameDisplay 
                        address={walletAddress}
                        className="text-lg font-semibold"
                      />
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Base Sepolia Connected
                  </div>
                </div>
              </div>
            )}
            
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Available Devices
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Control IoT devices with USDC payments via HTTP 402 protocol
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {devices.map((device) => (
                <div key={device.id}>
                  {device.type === 'gacha' && gachaFees[device.id] !== undefined ? (
                    <GachaFeeCustomizer
                      deviceId={device.id}
                      deviceName={device.name}
                      currentFee={gachaFees[device.id]}
                      onFeeChange={(newFee) => handleFeeChange(device.id, newFee)}
                      onPlayGacha={(fee) => handlePlayGacha(device.id, fee)}
                      isPlaying={isPlayingGacha[device.id] || false}
                      walletAddress={walletAddress}
                    />
                  ) : (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
                      <div className="mb-4">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                          {device.name}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                          {device.description}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            device.status === 'online' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                          }`}>
                            {device.status}
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        {device.type === 'gacha' && gachaFees[device.id] === undefined ? (
                          <div className="text-center py-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                            <p className="text-gray-600 dark:text-gray-400">Loading fee settings...</p>
                          </div>
                        ) : (
                          device.commands.map((command) => (
                            <button
                              key={command}
                              onClick={() => handleDeviceCommand(device, command)}
                              disabled={!walletAddress}
                              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
                            >
                              {command.toUpperCase()} - {device.pricing[command]?.amount} {device.pricing[command]?.currency}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>


        {/* Placeholder for Basename Setup Section */}

        {/* Mini App Features */}
        <div className="mt-12 text-center">
          <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-2xl p-8">
            <h3 className="text-xl font-semibold mb-4">🎮 Base Mini App Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              <div>
                <div className="text-2xl mb-2">🤖</div>
                <div className="font-medium">IoT Control</div>
                <div className="text-gray-600 dark:text-gray-400">Real device interaction</div>
              </div>
              <div>
                <div className="text-2xl mb-2">💰</div>
                <div className="font-medium">USDC Payments</div>
                <div className="text-gray-600 dark:text-gray-400">Base network transactions</div>
              </div>
              <div>
                <div className="text-2xl mb-2">🚀</div>
                <div className="font-medium">Social Sharing</div>
                <div className="text-gray-600 dark:text-gray-400">Viral achievement system</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  console.log('📊 DASHBOARD WRAPPER COMPONENT RENDERING');
  return (
    <Providers>
      <MiniAppProvider>
        <DashboardContent />
      </MiniAppProvider>
    </Providers>
  );
}