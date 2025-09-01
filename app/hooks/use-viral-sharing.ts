'use client'

import { useState, useCallback } from 'react';
import { useMiniApp } from '../components/MiniAppProvider';

interface ShareableEvent {
  type: 'device_interaction' | 'payment_success' | 'achievement' | 'first_use';
  deviceName?: string;
  amount?: string;
  achievement?: string;
  context?: string;
}

export function useViralSharing() {
  const { shareCast, isMiniApp } = useMiniApp();
  const [isSharing, setIsSharing] = useState(false);

  const shareDeviceInteraction = useCallback(async (deviceName: string, command: string, amount?: string) => {
    setIsSharing(true);
    try {
      const text = amount 
        ? `🎮 Just controlled "${deviceName}" with ${amount} USDC on xCockpit!
        
⚡ Command: ${command}
🤖 IoT + Crypto = Magic
💫 Powered by Base Network

Try controlling IoT devices with crypto! 🚀`
        : `🎮 Successfully controlled "${deviceName}" on xCockpit!
        
⚡ Command: ${command}  
🤖 Web3 IoT control dashboard
🔥 Real devices, real results

Join the future of IoT! 🚀`;

      await shareCast(text, [window.location.origin]);
      return true;
    } catch (error) {
      console.error('Failed to share device interaction:', error);
      return false;
    } finally {
      setIsSharing(false);
    }
  }, [shareCast]);

  const sharePaymentSuccess = useCallback(async (amount: string, deviceName: string) => {
    setIsSharing(true);
    try {
      const text = `💰 Payment successful! ${amount} USDC → "${deviceName}"
      
✅ HTTP 402 Payment Required protocol in action
🔥 xCockpit: Where crypto meets IoT
⚡ Instant, secure, unstoppable

Experience the future! 🚀`;

      await shareCast(text, [window.location.origin]);
      return true;
    } catch (error) {
      console.error('Failed to share payment success:', error);
      return false;
    } finally {
      setIsSharing(false);
    }
  }, [shareCast]);

  const shareAchievement = useCallback(async (achievement: string, context?: string) => {
    setIsSharing(true);
    try {
      const text = `🏆 Achievement Unlocked: ${achievement}
      
🎮 Playing xCockpit - Web3 IoT Dashboard
${context ? `📊 ${context}` : ''}
💎 Building the future, one device at a time

Ready to level up? 🚀`;

      await shareCast(text, [window.location.origin]);
      return true;
    } catch (error) {
      console.error('Failed to share achievement:', error);
      return false;
    } finally {
      setIsSharing(false);
    }
  }, [shareCast]);

  const shareFirstUse = useCallback(async () => {
    setIsSharing(true);
    try {
      const text = `🚀 Just discovered xCockpit!
      
🤖 Control IoT devices with USDC payments
⚡ HTTP 402 Payment Required protocol
🌊 Built on Base for fast, cheap transactions
🎮 Web3 meets real world

This is the future! 🔥`;

      await shareCast(text, [window.location.origin]);
      return true;
    } catch (error) {
      console.error('Failed to share first use:', error);
      return false;
    } finally {
      setIsSharing(false);
    }
  }, [shareCast]);

  const triggerAutoShare = useCallback(async (event: ShareableEvent): Promise<boolean> => {
    // Only auto-share in Mini App context to avoid spam
    if (!isMiniApp) return false;

    switch (event.type) {
      case 'device_interaction':
        if (event.deviceName) {
          return shareDeviceInteraction(event.deviceName, event.context || 'interact', event.amount);
        }
        break;
      
      case 'payment_success':
        if (event.amount && event.deviceName) {
          return sharePaymentSuccess(event.amount, event.deviceName);
        }
        break;
      
      case 'achievement':
        if (event.achievement) {
          return shareAchievement(event.achievement, event.context);
        }
        break;
      
      case 'first_use':
        return shareFirstUse();
      
      default:
        return false;
    }
    
    return false;
  }, [isMiniApp, shareDeviceInteraction, sharePaymentSuccess, shareAchievement, shareFirstUse]);

  const createInviteLink = useCallback((context?: string) => {
    const baseUrl = window.location.origin;
    const params = new URLSearchParams();
    
    if (context) {
      params.set('ref', context);
    }
    
    return `${baseUrl}${params.toString() ? '?' + params.toString() : ''}`;
  }, []);

  const shareInvite = useCallback(async (personalMessage?: string) => {
    setIsSharing(true);
    try {
      const inviteLink = createInviteLink('friend_invite');
      const text = personalMessage || `🎮 Join me on xCockpit!
      
🤖 Control real IoT devices with crypto
💰 USDC payments on Base Network  
⚡ HTTP 402 protocol in action
🔥 The future is here

Let's build together! 🚀`;

      await shareCast(text, [inviteLink]);
      return true;
    } catch (error) {
      console.error('Failed to share invite:', error);
      return false;
    } finally {
      setIsSharing(false);
    }
  }, [shareCast, createInviteLink]);

  return {
    isSharing,
    shareDeviceInteraction,
    sharePaymentSuccess,
    shareAchievement,
    shareFirstUse,
    shareInvite,
    triggerAutoShare,
    createInviteLink,
    isMiniApp
  };
}