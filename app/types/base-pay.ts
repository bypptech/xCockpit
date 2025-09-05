// Base Pay (OnchainKit) Type Definitions

export interface BasePayConfig {
  projectId: string;
  apiKey: string;
  network: 'sepolia' | 'base' | 'base-sepolia';
  usdcAddress: string;
}

export interface PaymentRequest {
  amount: string;
  currency: 'USDC' | 'ETH';
  recipient: string;
  metadata?: {
    deviceId: string;
    command: string;
    userId?: string;
    sessionId?: string;
  };
  callbackUrl?: string;
}

export interface PaymentResult {
  transactionHash: string;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: number;
  blockNumber?: number;
  from: string;
  to: string;
  amount: string;
  currency: string;
  network: string;
  gasUsed?: string;
  effectiveGasPrice?: string;
}

export interface PaymentError {
  code: string;
  message: string;
  details?: any;
}

export interface WebhookPayload {
  event: 'payment.created' | 'payment.completed' | 'payment.failed';
  timestamp: number;
  data: {
    paymentId: string;
    transactionHash?: string;
    status: string;
    amount: string;
    currency: string;
    from: string;
    to: string;
    metadata?: Record<string, any>;
  };
}

export interface TransactionQuote {
  estimatedGas: string;
  gasPrice: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  totalCostInWei: string;
  totalCostInEth: string;
  totalCostInUsd?: string;
}

// OnchainKit specific types
export interface OnchainKitTransaction {
  to: `0x${string}`;
  value?: bigint;
  data?: `0x${string}`;
  gas?: bigint;
  gasPrice?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  nonce?: number;
  chainId: number;
}

export interface OnchainKitError {
  name: string;
  message: string;
  code?: string;
  cause?: unknown;
}

// Component Props
export interface BasePayButtonProps {
  amount: string;
  recipient: string;
  currency?: 'USDC' | 'ETH';
  metadata?: Record<string, any>;
  onSuccess?: (result: PaymentResult) => void;
  onError?: (error: PaymentError) => void;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export interface BasePayModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: string;
  recipient: string;
  currency?: 'USDC' | 'ETH';
  metadata?: Record<string, any>;
  onSuccess?: (result: PaymentResult) => void;
  onError?: (error: PaymentError) => void;
}