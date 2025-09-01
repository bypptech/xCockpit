import * as crypto from 'crypto';
import { PaymentRequirements } from './signature-verifier';

interface EnhancedHMACSignature {
  v: string;        // 署名バージョン (v2)
  ts: number;       // 署名時刻 (Unix timestamp)
  kid: string;      // 鍵ID (Key Identifier)
  sig: string;      // HMAC-SHA256署名
}

interface SignatureVerificationResult {
  valid: boolean;
  keyId?: string;
  timestamp?: number;
  version?: string;
  error?: string;
}

export class EnhancedSignatureVerifier {
  private keyStore: Map<string, string> = new Map();
  private currentKid: string;
  
  constructor() {
    this.loadKeys();
    this.currentKid = this.getCurrentKeyId();
  }
  
  /**
   * Enhanced HMAC署名生成 (v2形式)
   */
  signPaymentRequirementsV2(requirements: PaymentRequirements): {
    requirementsHeader: string;
    signature: string;
  } {
    const requirementsHeader = this.formatRequirementsHeader(requirements);
    const timestamp = Math.floor(Date.now() / 1000);
    
    // データにタイムスタンプを含めて署名
    const signingData = requirementsHeader + '|ts=' + timestamp;
    const hmacSignature = this.signWithKey(signingData, this.currentKid);
    
    const payload: EnhancedHMACSignature = {
      v: 'v2',
      ts: timestamp,
      kid: this.currentKid,
      sig: hmacSignature
    };
    
    const signature = `v2=${Buffer.from(JSON.stringify(payload)).toString('base64')}`;
    
    return { requirementsHeader, signature };
  }
  
  /**
   * 後方互換性を持った署名検証
   */
  verifyPaymentRequirements(
    requirementsHeader: string, 
    signatureHeader: string
  ): SignatureVerificationResult {
    if (signatureHeader.startsWith('v1=')) {
      // 既存のv1形式の署名検証
      return this.verifyV1Signature(requirementsHeader, signatureHeader);
    }
    
    if (signatureHeader.startsWith('v2=')) {
      // 新しいv2形式の署名検証
      return this.verifyV2Signature(requirementsHeader, signatureHeader);
    }
    
    return { valid: false, error: 'Unsupported signature version' };
  }
  
  /**
   * V2署名の検証
   */
  private verifyV2Signature(
    requirementsHeader: string,
    signatureHeader: string
  ): SignatureVerificationResult {
    try {
      const payload: EnhancedHMACSignature = JSON.parse(
        Buffer.from(signatureHeader.substring(3), 'base64').toString()
      );
      
      // 基本的な形式チェック
      if (!payload.v || !payload.ts || !payload.kid || !payload.sig) {
        return { valid: false, error: 'Invalid signature payload' };
      }
      
      // タイムスタンプ検証 (5分以内)
      const now = Math.floor(Date.now() / 1000);
      const age = now - payload.ts;
      if (age > 300) {
        return { 
          valid: false, 
          error: `Signature expired (${age}s old, max 300s)`,
          timestamp: payload.ts,
          keyId: payload.kid
        };
      }
      
      if (age < -60) {
        return { 
          valid: false, 
          error: 'Signature from future (clock skew?)',
          timestamp: payload.ts,
          keyId: payload.kid
        };
      }
      
      // 鍵存在確認
      if (!this.keyStore.has(payload.kid)) {
        return { 
          valid: false, 
          error: `Unknown key ID: ${payload.kid}`,
          keyId: payload.kid
        };
      }
      
      // 署名検証
      const signingData = requirementsHeader + '|ts=' + payload.ts;
      const expectedSig = this.signWithKey(signingData, payload.kid);
      const isValid = crypto.timingSafeEqual(
        Buffer.from(payload.sig), 
        Buffer.from(expectedSig)
      );
      
      return {
        valid: isValid,
        keyId: payload.kid,
        timestamp: payload.ts,
        version: payload.v,
        error: isValid ? undefined : 'Signature mismatch'
      };
      
    } catch (error) {
      return { 
        valid: false, 
        error: `Invalid signature format: ${(error as Error).message}` 
      };
    }
  }
  
  /**
   * V1署名の後方互換性検証
   */
  private verifyV1Signature(
    requirementsHeader: string,
    signatureHeader: string
  ): SignatureVerificationResult {
    if (!signatureHeader.startsWith('v1=')) {
      return { valid: false, error: 'Invalid v1 signature format' };
    }
    
    try {
      const signature = signatureHeader.substring(3);
      
      // デフォルト鍵で検証
      const defaultKey = this.keyStore.get('default') || this.keyStore.get(this.currentKid);
      if (!defaultKey) {
        return { valid: false, error: 'No default key for v1 verification' };
      }
      
      const expectedSignature = crypto.createHmac('sha256', defaultKey)
        .update(requirementsHeader)
        .digest('hex');
      
      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature), 
        Buffer.from(expectedSignature)
      );
      
