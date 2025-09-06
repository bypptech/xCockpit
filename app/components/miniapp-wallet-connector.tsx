'use client'

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useMiniApp } from './MiniAppProvider';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { Wallet, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface MiniAppWalletConnectorProps {
  onConnect?: (address: string) => void;
  onDisconnect?: () => void;
  showBalance?: boolean;
}

export function MiniAppWalletConnector({ 
  onConnect, 
  onDisconnect, 
  showBalance = true 
}: MiniAppWalletConnectorProps) {
  const { 
    isMiniApp, 
    isWalletConnected, 
    requestWalletConnection,
    sdk
  } = useMiniApp();
  
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    if (isConnected && address && onConnect) {
      onConnect(address);
    }
  }, [isConnected, address, onConnect]);

  const handleConnect = async () => {
    setIsConnecting(true);
    setConnectionError(null);

    try {
      if (isMiniApp && sdk) {
        // Use Farcaster SDK for wallet connection in mini app environment
        console.log('🎯 Connecting wallet via Farcaster SDK...');
        await requestWalletConnection();
        console.log('✅ Farcaster SDK wallet connected');
      } else {
        // Fallback to standard wagmi connection
        console.log('🔗 Connecting wallet via wagmi...');
        const injectedConnector = connectors.find(c => c.id === 'injected');
        if (injectedConnector) {
          connect({ connector: injectedConnector });
        } else if (connectors.length > 0) {
          connect({ connector: connectors[0] });
        }
      }
    } catch (error) {
      console.error('❌ Wallet connection failed:', error);
      setConnectionError(error instanceof Error ? error.message : 'Connection failed');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    if (onDisconnect) {
      onDisconnect();
    }
  };

  if (isConnected) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            Wallet Connected
          </CardTitle>
          <CardDescription>
            {isMiniApp ? 'Connected via Farcaster' : 'Connected via Web3'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="font-mono text-sm bg-gray-100 p-2 rounded">
            {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Unknown'}
          </div>
          
          {showBalance && (
            <div className="text-sm text-gray-600">
              Balance information will be displayed here
            </div>
          )}
          
          <Button 
            onClick={handleDisconnect} 
            variant="outline" 
            className="w-full"
          >
            Disconnect
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="w-5 h-5" />
          Connect Wallet
        </CardTitle>
        <CardDescription>
          {isMiniApp 
            ? 'Connect your wallet securely through Farcaster' 
            : 'Connect your wallet to continue'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {connectionError && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-700">{connectionError}</span>
          </div>
        )}

        <Button 
          onClick={handleConnect} 
          disabled={isConnecting || isPending}
          className="w-full"
        >
          {(isConnecting || isPending) ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Wallet className="w-4 h-4 mr-2" />
              {isMiniApp ? 'Connect via Farcaster' : 'Connect Wallet'}
            </>
          )}
        </Button>

        {isMiniApp && (
          <div className="text-xs text-gray-500 text-center">
            Wallet connection is handled securely through Farcaster's mini app environment
          </div>
        )}
      </CardContent>
    </Card>
  );
}