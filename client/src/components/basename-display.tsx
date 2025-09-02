'use client';

import { useState, useEffect } from 'react';
import { useBasename, formatAddress } from '@/hooks/use-basenames';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Copy, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface BasenameDisplayProps {
  address: string;
  showCopyButton?: boolean;
  showExternalLink?: boolean;
  className?: string;
  variant?: 'default' | 'badge' | 'inline';
  truncate?: boolean;
}

export function BasenameDisplay({ 
  address,
  showCopyButton = false,
  showExternalLink = false,
  className = '',
  variant = 'default',
  truncate = true
}: BasenameDisplayProps) {
  console.log('BasenameDisplay Component - Props:', { address, variant });
  
  const { basename, loading, error } = useBasename(address);
  
  console.log('BasenameDisplay Component - Hook Result:', { basename, loading, error });
  
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      toast({
        title: 'Copied!',
        description: 'Address copied to clipboard',
      });
    } catch (error) {
      toast({
        title: 'Failed to copy',
        description: 'Could not copy address to clipboard',
        variant: 'destructive',
      });
    }
  };

  const handleExternalLink = () => {
    const network = process.env.NETWORK || 'sepolia';
    const explorerUrl = network === 'mainnet' 
      ? `https://basescan.org/address/${address}`
      : `https://sepolia.basescan.org/address/${address}`;
    window.open(explorerUrl, '_blank');
  };

  // クライアント側でのみレンダリング
  if (!mounted) {
    return (
      <div className={className}>
        <Skeleton className="h-4 w-24" />
      </div>
    );
  }

  const displayText = loading 
    ? (truncate ? formatAddress(address, null) : address)
    : formatAddress(address, basename);

  const isBasenameAvailable = basename && !error;

  if (variant === 'badge') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Badge 
          variant={isBasenameAvailable ? 'default' : 'secondary'}
          className="font-mono"
        >
          {displayText}
        </Badge>
        {isBasenameAvailable && (
          <Badge variant="outline" className="text-xs">
            basename
          </Badge>
        )}
        {showCopyButton && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-6 w-6 p-0"
          >
            <Copy className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span 
              className={`font-mono text-sm hover:text-blue-600 cursor-help ${
                isBasenameAvailable ? 'text-blue-500' : 'text-gray-600'
              } ${className}`}
            >
              {displayText}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p className="font-mono text-xs">{address}</p>
              {isBasenameAvailable && (
                <p className="text-xs text-blue-500">✓ Basename available</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Default variant
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex flex-col">
        <span 
          className={`font-mono text-sm ${
            isBasenameAvailable ? 'text-blue-600 font-medium' : 'text-gray-700'
          }`}
        >
          {displayText}
        </span>
        {isBasenameAvailable && (
          <span className="text-xs text-gray-500 font-mono">{address}</span>
        )}
      </div>

      <div className="flex items-center gap-1">
        {isBasenameAvailable && (
          <Badge variant="outline" className="text-xs">
            .base.eth
          </Badge>
        )}
        
        {showCopyButton && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="h-6 w-6 p-0"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Copy address</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {showExternalLink && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleExternalLink}
                  className="h-6 w-6 p-0"
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>View on BaseScan</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-1">
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500"></div>
          <span className="text-xs text-gray-500">Loading...</span>
        </div>
      )}
    </div>
  );
}

// エクスポート用のシンプルバージョン
export function SimpleBasenameDisplay({ 
  address, 
  className = '' 
}: { 
  address: string; 
  className?: string; 
}) {
  console.log('🎨 SimpleBasenameDisplay rendering with address:', address);
  
  return (
    <BasenameDisplay 
      address={address} 
      variant="inline" 
      className={className}
    />
  );
}