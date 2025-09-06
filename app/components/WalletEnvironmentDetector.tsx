'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useMiniApp } from './MiniAppProvider';

interface WalletEnvironment {
  isSmartWallet: boolean;
  isMetaMask: boolean;
  isCoinbaseWallet: boolean;
  supportedMethods: string[];
  preferredPaymentMethod: 'base_pay' | 'erc20_direct' | 'walletconnect';
  canUseBasePay: boolean;
}

interface WalletEnvironmentContextType {
  environment: WalletEnvironment | null;
  isDetecting: boolean;
  forceRefresh: () => void;
}

const WalletEnvironmentContext = createContext<WalletEnvironmentContextType | null>(null);

export function WalletEnvironmentProvider({ children }: { children: ReactNode }) {
  const [environment, setEnvironment] = useState<WalletEnvironment | null>(null);
  const [isDetecting, setIsDetecting] = useState(true);
  const { isMiniApp, sdk, isWalletConnected } = useMiniApp();

  const detectWalletEnvironment = async () => {
    setIsDetecting(true);
    
    try {
      let detectedEnv: WalletEnvironment = {
        isSmartWallet: false,
        isMetaMask: false,
        isCoinbaseWallet: false,
        supportedMethods: [],
        preferredPaymentMethod: 'walletconnect',
        canUseBasePay: false
      };

      if (isMiniApp && sdk) {
        console.log('🔍 Detecting wallet in MiniApp environment');
        
        try {
          // Check if we have access to the SDK wallet provider
          const accounts = await sdk.wallet.ethProvider.request({ method: 'eth_accounts' });
          const chainId = await sdk.wallet.ethProvider.request({ method: 'eth_chainId' });
          
          // In Farcaster MiniApp, the SDK provider is typically a Smart Wallet
          detectedEnv = {
            isSmartWallet: true,
            isMetaMask: false,
            isCoinbaseWallet: true, // SDK provider is Coinbase-based
            supportedMethods: ['eth_sendTransaction', 'eth_accounts', 'eth_chainId'],
            preferredPaymentMethod: 'base_pay',
            canUseBasePay: true
          };
          
          console.log('✅ Smart Wallet detected in MiniApp', {
            accounts: accounts.length,
            chainId,
            canUseBasePay: true
          });
          
        } catch (error) {
          console.warn('⚠️ Failed to detect wallet in MiniApp:', error);
          // Fallback: suggest opening in browser
          detectedEnv.preferredPaymentMethod = 'walletconnect';
        }
      } else if (typeof window !== 'undefined') {
        console.log('🔍 Detecting wallet in browser environment');
        
        // Check for injected providers
        const ethereum = (window as any).ethereum;
        if (ethereum) {
          // Detect MetaMask
          if (ethereum.isMetaMask) {
            detectedEnv.isMetaMask = true;
            detectedEnv.preferredPaymentMethod = 'erc20_direct';
            detectedEnv.supportedMethods.push('eth_sendTransaction');
            console.log('🦊 MetaMask detected');
          }
          
          // Detect Coinbase Wallet
          if (ethereum.isCoinbaseWallet || ethereum.selectedProvider?.isCoinbaseWallet) {
            detectedEnv.isCoinbaseWallet = true;
            detectedEnv.preferredPaymentMethod = 'base_pay';
            detectedEnv.canUseBasePay = true;
            console.log('🔵 Coinbase Wallet detected');
          }
        }
      }

      setEnvironment(detectedEnv);
      
    } catch (error) {
      console.error('❌ Wallet environment detection failed:', error);
      setEnvironment({
        isSmartWallet: false,
        isMetaMask: false,
        isCoinbaseWallet: false,
        supportedMethods: [],
        preferredPaymentMethod: 'walletconnect',
        canUseBasePay: false
      });
    } finally {
      setIsDetecting(false);
    }
  };

  useEffect(() => {
    detectWalletEnvironment();
  }, [isMiniApp, sdk, isWalletConnected]);

  const forceRefresh = () => {
    detectWalletEnvironment();
  };

  return (
    <WalletEnvironmentContext.Provider value={{ environment, isDetecting, forceRefresh }}>
      {children}
    </WalletEnvironmentContext.Provider>
  );
}

export function useWalletEnvironment() {
  const context = useContext(WalletEnvironmentContext);
  if (!context) {
    throw new Error('useWalletEnvironment must be used within WalletEnvironmentProvider');
  }
  return context;
}