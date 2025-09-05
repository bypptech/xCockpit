'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { baseAccountService } from '@/lib/base-account-service';
import { useToast } from '@/hooks/use-toast';
import type { BaseAccountPaymentRequest, BaseAccountPaymentResult } from '@/lib/base-account-service';

interface BaseAccountPaymentButtonProps {
  amount: string;
  recipient: string;
  metadata?: {
    deviceId?: string;
    command?: string;
    userId?: string;
  };
  onSuccess?: (result: BaseAccountPaymentResult) => void;
  onError?: (error: Error) => void;
  className?: string;
  children?: React.ReactNode;
  disabled?: boolean;
  requestPayerInfo?: boolean;
}

export function BaseAccountPaymentButton({
  amount,
  recipient,
  metadata,
  onSuccess,
  onError,
  className,
  children,
  disabled,
  requestPayerInfo = false,
}: BaseAccountPaymentButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'pending' | 'completed' | 'failed'>('idle');
  const { toast } = useToast();

  const handlePayment = async () => {
    try {
      setIsProcessing(true);
      setPaymentStatus('pending');

      const request: BaseAccountPaymentRequest = {
        amount,
        recipient,
        metadata,
      };

      // Add payer info request if needed
      if (requestPayerInfo) {
        request.payerInfo = {
          email: { optional: true },
          name: { optional: true },
        };
      }

      // Create payment
      const result = await baseAccountService.createPayment(request);

      toast({
        title: 'Payment Initiated',
        description: `Processing ${amount} USDC payment...`,
      });

      // Poll for completion
      const finalStatus = await baseAccountService.waitForPaymentCompletion(result.id);

      if (finalStatus.status === 'completed') {
        setPaymentStatus('completed');
        
        toast({
          title: 'Payment Successful',
          description: `Transaction completed: ${finalStatus.transactionHash?.slice(0, 10)}...`,
        });

        if (onSuccess) {
          onSuccess(finalStatus);
        }
      } else {
        throw new Error('Payment failed');
      }

    } catch (error: any) {
      console.error('Payment failed:', error);
      setPaymentStatus('failed');

      toast({
        title: 'Payment Failed',
        description: error.message || 'An error occurred during payment',
        variant: 'destructive',
      });

      if (onError) {
        onError(error);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const getButtonText = () => {
    if (isProcessing) {
      switch (paymentStatus) {
        case 'pending':
          return 'Processing...';
        case 'completed':
          return 'Payment Complete!';
        case 'failed':
          return 'Payment Failed';
        default:
          return 'Processing...';
      }
    }
    return children || `Pay ${amount} USDC`;
  };

  const getButtonVariant = () => {
    switch (paymentStatus) {
      case 'completed':
        return 'default';
      case 'failed':
        return 'destructive';
      default:
        return 'default';
    }
  };

  return (
    <Button
      onClick={handlePayment}
      disabled={disabled || isProcessing}
      className={className}
      variant={getButtonVariant()}
    >
      {isProcessing && (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
      )}
      {getButtonText()}
    </Button>
  );
}