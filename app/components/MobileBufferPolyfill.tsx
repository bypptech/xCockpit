'use client'

import { useEffect } from 'react';

// Mobile browser Buffer polyfill
export function MobileBufferPolyfill() {
  useEffect(() => {
    if (typeof window !== 'undefined' && typeof (window as any).Buffer === 'undefined') {
      console.log('📱 Adding Buffer polyfill for mobile browser');
      (window as any).Buffer = {
        from: (data: string, encoding?: string) => {
          if (encoding === 'base64url') {
            // Convert base64url to base64
            const base64 = data.replace(/-/g, '+').replace(/_/g, '/').padEnd(data.length + (4 - data.length % 4) % 4, '=');
            return {
              toString: (targetEncoding?: string) => {
                if (targetEncoding === 'utf-8') {
                  return decodeURIComponent(escape(atob(base64)));
                }
                return atob(base64);
              }
            };
          }
          return {
            toString: () => data
          };
        }
      };
    }
  }, []);

  return null;
}