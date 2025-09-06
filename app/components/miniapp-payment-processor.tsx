'use client'

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMiniApp } from './MiniAppProvider';
import { useAccount, useBalance } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { CreditCard, Send, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface PaymentRequest {
  amount: string;
  token?: string;
  recipient: string;
  description?: string;
}

interface MiniAppPaymentProcessorProps {
  defaultAmount?: string;
  defaultRecipient?: string;
  tokenSymbol?: string;
  onSuccess?: (txHash: string) => void;
  onError?: (error: string) => void;
}

export function MiniAppPaymentProcessor({
  defaultAmount = "0.001",
  defaultRecipient = "0x742C4B24cFa10D6B0C1DaFb5DE7C23f1F7D65C94",
  tokenSymbol = "ETH",
  onSuccess,
  onError
}: MiniAppPaymentProcessorProps) {
  const { 
    isMiniApp, 
    isWalletConnected, 
    sendTransaction,
    sdk,
    shareCast
  } = useMiniApp();
  
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });
  
  const [payment, setPayment] = useState<PaymentRequest>({
    amount: defaultAmount,
    recipient: defaultRecipient,
    description: "Payment via xCockpit"
  });
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePayment = async () => {
    if (!isConnected && !isWalletConnected) {
      setError('Please connect your wallet first');
      return;
    }

    if (!payment.amount || !payment.recipient) {
      setError('Please fill in all required fields');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setTxHash(null);

    try {
      let txHashResult: string;

      if (isMiniApp && sdk) {
        // Use Farcaster SDK for transaction in mini app environment
        console.log('💰 Processing payment via Farcaster SDK...');
        const valueInWei = parseEther(payment.amount).toString(16);
        
        txHashResult = await sendTransaction(
          payment.recipient,
          `0x${valueInWei}`
        );
        
        console.log('✅ Payment sent via Farcaster SDK:', txHashResult);
      } else {
        // Fallback to standard web3 transaction
        console.log('💳 Processing payment via standard web3...');
        // This would typically use wagmi's useSendTransaction hook
        throw new Error('Standard web3 payment not implemented in this component');
      }

      setTxHash(txHashResult);
      
      if (onSuccess) {
        onSuccess(txHashResult);
      }

      // Share success to Farcaster
      if (isMiniApp) {
        try {
          await shareCast(
            `💰 Just made a payment of ${payment.amount} ${tokenSymbol} via @xCockpit! 🚀\n\nTx: ${txHashResult.slice(0, 10)}...`,
            [`https://basescan.org/tx/${txHashResult}`]
          );
        } catch (shareError) {
          console.warn('Failed to share payment success:', shareError);
        }
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment failed';
      console.error('❌ Payment failed:', err);
      setError(errorMessage);
      
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const isFormValid = payment.amount && payment.recipient && parseFloat(payment.amount) > 0;

  if (txHash) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle className="w-5 h-5" />
            Payment Successful!
          </CardTitle>
          <CardDescription>
            Your transaction has been submitted to the blockchain
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm space-y-2">
            <div><strong>Amount:</strong> {payment.amount} {tokenSymbol}</div>
            <div><strong>To:</strong> {payment.recipient.slice(0, 10)}...</div>
            <div className="font-mono text-xs bg-gray-100 p-2 rounded">
              <strong>Tx Hash:</strong> {txHash.slice(0, 20)}...
            </div>
          </div>
          
          <Button 
            onClick={() => {
              setTxHash(null);
              setPayment({
                amount: defaultAmount,
                recipient: defaultRecipient,
                description: "Payment via xCockpit"
              });
            }}
            variant="outline" 
            className="w-full"
          >
            Make Another Payment
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Send Payment
        </CardTitle>
        <CardDescription>
          {isMiniApp 
            ? 'Send payments securely through Farcaster' 
            : 'Send cryptocurrency payments'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {balance && (
          <div className="text-sm text-gray-600">
            Balance: {formatEther(balance.value)} {balance.symbol}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="amount">Amount ({tokenSymbol})</Label>
          <Input
            id="amount"
            type="number"
            step="0.001"
            value={payment.amount}
            onChange={(e) => setPayment(prev => ({ ...prev, amount: e.target.value }))}
            placeholder="0.001"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="recipient">Recipient Address</Label>
          <Input
            id="recipient"
            value={payment.recipient}
            onChange={(e) => setPayment(prev => ({ ...prev, recipient: e.target.value }))}
            placeholder="0x..."
            className="font-mono text-sm"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description (Optional)</Label>
          <Input
            id="description"
            value={payment.description}
            onChange={(e) => setPayment(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Payment description"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        <Button 
          onClick={handlePayment} 
          disabled={!isFormValid || isProcessing || (!isConnected && !isWalletConnected)}
          className="w-full"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Send Payment
            </>
          )}
        </Button>

        {isMiniApp && (
          <div className="text-xs text-gray-500 text-center">
            Payments are processed securely through Farcaster's mini app environment
          </div>
        )}
      </CardContent>
    </Card>
  );
}