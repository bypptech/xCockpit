'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import MiniKit from '@farcaster/miniapp-sdk';

// MiniApp context types
interface MiniAppUser {
  fid: number;
  username: string;
  displayName: string;
  pfpUrl?: string;
  profile?: {
    bio?: string;
    location?: string;
  };
}

interface MiniAppContext {
  user: MiniAppUser | null;
  isFrameReady: boolean;
  isMiniApp: boolean;
  sdk: typeof MiniKit | null;
  isWalletConnected: boolean;
  setFrameReady: () => void;
  shareCast: (text: string, embeds?: string[]) => Promise<void>;
  viewProfile: (fid: number) => Promise<void>;
  openUrl: (url: string) => Promise<void>;
  requestWalletConnection: () => Promise<void>;
  sendTransaction: (to: string, value: string, data?: string) => Promise<string>;
}

const MiniAppContext = createContext<MiniAppContext | null>(null);

interface MiniAppProviderProps {
  children: ReactNode;
}

export function MiniAppProvider({ children }: MiniAppProviderProps) {
  const [user, setUser] = useState<MiniAppUser | null>(null);
  const [isFrameReady, setIsFrameReady] = useState(false);
  const [isMiniApp, setIsMiniApp] = useState(false);
  const [sdk, setSdk] = useState<typeof MiniKit | null>(null);
  const [isWalletConnected, setIsWalletConnected] = useState(false);

  useEffect(() => {
    // Initialize Farcaster SDK and detect environment
    const initializeMiniApp = async () => {
      try {
        // Check for Mini App specific properties
        const userAgent = navigator.userAgent;
        const isInWebView = /wv|WebView/i.test(userAgent);
        const hasParentWindow = window.parent !== window;
        const hasMiniAppIndicators = window.location.search.includes('frame=') || 
                                     window.location.search.includes('miniapp=') ||
                                     document.referrer.includes('warpcast.com') ||
                                     document.referrer.includes('base.org');
        
        const miniAppDetected = isInWebView || hasParentWindow || hasMiniAppIndicators;
        setIsMiniApp(miniAppDetected);
        
        console.log('Mini App Environment Detection:', {
          userAgent,
          isInWebView,
          hasParentWindow,
          hasMiniAppIndicators,
          miniAppDetected,
          referrer: document.referrer
        });

        // Initialize Farcaster SDK if in mini app environment
        if (miniAppDetected) {
          try {
            setSdk(MiniKit);

            // Call ready() to notify Farcaster that the mini app is ready
            await MiniKit.actions.ready();
            setIsFrameReady(true);
            
            console.log('🎯 Farcaster SDK initialized and ready');

            // Try to get user context
            loadMiniAppUser();
            
            // Check wallet connection
            checkWalletConnection();
          } catch (sdkError) {
            console.warn('🔧 Farcaster SDK initialization failed (fallback mode):', sdkError);
            // Continue with basic functionality
            loadMiniAppUser();
          }
        }
      } catch (error) {
        console.error('❌ Mini App initialization failed:', error);
      }
    };

    initializeMiniApp();
  }, []);

  const checkWalletConnection = async () => {
    if (sdk && isMiniApp) {
      try {
        // Check if wallet is connected via SDK - using ethProvider
        const accounts = await sdk.wallet.ethProvider.request({ method: 'eth_accounts' });
        const connected = accounts && accounts.length > 0;
        setIsWalletConnected(connected);
        console.log('🔗 Wallet connection status:', connected);
      } catch (error) {
        console.warn('Failed to check wallet connection:', error);
        setIsWalletConnected(false);
      }
    }
  };

  const loadMiniAppUser = async () => {
    try {
      // Try SDK context first if available
      if (sdk && isMiniApp) {
        try {
          const context = await sdk.context;
          if (context?.user) {
            setUser({
              fid: context.user.fid,
              username: context.user.username || `user_${context.user.fid}`,
              displayName: context.user.displayName || context.user.username || `User ${context.user.fid}`,
              pfpUrl: context.user.pfpUrl
            });
            console.log('🎯 Got user from SDK context:', context.user);
            return;
          }
        } catch (sdkError) {
          console.warn('Failed to get user from SDK, trying fallback methods:', sdkError);
        }
      }

      // Try to get user from URL parameters first (common in frames)
      const urlParams = new URLSearchParams(window.location.search);
      const fid = urlParams.get('fid');
      const username = urlParams.get('username');
      
      if (fid && username) {
        setUser({
          fid: parseInt(fid),
          username,
          displayName: username,
          pfpUrl: urlParams.get('pfp') || undefined
        });
        return;
      }

      // Try to get user from postMessage API (if available)
      if (window.parent !== window) {
        window.parent.postMessage({ type: 'GET_USER_CONTEXT' }, '*');
        
        const handleMessage = (event: MessageEvent) => {
          if (event.data.type === 'USER_CONTEXT' && event.data.user) {
            setUser(event.data.user);
            window.removeEventListener('message', handleMessage);
          }
        };
        
        window.addEventListener('message', handleMessage);
        
        // Clean up listener after timeout
        setTimeout(() => {
          window.removeEventListener('message', handleMessage);
        }, 5000);
      }
    } catch (error) {
      console.warn('Failed to load Mini App user context:', error);
    }
  };

  const setFrameReady = () => {
    setIsFrameReady(true);
    
    // Notify parent frame that app is ready
    if (isMiniApp && window.parent !== window) {
      window.parent.postMessage({ type: 'FRAME_READY' }, '*');
    }
  };

  const requestWalletConnection = async () => {
    if (sdk && isMiniApp) {
      try {
        // Request wallet connection via ethProvider
        const accounts = await sdk.wallet.ethProvider.request({ method: 'eth_requestAccounts' });
        setIsWalletConnected(accounts && accounts.length > 0);
        console.log('🔗 Wallet connected via SDK');
      } catch (error) {
        console.error('Failed to connect wallet via SDK:', error);
        throw error;
      }
    } else {
      throw new Error('SDK not available or not in mini app environment');
    }
  };

  const sendTransaction = async (to: string, value: string, data?: string) => {
    if (!sdk || !isMiniApp) {
      throw new Error('SDK not available or not in mini app environment');
    }

    if (!isWalletConnected) {
      await requestWalletConnection();
    }

    try {
      const txHash = await sdk.wallet.ethProvider.request({
        method: 'eth_sendTransaction',
        params: [{
          to: to as `0x${string}`,
          value: value as `0x${string}`,
          data: (data || '0x') as `0x${string}`
        }]
      });
      console.log('💰 Transaction sent:', txHash);
      return txHash;
    } catch (error) {
      console.error('Transaction failed:', error);
      throw error;
    }
  };

  const shareCast = async (text: string, embeds?: string[]) => {
    if (sdk && isMiniApp) {
      try {
        // Use composeCast action which is available in the SDK
        await sdk.actions.composeCast({ text, embeds: (embeds || []).slice(0, 2) as [] | [string] | [string, string] });
        console.log('📤 Cast shared via SDK');
        return;
      } catch (error) {
        console.warn('Failed to share cast via SDK, using fallback:', error);
      }
    }

    if (!isMiniApp) {
      // Fallback: open Warpcast compose URL
      const url = `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
      return;
    }

    // Try postMessage API
    if (window.parent !== window) {
      window.parent.postMessage({
        type: 'COMPOSE_CAST',
        data: { text, embeds }
      }, '*');
    }
  };

  const viewProfile = async (fid: number) => {
    if (sdk && isMiniApp) {
      try {
        // Use openUrl to navigate to profile for now
        await sdk.actions.openUrl(`https://warpcast.com/profile/${fid}`);
        console.log('👤 Profile opened via SDK:', fid);
        return;
      } catch (error) {
        console.warn('Failed to open profile via SDK, using fallback:', error);
      }
    }

    if (!isMiniApp) {
      // Fallback: open Warpcast profile URL
      const url = `https://warpcast.com/profile/${fid}`;
      window.open(url, '_blank');
      return;
    }

    if (window.parent !== window) {
      window.parent.postMessage({
        type: 'VIEW_PROFILE',
        data: { fid }
      }, '*');
    }
  };

  const openUrl = async (url: string) => {
    if (sdk && isMiniApp) {
      try {
        await sdk.actions.openUrl(url);
        console.log('🔗 URL opened via SDK:', url);
        return;
      } catch (error) {
        console.warn('Failed to open URL via SDK, using fallback:', error);
      }
    }

    if (!isMiniApp) {
      window.open(url, '_blank');
      return;
    }

    if (window.parent !== window) {
      window.parent.postMessage({
        type: 'OPEN_URL',
        data: { url }
      }, '*');
    }
  };

  const value: MiniAppContext = {
    user,
    isFrameReady,
    isMiniApp,
    sdk,
    isWalletConnected,
    setFrameReady,
    shareCast,
    viewProfile,
    openUrl,
    requestWalletConnection,
    sendTransaction
  };

  return (
    <MiniAppContext.Provider value={value}>
      {children}
    </MiniAppContext.Provider>
  );
}

export function useMiniApp() {
  const context = useContext(MiniAppContext);
  if (!context) {
    throw new Error('useMiniApp must be used within a MiniAppProvider');
  }
  return context;
}