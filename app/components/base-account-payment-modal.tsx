'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BaseAccountPaymentButton } from './base-account-payment-button';
import { BasenameDisplay } from '@/components/basename-display';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Zap, Shield, Clock } from 'lucide-react';
import type { BaseAccountPaymentResult } from '@/lib/base-account-service';
import { useToast } from '@/hooks/use-toast';
import { balanceEvents } from '@/lib/balance-events';
import { useQueryClient } from '@tanstack/react-query';
import { useMiniApp } from '@/providers/MiniAppProvider';
import { useViralSharing } from '@/hooks/use-viral-sharing';

interface BaseAccountPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: string;
  recipient: string;
  deviceId?: string;
  command?: string;
  walletAddress?: string;
  onSuccess?: (result: BaseAccountPaymentResult) => void;
  onError?: (error: Error) => void;
}

export function BaseAccountPaymentModal({
  isOpen,
  onClose,
  amount,
  recipient,
  deviceId,
  command,
  walletAddress,
  onSuccess,
  onError,
}: BaseAccountPaymentModalProps) {
  const [paymentComplete, setPaymentComplete] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isMiniApp } = useMiniApp();
  const { triggerAutoShare } = useViralSharing();

  useEffect(() => {
    if (isOpen) {
      setPaymentComplete(false);
    }
  }, [isOpen]);

  const handlePaymentSuccess = (result: BaseAccountPaymentResult) => {
    setPaymentComplete(true);

    // Update balance
    balanceEvents.triggerBalanceUpdate();

    // Invalidate queries
    if (walletAddress) {
      queryClient.invalidateQueries({ queryKey: ['/api/payments', walletAddress] });
    }

    // Auto-share in Mini App
    if (isMiniApp && deviceId) {
      triggerAutoShare({
        type: 'payment_success',
        amount: `${amount} USDC`,
        deviceName: deviceId,
        context: command || 'payment',
      });
    }

    // Call parent success handler
    if (onSuccess) {
      onSuccess(result);
    }

    // Auto close after 3 seconds
    setTimeout(() => {
      onClose();
    }, 3000);
  };

  const handlePaymentError = (error: Error) => {
    toast({
      title: 'Payment Failed',
      description: error.message,
      variant: 'destructive',
    });

    if (onError) {
      onError(error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span>💳</span>
              <span>Base Account Payment</span>
            </div>
            <Badge variant="secondary">Powered by Base</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Payment Details */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Amount</span>
              <span className="font-bold text-lg">{amount} USDC</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Recipient</span>
              <BasenameDisplay 
                address={recipient} 
                variant="inline"
                className="text-xs"
              />
            </div>

            {deviceId && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Device</span>
                <span className="font-medium">{deviceId}</span>
              </div>
            )}

            {command && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Command</span>
                <span className="font-medium capitalize">{command}</span>
              </div>
            )}
          </div>

          {/* Features */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center space-x-2 text-sm">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span>Fast Settlement</span>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <Shield className="h-4 w-4 text-green-500" />
              <span>Secure Payment</span>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <Clock className="h-4 w-4 text-blue-500" />
              <span>&lt;2 Second Confirm</span>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <CheckCircle className="h-4 w-4 text-purple-500" />
              <span>Gas Sponsored</span>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5" />
              <div className="text-xs text-blue-700 dark:text-blue-300">
                <p className="font-medium mb-1">Base Account Benefits:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>No gas fees required</li>
                  <li>Works with Base Account or Coinbase Account</li>
                  <li>Instant USDC transfers</li>
                  <li>Enterprise-grade security</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Payment Status */}
          {paymentComplete && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-lg">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="font-medium text-green-700 dark:text-green-300">
                  Payment completed successfully!
                </span>
              </div>
            </div>
          )}

          {/* Payment Button */}
          {!paymentComplete && (
            <BaseAccountPaymentButton
              amount={amount}
              recipient={recipient}
              metadata={{
                deviceId,
                command,
                userId: walletAddress,
              }}
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
              className="w-full"
              requestPayerInfo={false}
            >
              Pay with Base Account
            </BaseAccountPaymentButton>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-2">
            {paymentComplete ? (
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