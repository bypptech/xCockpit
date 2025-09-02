'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Coins, Settings, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';

interface GachaFeeCustomizerProps {
  deviceId: string;
  deviceName: string;
  currentFee: number;
  onFeeChange: (newFee: number) => void;
  onPlayGacha: (fee: number) => void;
  isPlaying?: boolean;
  className?: string;
  walletAddress?: string | null;
}

// Fee validation constants
const MIN_FEE = 0.001;
const MAX_FEE = 999;
const SUGGESTED_FEES = [0.001, 0.01, 0.1, 0.5, 1, 5, 10, 50, 100];

export function GachaFeeCustomizer({
  deviceId,
  deviceName,
  currentFee = 0.01,
  onFeeChange,
  onPlayGacha,
  isPlaying = false,
  className = '',
  walletAddress
}: GachaFeeCustomizerProps) {
  const [customFee, setCustomFee] = useState(currentFee);
  const [inputValue, setInputValue] = useState(currentFee.toString());
  const [isValid, setIsValid] = useState(true);
  const [validationMessage, setValidationMessage] = useState('');

  // Update internal state when currentFee prop changes
  useEffect(() => {
    setCustomFee(currentFee);
    setInputValue(currentFee.toString());
  }, [currentFee]);

  const validateFee = (fee: number): { valid: boolean; message: string } => {
    if (isNaN(fee)) {
      return { valid: false, message: 'Please enter a valid number' };
    }
    if (fee < MIN_FEE) {
      return { valid: false, message: `Minimum fee is ${MIN_FEE} USDC` };
    }
    if (fee > MAX_FEE) {
      return { valid: false, message: `Maximum fee is ${MAX_FEE} USDC` };
    }
    return { valid: true, message: '' };
  };

  const handleInputChange = (value: string) => {
    setInputValue(value);
    
    const numValue = parseFloat(value);
    const validation = validateFee(numValue);
    
    setIsValid(validation.valid);
    setValidationMessage(validation.message);
    
    if (validation.valid) {
      setCustomFee(numValue);
    }
  };

  const handleSliderChange = (value: number[]) => {
    const fee = value[0];
    setCustomFee(fee);
    setInputValue(fee.toFixed(3));
    setIsValid(true);
    setValidationMessage('');
  };

  const handleSuggestedFeeClick = (fee: number) => {
    setCustomFee(fee);
    setInputValue(fee.toString());
    setIsValid(true);
    setValidationMessage('');
  };

  const handleApplyFee = () => {
    if (isValid && customFee !== currentFee) {
      onFeeChange(customFee);
    }
  };

  const handlePlayGacha = () => {
    if (isValid) {
      onPlayGacha(customFee);
    }
  };

  const getFeeLevel = (fee: number): { level: string; color: string; icon: React.ReactNode } => {
    if (fee <= 0.01) return { level: 'Minimal', color: 'text-green-600', icon: <TrendingDown className="w-4 h-4" /> };
    if (fee <= 0.1) return { level: 'Low', color: 'text-blue-600', icon: <DollarSign className="w-4 h-4" /> };
    if (fee <= 1) return { level: 'Standard', color: 'text-yellow-600', icon: <Coins className="w-4 h-4" /> };
    if (fee <= 10) return { level: 'Premium', color: 'text-orange-600', icon: <TrendingUp className="w-4 h-4" /> };
    return { level: 'Maximum', color: 'text-red-600', icon: <TrendingUp className="w-4 h-4" /> };
  };

  const feeLevel = getFeeLevel(customFee);

  return (
    <Card className={`border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50 ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <Settings className="w-5 h-5" />
          Customize Play Fee
        </CardTitle>
        <CardDescription className="text-blue-700">
          Set your preferred fee for {deviceName} (0.001 - 999 USDC)
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Current Fee Display */}
        <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Current Fee:</span>
            <div className="flex items-center gap-1">
              {feeLevel.icon}
              <span className={`font-bold ${feeLevel.color}`}>
                {customFee.toFixed(3)} USDC
              </span>
            </div>
          </div>
          <Badge variant="outline" className={feeLevel.color}>
            {feeLevel.level}
          </Badge>
        </div>

        {/* Fee Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Custom Fee Amount (USDC)
          </label>
          <div className="flex gap-2">
            <Input
              type="number"
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              min={MIN_FEE}
              max={MAX_FEE}
              step={0.001}
              className={`flex-1 ${!isValid ? 'border-red-500' : 'border-blue-300'}`}
              placeholder="Enter fee amount..."
            />
            <Button
              onClick={handleApplyFee}
              disabled={!isValid || customFee === currentFee}
              variant="outline"
              size="sm"
            >
              Apply
            </Button>
          </div>
          {!isValid && (
            <p className="text-sm text-red-600">{validationMessage}</p>
          )}
        </div>

        {/* Fee Slider */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Quick Adjustment
          </label>
          <Slider
            value={[customFee]}
            onValueChange={handleSliderChange}
            min={MIN_FEE}
            max={Math.min(MAX_FEE, 100)} // Limit slider to 100 for better UX
            step={0.001}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>{MIN_FEE} USDC</span>
            <span>100 USDC</span>
          </div>
        </div>

        {/* Suggested Fees */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Suggested Fees
          </label>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_FEES.map((fee) => (
              <Button
                key={fee}
                variant={customFee === fee ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSuggestedFeeClick(fee)}
                className="text-xs"
              >
                {fee} USDC
              </Button>
            ))}
          </div>
        </div>

        {/* Fee Impact Info */}
        <div className="bg-blue-100 p-3 rounded-lg">
          <div className="text-xs text-blue-800 space-y-1">
            <div className="font-medium">💡 Fee Impact:</div>
            <div>• Higher fees = Better rewards potential</div>
            <div>• Lower fees = More affordable play</div>
            <div>• All fees go directly to the device owner</div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex gap-2">
        <Button
          onClick={handlePlayGacha}
          disabled={!isValid || isPlaying || !walletAddress}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
          size="lg"
        >
          {!walletAddress ? (
            <>
              <Coins className="w-4 h-4 mr-2" />
              Connect Wallet to Play
            </>
          ) : isPlaying ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Playing...
            </>
          ) : (
            <>
              <Coins className="w-4 h-4 mr-2" />
              Play Gacha ({customFee.toFixed(3)} USDC)
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}