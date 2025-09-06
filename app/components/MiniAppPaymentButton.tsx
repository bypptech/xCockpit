'use client'

import React, { useState } from 'react';
import { useMiniApp } from './MiniAppProvider';

// Fallback components for environments without shadcn
const Button = ({ children, onClick, disabled, className, ...props }: any) => (
  <button 
    onClick={onClick} 
    disabled={disabled} 
    className={`px-4 py-2 rounded font-medium ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
    {...props}
  >
    {children}
  </button>
);

const useToast = () => ({
  toast: ({ title, description, variant }: any) => {
    console.log(`Toast: ${title} - ${description} (${variant || 'default'})`);
  }
});

// Simple icon components
const Loader2 = ({ className }: { className?: string }) => (
  <span className={`inline-block animate-spin ${className}`}>⟳</span>
);
const Wallet = ({ className }: { className?: string }) => (
  <span className={className}>💰</span>
);
const ExternalLink = ({ className }: { className?: string }) => (
  <span className={className}>🔗</span>
);
// USDC contract address on Base Mainnet
const USDC_CONTRACT_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
// USDC contract address on Base Sepolia for testing
const USDC_CONTRACT_BASE_SEPOLIA = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

// ERC-20 transfer function signature: transfer(address,uint256)
const TRANSFER_FUNCTION_SIGNATURE = '0xa9059cbb';

// Helper function to encode ERC-20 transfer data
function encodeTransferData(to: string, amount: string): string {
  // Remove 0x prefix from address and pad to 32 bytes
  const addressParam = to.slice(2).padStart(64, '0');
  
  // Convert amount to BigInt and then to hex, pad to 32 bytes
  const amountBigInt = BigInt(amount);
  const amountParam = amountBigInt.toString(16).padStart(64, '0');
  
  return `${TRANSFER_FUNCTION_SIGNATURE}${addressParam}${amountParam}`;
}

// Helper function to convert USDC amount (with 6 decimals) to units
function parseUSDCUnits(amount: string): string {
  const amountNum = parseFloat(amount);
  const units = Math.floor(amountNum * 1000000); // 6 decimals for USDC
  return units.toString();
}

interface MiniAppPaymentButtonProps {
  amount: string;
  recipient: string;
  deviceId: string;
  command: string;
  onSuccess?: (txHash: string) => void;
  onError?: (error: any) => void;
  disabled?: boolean;
}

export function MiniAppPaymentButton({
  amount,
  recipient,
  deviceId,
  command,
  onSuccess,
  onError,
  disabled = false
}: MiniAppPaymentButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { isMiniApp, isWalletConnected, sendTransaction, requestWalletConnection, shareCast, openUrl } = useMiniApp();
  const { toast } = useToast();

  const handlePayment = async () => {
    try {
      setIsProcessing(true);

      // Ensure wallet is connected
      if (!isWalletConnected) {
        await requestWalletConnection();
      }

      // Check if we're on the correct network (Base or Base Sepolia)
      const { sdk } = useMiniApp();
      if (!sdk) {
        throw new Error('MiniApp SDK not available');
      }

      const chainId = await sdk.wallet.ethProvider.request({ method: 'eth_chainId' });
      const isBaseMainnet = chainId === '0x2105';
      const isBaseSepolia = chainId === '0x14a34' || chainId === '0x14A34';
      
      if (!isBaseMainnet && !isBaseSepolia) {
        throw new Error('Please switch to Base network to make USDC payments');
      }
      
      // Get current account
      const accounts = await sdk.wallet.ethProvider.request({ method: 'eth_accounts' });
      if (!accounts || accounts.length === 0) {
        throw new Error('No wallet accounts found');
      }
      
      // Use correct USDC contract based on network
      const usdcContract = isBaseMainnet ? USDC_CONTRACT_BASE : USDC_CONTRACT_BASE_SEPOLIA;
      
      // Convert amount to USDC units (6 decimals) and encode transfer data
      const amountInUnits = parseUSDCUnits(amount);
      const transferData = encodeTransferData(recipient, amountInUnits);

      // Send USDC transfer transaction
      const txHash = await sdk.wallet.ethProvider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: accounts[0],
          to: usdcContract,
          data: transferData,
          value: '0x0' // No ETH value for ERC-20 transfer
        }]
      });

      // Share success in Farcaster
      if (isMiniApp) {
        await shareCast(
          `🎯 Just sent ${amount} USDC to control an IoT device! ${command} executed successfully. #Web3IoT #xCockpit`,
          [`https://basescan.org/tx/${txHash}`]
        );
      }

      toast({
        title: "Payment Successful!",
        description: `${command} executed on device ${deviceId}`,
        variant: "default",
      });

      onSuccess?.(txHash);

    } catch (error: any) {
      console.error('MiniApp payment failed:', error);
      
      toast({
        title: "Payment Failed",
        description: error.message || 'Transaction failed to process',
        variant: "destructive",
      });

      onError?.(error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Smart wallet detection and fallback UI
  if (!isMiniApp) {
    return (
      <div className="space-y-2">
        <Button
          onClick={() => {
            // Redirect to app URL that will open in Farcaster for Smart Wallet
            const appUrl = `${window.location.origin}?device=${deviceId}&amount=${amount}&command=${command}`;
            window.open(`https://warpcast.com/~/add-cast-action?actionType=post&name=xCockpit&icon=🚀&postUrl=${encodeURIComponent(appUrl)}`, '_blank');
          }}
          disabled={disabled}
          size="sm"
          className="gap-2 bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700"
        >
          <ExternalLink className="h-4 w-4" />
          Open in Farcaster (Smart Wallet)
        </Button>
        <p className="text-xs text-muted-foreground">
          💡 For MetaMask/WalletConnect, use the main payment button below
        </p>
      </div>
    );
  }

  // In MiniApp but wallet not connected
  if (isMiniApp && !isWalletConnected) {
    return (
      <Button
        onClick={async () => {
          try {
            await requestWalletConnection();
            toast({
              title: "Wallet Connected",
              description: "Smart Wallet connected successfully!",
              variant: "default",
            });
          } catch (error: any) {
            toast({
              title: "Connection Failed", 
              description: error.message || "Failed to connect Smart Wallet",
              variant: "destructive",
            });
          }
        }}
        disabled={disabled}
        size="sm"
        className="gap-2"
      >
        <Wallet className="h-4 w-4" />
        Connect Smart Wallet
      </Button>
    );
  }

  return (
    <Button
      onClick={handlePayment}
      disabled={disabled || isProcessing}
      size="sm"
      className="gap-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
      data-testid={`miniapp-payment-button-${deviceId}`}
    >
      {isProcessing ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : (
        <>
          <Wallet className="h-4 w-4" />
          Pay {amount} USDC
        </>
      )}
    </Button>
  );
}