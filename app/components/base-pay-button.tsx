'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Transaction,
  TransactionButton,
  TransactionStatus,
  TransactionStatusLabel,
  TransactionStatusAction
} from '@coinbase/onchainkit/transaction';
import { basePayService } from '@/lib/base-pay-service';
import type { BasePayButtonProps, OnchainKitTransaction } from '@/types/base-pay';
import { useToast } from '@/hooks/use-toast';

export function BasePayButton({
  amount,
  recipient,
  currency = 'USDC',
  metadata,
  onSuccess,
  onError,
  disabled,
  className,
  children,
}: BasePayButtonProps) {
  const [transaction, setTransaction] = useState<OnchainKitTransaction | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handlePayment = async () => {
    try {
      setIsProcessing(true);

      // Create the transaction
      const tx = await basePayService.createPayment({
        amount,
        currency,
        recipient,
        metadata,
      });

      setTransaction(tx);

      // Display transaction for debugging
      console.log('Transaction created:', tx);
      
      toast({
        title: 'Transaction Prepared',
        description: `Ready to send ${amount} ${currency}`,
      });

    } catch (error: any) {
      console.error('Failed to create transaction:', error);
      
      toast({
        title: 'Payment Failed',
        description: error.message || 'Failed to create transaction',
        variant: 'destructive',
      });

      if (onError) {
        onError({
          code: 'TRANSACTION_CREATION_FAILED',
          message: error.message,
          details: error,
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTransactionSuccess = (txHash: string) => {
    console.log('Transaction successful:', txHash);
    
    toast({
      title: 'Payment Successful',
      description: `Transaction confirmed: ${txHash.slice(0, 10)}...`,
    });

    if (onSuccess) {
      onSuccess({
        transactionHash: txHash,
        status: 'confirmed',
        timestamp: Date.now(),
        from: '', // Will be filled by actual transaction
        to: recipient,
        amount,
        currency,
        network: 'base-sepolia',
      });
    }
  };

  const handleTransactionError = (error: any) => {
    console.error('Transaction failed:', error);
    
    toast({
      title: 'Transaction Failed',
      description: error.message || 'Transaction could not be completed',
      variant: 'destructive',
    });

    if (onError) {
      onError({
        code: 'TRANSACTION_FAILED',
        message: error.message,
        details: error,
      });
    }
  };

  // If transaction is created, show OnchainKit transaction UI
  if (transaction) {
    return (
      <div className={className}>
        <Transaction
          chainId={transaction.chainId}
          onError={handleTransactionError}
          onSuccess={(response: any) => handleTransactionSuccess(response.transactionHash)}
        >
          <TransactionButton
            text={children || `Pay ${amount} ${currency}`}
            disabled={disabled}
          />
          <TransactionStatus>
            <TransactionStatusLabel />
            <TransactionStatusAction />
          </TransactionStatus>
        </Transaction>
      </div>
    );
  }

  // Otherwise show button to create transaction
  return (
    <Button
      onClick={handlePayment}
      disabled={disabled || isProcessing}
      className={className}
    >
      {isProcessing ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          Preparing...
        </>
      ) : (
        children || `Pay ${amount} ${currency}`
      )}
    </Button>
  );
}