import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { PaymentRequirements } from './signature-verifier';

interface JWSHeader {
  alg: 'RS256' | 'ES256';  // RSA-SHA256 or ECDSA-SHA256
  typ: 'JWT';
  kid: string;             // Key ID for public key lookup
}

interface JWSPayload {
  iss: string;            // Issuer (your service)
  iat: number;            // Issued at
  exp: number;            // Expiration (5 minutes from iat)
  sub: string;            // Subject (device:command)
  aud: string;            // Audience (client application)
  jti: string;            // JWT ID (for replay protection)
  requirements: string;   // Formatted requirements header string
}

interface JWKPublicKey {
  kty: 'RSA' | 'EC';
  use: 'sig';
  kid: string;
  alg: 'RS256' | 'ES256';
  n?: string;             // RSA modulus (base64url)
  e?: string;             // RSA exponent (base64url)
  x?: string;             // EC x coordinate (base64url)
  y?: string;             // EC y coordinate (base64url)
  crv?: string;           // EC curve name
}

interface JWKSResponse {
  keys: JWKPublicKey[];
}

interface KeyPair {
  private: crypto.KeyObject;
  public: crypto.KeyObject;
  algorithm: 'RS256' | 'ES256';
}

interface JWSVerificationResult {
  valid: boolean;
  payload?: JWSPayload;
  header?: JWSHeader;
  keyId?: string;
  algorithm?: string;
  error?: string;
  issuedAt?: number;
  expiresAt?: number;
}

export class JWSSignatureVerifier {
  private keyPairs: Map<string, KeyPair> = new Map();
  private currentKid: string;
  private issuer: string;
  private audience: string;
  
  constructor(issuer: string = 'xcockpit-api', audience: string = 'xcockpit-client') {
    this.issuer = issuer;
    this.audience = audience;
    this.loadKeyPairs();
    this.currentKid = this.getCurrentKeyId();
  }
  
  /**
   * JWS形式で支払い要件に署名
   */
  signPaymentRequirements(
    requirements: PaymentRequirements,
    subject?: string
  ): {
    requirementsHeader: string;
    signature: string;  // JWS Compact Serialization
  } {
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 300; // 5分間有効
    
    const header: JWSHeader = {
      alg: this.getAlgorithmForKey(this.currentKid),
      typ: 'JWT',
      kid: this.currentKid
    };
    
    const requirementsHeader = this.formatRequirementsHeader(requirements);
    
    const payload: JWSPayload = {
      iss: this.issuer,
      iat: now,
      exp: exp,
      sub: subject || `${requirements.orderId}:${requirements.nonce}`,
      aud: this.audience,
      jti: this.generateJTI(), // JWT ID for replay protection
      requirements: requirementsHeader
    };
    
    const encodedHeader = this.base64URLEncode(JSON.stringify(header));
    const encodedPayload = this.base64URLEncode(JSON.stringify(payload));
    const signingInput = `${encodedHeader}.${encodedPayload}`;
    
    const keyPair = this.keyPairs.get(this.currentKid);
    if (!keyPair) {
      throw new Error(`Key pair not found for kid: ${this.currentKid}`);
    }
    
    const signature = crypto.sign(
      header.alg === 'RS256' ? 'sha256' : 'sha256',
      Buffer.from(signingInput),
      {
        key: keyPair.private,
        padding: header.alg === 'RS256' ? crypto.constants.RSA_PKCS1_PSS_PADDING : undefined
      }
    );
    
    const encodedSignature = this.base64URLEncode(signature);
    const jws = `${signingInput}.${encodedSignature}`;
    
    return {
      requirementsHeader,
      signature: `jws=${jws}`
    };
  }
  
