import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SpendingCapService, SpendingCap } from '@/lib/spending-cap';
import { FastPathPaymentService } from '@/lib/fast-path-payment';
import { Zap, Shield, Clock, Settings, Plus, TrendingUp, AlertTriangle } from 'lucide-react';

interface SpendingCapCardProps {
  walletAddress: string | null;
  onSetupCap: () => void;
}

export default function SpendingCapCard({ walletAddress, onSetupCap }: SpendingCapCardProps) {
  const [spendingCap, setSpendingCap] = useState<SpendingCap | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (walletAddress) {
      loadSpendingCap();
    } else {
      setSpendingCap(null);
    }
  }, [walletAddress]);

  const loadSpendingCap = async () => {
    if (!walletAddress) return;
    
    setIsLoading(true);
    try {
      const cap = await SpendingCapService.getCurrentCap(walletAddress);
      setSpendingCap(cap);
    } catch (error) {
      console.error('Failed to load spending cap:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimeRemaining = () => {
    const now = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const diffMs = tomorrow.getTime() - now.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  const getDailyProgress = () => {
    if (!spendingCap) return 0;
    const spent = parseFloat(spendingCap.dailySpent);
    const limit = parseFloat(spendingCap.dailyLimit);
    return limit > 0 ? (spent / limit) * 100 : 0;
  };

  const getTotalProgress = () => {
    if (!spendingCap) return 0;
    const remaining = parseFloat(spendingCap.remainingCap);
    const total = parseFloat(spendingCap.totalCap);
    return total > 0 ? ((total - remaining) / total) * 100 : 0;
  };

  const getPerformanceStats = () => {
    return FastPathPaymentService.getPerformanceStats();
  };

  if (!walletAddress) {
    return (
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Fast Payments
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-6">
          <div className="text-muted-foreground">
            <Zap className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Connect your wallet to enable instant payments</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Fast Payments
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">Loading spending cap...</p>
        </CardContent>
      </Card>
    );
  }

  if (!spendingCap) {
    const stats = getPerformanceStats();
    
    return (
      <Card className="bg-card border-border/50 hover:border-primary/50 transition-colors">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Fast Payments
            </div>
            <Button
              size="sm"
              onClick={onSetupCap}
              className="bg-yellow-500 hover:bg-yellow-600 text-white"
            >
              <Plus className="h-4 w-4 mr-1" />
              Setup
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Benefits */}
            <div className="bg-yellow-50 dark:bg-yellow-950/30 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800/30">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-yellow-600" />
                <span className="font-medium text-yellow-800 dark:text-yellow-200">
                  Enable Lightning-Fast Payments
                </span>
              </div>
              <div className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                <p>⚡ <strong>{stats.comparison.speedImprovement}</strong> than regular payments</p>
                <p>🛡️ Set daily spending limits for security</p>
                <p>🚀 Skip wallet confirmations within your cap</p>
              </div>
            </div>

            {/* Performance Preview */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-muted p-2 rounded">
                <p className="text-xs text-muted-foreground">Current</p>
                <p className="text-sm font-medium">3-8s</p>
              </div>
              <div className="bg-primary/10 p-2 rounded border border-primary/20">
                <p className="text-xs text-primary">With Fast Pay</p>
                <p className="text-sm font-bold text-primary">0.5-1.5s</p>
              </div>
              <div className="bg-green-50 dark:bg-green-950 p-2 rounded border border-green-200 dark:border-green-800">
                <p className="text-xs text-green-600">Savings</p>
                <p className="text-sm font-medium text-green-700 dark:text-green-300">2-6s</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Active spending cap display
  const dailyRemaining = parseFloat(spendingCap.dailyLimit) - parseFloat(spendingCap.dailySpent);
  const isDailyLimitLow = dailyRemaining < 0.5;
  const isTotalCapLow = parseFloat(spendingCap.remainingCap) < 1.0;

  return (
    <Card className="bg-card border-border/50 hover:border-green-500/50 transition-colors">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-500" />
            <span>Fast Payments</span>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 px-2 py-0.5 rounded-full">
              Active
            </span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={onSetupCap}
            className="h-8 px-2"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          
          {/* Daily Usage */}
          <div className={`p-3 rounded-lg ${isDailyLimitLow ? 'bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/30' : 'bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/30'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Clock className={`h-4 w-4 ${isDailyLimitLow ? 'text-orange-600' : 'text-green-600'}`} />
                <span className={`text-sm font-medium ${isDailyLimitLow ? 'text-orange-800 dark:text-orange-200' : 'text-green-800 dark:text-green-200'}`}>
                  Today's Fast Payments
                </span>
              </div>
              <span className={`text-xs ${isDailyLimitLow ? 'text-orange-600' : 'text-green-600'}`}>
                Resets in {formatTimeRemaining()}
              </span>
            </div>
            
            <div className="flex items-center justify-between mb-2">
              <span className={`text-lg font-bold ${isDailyLimitLow ? 'text-orange-700 dark:text-orange-300' : 'text-green-700 dark:text-green-300'}`}>
                ${dailyRemaining.toFixed(2)} remaining
              </span>
              <span className="text-sm text-muted-foreground">
                of ${spendingCap.dailyLimit}
              </span>
            </div>
            
            <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  getDailyProgress() > 80 ? 'bg-orange-500' : 'bg-green-500'
                }`}
                style={{ width: `${getDailyProgress()}%` }}
              ></div>
            </div>
            
            {isDailyLimitLow && (
              <div className="flex items-center gap-1 mt-2">
                <AlertTriangle className="h-3 w-3 text-orange-600" />
                <span className="text-xs text-orange-700 dark:text-orange-300">
                  Daily limit almost reached - regular payments will be used
                </span>
              </div>
            )}
          </div>

          {/* Total Cap Status */}
          <div className={`p-3 rounded-lg ${isTotalCapLow ? 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/30' : 'bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/30'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Shield className={`h-4 w-4 ${isTotalCapLow ? 'text-red-600' : 'text-blue-600'}`} />
                <span className={`text-sm font-medium ${isTotalCapLow ? 'text-red-800 dark:text-red-200' : 'text-blue-800 dark:text-blue-200'}`}>
                  Total Spending Cap
                </span>
              </div>
              <Button
                size="sm"
                variant="ghost" 
                onClick={onSetupCap}
                className="text-xs h-6 px-2"
              >
                Increase
              </Button>
            </div>
            
            <div className="flex items-center justify-between mb-2">
              <span className={`text-lg font-bold ${isTotalCapLow ? 'text-red-700 dark:text-red-300' : 'text-blue-700 dark:text-blue-300'}`}>
                ${spendingCap.remainingCap} available
              </span>
              <span className="text-sm text-muted-foreground">
                of ${spendingCap.totalCap}
              </span>
            </div>
            
            <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  getTotalProgress() > 80 ? 'bg-red-500' : 'bg-blue-500'
                }`}
                style={{ width: `${getTotalProgress()}%` }}
              ></div>
            </div>
            
            {isTotalCapLow && (
              <div className="flex items-center gap-1 mt-2">
                <AlertTriangle className="h-3 w-3 text-red-600" />
                <span className="text-xs text-red-700 dark:text-red-300">
                  Total cap running low - consider increasing your limit
                </span>
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/50">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Average Speed</p>
              <p className="text-sm font-medium text-primary">0.5-1.5s</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Setup Date</p>
              <p className="text-sm font-medium">
                {new Date(spendingCap.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

        </div>
      </CardContent>
    </Card>
  );
}