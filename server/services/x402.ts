import { BlockchainVerifier } from './blockchain-verifier';
import { orderManager, OrderValidation } from './order-manager';
import { signatureVerifier, PaymentRequirements } from './signature-verifier';
import { enhancedSignatureVerifier } from './enhanced-signature-verifier';
import { jwsSignatureVerifier } from './jws-signature-verifier';
import { getDeviceFee } from '../storage';

export interface X402PaymentRequest {
  amount: string;
  currency: string;
  network: string;
  recipient: string;
  metadata?: {
    txHash?: string;
    orderId?: string;
    nonce?: string;
    [key: string]: any;
  };
  minConfirmations?: number;
}

export interface X402PaymentResponse {
  paymentId: string;
  txHash: string;
  amount: string;
  currency: string;
  network: string;
  timestamp: string;
}

export class X402Service {
  private static blockchainVerifier: BlockchainVerifier | null = null;
  
  static initialize(network: 'mainnet' | 'sepolia' = 'sepolia') {
    this.blockchainVerifier = new BlockchainVerifier(network);
  }
  
  static async calculateDevicePrice(deviceId: string, command: string): Promise<string> {
    // ESP32_002 always uses fixed fee of 0.123 USDC (Gacha Live Demo)
    if (deviceId === 'ESP32_002') {
      console.log(`💰 Using fixed fee for ${deviceId}: 0.123 USDC (Gacha Live Demo)`);
      return '0.123';
    }
    
    // Load persisted fees from storage for other devices
    const fee = await getDeviceFee(deviceId);
    
    if (fee) {
      console.log(`💰 Using persisted fee for ${deviceId}: ${fee} USDC`);
      return fee;
    }
    
    // Fallback to default pricing if no persisted fee
    const defaultPricing: Record<string, string> = {
      'ESP32_001': '0.5',   // Default Gacha #001 fee
      'ESP32_002': '0.123', // Fixed Gacha Live Demo fee (fallback)
    };
    
    const basePrice = defaultPricing[deviceId] || '0.01';
    console.log(`💰 Using default fee for ${deviceId}: ${basePrice} USDC`);
    return basePrice;
  }

  static async create402Response(deviceId: string, command: string, ttlMinutes: number = 5) {
    const amount = await this.calculateDevicePrice(deviceId, command);
    const recipient = process.env.PAYMENT_RECIPIENT || '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238';
    const network = process.env.NETWORK || 'sepolia';
    const isMainnet = network === 'mainnet';
    
    const { orderId, nonce, nonceExp } = orderManager.generateOrder(ttlMinutes, {
      deviceId,
      command,
      amount
    });
    
    const requirements: PaymentRequirements = {
      scheme: 'x402-exact',
      chain: isMainnet ? 'eip155:8453' : 'eip155:84532',
      token: isMainnet 
        ? 'erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' 
        : 'erc20:0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      amount: amount,
      currency: 'USDC',
      to: recipient,
      minConfirmations: 0,
      orderId,
      nonce,
      nonceExp,
      callback: process.env.PAYMENT_CALLBACK_URL
    };
    
    // 署名システムの選択
    const signatureStrategy = process.env.X402_SIGNATURE_STRATEGY || 'enhanced-hmac';
    let requirementsHeader: string;
    let signature: string;
    
    switch (signatureStrategy) {
      case 'jws':
        ({ requirementsHeader, signature } = jwsSignatureVerifier.signPaymentRequirements(requirements));
        break;
      case 'enhanced-hmac':
      case 'v2':
        ({ requirementsHeader, signature } = enhancedSignatureVerifier.signPaymentRequirementsV2(requirements));
        break;
      case 'dual':
        // デュアル署名（JWSを優先、フォールバック用にHMAC）
        ({ requirementsHeader, signature } = jwsSignatureVerifier.signPaymentRequirements(requirements));
        break;
      default:
        // レガシーHMAC (v1)
        ({ requirementsHeader, signature } = signatureVerifier.signPaymentRequirements(requirements));
    }
    
    return {
      status: 402,
      headers: {
        'Content-Type': 'application/json',
        'WWW-Authenticate': 'Payment',
        'X-Payment-Requirements': requirementsHeader,
        'X-Payment-Signature': signature
      },
      body: {
        message: 'Payment Required',
        orderId,
        nonce,
        expiresAt: nonceExp,
        payment: {
          accepts: [{
            scheme: 'x402-exact',
            network: requirements.chain,
            asset: requirements.token,
            amount: amount,
            recipient: recipient,
            minConfirmations: 0
          }],
          metadata: {
            deviceId,
            command,
            orderId,
            timestamp: new Date().toISOString()
          }
        }
      }
    };
  }

