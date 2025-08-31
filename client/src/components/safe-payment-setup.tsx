import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { SessionBasedPaymentService, SessionPayment } from '@/lib/session-based-payments';
import { TransactionWhitelistService, WhitelistEntry } from '@/lib/transaction-whitelist';
import { Shield, Zap, CheckCircle, AlertTriangle, Clock, Users } from 'lucide-react';

interface SafePaymentSetupProps {
  walletAddress: string;
  onClose: () => void;
  recentPayments?: Array<{ amount: string; timestamp: string; deviceId: string }>;
}

export default function SafePaymentSetup({ walletAddress, onClose, recentPayments = [] }: SafePaymentSetupProps) {
  const [currentStep, setCurrentStep] = useState<'method_selection' | 'session_setup' | 'whitelist_setup' | 'completed'>('method_selection');
  const [selectedMethod, setSelectedMethod] = useState<'session' | 'whitelist' | 'skip'>('session');
  const [isLoading, setIsLoading] = useState(false);
  const [setupResults, setSetupResults] = useState<any>(null);
  const { toast } = useToast();

  const getRecommendedSessionConfig = () => {
    if (recentPayments.length === 0) {
      return {
        recommendedAmount: '10.00',
        recommendedHours: 24,
        whitelistedDevices: [],
        reasoning: 'No payment history - conservative session recommended'
      };
    }
    return SessionBasedPaymentService.getRecommendedSessionConfig(recentPayments);
  };

  const getServiceRecipients = () => {
    return TransactionWhitelistService.getServiceRecipients();
  };

  const handleMethodSelection = (method: 'session' | 'whitelist' | 'skip') => {
    setSelectedMethod(method);
    if (method === 'skip') {
      onClose();
      return;
    }
    setCurrentStep(method === 'session' ? 'session_setup' : 'whitelist_setup');
  };

  const handleSessionSetup = async () => {
    setIsLoading(true);
    try {
      const config = getRecommendedSessionConfig();
      
      const result = await SessionBasedPaymentService.createPaymentSession(
        walletAddress,
        config.recommendedAmount,
        config.recommendedHours,
        config.whitelistedDevices
      );

      if (result.success) {
        setSetupResults(result);
        setCurrentStep('completed');
        toast({
          title: 'Session Created Successfully!',
          description: `Payment session activated for ${config.recommendedAmount} USDC`,
        });
      } else {
        throw new Error(result.error || 'Session creation failed');
      }
    } catch (error) {
      toast({
        title: 'Setup Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleWhitelistSetup = async () => {
    setIsLoading(true);
    try {
      const result = await TransactionWhitelistService.quickSetupServiceWhitelist(walletAddress);

      if (result.success) {
        setSetupResults(result);
        setCurrentStep('completed');
        toast({
          title: 'Whitelist Setup Complete!',
          description: `${result.addedCount} trusted recipients added`,
        });
      } else {
        throw new Error('Whitelist setup failed');
      }
    } catch (error) {
      toast({
        title: 'Setup Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderMethodSelection = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="h-8 w-8 text-red-600" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Avoid Fraud Warnings</h3>
        <p className="text-sm text-muted-foreground">
          Choose a safer payment method to avoid wallet security warnings
        </p>
      </div>

      <div className="space-y-3">
        {/* Session-Based Payments */}
        <div 
          className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
            selectedMethod === 'session' 
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' 
              : 'border-border hover:border-blue-300'
          }`}
          onClick={() => setSelectedMethod('session')}
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mt-0.5">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-blue-700 dark:text-blue-300">🎯 Session-Based Payments</span>
                <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 px-2 py-0.5 rounded-full">
                  Recommended
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                Create a payment session instead of blanket approval. No fraud warnings.
              </p>
              <div className="text-xs text-blue-600 space-y-1">
                <div>• ✅ No "withdraw to someone else's address" warning</div>
                <div>• ⚡ Fast payments within session limits</div>
                <div>• 🛡️ Automatic expiration for security</div>
                <div>• 🎯 Device-specific whitelisting available</div>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction Whitelisting */}
        <div 
          className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
            selectedMethod === 'whitelist' 
              ? 'border-green-500 bg-green-50 dark:bg-green-950' 
              : 'border-border hover:border-green-300'
          }`}
          onClick={() => setSelectedMethod('whitelist')}
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mt-0.5">
              <Users className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-green-700 dark:text-green-300">🛡️ Trusted Recipients</span>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                Pre-approve trusted service addresses. Clearer user experience.
              </p>
              <div className="text-xs text-green-600 space-y-1">
                <div>• ✅ Clear "I trust this service" messaging</div>
                <div>• 🚀 Fast payments to approved recipients</div>
                <div>• 📊 Usage tracking and limits</div>
                <div>• 🔄 Easy management and removal</div>
              </div>
            </div>
          </div>
        </div>

        {/* Skip Setup */}
        <div 
          className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
            selectedMethod === 'skip' 
              ? 'border-gray-500 bg-gray-50 dark:bg-gray-950' 
              : 'border-border hover:border-gray-300'
          }`}
          onClick={() => setSelectedMethod('skip')}
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-gray-100 dark:bg-gray-900 rounded-lg flex items-center justify-center mt-0.5">
              <AlertTriangle className="h-5 w-5 text-gray-600" />
            </div>
            <div className="flex-1">
              <span className="font-medium text-gray-700 dark:text-gray-300">❌ Keep Current Method</span>
              <p className="text-sm text-muted-foreground mt-1">
                Continue with regular payments (will show fraud warnings)
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex space-x-3">
        <Button variant="secondary" className="flex-1" onClick={onClose}>
          Maybe Later
        </Button>
        <Button 
          className="flex-1" 
          onClick={() => handleMethodSelection(selectedMethod)}
          disabled={!selectedMethod}
        >
          Continue with {selectedMethod === 'session' ? 'Sessions' : selectedMethod === 'whitelist' ? 'Whitelist' : 'Current Method'}
        </Button>
      </div>
    </div>
  );

  const renderSessionSetup = () => {
    const config = getRecommendedSessionConfig();
    
    return (
      <div className="space-y-6">
        <div className="text-center">
          <Clock className="h-12 w-12 text-blue-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold mb-2">Setup Payment Session</h3>
          <p className="text-sm text-muted-foreground">
            Create a secure session for fast payments without approval warnings
          </p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-3">Smart Recommendations</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-blue-700 dark:text-blue-300">Session Amount:</span>
              <span className="font-medium">${config.recommendedAmount} USDC</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-700 dark:text-blue-300">Valid Duration:</span>
              <span className="font-medium">{config.recommendedHours} hours</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-700 dark:text-blue-300">Device Access:</span>
              <span className="font-medium">
                {config.whitelistedDevices.length > 0 
                  ? `${config.whitelistedDevices.length} devices` 
                  : 'All devices'
                }
              </span>
            </div>
          </div>
          <p className="text-xs text-blue-600 mt-3 italic">{config.reasoning}</p>
        </div>

        <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg border border-green-200 dark:border-green-800">
          <h4 className="font-medium text-green-900 dark:text-green-100 mb-2 flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Session Benefits
          </h4>
          <div className="text-sm text-green-700 dark:text-green-300 space-y-1">
            <div>✅ No "fraud warning" in wallet</div>
            <div>⚡ Lightning-fast payments (0.5-1s)</div>
            <div>🛡️ Automatic expiration for security</div>
            <div>🎯 Optional device restrictions</div>
          </div>
        </div>

        <div className="flex space-x-3">
          <Button 
            variant="secondary" 
            className="flex-1" 
            onClick={() => setCurrentStep('method_selection')}
            disabled={isLoading}
          >
            Back
          </Button>
          <Button 
            className="flex-1" 
            onClick={handleSessionSetup}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating Session...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Create Session
              </>
            )}
          </Button>
        </div>
      </div>
    );
  };

  const renderWhitelistSetup = () => {
    const serviceRecipients = getServiceRecipients();
    
    return (
      <div className="space-y-6">
        <div className="text-center">
          <Users className="h-12 w-12 text-green-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold mb-2">Setup Trusted Recipients</h3>
          <p className="text-sm text-muted-foreground">
            Add xCockpit service addresses to your trusted list
          </p>
        </div>

        <div className="space-y-3">
          {serviceRecipients.map((recipient, index) => (
            <div key={index} className="bg-green-50 dark:bg-green-950 p-4 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <Shield className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-green-900 dark:text-green-100">{recipient.label}</h4>
                  <p className="text-sm text-green-700 dark:text-green-300 mb-2">{recipient.description}</p>
                  <div className="text-xs text-green-600 space-y-1">
                    <div>Address: <code className="bg-green-100 dark:bg-green-900 px-1 rounded">{recipient.address.slice(0, 8)}...{recipient.address.slice(-6)}</code></div>
                    <div>Max Amount: <strong>${recipient.suggestedMaxAmount} USDC</strong></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Whitelist Benefits
          </h4>
          <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <div>✅ Clear "trusted recipient" messaging</div>
            <div>🚀 Fast payments to approved addresses</div>
            <div>📊 Usage tracking and spending limits</div>
            <div>🔄 Easy management in settings</div>
          </div>
        </div>

        <div className="flex space-x-3">
          <Button 
            variant="secondary" 
            className="flex-1" 
            onClick={() => setCurrentStep('method_selection')}
            disabled={isLoading}
          >
            Back
          </Button>
          <Button 
            className="flex-1" 
            onClick={handleWhitelistSetup}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Adding Recipients...
              </>
            ) : (
              <>
                <Shield className="h-4 w-4 mr-2" />
                Add to Whitelist
              </>
            )}
          </Button>
        </div>
      </div>
    );
  };

  const renderCompleted = () => (
    <div className="space-y-6 text-center">
      <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto">
        <CheckCircle className="h-8 w-8 text-green-600" />
      </div>
      
      <div>
        <h3 className="text-lg font-semibold mb-2">Setup Complete!</h3>
        <p className="text-sm text-muted-foreground">
          {selectedMethod === 'session' 
            ? 'Payment session created successfully. Fast payments are now available without fraud warnings.'
            : 'Trusted recipients added successfully. You can now make fast payments to approved addresses.'
          }
        </p>
      </div>

      {setupResults && (
        <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg border border-green-200 dark:border-green-800">
          <div className="text-sm text-green-700 dark:text-green-300">
            {selectedMethod === 'session' ? (
              <>
                <div>✅ Session Amount: ${setupResults.session?.maxAmount || 'N/A'}</div>
                <div>⏰ Valid Until: {setupResults.session?.validUntil ? new Date(setupResults.session.validUntil).toLocaleString() : 'N/A'}</div>
                <div>🚀 Expected Speed: 0.5-1.5 seconds per payment</div>
              </>
            ) : (
              <>
                <div>✅ Recipients Added: {setupResults.addedCount}</div>
                <div>🚀 Fast Payments Available: Immediately</div>
                <div>📊 Usage Tracking: Enabled</div>
              </>
            )}
          </div>
        </div>
      )}

      <Button className="w-full" onClick={onClose}>
        <Zap className="h-4 w-4 mr-2" />
        Start Using Fast Payments
      </Button>
    </div>
  );

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-500" />
            Safe Payment Setup
          </DialogTitle>
        </DialogHeader>

        {currentStep === 'method_selection' && renderMethodSelection()}
        {currentStep === 'session_setup' && renderSessionSetup()}
        {currentStep === 'whitelist_setup' && renderWhitelistSetup()}
        {currentStep === 'completed' && renderCompleted()}
      </DialogContent>
    </Dialog>
  );
}