  /**
   * JWS署名の検証
   */
  verifyPaymentRequirements(
    requirementsHeader: string,
    signatureHeader: string
  ): JWSVerificationResult {
    if (!signatureHeader.startsWith('jws=')) {
      return { valid: false, error: 'Not a JWS signature' };
    }
    
    try {
      const jws = signatureHeader.substring(4);
      const [encodedHeader, encodedPayload, encodedSignature] = jws.split('.');
      
      if (!encodedHeader || !encodedPayload || !encodedSignature) {
        return { valid: false, error: 'Invalid JWS format' };
      }
      
      const header: JWSHeader = JSON.parse(this.base64URLDecode(encodedHeader));
      const payload: JWSPayload = JSON.parse(this.base64URLDecode(encodedPayload));
      
      // 基本的な構造チェック
      if (!header.alg || !header.kid || header.typ !== 'JWT') {
        return { valid: false, error: 'Invalid JWS header' };
      }
      
      if (!payload.iss || !payload.aud || !payload.exp || !payload.requirements) {
        return { valid: false, error: 'Invalid JWS payload' };
      }
      
      // 発行者・受信者チェック
      if (payload.iss !== this.issuer) {
        return { valid: false, error: `Invalid issuer: expected ${this.issuer}, got ${payload.iss}` };
      }
      
      if (payload.aud !== this.audience) {
        return { valid: false, error: `Invalid audience: expected ${this.audience}, got ${payload.aud}` };
      }
      
      // 有効期限チェック
      const now = Math.floor(Date.now() / 1000);
      if (now > payload.exp) {
        return { 
          valid: false, 
          error: `Token expired at ${new Date(payload.exp * 1000).toISOString()}`,
          expiresAt: payload.exp
        };
      }
      
      // 発行時刻チェック (not before)
      if (payload.iat && now < payload.iat - 60) { // 60秒のクロックスキュー許容
        return { 
          valid: false, 
          error: `Token not yet valid (iat: ${new Date(payload.iat * 1000).toISOString()})`,
          issuedAt: payload.iat
        };
      }
      
      // 公開鍵取得
      const keyPair = this.keyPairs.get(header.kid);
      if (!keyPair) {
        return { 
          valid: false, 
          error: `Unknown key ID: ${header.kid}`,
          keyId: header.kid
        };
      }
      
      // アルゴリズムチェック
      if (header.alg !== keyPair.algorithm) {
        return { 
          valid: false, 
          error: `Algorithm mismatch: header ${header.alg}, key ${keyPair.algorithm}` 
        };
      }
      
      // 署名検証
      const signingInput = `${encodedHeader}.${encodedPayload}`;
      const signature = this.base64URLDecodeBuffer(encodedSignature);
      
      const isValid = crypto.verify(
        header.alg === 'RS256' ? 'sha256' : 'sha256',
        Buffer.from(signingInput),
        {
          key: keyPair.public,
          padding: header.alg === 'RS256' ? crypto.constants.RSA_PKCS1_PSS_PADDING : undefined
        },
        signature
      );
      
      return {
        valid: isValid,
        payload: isValid ? payload : undefined,
        header,
        keyId: header.kid,
        algorithm: header.alg,
        issuedAt: payload.iat,
        expiresAt: payload.exp,
        error: isValid ? undefined : 'Signature verification failed'
      };
      
    } catch (error) {
      return { 
        valid: false, 
        error: `JWS verification error: ${(error as Error).message}` 
      };
    }
  }
  
  /**
   * JWKS (JSON Web Key Set) を生成
   */
  getJWKS(): JWKSResponse {
    const keys: JWKPublicKey[] = [];
    
    this.keyPairs.forEach((keyPair, kid) => {
      try {
        if (keyPair.algorithm === 'RS256') {
          try {
            const publicKeyPem = keyPair.public.export({ type: 'spki', format: 'pem' }) as string;
            const publicKeyDer = keyPair.public.export({ type: 'spki', format: 'der' }) as Buffer;
            
            // RSA public keyの詳細をPEMから解析（簡略化）
            // 実際のJWKS生成では、より詳細なASN.1解析が必要
            keys.push({
              kty: 'RSA',
              use: 'sig',
              kid,
              alg: 'RS256',
              // JWKS用の詳細な解析は省略し、基本的なJWKを生成
              n: this.extractRSAModulus(publicKeyDer),
              e: 'AQAB' // 標準的な公開指数 65537
            });
          } catch (error) {
            console.warn(`Failed to export RSA public key for ${kid}:`, error);
          }
        } else if (keyPair.algorithm === 'ES256') {
          // EC key support (for future enhancement)
          try {
            // ECキーの場合のJWK生成（プレースホルダー）
            keys.push({
              kty: 'EC',
              use: 'sig', 
              kid,
              alg: 'ES256',
              crv: 'P-256',
              // x and y coordinates would be extracted here
              x: 'placeholder',
              y: 'placeholder'
            });
          } catch (error) {
            console.warn(`Failed to export EC public key for ${kid}:`, error);
          }
        }
      } catch (error) {
        console.error(`Failed to export public key for kid ${kid}:`, error);
      }
    });
    
    return { keys };
  }
  