  static parsePaymentHeader(paymentHeader: string): X402PaymentRequest | null {
    try {
      const decoded = Buffer.from(paymentHeader, 'base64').toString('utf-8');
      const payment = JSON.parse(decoded);
      
      if (!payment.amount || !payment.currency || !payment.network || !payment.recipient) {
        return null;
      }
      
      return payment;
    } catch (error) {
      return null;
    }
  }

  static createPaymentResponse(payment: X402PaymentRequest, paymentId: string): X402PaymentResponse {
    return {
      paymentId,
      txHash: payment.metadata?.txHash || '',
      amount: payment.amount,
      currency: payment.currency,
      network: payment.network,
      timestamp: new Date().toISOString()
    };
  }

  static async verifyPayment(
    payment: X402PaymentRequest, 
    requirementsHeader?: string,
    signatureHeader?: string
  ): Promise<{
    verified: boolean;
    error?: string;
    confirmations?: number;
    orderValidation?: OrderValidation;
    blockchainResult?: any;
  }> {
    try {
      if (process.env.ENHANCED_X402 !== 'true') {
        return {
          verified: !!(payment.amount && payment.currency && payment.network && payment.metadata?.txHash)
        };
      }
      
      if (!this.blockchainVerifier) {
        this.initialize(process.env.NETWORK as 'mainnet' | 'sepolia' || 'sepolia');
      }
      
      // 署名検証（複数方式対応）
      if (requirementsHeader && signatureHeader) {
        let verificationResult: any = null;
        
        // JWS署名の検証
        if (signatureHeader.startsWith('jws=')) {
          verificationResult = jwsSignatureVerifier.verifyPaymentRequirements(
            requirementsHeader, 
            signatureHeader
          );
          
          if (process.env.DEBUG_X402 === 'true') {
            console.log('JWS signature verification:', {
              valid: verificationResult.valid,
              algorithm: verificationResult.algorithm,
              keyId: verificationResult.keyId,
              issuedAt: verificationResult.issuedAt,
              expiresAt: verificationResult.expiresAt
            });
          }
        }
        // Enhanced HMAC署名の検証
        else if (signatureHeader.startsWith('v2=')) {
          verificationResult = enhancedSignatureVerifier.verifyPaymentRequirements(
            requirementsHeader, 
            signatureHeader
          );
          
          if (process.env.DEBUG_X402 === 'true') {
            console.log('Enhanced HMAC signature verification:', {
              valid: verificationResult.valid,
              version: verificationResult.version,
              keyId: verificationResult.keyId,
              timestamp: verificationResult.timestamp
            });
          }
        }
        // レガシーHMAC署名の検証
        else if (signatureHeader.startsWith('v1=')) {
          const isValid = signatureVerifier.verifyPaymentRequirements(requirementsHeader, signatureHeader);
          verificationResult = { valid: isValid, version: 'v1' };
          
          if (process.env.DEBUG_X402 === 'true') {
            console.log('Legacy HMAC signature verification:', { valid: isValid });
          }
        }
        else {
          return { 
            verified: false, 
            error: 'Unsupported signature format' 
          };
        }
        
        if (!verificationResult || !verificationResult.valid) {
          console.warn('Signature verification failed:', verificationResult);
          return { 
            verified: false, 
            error: `Signature verification failed: ${verificationResult?.error || 'Unknown error'}` 
          };
        }
      }
      
      const { orderId, nonce, txHash } = payment.metadata || {};
      
      if (!orderId || !nonce) {
        return { verified: false, error: 'Missing order ID or nonce' };
      }
      
      const orderValidation = orderManager.validateOrder(orderId, nonce);
      if (!orderValidation.valid) {
        return { 
          verified: false, 
          error: orderValidation.error,
          orderValidation 
        };
      }
      
      if (!txHash) {
        return { verified: false, error: 'Missing transaction hash' };
      }
      
      const blockchainResult = await this.blockchainVerifier!.verifyUSDCTransfer({
        txHash,
        expectedTo: payment.recipient,
        minAmount: payment.amount,
        minConfirmations: payment.minConfirmations || 0
      });
      
      if (!blockchainResult.verified) {
        return { 
          verified: false, 
          error: blockchainResult.error,
          confirmations: blockchainResult.confirmations,
          blockchainResult 
        };
      }
      
      const consumed = orderManager.consumeOrder(orderId, nonce, txHash);
      if (!consumed) {
        return { verified: false, error: 'Failed to consume order' };
      }
      
      return {
        verified: true,
        confirmations: blockchainResult.confirmations,
        orderValidation,
        blockchainResult
      };
      
    } catch (error) {
      console.error('Payment verification error:', error);
      return { 
        verified: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
  
  static async waitForConfirmations(
    txHash: string,
    targetConfirmations: number,
    maxWaitTime: number = 60000
  ): Promise<boolean> {
    if (!this.blockchainVerifier) {
      this.initialize();
    }
    
    return this.blockchainVerifier!.waitForConfirmations(
      txHash, 
      targetConfirmations, 
      maxWaitTime
    );
  }
  
  static generatePaymentStateHeader(
    txHash: string,
    confirmations: number,
    network?: string
  ): string {
    const chain = network === 'mainnet' ? 'eip155:8453' : 'eip155:84532';
    return signatureVerifier.generatePaymentStateHeader(txHash, confirmations, chain);
  }
  
  /**
   * 署名システム管理機能
   */
  static getSignatureSystemInfo(): {
    current: 'legacy' | 'enhanced' | 'jws' | 'dual';
    strategy: string;
    hmac?: any;
    jws?: any;
    validation: any;
  } {
    const strategy = process.env.X402_SIGNATURE_STRATEGY || 'enhanced-hmac';
    const info: any = {
      current: strategy === 'jws' ? 'jws' : 
               strategy === 'dual' ? 'dual' :
               strategy.includes('enhanced') || strategy === 'v2' ? 'enhanced' : 'legacy',
      strategy
    };
    
    // HMAC系の情報
    if (strategy !== 'jws') {
      info.hmac = {
        keyInfo: enhancedSignatureVerifier.getKeyInfo(),
        validation: enhancedSignatureVerifier.validateKeys(),
        stats: enhancedSignatureVerifier.getStats()
      };
    }
    
    // JWS系の情報
    if (strategy === 'jws' || strategy === 'dual') {
      info.jws = {
        keyInfo: jwsSignatureVerifier.getKeyInfo(),
        validation: jwsSignatureVerifier.validateKeys(),
        stats: jwsSignatureVerifier.getStats()
      };
    }
    
    // 全体的な検証
    const allIssues = [
      ...(info.hmac?.validation?.issues || []),
      ...(info.jws?.validation?.issues || [])
    ];
    
    info.validation = {
      valid: allIssues.length === 0,
      issues: allIssues
    };
    
    return info;
  }
  
  /**
   * 鍵のローテーション（管理者機能）
   */
  static rotateSigningKey(
    newKid: string, 
    newSecret?: string, 
    algorithm?: 'RS256' | 'ES256'
  ): {
    success: boolean;
    error?: string;
  } {
    try {
      const strategy = process.env.X402_SIGNATURE_STRATEGY || 'enhanced-hmac';
      
      if (strategy === 'jws' || strategy === 'dual') {
        // JWS鍵のローテーション
        jwsSignatureVerifier.rotateKey(newKid, algorithm || 'RS256');
        return { success: true };
      } else if (strategy.includes('enhanced') || strategy === 'v2') {
        // HMAC鍵のローテーション
        if (!newSecret) {
          return { 
            success: false, 
            error: 'HMAC key rotation requires newSecret parameter' 
          };
        }
        enhancedSignatureVerifier.rotateKey(newKid, newSecret);
        return { success: true };
      } else {
        return { 
          success: false, 
          error: 'Key rotation requires Enhanced or JWS signature system' 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
  
  /**
   * JWKS (JSON Web Key Set) の取得
   */
  static getJWKS(): any {
    const strategy = process.env.X402_SIGNATURE_STRATEGY || 'enhanced-hmac';
    
    if (strategy === 'jws' || strategy === 'dual') {
      return jwsSignatureVerifier.getJWKS();
    } else {
      return { 
        error: 'JWKS is only available with JWS signature strategy',
        keys: []
      };
    }
  }
  
  /**
   * システム健全性チェック
   */
  static healthCheck(): {
    signature: { system: string; valid: boolean; issues: string[] };
    blockchain: { connected: boolean; network: string };
    orderManager: { active: boolean; cleanupNeeded: boolean };
  } {
    const signatureInfo = this.getSignatureSystemInfo();
    
    return {
      signature: {
        system: signatureInfo.current,
        valid: signatureInfo.validation.valid,
        issues: signatureInfo.validation.issues
      },
      blockchain: {
        connected: !!this.blockchainVerifier,
        network: process.env.NETWORK || 'sepolia'
      },
      orderManager: {
        active: true, // OrderManagerは常にアクティブ
        cleanupNeeded: false // 実装可能：期限切れorderの清理が必要かどうか
      }
    };
  }
}
