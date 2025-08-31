import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { SpendingCapService, SpendingCap } from '@/lib/spending-cap';
import { FastPathPaymentService } from '@/lib/fast-path-payment';
import { Zap, Shield, Clock, TrendingUp } from 'lucide-react';

interface SpendingCapSetupProps {
  walletAddress: string | null;
  onClose: () => void;
  recentPayments?: Array<{ amount: string; timestamp: string }>;
}

export default function SpendingCapSetup({ walletAddress, onClose, recentPayments = [] }: SpendingCapSetupProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [currentCap, setCurrentCap] = useState<SpendingCap | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<'conservative' | 'moderate' | 'generous' | 'custom'>('moderate');
  const [customTotal, setCustomTotal] = useState('');
  const [customDaily, setCustomDaily] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [setupStatus, setSetupStatus] = useState<'idle' | 'processing' | 'completed' | 'error'>('idle');
  const { toast } = useToast();

  // Load current spending cap
  useEffect(() => {
    if (walletAddress) {
      loadCurrentCap();
    }
  }, [walletAddress]);

  const loadCurrentCap = async () => {
    if (!walletAddress) return;
    
    try {
      const cap = await SpendingCapService.getCurrentCap(walletAddress);
      setCurrentCap(cap);
    } catch (error) {
      console.error('Failed to load current cap:', error);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    onClose();
  };

  const getRecommendedPlans = () => {
    const basePlans = SpendingCapService.getRecommendedCaps();
    
    // If we have recent payments, analyze and provide smart recommendations
    if (recentPayments.length > 0) {
      const analysis = FastPathPaymentService.analyzeUsageAndRecommendCap(recentPayments);
      
      return {
        ...basePlans,
        smart: {
          total: analysis.recommendedTotalCap,
          daily: analysis.recommendedDailyLimit,
          description: `Smart recommendation: ${analysis.reasoning}`
        }
      };
    }
    
    return basePlans;
  };

  const plans = getRecommendedPlans();

  const getCurrentPlanValues = () => {
    if (selectedPlan === 'custom') {
      return { total: customTotal, daily: customDaily };
    }
    
    const planKey = selectedPlan as keyof typeof plans;
    return {
      total: plans[planKey]?.total || '10.00',
      daily: plans[planKey]?.daily || '1.00'
    };
  };

  const handleSetupCap = async () => {
    if (!walletAddress) return;
    
    const { total, daily } = getCurrentPlanValues();
    
    if (!total || !daily || parseFloat(total) <= 0 || parseFloat(daily) <= 0) {
      toast({
        title: 'Invalid Amounts',
        description: 'Please enter valid spending cap amounts',
        variant: 'destructive'
      });
      return;
    }
    
    if (parseFloat(daily) > parseFloat(total)) {
      toast({
        title: 'Invalid Configuration',
        description: 'Daily limit cannot exceed total cap',
        variant: 'destructive'
      });
      return;
    }
    
    setIsLoading(true);
    setSetupStatus('processing');
    
    try {
      console.log(`🚀 Setting up spending cap: ${total} USDC total, ${daily} USDC daily`);
      
      const result = await SpendingCapService.setupSpendingCap(walletAddress, total, daily);
      
      if (result.success) {
        setSetupStatus('completed');
        setCurrentCap(result.cap!);
        
        toast({
          title: 'Spending Cap Activated!',
          description: `Fast payments enabled up to ${daily} USDC per day`
        });
        
        // Close after short delay
        setTimeout(() => {
          handleClose();
        }, 2000);
        
      } else {
        throw new Error(result.error || 'Setup failed');
      }
      
    } catch (error) {
      console.error('Spending cap setup failed:', error);
      setSetupStatus('error');
      
      toast({
        title: 'Setup Failed',
        description: error instanceof Error ? error.message : 'Failed to setup spending cap',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimeSavings = () => {
    const stats = FastPathPaymentService.getPerformanceStats();
    return stats.comparison.speedImprovement;
  };

  const getPotentialSavingsInfo = () => {
    if (recentPayments.length === 0) return null;
    
    const analysis = FastPathPaymentService.analyzeUsageAndRecommendCap(recentPayments);
    return analysis.potentialSavings;
  };

  const potentialSavings = getPotentialSavingsInfo();

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            {currentCap ? 'Manage Spending Cap' : 'Setup Fast Payments'}
          </DialogTitle>
        </DialogHeader>

        {/* Current Status */}
        {currentCap && (
          <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-green-600" />
              <span className="font-medium text-green-800 dark:text-green-200">Active Spending Cap</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Remaining Today</p>
                <p className="font-medium text-green-700 dark:text-green-300">
                  ${(parseFloat(currentCap.dailyLimit) - parseFloat(currentCap.dailySpent)).toFixed(2)} USDC
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Remaining</p>
                <p className="font-medium text-green-700 dark:text-green-300">
                  ${currentCap.remainingCap} USDC
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Benefits Section */}
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Fast Payment Benefits
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="text-blue-800 dark:text-blue-200">
                {formatTimeSavings()} speed boost
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-blue-600" />
              <span className="text-blue-800 dark:text-blue-200">
                Skip wallet confirmations
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-600" />
              <span className="text-blue-800 dark:text-blue-200">
                Secure daily limits
              </span>
            </div>
          </div>
          
          {potentialSavings && (
            <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
              <p className="text-blue-800 dark:text-blue-200 text-sm">
                📊 <strong>{potentialSavings.fastPathEligible}</strong> of your last <strong>{potentialSavings.totalPayments}</strong> payments 
                would be {potentialSavings.timeSavedPerPayment} faster with this setup
              </p>
            </div>
          )}
        </div>

        {/* Plan Selection */}
        {!currentCap && (
          <>
            <div className="space-y-4">
              <h3 className="font-medium">Choose Your Spending Plan</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Smart Recommendation (if available) */}
                {'smart' in plans && (
                  <div 
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      selectedPlan === 'moderate' ? 
                      'border-purple-500 bg-purple-50 dark:bg-purple-950' : 
                      'border-border hover:border-purple-300'
                    }`}
                    onClick={() => setSelectedPlan('moderate')}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span className="font-medium text-purple-700 dark:text-purple-300">🎯 Smart Recommendation</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{plans.smart?.description}</p>
                    <p className="text-lg font-semibold">${plans.smart?.total} total • ${plans.smart?.daily}/day</p>
                  </div>
                )}
                
                {/* Conservative Plan */}
                <div 
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    selectedPlan === 'conservative' ? 
                    'border-green-500 bg-green-50 dark:bg-green-950' : 
                    'border-border hover:border-green-300'
                  }`}
                  onClick={() => setSelectedPlan('conservative')}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="font-medium text-green-700 dark:text-green-300">🛡️ Conservative</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{plans.conservative.description}</p>
                  <p className="text-lg font-semibold">${plans.conservative.total} total • ${plans.conservative.daily}/day</p>
                </div>

                {/* Generous Plan */}
                <div 
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    selectedPlan === 'generous' ? 
                    'border-blue-500 bg-blue-50 dark:bg-blue-950' : 
                    'border-border hover:border-blue-300'
                  }`}
                  onClick={() => setSelectedPlan('generous')}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="font-medium text-blue-700 dark:text-blue-300">🚀 Generous</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{plans.generous.description}</p>
                  <p className="text-lg font-semibold">${plans.generous.total} total • ${plans.generous.daily}/day</p>
                </div>

                {/* Custom Plan */}
                <div 
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    selectedPlan === 'custom' ? 
                    'border-orange-500 bg-orange-50 dark:bg-orange-950' : 
                    'border-border hover:border-orange-300'
                  }`}
                  onClick={() => setSelectedPlan('custom')}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span className="font-medium text-orange-700 dark:text-orange-300">⚙️ Custom</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">Set your own limits</p>
                  
                  {selectedPlan === 'custom' && (
                    <div className="space-y-2">
                      <input
                        type="number"
                        placeholder="Total cap (USDC)"
                        value={customTotal}
                        onChange={(e) => setCustomTotal(e.target.value)}
                        className="w-full p-2 border rounded text-sm"
                        step="0.01"
                        min="0"
                      />
                      <input
                        type="number"
                        placeholder="Daily limit (USDC)"
                        value={customDaily}
                        onChange={(e) => setCustomDaily(e.target.value)}
                        className="w-full p-2 border rounded text-sm"
                        step="0.01"
                        min="0"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4">
              <Button 
                variant="secondary"
                className="flex-1"
                onClick={handleClose}
                disabled={isLoading}
              >
                Maybe Later
              </Button>
              <Button 
                className="flex-1 bg-primary hover:bg-primary/90"
                onClick={handleSetupCap}
                disabled={isLoading || setupStatus === 'processing'}
              >
                {setupStatus === 'processing' ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Setting up...
                  </>
                ) : setupStatus === 'completed' ? (
                  '✅ Completed!'
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Enable Fast Payments
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {/* Status Messages */}
        {setupStatus === 'completed' && (
          <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm">✓</span>
              </div>
              <div>
                <p className="font-medium text-green-900 dark:text-green-100">Fast Payments Activated!</p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Payments within your daily limit will now be instant
                </p>
              </div>
            </div>
          </div>
        )}

        {setupStatus === 'error' && (
          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm">×</span>
              </div>
              <div>
                <p className="font-medium text-red-900 dark:text-red-100">Setup Failed</p>
                <p className="text-sm text-red-700 dark:text-red-300">
                  Please try again or contact support if the problem persists
                </p>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}