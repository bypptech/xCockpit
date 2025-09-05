'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { BasePayButton } from '@/components/base-pay-button';
import { BasePayModal } from '@/components/base-pay-modal';
import { paymentService } from '@/lib/payment-service-adapter';
import { basePayService } from '@/lib/base-pay-service';
import { useToast } from '@/hooks/use-toast';

export default function TestBasePayPage() {
  const [amount, setAmount] = useState('0.01');
  const [recipient, setRecipient] = useState('0x1c7d4b196cb0c7b01d743fbc6116a902379c7238');
  const [showModal, setShowModal] = useState(false);
  const [useBasePay, setUseBasePay] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);
  const { toast } = useToast();

  const addTestResult = (result: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestResults(prev => [...prev, `[${timestamp}] ${result}`]);
  };

  const handleTestPayment = async () => {
    addTestResult(`Testing ${useBasePay ? 'Base Pay' : 'Legacy'} payment...`);
    
    try {
      if (useBasePay) {
        const transaction = await basePayService.createPayment({
          amount,
          currency: 'USDC',
          recipient,
          metadata: {
            deviceId: 'test-device',
            command: 'test-command',
          },
        });
        
        addTestResult('Transaction created successfully');
        addTestResult(`Transaction: ${JSON.stringify(transaction, null, 2)}`);
        
        toast({
          title: 'Transaction Created',
          description: 'Base Pay transaction ready for execution',
        });
      } else {
        addTestResult('Using legacy payment system');
        setShowModal(true);
      }
    } catch (error: any) {
      addTestResult(`Error: ${error.message}`);
      toast({
        title: 'Test Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleEstimateGas = async () => {
    addTestResult('Estimating gas...');
    
    try {
      const transaction = await basePayService.createPayment({
        amount,
        currency: 'USDC',
        recipient,
      });
      
      const quote = await basePayService.estimateGas(transaction);
      
      addTestResult(`Estimated gas: ${quote.estimatedGas}`);
      addTestResult(`Gas price: ${quote.gasPrice} wei`);
      addTestResult(`Total cost: ${quote.totalCostInEth} ETH`);
      
      toast({
        title: 'Gas Estimated',
        description: `Cost: ${quote.totalCostInEth} ETH`,
      });
    } catch (error: any) {
      addTestResult(`Error: ${error.message}`);
      toast({
        title: 'Estimation Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleCheckAvailability = () => {
    const isAvailable = basePayService.isAvailable();
    const config = basePayService.getConfig();
    const method = paymentService.getPaymentMethod();
    
    addTestResult(`Base Pay available: ${isAvailable}`);
    addTestResult(`Current method: ${method}`);
    addTestResult(`Config: ${JSON.stringify(config, null, 2)}`);
    
    toast({
      title: 'Availability Check',
      description: `Base Pay is ${isAvailable ? 'available' : 'not available'}`,
    });
  };

  const handleClearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">Base Pay Integration Test</h1>
      
      <div className="grid gap-6 md:grid-cols-2">
        {/* Configuration Card */}
        <Card>
          <CardHeader>
            <CardTitle>Test Configuration</CardTitle>
            <CardDescription>Configure test payment parameters</CardDescription>
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
                id="use-base-pay"
                checked={useBasePay}
                onCheckedChange={setUseBasePay}
              />
              <Label htmlFor="use-base-pay">Use Base Pay (OnchainKit)</Label>
            </div>
          </CardContent>
        </Card>

        {/* Actions Card */}
        <Card>
          <CardHeader>
            <CardTitle>Test Actions</CardTitle>
            <CardDescription>Execute test operations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              onClick={handleTestPayment}
              className="w-full"
              variant="default"
            >
              Test Payment
            </Button>
            
            <Button 
              onClick={handleEstimateGas}
              className="w-full"
              variant="outline"
            >
              Estimate Gas
            </Button>
            
            <Button 
              onClick={handleCheckAvailability}
              className="w-full"
              variant="outline"
            >
              Check Availability
            </Button>
            
            <div className="pt-2">
              <BasePayButton
                amount={amount}
                recipient={recipient}
                currency="USDC"
                metadata={{
                  deviceId: 'test-device',
                  command: 'test-command',
                }}
                onSuccess={(result) => {
                  addTestResult(`Payment success: ${result.transactionHash}`);
                }}
                onError={(error) => {
                  addTestResult(`Payment error: ${error.message}`);
                }}
                className="w-full"
              >
                Direct Base Pay Button
              </BasePayButton>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Test Results */}
      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Test Results</CardTitle>
            <CardDescription>Output from test operations</CardDescription>
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
          <div className="bg-muted p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
            {testResults.length === 0 ? (
              <div className="text-muted-foreground">No test results yet...</div>
            ) : (
              testResults.map((result, index) => (
                <div key={index} className="mb-1">
                  {result}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Feature Flag Info */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Feature Flag Status</CardTitle>
          <CardDescription>Current Base Pay configuration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">USE_BASE_PAY:</span>
              <span className="font-mono">{process.env.NEXT_PUBLIC_USE_BASE_PAY || 'false'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">ROLLOUT_PERCENTAGE:</span>
              <span className="font-mono">{process.env.BASE_PAY_ROLLOUT_PERCENTAGE || '0'}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">NETWORK:</span>
              <span className="font-mono">Base Sepolia (84532)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">USDC_ADDRESS:</span>
              <span className="font-mono text-xs">0x036CbD53842c5426634e7929541eC2318f3dCF7e</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Modal */}
      {showModal && (
        <BasePayModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          amount={amount}
          recipient={recipient}
          currency="USDC"
          metadata={{
            deviceId: 'test-device',
            command: 'test-command',
          }}
          onSuccess={(result) => {
            addTestResult(`Modal payment success: ${result.transactionHash}`);
            setShowModal(false);
          }}
          onError={(error) => {
            addTestResult(`Modal payment error: ${error.message}`);
          }}
        />
      )}
    </div>
  );
}