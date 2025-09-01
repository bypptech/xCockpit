# x402 署名セキュリティ強化計画

## 🔍 現状の課題分析

### 現在のHMAC署名方式の限界

| 項目 | 現状 | 問題点 |
|------|------|--------|
| **検証主体** | サーバー側のみ | クライアント側で署名検証不可能 |
| **鍵管理** | 単一HMAC秘密鍵 | Key Rotation困難 |
| **相互運用性** | プロプライエタリ形式 | 標準準拠なし |
| **CDN/Proxy対応** | 未対応 | エッジで検証不可能 |
| **デバッグ性** | 限定的 | 署名内容が不透明 |

### セキュリティリスク評価

```mermaid
graph TD
    A[HMAC Single Key] --> B[Key Compromise Risk]
    A --> C[No Key Rotation]
    A --> D[Single Point of Failure]
    B --> E[全システム影響]
    C --> F[運用リスク増大]
    D --> G[復旧困難]
```

## 🎯 改善戦略

### Phase 1: HMAC強化版 (後方互換性維持)

```typescript
// 改善されたHMAC署名形式
interface EnhancedHMACSignature {
  v: string;        // 署名バージョン (v2)
  ts: number;       // 署名時刻 (Unix timestamp)
  kid: string;      // 鍵ID (疑似的なKey Identifier)
  sig: string;      // HMAC-SHA256署名
}

// ヘッダー形式: X-Payment-Signature: v2=eyJ2IjoidjIiLCJ0cyI6MTcyNTI2NDAwMCwia2lkIjoicHJvZC0yMDI1LTAyIiwic2lnIjoiYWJjZGVmLi4uIn0
```

#### 実装例

```typescript
class EnhancedSignatureVerifier {
  private keyStore: Map<string, string> = new Map();
  private currentKid: string;
  
  constructor() {
    // Key rotation対応
    this.loadKeys();
    this.currentKid = this.getCurrentKeyId();
  }
  
  signPaymentRequirementsV2(requirements: PaymentRequirements): {
    requirementsHeader: string;
    signature: string;
  } {
    const requirementsHeader = this.formatRequirementsHeader(requirements);
    const timestamp = Math.floor(Date.now() / 1000);
    
    const payload = {
      v: 'v2',
      ts: timestamp,
      kid: this.currentKid,
      sig: this.signWithKey(requirementsHeader + timestamp, this.currentKid)
    };
    
    const signature = `v2=${Buffer.from(JSON.stringify(payload)).toString('base64')}`;
    
    return { requirementsHeader, signature };
  }
  
  verifyPaymentRequirementsV2(
    requirementsHeader: string, 
    signatureHeader: string
  ): { valid: boolean; keyId?: string; timestamp?: number; error?: string } {
    if (signatureHeader.startsWith('v1=')) {
      // 後方互換性: v1形式も処理
      return this.verifyV1Signature(requirementsHeader, signatureHeader);
    }
    
    if (!signatureHeader.startsWith('v2=')) {
      return { valid: false, error: 'Unsupported signature version' };
    }
    
    try {
      const payload = JSON.parse(
        Buffer.from(signatureHeader.substring(3), 'base64').toString()
      );
      
      // タイムスタンプ検証 (5分以内)
      const now = Math.floor(Date.now() / 1000);
      if (now - payload.ts > 300) {
        return { valid: false, error: 'Signature expired' };
      }
      
      // 鍵存在確認
      if (!this.keyStore.has(payload.kid)) {
        return { valid: false, error: 'Unknown key ID' };
      }
      
      // 署名検証
      const expectedSig = this.signWithKey(requirementsHeader + payload.ts, payload.kid);
      const isValid = crypto.timingSafeEqual(
        Buffer.from(payload.sig), 
        Buffer.from(expectedSig)
      );
      
      return {
        valid: isValid,
        keyId: payload.kid,
        timestamp: payload.ts
      };
      
    } catch (error) {
      return { valid: false, error: 'Invalid signature format' };
    }
  }
  
  private signWithKey(data: string, kid: string): string {
    const key = this.keyStore.get(kid);
    if (!key) throw new Error(`Key not found: ${kid}`);
    return crypto.createHmac('sha256', key).update(data).digest('hex');
  }
  
  private loadKeys() {
    // 環境変数から複数鍵を読み込み
    const keys = JSON.parse(process.env.X402_HMAC_KEYS || '{}');
    Object.entries(keys).forEach(([kid, secret]) => {
      this.keyStore.set(kid, secret as string);
    });
    
    // デフォルト鍵設定
    if (this.keyStore.size === 0) {
      this.keyStore.set('default', process.env.X402_HMAC_SECRET || crypto.randomBytes(32).toString('hex'));
    }
  }
  
  private getCurrentKeyId(): string {
    return process.env.X402_CURRENT_KEY_ID || 'default';
  }
  
  rotateKey(newKid: string, newSecret: string) {
    this.keyStore.set(newKid, newSecret);
    this.currentKid = newKid;
    console.log(`Key rotated to: ${newKid}`);
  }
}
```

