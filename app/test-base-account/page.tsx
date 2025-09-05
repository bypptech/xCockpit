'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { BaseAccountPaymentButton } from '@/components/base-account-payment-button';
import { BaseAccountPaymentModal } from '@/components/base-account-payment-modal';
import { baseAccountService } from '@/lib/base-account-service';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, AlertCircle, Terminal, Zap } from 'lucide-react';

export default function TestBaseAccountPage() {
  const [amount, setAmount] = useState('0.01');
  const [recipient, setRecipient] = useState('0x1c7d4b196cb0c7b01d743fbc6116a902379c7238');
  const [showModal, setShowModal] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isTestnet, setIsTestnet] = useState(true);
  const [requestPayerInfo, setRequestPayerInfo] = useState(false);
  const { toast } = useToast();

  const addTestResult = (result: string, type: 'info' | 'success' | 'error' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = type === 'success' ? '✅' : type === 'error' ? '❌' : '📌';
    setTestResults(prev => [...prev, `[${timestamp}] ${prefix} ${result}`]);
  };

  const handleTestPayment = async () => {
    addTestResult('Initiating Base Account payment...', 'info');
    
    try {
      const payment = await baseAccountService.createPayment({
        amount,
        recipient,
        testnet: isTestnet,
        metadata: {
          deviceId: 'test-device',
          command: 'test-command',
          userId: 'test-user',
        },
        ...(requestPayerInfo && {
          payerInfo: {
            email: { optional: true },
            name: { optional: true },
            phone: { optional: true },
          },
        }),
      });
      
      addTestResult(`Payment initiated: ${payment.id}`, 'success');
      addTestResult(`Status: ${payment.status}`, 'info');
      
      if (payment.transactionHash) {
        addTestResult(`Transaction Hash: ${payment.transactionHash}`, 'success');
      }
      
      toast({
        title: 'Payment Initiated',
        description: `Payment ID: ${payment.id}`,
      });

      // Poll for completion
      addTestResult('Polling for payment completion...', 'info');
      const finalStatus = await baseAccountService.waitForPaymentCompletion(payment.id);
      
      if (finalStatus.status === 'completed') {
        addTestResult('Payment completed successfully!', 'success');
        addTestResult(`Final transaction hash: ${finalStatus.transactionHash}`, 'success');
      } else {
        addTestResult(`Payment failed with status: ${finalStatus.status}`, 'error');
      }
      
    } catch (error: any) {
      addTestResult(`Error: ${error.message}`, 'error');
      toast({
        title: 'Test Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleCheckStatus = async () => {
    const paymentId = prompt('Enter Payment ID:');
    if (!paymentId) return;
    
    addTestResult(`Checking status for payment: ${paymentId}`, 'info');
    
    try {
      const status = await baseAccountService.checkPaymentStatus(paymentId);
      addTestResult(`Status: ${status.status}`, status.status === 'completed' ? 'success' : 'info');
      
      if (status.transactionHash) {
        addTestResult(`Transaction Hash: ${status.transactionHash}`, 'info');
      }
      
      toast({
        title: 'Payment Status',
        description: `Status: ${status.status}`,
      });
    } catch (error: any) {
      addTestResult(`Error: ${error.message}`, 'error');
      toast({
        title: 'Status Check Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleNetworkSwitch = (testnet: boolean) => {
    setIsTestnet(testnet);
    baseAccountService.setTestnet(testnet);
    addTestResult(`Switched to ${testnet ? 'Testnet' : 'Mainnet'}`, 'info');
  };

  const handleClearResults = () => {
    setTestResults([]);
  };

  const handleShowModal = () => {
    setShowModal(true);
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Base Account Payment Test</h1>
        <div className="flex items-center space-x-2">
          <Zap className="h-5 w-5 text-yellow-500" />
          <span className="text-sm font-medium">Official Base SDK</span>
        </div>
      </div>

      {/* Info Alert */}
      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Base Account Payment System</AlertTitle>
        <AlertDescription>
          This page tests the official @base-org/account SDK for accepting payments on Base.
          Features include gas sponsorship, fast settlement (&lt;2 seconds), and support for Base Account and Coinbase Account.
        </AlertDescription>
      </Alert>
      
      <div className="grid gap-6 md:grid-cols-2">
        {/* Configuration Card */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Configuration</CardTitle>
            <CardDescription>Set up payment parameters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (USDC)</Label>
              <Input
                id="amount"
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.01"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="recipient">Recipient Address</Label>
              <Input
                id="recipient"
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="0x..."
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="testnet"
                checked={isTestnet}
                onCheckedChange={handleNetworkSwitch}
              />
              <Label htmlFor="testnet">Use Testnet (Base Sepolia)</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="payer-info"
                checked={requestPayerInfo}
                onCheckedChange={setRequestPayerInfo}
              />
              <Label htmlFor="payer-info">Request Payer Info</Label>
            </div>
          </CardContent>
        </Card>

        {/* Actions Card */}
        <Card>
          <CardHeader>
            <CardTitle>Test Actions</CardTitle>
            <CardDescription>Execute payment operations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              onClick={handleTestPayment}
              className="w-full"
              variant="default"
            >
              Test Direct Payment
            </Button>
            
            <Button 
              onClick={handleShowModal}
              className="w-full"
              variant="outline"
            >
              Test Payment Modal
            </Button>
            
            <Button 
              onClick={handleCheckStatus}
              className="w-full"
              variant="outline"
            >
              Check Payment Status
            </Button>
            
            <div className="pt-2">
              <BaseAccountPaymentButton
                amount={amount}
                recipient={recipient}
                metadata={{
                  deviceId: 'test-device',
                  command: 'button-test',
                }}
                requestPayerInfo={requestPayerInfo}
                onSuccess={(result) => {
                  addTestResult(`Button payment success: ${result.id}`, 'success');
                  addTestResult(`Transaction: ${result.transactionHash}`, 'success');
                }}
                onError={(error) => {
                  addTestResult(`Button payment error: ${error.message}`, 'error');
                }}
                className="w-full"
              >
                <div className="flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Pay with Base Account Button
                </div>
              </BaseAccountPaymentButton>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Test Results */}
      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center space-x-2">
            <Terminal className="h-5 w-5" />
            <div>
              <CardTitle>Test Console</CardTitle>
              <CardDescription>Payment operation logs</CardDescription>
            </div>
          </div>
          <Button 
            onClick={handleClearResults}
            variant="outline"
            size="sm"
          >
            Clear
          </Button>
        </CardHeader>
        <CardContent>
          <div className="bg-slate-900 text-slate-100 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
            {testResults.length === 0 ? (
              <div className="text-slate-500">Waiting for test operations...</div>
            ) : (
              testResults.map((result, index) => (
                <div 
                  key={index} 
                  className={`mb-1 ${
                    result.includes('✅') ? 'text-green-400' :
                    result.includes('❌') ? 'text-red-400' :
                    'text-slate-300'
                  }`}
                >
                  {result}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Network Status */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Network Configuration</CardTitle>
          <CardDescription>Current Base Account settings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Network Mode:</span>
              <span className="ml-2 font-mono">{isTestnet ? 'Testnet' : 'Mainnet'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Chain:</span>
              <span className="ml-2 font-mono">{isTestnet ? 'Base Sepolia' : 'Base Mainnet'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">USDC Address:</span>
              <span className="ml-2 font-mono text-xs">
                {isTestnet ? '0x036CbD53842c5426634e7929541eC2318f3dCF7e' : '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">SDK Version:</span>
              <span className="ml-2 font-mono">@base-org/account</span>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">Features:</span>
              <div className="mt-1 flex flex-wrap gap-2">
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs">
                  Gas Sponsorship
                </span>
                <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-xs">
                  &lt;2s Settlement
                </span>
                <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded text-xs">
                  Payer Info Collection
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Modal */}
      {showModal && (
        <BaseAccountPaymentModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          amount={amount}
          recipient={recipient}
          deviceId="test-device"
          command="modal-test"
          walletAddress="test-wallet"
          onSuccess={(result) => {
            addTestResult(`Modal payment success: ${result.id}`, 'success');
            setShowModal(false);
          }}
          onError={(error) => {
            addTestResult(`Modal payment error: ${error.message}`, 'error');
          }}
        />
      )}
    </div>
  );
}