'use client'

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useMiniApp } from './MiniAppProvider';
import { Loader2, Wallet, ExternalLink } from 'lucide-react';
import { encodeFunctionData, parseUnits } from 'viem';

// USDC contract address on Base Mainnet
const USDC_CONTRACT_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
// USDC contract address on Base Sepolia for testing
const USDC_CONTRACT_BASE_SEPOLIA = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

// ERC-20 transfer function ABI
const TRANSFER_ABI = {
  name: 'transfer',
  type: 'function',
  inputs: [
    { name: 'to', type: 'address' },
    { name: 'amount', type: 'uint256' }
  ]
} as const;

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
  const { isMiniApp, isWalletConnected, sendTransaction, requestWalletConnection, shareCast } = useMiniApp();
  const { toast } = useToast();

  const handlePayment = async () => {
    try {
      setIsProcessing(true);

      // Ensure wallet is connected
      if (!isWalletConnected) {
        await requestWalletConnection();
      }

      // Check if we're on the correct network (Base or Base Sepolia)
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
      
      // Convert amount to USDC units (6 decimals)
      const amountInUnits = parseUnits(amount, 6);
      
      // Encode ERC-20 transfer function call
      const transferData = encodeFunctionData({
        abi: [TRANSFER_ABI],
        functionName: 'transfer',
        args: [recipient as `0x${string}`, amountInUnits]
      });

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

  // Fallback for non-miniapp environments
  if (!isMiniApp) {
    return (
      <Button
        onClick={() => {
          toast({
            title: "Mini App Required",
            description: "This payment method is optimized for Farcaster Mini Apps",
            variant: "default",
          });
        }}
        disabled={disabled}
        size="sm"
        className="gap-2"
      >
        <ExternalLink className="h-4 w-4" />
        Open in Farcaster
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