### Phase 2: JWS (JSON Web Signature) 移行

```typescript
// JWS-based signature system
interface JWSHeader {
  alg: 'RS256' | 'ES256';  // RSA-SHA256 or ECDSA-SHA256
  typ: 'JWT';
  kid: string;             // Key ID for public key lookup
}

interface JWSPayload {
  iss: string;            // Issuer (your service)
  iat: number;            // Issued at
  exp: number;            // Expiration
  sub: string;            // Subject (device command)
  requirements: PaymentRequirements;
}

class JWSSignatureVerifier {
  private privateKeys: Map<string, crypto.KeyObject> = new Map();
  private publicKeys: Map<string, crypto.KeyObject> = new Map();
  
  constructor() {
    this.loadKeyPairs();
  }
  
  signPaymentRequirementsJWS(requirements: PaymentRequirements): {
    requirementsHeader: string;
    signature: string;  // JWS Compact Serialization
  } {
    const header: JWSHeader = {
      alg: 'RS256',
      typ: 'JWT',
      kid: this.getCurrentKeyId()
    };
    
    const payload: JWSPayload = {
      iss: 'xcockpit-api',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 300, // 5分有効
      sub: `${requirements.deviceId}:${requirements.command}`,
      requirements
    };
    
    const encodedHeader = this.base64URLEncode(JSON.stringify(header));
    const encodedPayload = this.base64URLEncode(JSON.stringify(payload));
    const signingInput = `${encodedHeader}.${encodedPayload}`;
    
    const signature = crypto.sign('sha256', Buffer.from(signingInput), {
      key: this.privateKeys.get(header.kid)!,
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING
    });
    
    const encodedSignature = this.base64URLEncode(signature);
    const jws = `${signingInput}.${encodedSignature}`;
    
    return {
      requirementsHeader: this.formatRequirementsHeader(requirements),
      signature: `jws=${jws}`
    };
  }
  
  verifyPaymentRequirementsJWS(
    requirementsHeader: string,
    signatureHeader: string
  ): { valid: boolean; payload?: JWSPayload; error?: string } {
    if (!signatureHeader.startsWith('jws=')) {
      return { valid: false, error: 'Not a JWS signature' };
    }
    
    try {
      const jws = signatureHeader.substring(4);
      const [encodedHeader, encodedPayload, encodedSignature] = jws.split('.');
      
      const header: JWSHeader = JSON.parse(this.base64URLDecode(encodedHeader));
      const payload: JWSPayload = JSON.parse(this.base64URLDecode(encodedPayload));
      
      // 有効期限チェック
      if (Date.now() / 1000 > payload.exp) {
        return { valid: false, error: 'Token expired' };
      }
      
      // 公開鍵取得
      const publicKey = this.publicKeys.get(header.kid);
      if (!publicKey) {
        return { valid: false, error: 'Unknown key ID' };
      }
      
      // 署名検証
      const signingInput = `${encodedHeader}.${encodedPayload}`;
      const signature = this.base64URLDecode(encodedSignature, true);
      
      const isValid = crypto.verify('sha256', Buffer.from(signingInput), {
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_PSS_PADDING
      }, signature);
      
      return { valid: isValid, payload };
      
    } catch (error) {
      return { valid: false, error: 'Invalid JWS format' };
    }
  }
  
  // 公開鍵をJWKS形式で提供
  getJWKS(): { keys: any[] } {
    const keys = Array.from(this.publicKeys.entries()).map(([kid, key]) => {
      const keyDetails = key.asymmetricKeyDetails!;
      return {
        kty: 'RSA',
        use: 'sig',
        kid,
        alg: 'RS256',
        n: keyDetails.n!.toString('base64url'),
        e: keyDetails.e!.toString('base64url')
      };
    });
    
    return { keys };
  }
  
  private base64URLEncode(data: string | Buffer): string {
    return Buffer.from(data).toString('base64url');
  }
  
  private base64URLDecode(data: string, asBuffer = false): any {
    const decoded = Buffer.from(data, 'base64url');
    return asBuffer ? decoded : decoded.toString();
  }
  
  private loadKeyPairs() {
    // RSA鍵ペア読み込み (PEM形式)
    const keyPairs = JSON.parse(process.env.X402_JWS_KEYS || '{}');
    Object.entries(keyPairs).forEach(([kid, keys]: [string, any]) => {
      this.privateKeys.set(kid, crypto.createPrivateKey(keys.private));
      this.publicKeys.set(kid, crypto.createPublicKey(keys.public));
    });
  }
  
  private getCurrentKeyId(): string {
    return process.env.X402_JWS_CURRENT_KID || 'prod-2025-02';
  }
}
```