  /**
   * 新しいRSAキーペアの生成と追加
   */
  generateRSAKeyPair(kid: string, keySize: number = 2048): void {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: keySize,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });
    
    this.keyPairs.set(kid, {
      private: crypto.createPrivateKey(privateKey),
      public: crypto.createPublicKey(publicKey),
      algorithm: 'RS256'
    });
    
    // キーファイルを保存
    const keysDir = process.env.X402_JWS_KEYS_DIR || path.join(process.cwd(), 'keys');
    if (!fs.existsSync(keysDir)) {
      fs.mkdirSync(keysDir, { recursive: true });
    }
    
    const privateKeyPath = path.join(keysDir, `${kid}.key`);
    const publicKeyPath = path.join(keysDir, `${kid}.pub`);
    
    fs.writeFileSync(privateKeyPath, privateKey);
    fs.writeFileSync(publicKeyPath, publicKey);
    
    // 現在のキーIDが設定されている場合、新しく生成されたキーに切り替え
    if (process.env.X402_JWS_CURRENT_KID === kid) {
      this.currentKid = kid;
    }
    
    console.log(`[JWSSignatureVerifier] Generated RSA key pair: ${kid}`);
  }
  
  /**
   * 新しいECキーペアの生成と追加
   */
  generateECKeyPair(kid: string, namedCurve: string = 'prime256v1'): void {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
      namedCurve,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });
    
    this.keyPairs.set(kid, {
      private: crypto.createPrivateKey(privateKey),
      public: crypto.createPublicKey(publicKey),
      algorithm: 'ES256'
    });
    
    // キーファイルを保存
    const keysDir = process.env.X402_JWS_KEYS_DIR || path.join(process.cwd(), 'keys');
    if (!fs.existsSync(keysDir)) {
      fs.mkdirSync(keysDir, { recursive: true });
    }
    
    const privateKeyPath = path.join(keysDir, `${kid}.key`);
    const publicKeyPath = path.join(keysDir, `${kid}.pub`);
    
    fs.writeFileSync(privateKeyPath, privateKey);
    fs.writeFileSync(publicKeyPath, publicKey);
    
    // 現在のキーIDが設定されている場合、新しく生成されたキーに切り替え
    if (process.env.X402_JWS_CURRENT_KID === kid) {
      this.currentKid = kid;
    }
    
    console.log(`[JWSSignatureVerifier] Generated EC key pair: ${kid}`);
  }
  
  /**
   * 鍵のローテーション
   */
  rotateKey(newKid: string, algorithm: 'RS256' | 'ES256' = 'RS256'): void {
    if (algorithm === 'RS256') {
      this.generateRSAKeyPair(newKid);
    } else {
      this.generateECKeyPair(newKid);
    }
    
    this.currentKid = newKid;
    
    // 古い鍵の清理
    const maxKeys = parseInt(process.env.X402_MAX_JWS_KEYS || '5');
    const keyIds = Array.from(this.keyPairs.keys());
    
    if (keyIds.length > maxKeys) {
      // 現在の鍵以外で最も古いものを削除
      const keysToDelete = keyIds
        .filter(kid => kid !== this.currentKid)
        .slice(0, keyIds.length - maxKeys);
      
      keysToDelete.forEach(kid => {
        this.keyPairs.delete(kid);
        console.log(`[JWSSignatureVerifier] Removed old key: ${kid}`);
      });
    }
  }
  
  /**
   * 鍵情報の取得
   */
  getKeyInfo(): { 
    currentKid: string; 
    availableKids: string[];
    algorithms: Record<string, string>;
  } {
    const algorithms: Record<string, string> = {};
    this.keyPairs.forEach((keyPair, kid) => {
      algorithms[kid] = keyPair.algorithm;
    });
    
    return {
      currentKid: this.currentKid,
      availableKids: Array.from(this.keyPairs.keys()),
      algorithms
    };
  }
  
  /**
   * システム検証
   */
  validateKeys(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // 現在の鍵の存在確認
    if (!this.keyPairs.has(this.currentKid)) {
      issues.push(`Current key ID '${this.currentKid}' not found`);
    }
    
    // 鍵の有効性チェック
    this.keyPairs.forEach((keyPair, kid) => {
      try {
        // 鍵が正常に動作するかテスト署名で確認
        const testData = 'test-signature-validation';
        const signature = crypto.sign(
          'sha256',
          Buffer.from(testData),
          {
            key: keyPair.private,
            padding: keyPair.algorithm === 'RS256' ? crypto.constants.RSA_PKCS1_PSS_PADDING : undefined
          }
        );
        
        const isValid = crypto.verify(
          'sha256',
          Buffer.from(testData),
          {
            key: keyPair.public,
            padding: keyPair.algorithm === 'RS256' ? crypto.constants.RSA_PKCS1_PSS_PADDING : undefined
          },
          signature
        );
        
        if (!isValid) {
          issues.push(`Key '${kid}' failed signature validation test`);
        }
      } catch (error) {
        issues.push(`Key '${kid}' validation error: ${(error as Error).message}`);
      }
    });
    
    // 本番環境でのテスト鍵チェック
    if (process.env.NODE_ENV === 'production') {
      this.keyPairs.forEach((_, kid) => {
        if (kid.startsWith('test-') || kid.includes('dev')) {
          issues.push(`Test/development key '${kid}' found in production`);
        }
      });
    }
    
    return {
      valid: issues.length === 0,
      issues
    };
  }
  
  /**
   * 統計情報の取得
   */
  getStats(): {
    keyCount: number;
    currentKeyId: string;
    algorithms: Record<string, number>;
  } {
    const algorithms: Record<string, number> = {};
    
    this.keyPairs.forEach(keyPair => {
      algorithms[keyPair.algorithm] = (algorithms[keyPair.algorithm] || 0) + 1;
    });
    
    return {
      keyCount: this.keyPairs.size,
      currentKeyId: this.currentKid,
      algorithms
    };
  }
  
  // プライベートメソッド
  private loadKeyPairs(): void {
    try {
      const keysJson = process.env.X402_JWS_KEYS;
      if (keysJson) {
        const keys = JSON.parse(keysJson);
        Object.entries(keys).forEach(([kid, keyData]: [string, any]) => {
          try {
            this.keyPairs.set(kid, {
              private: crypto.createPrivateKey(keyData.private),
              public: crypto.createPublicKey(keyData.public),
              algorithm: keyData.algorithm || 'RS256'
            });
            console.log(`[JWSSignatureVerifier] Loaded key pair: ${kid} (${keyData.algorithm || 'RS256'})`);
          } catch (error) {
            console.error(`[JWSSignatureVerifier] Failed to load key pair ${kid}:`, error);
          }
        });
      }
      
      // キーが設定されていない場合、デフォルトキーを生成
      if (this.keyPairs.size === 0) {
        const defaultKid = 'default-rsa';
        this.generateRSAKeyPair(defaultKid);
        console.log(`[JWSSignatureVerifier] Generated default RSA key pair: ${defaultKid}`);
      }
      
    } catch (error) {
      console.error('[JWSSignatureVerifier] Failed to load key pairs:', error);
      // フォールバック: デフォルトキーを生成
      const emergencyKid = 'emergency-rsa';
      this.generateRSAKeyPair(emergencyKid);
      console.log(`[JWSSignatureVerifier] Generated emergency RSA key pair: ${emergencyKid}`);
    }
  }
  
  private getCurrentKeyId(): string {
    const configured = process.env.X402_JWS_CURRENT_KID;
    if (configured && this.keyPairs.has(configured)) {
      return configured;
    }
    
    // フォールバック: 利用可能な最初のキー
    const keyIds = Array.from(this.keyPairs.keys());
    return keyIds[0];
  }
  
  private getAlgorithmForKey(kid: string): 'RS256' | 'ES256' {
    const keyPair = this.keyPairs.get(kid);
    return keyPair?.algorithm || 'RS256';
  }
  
  private generateJTI(): string {
    return crypto.randomBytes(16).toString('hex');
  }
  
  private base64URLEncode(data: string | Buffer): string {
    return Buffer.from(data).toString('base64url');
  }
  
  private base64URLDecode(data: string): string {
    return Buffer.from(data, 'base64url').toString();
  }
  
  private base64URLDecodeBuffer(data: string): Buffer {
    return Buffer.from(data, 'base64url');
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

  /**
   * RSA公開鍵からmodulus (n) を抽出（簡略化実装）
   * 実際の本番実装では適切なASN.1解析が必要
   */
  private extractRSAModulus(publicKeyDer: Buffer): string {
    // プレースホルダー実装
    // 実際には ASN.1 DER encoding を解析して RSA modulus を取得
    // 今回はテスト目的なので固定値を返す
    const hash = crypto.createHash('sha256').update(publicKeyDer).digest();
    return hash.toString('base64url').substring(0, 32);
  }
}

// デフォルトのインスタンスをエクスポート
export const jwsSignatureVerifier = new JWSSignatureVerifier();