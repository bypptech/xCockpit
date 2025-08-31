import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { X402Client } from '@/lib/x402-client';
import { balanceEvents } from '@/lib/balance-events';
import { MetaTransactionService, PaymentMethod } from '@/lib/meta-transaction';
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
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'analyzing' | 'processing' | 'confirming' | 'completed' | 'error'>('idle');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('direct');
  const [approvalNeeded, setApprovalNeeded] = useState<boolean>(false);
  const { toast } = useToast();

  const paymentMutation = useMutation({
    mutationFn: async () => {
      setPaymentStatus('analyzing');
      setPaymentError(null);

      try {
        console.log(`🔍 Analyzing optimal payment method for ${amount} USDC`);
        
        let paymentResult: any;
        
        // Determine optimal payment method
        const { recommendedMethod, approvalState, supportsPermit } = 
          await MetaTransactionService.selectOptimalPaymentMethod(walletAddress, amount);
        
        console.log(`🚀 Payment method: ${recommendedMethod}`, {
          approvalState,
          supportsPermit,
          recipient,
          amount,
          device: device.name
        });
        
        setPaymentMethod(recommendedMethod);
        setApprovalNeeded(approvalState.needsApproval && recommendedMethod === 'approve_transfer');
        
        // Execute payment
        setPaymentStatus('processing');
        paymentResult = await MetaTransactionService.executeOptimizedPayment(
          walletAddress,
          recipient,
          amount
        );
        
        if (!paymentResult.success) {
          throw new Error(paymentResult.error || 'Payment failed');
        }
        
        console.log(`✅ Payment completed: ${paymentResult.method} in ${paymentResult.executionTime}ms`);
        
        // Phase 3: Submit payment proof to x402 endpoint
        setPaymentStatus('confirming');
        const submitResult = await X402Client.submitPayment(device.id, command, {
          amount,
          currency: 'USDC',
          network: 'eip155:84532',
          txHash: paymentResult.txHash,
          walletAddress
        });

        if (!submitResult.success) {
          throw new Error(submitResult.error || 'Payment confirmation failed');
        }

        // Success!
        setPaymentStatus('completed');
        balanceEvents.triggerBalanceUpdate();
        
        toast({
          title: "Payment Successful",
          description: `${command} executed on ${device.name}`,
          variant: "default",
        });

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
      case 'analyzing':
        return 'Analyzing optimal payment method...';
      case 'processing':
        if (paymentMethod === 'permit_transfer') return 'Signing permit transaction (gas-free)...';
        if (paymentMethod === 'approve_transfer') return approvalNeeded ? 'Waiting for approval...' : 'Processing transfer...';
        return 'Processing payment...';
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

  const getMethodDisplayName = (method: PaymentMethod) => {
    switch (method) {
      case 'permit_transfer':
        return '⚡ EIP-2612 Permit (Gas-free)';
      case 'approve_transfer':
        return '🔄 Approve + Transfer';
      case 'direct':
        return '💸 Direct Transfer';
      default:
        return 'Payment Method';
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
              <span className="font-mono text-xs">{recipient.slice(0, 6)}...{recipient.slice(-4)}</span>
            </div>
          </div>

          {/* Payment Method & Status */}
          {paymentStatus !== 'idle' && (
            <div className="bg-card border p-4 rounded-lg space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Method</span>
                <span className="text-sm font-medium">{getMethodDisplayName(paymentMethod)}</span>
              </div>
              
              {approvalNeeded && (
                <div className="flex items-center space-x-2 text-sm text-amber-600">
                  <span>⚠️</span>
                  <span>ERC-20 approval required first</span>
                </div>
              )}
              
              <div className="flex items-center space-x-2">
                {paymentStatus === 'processing' || paymentStatus === 'analyzing' || paymentStatus === 'confirming' ? (
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
              disabled={paymentStatus === 'processing' || paymentStatus === 'analyzing' || paymentStatus === 'confirming'}
              className="flex-1"
            >
              {paymentStatus === 'completed' ? 'Close' : 'Cancel'}
            </Button>
            
            {paymentStatus !== 'completed' && (
              <Button
                onClick={handlePayment}
                disabled={paymentStatus === 'processing' || paymentStatus === 'analyzing' || paymentStatus === 'confirming'}
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