import * as crypto from 'crypto';

export interface PaymentRequirements {
  scheme: string;
  chain: string;
  token: string;
  amount: string;
  currency: string;
  to: string;
  minConfirmations: number;
  orderId: string;
  nonce: string;
  nonceExp: string;
  callback?: string;
}

export class SignatureVerifier {
  private secret: string;
  
  constructor(secret?: string) {
    this.secret = secret || process.env.X402_HMAC_SECRET || crypto.randomBytes(32).toString('hex');
    
    if (!secret && !process.env.X402_HMAC_SECRET) {
      console.warn('[SignatureVerifier] No HMAC secret provided, generated random secret:', this.secret);
    }
  }
  
  static sign(data: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  }
  
  static verify(data: string, signature: string, secret: string): boolean {
    try {
      const expectedSignature = SignatureVerifier.sign(data, secret);
      return crypto.timingSafeEqual(
        Buffer.from(signature), 
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      console.error('Signature verification error:', error);
      return false;
    }
  }
  
  signPaymentRequirements(requirements: PaymentRequirements): {
    requirementsHeader: string;
    signature: string;
  } {
    const requirementsHeader = this.formatRequirementsHeader(requirements);
    const signature = `v1=${SignatureVerifier.sign(requirementsHeader, this.secret)}`;
    
    return {
      requirementsHeader,
      signature
    };
  }
  
  verifyPaymentRequirements(
    requirementsHeader: string, 
    signatureHeader: string
  ): boolean {
    if (!signatureHeader.startsWith('v1=')) {
      console.error('Invalid signature format');
      return false;
    }
    
    const signature = signatureHeader.substring(3);
    return SignatureVerifier.verify(requirementsHeader, signature, this.secret);
  }
  
  private formatRequirementsHeader(requirements: PaymentRequirements): string {
    const parts = [
      `scheme="${requirements.scheme}"`,
      `chain="${requirements.chain}"`,
      `token="${requirements.token}"`,
      `amount="${requirements.amount}"`,
      `currency="${requirements.currency}"`,
      `to="${requirements.to}"`,
      `min_confirmations="${requirements.minConfirmations}"`,
      `order_id="${requirements.orderId}"`,
      `nonce="${requirements.nonce}"`,
      `nonce_exp="${requirements.nonceExp}"`
    ];
    
    if (requirements.callback) {
      parts.push(`callback="${requirements.callback}"`);
    }
    
    return parts.join(', ');
  }
  
  parseRequirementsHeader(header: string): PaymentRequirements | null {
    try {
      const regex = /(\w+)="([^"]+)"/g;
      const matches: Record<string, string> = {};
      let match;
      
      while ((match = regex.exec(header)) !== null) {
        matches[match[1]] = match[2];
      }
      
      if (!matches.scheme || !matches.chain || !matches.token || 
          !matches.amount || !matches.to || !matches.order_id || 
          !matches.nonce || !matches.nonce_exp) {
        console.error('Missing required fields in payment requirements');
        return null;
      }
      
      return {
        scheme: matches.scheme,
        chain: matches.chain,
        token: matches.token,
        amount: matches.amount,
        currency: matches.currency || 'USDC',
        to: matches.to,
        minConfirmations: parseInt(matches.min_confirmations || '0'),
        orderId: matches.order_id,
        nonce: matches.nonce,
        nonceExp: matches.nonce_exp,
        callback: matches.callback
      };
    } catch (error) {
      console.error('Failed to parse requirements header:', error);
      return null;
    }
  }
  
  generatePaymentStateHeader(
    txHash: string,
    confirmations: number,
    chain: string = 'eip155:8453'
  ): string {
    return `paid; chain="${chain}"; tx_hash="${txHash}"; confirmations="${confirmations}"`;
  }
  
  hashTransaction(txData: Record<string, any>): string {
    const sortedData = Object.keys(txData)
      .sort()
      .reduce((acc, key) => {
        acc[key] = txData[key];
        return acc;
      }, {} as Record<string, any>);
    
    const dataString = JSON.stringify(sortedData);
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }
  
  generateAPIKey(): string {
    return `x402_${crypto.randomBytes(32).toString('hex')}`;
  }
  
  verifyAPIKey(apiKey: string, expectedHash: string): boolean {
    const hash = crypto.createHash('sha256').update(apiKey).digest('hex');
    return hash === expectedHash;
  }
}

export const signatureVerifier = new SignatureVerifier();