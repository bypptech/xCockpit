import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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
  setFrameReady: () => void;
  shareCast: (text: string, embeds?: string[]) => Promise<void>;
  viewProfile: (fid: number) => Promise<void>;
  openUrl: (url: string) => Promise<void>;
}

const MiniAppContext = createContext<MiniAppContext | null>(null);

interface MiniAppProviderProps {
  children: ReactNode;
}

export function MiniAppProvider({ children }: MiniAppProviderProps) {
  const [user, setUser] = useState<MiniAppUser | null>(null);
  const [isFrameReady, setIsFrameReady] = useState(false);
  const [isMiniApp, setIsMiniApp] = useState(false);

  useEffect(() => {
    // Detect if running in Mini App environment
    const checkMiniAppEnvironment = () => {
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

      // If in Mini App environment, try to get user context
      if (miniAppDetected) {
        loadMiniAppUser();
      }
    };

    checkMiniAppEnvironment();
  }, []);

  const loadMiniAppUser = async () => {
    try {
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

  const shareCast = async (text: string, embeds?: string[]) => {
    if (!isMiniApp) {
      // Fallback: open Warpcast compose URL
      const url = `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
      return;
    }

    // Try Mini App API
    if (window.parent !== window) {
      window.parent.postMessage({
        type: 'COMPOSE_CAST',
        data: { text, embeds }
      }, '*');
    }
  };

  const viewProfile = async (fid: number) => {
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
    setFrameReady,
    shareCast,
    viewProfile,
    openUrl
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