      return {
        valid: isValid,
        version: 'v1',
        keyId: 'legacy',
        error: isValid ? undefined : 'Legacy signature mismatch'
      };
    } catch (error) {
      return { 
        valid: false, 
        error: `V1 signature verification failed: ${(error as Error).message}` 
      };
    }
  }
  
  /**
   * 指定された鍵でデータに署名
   */
  private signWithKey(data: string, kid: string): string {
    const key = this.keyStore.get(kid);
    if (!key) {
      throw new Error(`Key not found: ${kid}`);
    }
    return crypto.createHmac('sha256', key).update(data).digest('hex');
  }
  
  /**
   * 鍵の読み込み
   */
  private loadKeys() {
    try {
      // 複数鍵対応
      const keysJson = process.env.X402_HMAC_KEYS;
      if (keysJson) {
        const keys = JSON.parse(keysJson);
        Object.entries(keys).forEach(([kid, secret]) => {
          this.keyStore.set(kid, secret as string);
          console.log(`[EnhancedSignatureVerifier] Loaded key: ${kid}`);
        });
      }
      
      // 後方互換性: 単一鍵もサポート
      const legacySecret = process.env.X402_HMAC_SECRET;
      if (legacySecret && !this.keyStore.has('default')) {
        this.keyStore.set('default', legacySecret);
        console.log('[EnhancedSignatureVerifier] Loaded legacy key as default');
      }
      
      // 鍵が全く設定されていない場合
      if (this.keyStore.size === 0) {
        const randomSecret = crypto.randomBytes(32).toString('hex');
        this.keyStore.set('emergency', randomSecret);
        console.warn('[EnhancedSignatureVerifier] No keys configured, generated emergency key:', randomSecret.substring(0, 8) + '...');
      }
      
    } catch (error) {
      console.error('[EnhancedSignatureVerifier] Failed to load keys:', error);
      // フォールバック: 緊急用鍵を生成
      const emergencySecret = crypto.randomBytes(32).toString('hex');
      this.keyStore.set('emergency', emergencySecret);
    }
  }
  
  /**
   * 現在の鍵IDを取得
   */
  private getCurrentKeyId(): string {
    const configured = process.env.X402_CURRENT_KEY_ID;
    if (configured && this.keyStore.has(configured)) {
      return configured;
    }
    
    // フォールバック順序: prod-* > dev-* > default > 最初の鍵
    const keyIds = Array.from(this.keyStore.keys());
    
    const prodKey = keyIds.find(kid => kid.startsWith('prod-'));
    if (prodKey) return prodKey;
    
    const devKey = keyIds.find(kid => kid.startsWith('dev-'));
    if (devKey) return devKey;
    
    if (keyIds.includes('default')) return 'default';
    
    return keyIds[0];
  }
  
  /**
   * 鍵のローテーション
   */
  rotateKey(newKid: string, newSecret: string): void {
    if (newSecret.length < 32) {
      throw new Error('Key must be at least 32 characters');
    }
    
    this.keyStore.set(newKid, newSecret);
    this.currentKid = newKid;
    
    console.log(`[EnhancedSignatureVerifier] Key rotated to: ${newKid}`);
    
    // 古い鍵の自動削除 (設定可能)
    const maxKeys = parseInt(process.env.X402_MAX_KEYS || '5');
    const keyIds = Array.from(this.keyStore.keys());
    
    if (keyIds.length > maxKeys) {
      // 'emergency' と 'default' 以外の最も古い鍵を削除
      const deletableKeys = keyIds.filter(kid => !['emergency', 'default'].includes(kid));
      if (deletableKeys.length > maxKeys - 2) {
        const toDelete = deletableKeys.slice(0, deletableKeys.length - (maxKeys - 2));
        toDelete.forEach(kid => {
          this.keyStore.delete(kid);
          console.log(`[EnhancedSignatureVerifier] Removed old key: ${kid}`);
        });
      }
    }
  }
  
  /**
   * 鍵情報の取得 (デバッグ用)
   */
  getKeyInfo(): { currentKid: string; availableKids: string[] } {
    return {
      currentKid: this.currentKid,
      availableKids: Array.from(this.keyStore.keys())
    };
  }
  
  /**
   * 鍵の健全性チェック
   */
  validateKeys(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // 現在の鍵の存在確認
    if (!this.keyStore.has(this.currentKid)) {
      issues.push(`Current key ID '${this.currentKid}' not found in keystore`);
    }
    
    // 鍵の最小長チェック
    this.keyStore.forEach((secret, kid) => {
      if (secret.length < 32) {
        issues.push(`Key '${kid}' is too short (${secret.length} < 32)`);
      }
    });
    
    // 本番環境での緊急鍵チェック
    if (process.env.NODE_ENV === 'production' && this.currentKid === 'emergency') {
      issues.push('Using emergency key in production environment');
    }
    
    return {
      valid: issues.length === 0,
      issues
    };
  }
  
  /**
   * Requirements ヘッダーのフォーマット (既存の実装を再利用)
   */
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
  
  /**
   * 統計情報の取得
   */
  getStats(): {
    keyCount: number;
    currentKeyId: string;
    oldestKeyAge?: number;
    newestKeyAge?: number;
  } {
    const stats = {
      keyCount: this.keyStore.size,
      currentKeyId: this.currentKid,
      oldestKeyAge: undefined as number | undefined,
      newestKeyAge: undefined as number | undefined
    };
    
    // タイムスタンプ付きの鍵ID（例: prod-2025-02-01）から年齢を推定
    const keyDates = Array.from(this.keyStore.keys())
      .map(kid => {
        const match = kid.match(/(\d{4})-(\d{2})-(\d{2})$/);
        if (match) {
          const [, year, month, day] = match;
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        }
        return null;
      })
      .filter(date => date !== null) as Date[];
    
    if (keyDates.length > 0) {
      const now = new Date();
      const ages = keyDates.map(date => (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      stats.oldestKeyAge = Math.max(...ages);
      stats.newestKeyAge = Math.min(...ages);
    }
    
    return stats;
  }
}

// デフォルトのインスタンスをエクスポート
export const enhancedSignatureVerifier = new EnhancedSignatureVerifier();