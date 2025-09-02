import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { walletService } from '@/lib/coinbase-wallet';
import { X402Client } from '@/lib/x402-client';
import { balanceEvents } from '@/lib/balance-events';
import { useMiniApp } from '@/providers/MiniAppProvider';
import { useViralSharing } from '@/hooks/use-viral-sharing';
import { BasenameDisplay } from '@/components/basename-display';
import { type Device } from '@shared/schema';

interface PaymentModalProps {
  device: Device;
  command: string;
  amount: string;
  recipient: string;
  walletAddress: string;
  onClose: () => void;
}

export default function PaymentModal({ device, command, amount, recipient, walletAddress, onClose }: PaymentModalProps) {
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'confirming' | 'completed' | 'error'>('idle');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isMiniApp } = useMiniApp();
  const { triggerAutoShare } = useViralSharing();

  const paymentMutation = useMutation({
    mutationFn: async () => {
      setPaymentStatus('processing');
      setPaymentError(null);

      try {
        console.log(`💳 Processing direct USDC payment:`, {
          device: device.name,
          command: command,
          amount: amount,
          recipient: recipient
        });
        
        // Execute direct USDC payment
        const txHash = await walletService.sendUSDCPayment(recipient, amount);
        
        if (!txHash) {
          throw new Error('Payment transaction failed');
        }
        
        console.log(`✅ Payment completed: ${txHash}`);
        
        // Phase 2: Submit payment proof to x402 endpoint
        setPaymentStatus('confirming');
        const submitResult = await X402Client.submitPayment(device.id, command, {
          amount,
          currency: 'USDC',
          network: 'eip155:84532',
          txHash: txHash,
          walletAddress
        });

        if (!submitResult.success) {
          throw new Error(submitResult.error || 'Payment confirmation failed');
        }

        // Success!
        setPaymentStatus('completed');
        balanceEvents.triggerBalanceUpdate();
        
        // Invalidate payment history to refresh transactions
        queryClient.invalidateQueries({ queryKey: ['/api/payments', walletAddress] });
        
        toast({
          title: "Payment Successful",
          description: `${command} executed on ${device.name}`,
          variant: "default",
        });

        // Auto-share payment success in Mini App
        if (isMiniApp) {
          triggerAutoShare({
            type: 'payment_success',
            amount: `${amount} USDC`,
            deviceName: device.name,
            context: command
          });
        }

        // Auto-close after success
        setTimeout(() => {
          onClose();
        }, 2000);

      } catch (error: any) {
        console.error('Payment failed:', error);
        setPaymentStatus('error');
        setPaymentError(error.message);
        
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      setPaymentStatus('error');
      setPaymentError(error.message);
    }
  });

  const handlePayment = () => {
    paymentMutation.mutate();
  };

  const getStatusMessage = () => {
    switch (paymentStatus) {
      case 'idle':
        return 'Ready to process payment';
      case 'processing':
        return 'Processing USDC payment...';
      case 'confirming':
        return 'Confirming payment with device...';
      case 'completed':
        return '✅ Payment completed successfully!';
      case 'error':
        return `❌ ${paymentError}`;
      default:
        return 'Processing...';
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <span>💳</span>
            <span>Payment Required</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Payment Details */}
          <div className="bg-secondary/50 p-4 rounded-lg space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Device</span>
              <span className="font-medium">{device.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Command</span>
              <span className="font-medium capitalize">{command}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Amount</span>
              <span className="font-bold text-lg">${amount} USDC</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Recipient</span>
              <BasenameDisplay 
                address={recipient} 
                variant="inline"
                className="text-xs"
              />
            </div>
          </div>

          {/* Payment Method & Status */}
          {paymentStatus !== 'idle' && (
            <div className="bg-card border p-4 rounded-lg space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Method</span>
                <span className="text-sm font-medium">💸 Direct USDC Transfer</span>
              </div>
              
              <div className="flex items-center space-x-2">
                {paymentStatus === 'processing' || paymentStatus === 'confirming' ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                ) : null}
                <span className="text-sm">{getStatusMessage()}</span>
              </div>
            </div>
          )}

          {/* Error Display */}
          {paymentStatus === 'error' && paymentError && (
            <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg">
              <p className="text-sm text-destructive">{paymentError}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={paymentStatus === 'processing' || paymentStatus === 'confirming'}
              className="flex-1"
            >
              {paymentStatus === 'completed' ? 'Close' : 'Cancel'}
            </Button>
            
            {paymentStatus !== 'completed' && (
              <Button
                onClick={handlePayment}
                disabled={paymentStatus === 'processing' || paymentStatus === 'confirming'}
                className="flex-1"
              >
                {paymentStatus === 'idle' ? `Pay ${amount} USDC` : 'Processing...'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}