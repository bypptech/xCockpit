import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { walletService } from '@/lib/coinbase-wallet';
import { X402Client } from '@/lib/x402-client';
import { balanceEvents } from '@/lib/balance-events';
import { MetaTransactionService, PaymentMethod } from '@/lib/meta-transaction';
import { ERC20ApprovalService } from '@/lib/erc20-approve';
import { FastPathPaymentService } from '@/lib/fast-path-payment';
import { SpendingCapService } from '@/lib/spending-cap';
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
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | 'fast_path'>('direct');
  const [approvalNeeded, setApprovalNeeded] = useState<boolean>(false);
  const [fastPathAvailable, setFastPathAvailable] = useState<boolean>(false);
  const [spendingCapInfo, setSpendingCapInfo] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const paymentMutation = useMutation({
    mutationFn: async () => {
      setPaymentStatus('analyzing');
      setPaymentError(null);

      try {
        console.log(`🔍 Analyzing optimal payment method for ${amount} USDC`);
        
        let paymentResult: any;
        
        // Phase 1: Check fast path availability first (highest priority)
        const fastPathCheck = await SpendingCapService.canUseFastPath(walletAddress, amount);
        
        if (fastPathCheck.canUseFastPath) {
          console.log(`⚡ Fast path available: ${fastPathCheck.reason}`);
          setPaymentMethod('fast_path');
          setFastPathAvailable(true);
          setSpendingCapInfo(`Remaining cap: $${fastPathCheck.currentCap?.remainingCap || '0.00'}`);
          
          // Execute ultra-fast payment
          setPaymentStatus('processing');
          paymentResult = await FastPathPaymentService.executePayment(
            walletAddress,
            recipient,
            amount
          );
          
          if (!paymentResult.success) {
            throw new Error(paymentResult.error || 'Fast path payment failed');
          }
          
          console.log(`✅ Fast path payment completed in ${paymentResult.executionTime}ms`);
          
          // Update spending cap display
          if (paymentResult.spendingCapUsed) {
            setSpendingCapInfo(
              `Daily remaining: $${paymentResult.spendingCapUsed.dailyRemaining} USDC`
            );
          }
          
        } else {
          console.log(`🔄 Fast path unavailable: ${fastPathCheck.reason}`);
          setFastPathAvailable(false);
          setSpendingCapInfo(fastPathCheck.reason);
          
          // Phase 2: Fallback to standard optimized payment methods
          const { recommendedMethod, approvalState, supportsPermit } = 
            await MetaTransactionService.selectOptimalPaymentMethod(walletAddress, amount);
          
          console.log(`🚀 Fallback method: ${recommendedMethod}`, {
            approvalState,
            supportsPermit,
            recipient,
            amount,
            device: device.name
          });
          
          setPaymentMethod(recommendedMethod);
          setApprovalNeeded(approvalState.needsApproval && recommendedMethod === 'approve_transfer');
          
          // Execute standard payment
          setPaymentStatus('processing');
          paymentResult = await MetaTransactionService.executeOptimizedPayment(
            walletAddress,
            recipient,
            amount
          );
          
          if (!paymentResult.success) {
            throw new Error(paymentResult.error || 'Payment failed');
          }
          
          console.log(`✅ Payment completed using ${paymentResult.method}:`, paymentResult.txHash);
        }
        
        // Phase 3: Submit payment via x402 protocol
        setPaymentStatus('confirming');
        
        const result = await X402Client.submitPayment(device.id, command, {
          amount,
          currency: 'USDC',
          network: 'eip155:84532',
          txHash: paymentResult.txHash || '',
          walletAddress
        });

        if (!result.success) {
          throw new Error(result.error || 'Payment failed');
        }

        setPaymentStatus('completed');
        
        toast({
          title: 'Payment Successful',
          description: `${command} command executed successfully`,
        });

        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
        queryClient.invalidateQueries({ queryKey: ['/api/users', walletAddress] });
        
        // Trigger balance update
        balanceEvents.triggerBalanceUpdate();

        // Close modal after short delay
        setTimeout(() => {
          onClose();
        }, 2000);

        return result;

      } catch (error: any) {
        setPaymentStatus('error');
        setPaymentError(error.message);
        throw error;
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Payment Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  const handleConfirmPayment = () => {
    paymentMutation.mutate();
  };

  const getStatusMessage = () => {
    switch (paymentStatus) {
      case 'analyzing':
        return 'Analyzing optimal payment method...';
      case 'processing':
        return paymentMethod === 'fast_path' ? 'Executing instant payment...' :
               paymentMethod === 'permit_transfer' ? 'Executing gasless permit payment...' : 
               paymentMethod === 'approve_transfer' ? 'Executing pre-approved payment...' : 
               'Executing direct payment...';
      case 'confirming':
        return 'Confirming with IoT device...';
      case 'completed':
        return 'Payment completed successfully!';
      case 'error':
        return paymentError || 'Payment failed';
      default:
        return '';
    }
  };

  const getStatusIcon = () => {
    switch (paymentStatus) {
      case 'processing':
      case 'confirming':
        return 'fas fa-spinner fa-spin text-blue-600';
      case 'completed':
        return 'fas fa-check text-green-600';
      case 'error':
        return 'fas fa-times text-red-600';
      default:
        return '';
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Confirm Payment
            <button 
              className="text-muted-foreground hover:text-foreground"
              onClick={onClose}
              data-testid="button-close-payment-modal"
            >
              <i className="fas fa-times"></i>
            </button>
          </DialogTitle>
        </DialogHeader>

        {/* Payment Details */}
        <div className="space-y-4 mb-6">
          <div className="bg-muted p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Action</span>
              <span className="font-medium text-card-foreground" data-testid="text-payment-action">
                {command} {device.name}
              </span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Amount</span>
              <span className="font-medium text-card-foreground" data-testid="text-payment-amount">
                {amount} USDC
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Network</span>
              <span className="font-medium text-card-foreground" data-testid="text-payment-network">
                Base Sepolia
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Recipient</span>
              <span className="font-mono text-xs text-card-foreground" data-testid="text-payment-recipient">
                {`${recipient.slice(0, 8)}...${recipient.slice(-6)}`}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Payment Method</span>
              <span className="text-xs text-card-foreground" data-testid="text-payment-method">
                {paymentMethod === 'fast_path' ? '🚀 Instant (Within Cap)' :
                 paymentMethod === 'permit_transfer' ? '⚡ Gasless Permit' :
                 paymentMethod === 'approve_transfer' ? '🔄 Pre-approved' :
                 '💳 Direct Transfer'}
                {approvalNeeded && ' (Approval needed)'}
              </span>
            </div>
            {spendingCapInfo && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Spending Cap</span>
                <span className="text-xs text-muted-foreground" data-testid="text-spending-cap-info">
                  {spendingCapInfo}
                </span>
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div className="border border-border rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <i className="fas fa-wallet text-blue-600"></i>
              </div>
              <div>
                <p className="font-medium text-card-foreground" data-testid="text-wallet-address">
                  {`${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`}
                </p>
                <p className="text-sm text-muted-foreground">Coinbase Wallet</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <Button 
            variant="secondary"
            className="flex-1"
            onClick={onClose}
            disabled={paymentStatus === 'processing' || paymentStatus === 'confirming'}
            data-testid="button-cancel-payment"
          >
            Cancel
          </Button>
          <Button 
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={handleConfirmPayment}
            disabled={paymentStatus === 'analyzing' || paymentStatus === 'processing' || paymentStatus === 'confirming' || paymentStatus === 'completed'}
            data-testid="button-confirm-payment"
          >
            <i className="fas fa-credit-card mr-2"></i>
            {paymentStatus === 'idle' ? 'Pay with Smart Method' : 
             paymentStatus === 'analyzing' ? 'Analyzing...' : 'Processing...'}
          </Button>
        </div>

        {/* Payment Status Updates */}
        {(paymentStatus === 'analyzing' || paymentStatus === 'processing' || paymentStatus === 'confirming' || paymentStatus === 'completed' || paymentStatus === 'error') && (
          <div className={`mt-6 p-4 rounded-lg border ${
            paymentStatus === 'error' 
              ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800' 
              : paymentStatus === 'completed'
              ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
              : 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800'
          }`} data-testid="payment-progress">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 flex items-center justify-center">
                <i className={getStatusIcon()}></i>
              </div>
              <div>
                <p className={`font-medium ${
                  paymentStatus === 'error' 
                    ? 'text-red-900 dark:text-red-100' 
                    : paymentStatus === 'completed'
                    ? 'text-green-900 dark:text-green-100'
                    : 'text-blue-900 dark:text-blue-100'
                }`} data-testid="text-payment-status">
                  {paymentStatus === 'completed' ? 'Payment Successful' : 
                   paymentStatus === 'error' ? 'Payment Failed' : 'Processing Payment'}
                </p>
                <p className={`text-sm ${
                  paymentStatus === 'error' 
                    ? 'text-red-700 dark:text-red-300' 
                    : paymentStatus === 'completed'
                    ? 'text-green-700 dark:text-green-300'
                    : 'text-blue-700 dark:text-blue-300'
                }`} data-testid="text-payment-status-detail">
                  {getStatusMessage()}
                </p>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