## 🔧 実装ロードマップ

### Step 1: 環境変数設定強化

```bash
# Enhanced HMAC Keys (Phase 1)
X402_HMAC_KEYS='{"prod-2025-02":"32文字の秘密鍵","prod-2025-01":"旧32文字の秘密鍵"}'
X402_CURRENT_KEY_ID="prod-2025-02"

# JWS Keys (Phase 2)  
X402_JWS_KEYS='{"prod-2025-02":{"private":"-----BEGIN PRIVATE KEY-----...","public":"-----BEGIN PUBLIC KEY-----..."}}'
X402_JWS_CURRENT_KID="prod-2025-02"

# Signature Strategy
X402_SIGNATURE_STRATEGY="enhanced-hmac"  # enhanced-hmac | jws | dual
```

### Step 2: 段階的展開

```mermaid
gantt
    title 署名セキュリティ強化ロードマップ
    dateFormat  YYYY-MM-DD
    section Phase 1
    HMAC強化版実装      :active, p1a, 2025-02-01, 1w
    Key Rotation機能    :p1b, after p1a, 1w
    テスト・検証        :p1c, after p1b, 1w
    
    section Phase 2
    JWS実装開始         :p2a, after p1c, 2w
    JWKS endpoint追加   :p2b, after p2a, 1w
    
    section Phase 3
    Dual運用開始        :p3a, after p2b, 2w
    完全JWS移行        :p3b, after p3a, 4w
```

### Step 3: クライアント側実装例

