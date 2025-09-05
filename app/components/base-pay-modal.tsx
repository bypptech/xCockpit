'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BasePayButton } from './base-pay-button';
import { BasenameDisplay } from '@/components/basename-display';
import type { BasePayModalProps, PaymentResult, PaymentError } from '@/types/base-pay';
import { useToast } from '@/hooks/use-toast';
import { balanceEvents } from '@/lib/balance-events';
import { useQueryClient } from '@tanstack/react-query';
import { useMiniApp } from '@/providers/MiniAppProvider';
import { useViralSharing } from '@/hooks/use-viral-sharing';

export function BasePayModal({
  isOpen,
  onClose,
  amount,
  recipient,
  currency = 'USDC',
  metadata,
  onSuccess,
  onError,
}: BasePayModalProps) {
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'completed' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isMiniApp } = useMiniApp();
  const { triggerAutoShare } = useViralSharing();

  useEffect(() => {
    if (isOpen) {
      setPaymentStatus('idle');
      setStatusMessage('');
    }
  }, [isOpen]);

  const handlePaymentSuccess = (result: PaymentResult) => {
    setPaymentStatus('completed');
    setStatusMessage('Payment completed successfully!');

    // Update balance
    balanceEvents.triggerBalanceUpdate();

    // Invalidate queries
    if (metadata?.userId) {
      queryClient.invalidateQueries({ queryKey: ['/api/payments', metadata.userId] });
    }

    // Auto-share in Mini App
    if (isMiniApp && metadata?.deviceId) {
      triggerAutoShare({
        type: 'payment_success',
        amount: `${amount} ${currency}`,
        deviceName: metadata.deviceId,
        context: metadata.command || 'payment',
      });
    }

    // Call parent success handler
    if (onSuccess) {
      onSuccess(result);
    }

    // Auto close after 2 seconds
    setTimeout(() => {
      onClose();
    }, 2000);
  };

  const handlePaymentError = (error: PaymentError) => {
    setPaymentStatus('error');
    setStatusMessage(error.message);

    toast({
      title: 'Payment Failed',
      description: error.message,
      variant: 'destructive',
    });

    // Call parent error handler
    if (onError) {
      onError(error);
    }
  };

  const getStatusIcon = () => {
    switch (paymentStatus) {
      case 'processing':
        return '⏳';
      case 'completed':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '💳';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <span>{getStatusIcon()}</span>
            <span>Base Pay - Payment Required</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Payment Details Card */}
          <div className="bg-secondary/50 p-4 rounded-lg space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Amount</span>
              <span className="font-bold text-lg">{amount} {currency}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Recipient</span>
              <BasenameDisplay 
                address={recipient} 
                variant="inline"
                className="text-xs"
              />
            </div>

            {metadata?.deviceId && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Device</span>
                <span className="font-medium">{metadata.deviceId}</span>
              </div>
            )}

            {metadata?.command && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Command</span>
                <span className="font-medium capitalize">{metadata.command}</span>
              </div>
            )}
          </div>

          {/* Payment Features */}
          <div className="bg-card border p-4 rounded-lg space-y-2">
            <h4 className="font-medium text-sm mb-2">Base Pay Features</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li className="flex items-center">
                <span className="mr-2">✓</span>
                <span>One-click payment with OnchainKit</span>
              </li>
              <li className="flex items-center">
                <span className="mr-2">✓</span>
                <span>Automatic gas estimation</span>
              </li>
              <li className="flex items-center">
                <span className="mr-2">✓</span>
                <span>Real-time transaction tracking</span>
              </li>
              <li className="flex items-center">
                <span className="mr-2">✓</span>
                <span>Secure Base Sepolia network</span>
              </li>
            </ul>
          </div>

          {/* Status Message */}
          {statusMessage && (
            <div className={`p-3 rounded-lg text-sm ${
              paymentStatus === 'error' 
                ? 'bg-destructive/10 text-destructive' 
                : paymentStatus === 'completed'
                ? 'bg-green-500/10 text-green-600'
                : 'bg-muted'
            }`}>
              {statusMessage}
            </div>
          )}

          {/* Payment Button */}
          {paymentStatus !== 'completed' && (
            <BasePayButton
              amount={amount}
              recipient={recipient}
              currency={currency}
              metadata={metadata}
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
              className="w-full"
              disabled={paymentStatus === 'processing'}
            >
              {paymentStatus === 'processing' 
                ? 'Processing Payment...' 
                : `Pay ${amount} ${currency} with Base Pay`}
            </BasePayButton>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-2">
            {paymentStatus === 'completed' ? (
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-primary hover:underline"
              >
                Close
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}