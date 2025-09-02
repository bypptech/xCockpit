'use client'

import { useState, useEffect } from 'react';
import { MiniAppProvider } from './MiniAppProvider';
import { Providers } from '../providers';
import { SimpleBasenameDisplay } from '@/components/basename-display';
import WalletConnection from '@/components/wallet-connection';
import { WalletBalance } from '@/components/wallet-balance';
import { SimpleNetworkSwitcher } from '@/components/simple-network-switcher';
import { walletService } from '@/lib/coinbase-wallet';

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
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  // Load wallet address on component mount
  useEffect(() => {
    const loadWalletAddress = async () => {
      try {
        const address = walletService.getCurrentAccount();
        setWalletAddress(address);
      } catch (error) {
        console.log('No wallet connected');
      }
    };

    loadWalletAddress();
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
    try {
      const accounts = await walletService.connect();
      setWalletAddress(accounts[0] || null);
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

  const handleDeviceCommand = async (device: Device, command: string) => {
    if (!walletAddress) {
      alert('Please connect your wallet first');
      return;
    }
    alert(`Executing ${command} on ${device.name} - Mini App ready!`);
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
          <div className="mt-4 flex justify-center">
            <div className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-4 py-2 rounded-full text-sm font-medium">
              🚀 Mini App Enabled
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Wallet & Controls */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4">Wallet Connection</h3>
              <WalletConnection 
                walletAddress={walletAddress}
                onConnect={handleWalletConnect}
                onDisconnect={handleWalletDisconnect}
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
          </div>

          {/* Right Column - Devices */}
          <div className="lg:col-span-2">
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
                <div key={device.id} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
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
                    {device.commands.map((command) => (
                      <button
                        key={command}
                        onClick={() => handleDeviceCommand(device, command)}
                        disabled={!walletAddress}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
                      >
                        {command.toUpperCase()} - {device.pricing[command]?.amount} {device.pricing[command]?.currency}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

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
  return (
    <Providers>
      <MiniAppProvider>
        <DashboardContent />
      </MiniAppProvider>
    </Providers>
  );
}