```javascript
// Client-side signature verification (JWS)
class X402ClientVerifier {
  constructor(jwksUrl) {
    this.jwksUrl = jwksUrl;
    this.publicKeys = new Map();
  }
  
  async loadPublicKeys() {
    const response = await fetch(this.jwksUrl);
    const jwks = await response.json();
    
    for (const key of jwks.keys) {
      const publicKey = await this.importJWK(key);
      this.publicKeys.set(key.kid, publicKey);
    }
  }
  
  async verifyPaymentRequirements(signatureHeader) {
    if (!signatureHeader.startsWith('jws=')) {
      return { valid: false, error: 'Not a JWS signature' };
    }
    
    const jws = signatureHeader.substring(4);
    const [encodedHeader, encodedPayload, encodedSignature] = jws.split('.');
    
    const header = JSON.parse(this.base64URLDecode(encodedHeader));
    const payload = JSON.parse(this.base64URLDecode(encodedPayload));
    
    // 有効期限チェック
    if (Date.now() / 1000 > payload.exp) {
      return { valid: false, error: 'Token expired' };
    }
    
    // 公開鍵で署名検証
    const publicKey = this.publicKeys.get(header.kid);
    if (!publicKey) {
      await this.loadPublicKeys(); // 鍵をリフレッシュ
      const retryKey = this.publicKeys.get(header.kid);
      if (!retryKey) {
        return { valid: false, error: 'Unknown key ID' };
      }
      publicKey = retryKey;
    }
    
    const signingInput = `${encodedHeader}.${encodedPayload}`;
    const signature = this.base64URLDecode(encodedSignature, true);
    
    const isValid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      publicKey,
      signature,
      new TextEncoder().encode(signingInput)
    );
    
    return { valid: isValid, payload };
  }
  
  async importJWK(jwk) {
    return await crypto.subtle.importKey(
      'jwk',
      jwk,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: { name: 'SHA-256' }
      },
      false,
      ['verify']
    );
  }
  
  base64URLDecode(data, asArrayBuffer = false) {
    const padding = '='.repeat((4 - data.length % 4) % 4);
    const base64 = data.replace(/-/g, '+').replace(/_/g, '/') + padding;
    const decoded = atob(base64);
    
    if (asArrayBuffer) {
      return Uint8Array.from(decoded, c => c.charCodeAt(0));
    }
    return decoded;
  }
}

// 使用例
const verifier = new X402ClientVerifier('https://api.xcockpit.com/.well-known/jwks.json');
await verifier.loadPublicKeys();

const result = await verifier.verifyPaymentRequirements(signatureHeader);
if (result.valid) {
  console.log('署名検証成功:', result.payload);
} else {
  console.error('署名検証失敗:', result.error);
}
```

## 🚀 運用上の利点

### 1. セキュリティ向上
- **Key Rotation**: 定期的な鍵更新が可能
- **鍵分離**: 用途別・環境別の鍵管理
- **公開鍵検証**: クライアント側での独立検証

### 2. 相互運用性
- **標準準拠**: JWS/JWT標準との互換性
- **ツール対応**: 既存のJWT toolsが利用可能
- **CDN/Proxy**: エッジでの署名検証が可能

### 3. 運用改善
- **透明性**: 署名内容が可読
- **デバッグ**: トラブルシューティングが容易
- **監査**: 署名履歴の追跡が可能

### 4. スケーラビリティ
- **分散検証**: 各サービスで独立検証
- **キャッシュ**: 公開鍵のCDNキャッシュ
- **ロードバランシング**: 署名検証の分散処理

## 📋 チェックリスト

### Phase 1 実装
- [ ] EnhancedSignatureVerifierクラス実装
- [ ] v2署名形式対応
- [ ] Key Rotation機能実装
- [ ] 後方互換性テスト

### Phase 2 実装  
- [ ] JWSSignatureVerifierクラス実装
- [ ] RSA/ECDSA鍵ペア生成
- [ ] JWKS endpoint実装
- [ ] クライアント側検証ライブラリ

### 運用準備
- [ ] 鍵管理ポリシー策定
- [ ] Key Rotation手順書作成
- [ ] 監視・アラート設定
- [ ] 緊急時対応計画

この改善により、x402プロトコルの署名システムは業界標準に準拠し、将来の拡張性と相互運用性を大幅に向上させることができます。

---

**次のステップ**: Phase 1のEnhanced HMAC実装から開始し、段階的にJWS移行を進める予定です。