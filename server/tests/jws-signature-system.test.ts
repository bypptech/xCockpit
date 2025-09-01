import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { JWSSignatureVerifier } from '../services/jws-signature-verifier';
import { PaymentRequirements } from '../services/signature-verifier';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

describe('JWS Signature System', () => {
  let verifier: JWSSignatureVerifier;
  const testKeysDir = path.join(__dirname, 'test-keys');
  
  const sampleRequirements: PaymentRequirements = {
    scheme: 'x402-exact',
    chain: 'eip155:84532',
    token: 'erc20:0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    amount: '0.01',
    currency: 'USDC',
    to: '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238',
    minConfirmations: 0,
    orderId: 'ord_test123',
    nonce: 'nx_test456',
    nonceExp: '2025-09-01T10:00:00Z'
  };

  beforeEach(() => {
    // テスト用ディレクトリ作成
    if (!fs.existsSync(testKeysDir)) {
      fs.mkdirSync(testKeysDir, { recursive: true });
    }
    
    // テスト用の環境変数設定
    process.env.X402_JWS_KEYS_DIR = testKeysDir;
    process.env.X402_JWS_CURRENT_KID = 'test-rsa-key';
    process.env.X402_JWS_DEFAULT_ALGORITHM = 'RS256';
    
    verifier = new JWSSignatureVerifier();
  });

  describe('Key Management', () => {
    it('should generate RSA key pair correctly', () => {
      const keyId = 'test-rsa-key';
      
      verifier.generateRSAKeyPair(keyId, 2048);
      
      const keyInfo = verifier.getKeyInfo();
      expect(keyInfo.availableKids).toContain(keyId);
      expect(keyInfo.currentKid).toBe(keyId);
      
      // ファイルが作成されているか確認
      const privateKeyPath = path.join(testKeysDir, `${keyId}.key`);
      const publicKeyPath = path.join(testKeysDir, `${keyId}.pub`);
      
      expect(fs.existsSync(privateKeyPath)).toBe(true);
      expect(fs.existsSync(publicKeyPath)).toBe(true);
    });

    it('should generate ECDSA key pair correctly', () => {
      const keyId = 'test-ec-key';
      
      verifier.generateECKeyPair(keyId, 'prime256v1');
      
      const keyInfo = verifier.getKeyInfo();
      expect(keyInfo.availableKids).toContain(keyId);
      
      // ファイルが作成されているか確認
      const privateKeyPath = path.join(testKeysDir, `${keyId}.key`);
      const publicKeyPath = path.join(testKeysDir, `${keyId}.pub`);
      
      expect(fs.existsSync(privateKeyPath)).toBe(true);
      expect(fs.existsSync(publicKeyPath)).toBe(true);
    });

    it('should load existing keys correctly', () => {
      // 最初にキーを生成
      verifier.generateRSAKeyPair('existing-key', 2048);
      
      // 新しいインスタンスを作成（既存キーを読み込み）
      const newVerifier = new JWSSignatureVerifier();
      const keyInfo = newVerifier.getKeyInfo();
      
      expect(keyInfo.availableKids).toContain('existing-key');
    });

    it('should handle key rotation correctly', () => {
      const oldKeyId = 'old-key';
      const newKeyId = 'new-key';
      
      verifier.generateRSAKeyPair(oldKeyId, 2048);
      expect(verifier.getKeyInfo().currentKid).toBe(oldKeyId);
      
      verifier.rotateKey(newKeyId, 'RS256');
      
      const keyInfo = verifier.getKeyInfo();
      expect(keyInfo.currentKid).toBe(newKeyId);
      expect(keyInfo.availableKids).toContain(oldKeyId);
      expect(keyInfo.availableKids).toContain(newKeyId);
    });
  });

  describe('JWS Signature Generation', () => {
    beforeEach(() => {
      verifier.generateRSAKeyPair('test-rsa-key', 2048);
    });

    it('should generate valid JWS signature with RS256', () => {
      const { requirementsHeader, signature } = verifier.signPaymentRequirements(sampleRequirements);
      
      expect(signature).toMatch(/^jws=.+\..+\..+$/); // JWS Compact Serialization format
      
      // JWSヘッダーを解析
      const parts = signature.substring(4).split('.');
      expect(parts).toHaveLength(3);
      
      const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
      expect(header.alg).toBe('RS256');
      expect(header.kid).toBe('test-rsa-key');
      expect(header.typ).toBe('JWT');
    });

    it('should include correct payload in JWS', () => {
      const { requirementsHeader, signature } = verifier.signPaymentRequirements(sampleRequirements, 'test-subject');
      
      const parts = signature.substring(4).split('.');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      
      expect(payload.sub).toBe('test-subject');
      expect(payload.iat).toBeDefined();
      expect(payload.exp).toBeDefined();
      expect(payload.iss).toBe('xcockpit-api');
      expect(payload.aud).toBe('xcockpit-client');
      expect(payload.requirements).toBe(requirementsHeader);
      
      // 有効期限が適切に設定されているか確認（5分後）
      const now = Math.floor(Date.now() / 1000);
      expect(payload.exp - payload.iat).toBe(300); // 5分 = 300秒
      expect(payload.iat).toBeGreaterThanOrEqual(now - 5); // 5秒以内の誤差を許容
    });

    it('should generate different signatures for same data at different times', () => {
      const { signature: sig1 } = verifier.signPaymentRequirements(sampleRequirements);
      
      return new Promise<void>(resolve => {
        setTimeout(() => {
          const { signature: sig2 } = verifier.signPaymentRequirements(sampleRequirements);
          expect(sig1).not.toBe(sig2); // タイムスタンプが異なるため署名も異なる
          resolve();
        }, 1000);
      });
    });
  });

  describe('JWS Signature Verification', () => {
    beforeEach(() => {
      verifier.generateRSAKeyPair('test-rsa-key', 2048);
    });

    it('should verify valid JWS signature', () => {
      const { requirementsHeader, signature } = verifier.signPaymentRequirements(sampleRequirements);
      
      const result = verifier.verifyPaymentRequirements(requirementsHeader, signature);
      
      expect(result.valid).toBe(true);
      expect(result.algorithm).toBe('RS256');
      expect(result.keyId).toBe('test-rsa-key');
      expect(result.issuedAt).toBeDefined();
      expect(result.expiresAt).toBeDefined();
      expect(result.payload?.sub).toBe(`${sampleRequirements.orderId}:${sampleRequirements.nonce}`); // デフォルトでは orderId:nonce が設定される
    });

    it('should verify JWS with subject', () => {
      const testSubject = 'user123';
      const { requirementsHeader, signature } = verifier.signPaymentRequirements(sampleRequirements, testSubject);
      
      const result = verifier.verifyPaymentRequirements(requirementsHeader, signature);
      
      expect(result.valid).toBe(true);
      expect(result.payload?.sub).toBe(testSubject);
    });

    it('should reject expired JWS tokens', () => {
      // 過去の時刻でJWSトークンを手動作成
      const header = {
        alg: 'RS256',
        typ: 'JWT',
        kid: 'test-rsa-key'
      };
      
      const expiredTime = Math.floor(Date.now() / 1000) - 400; // 400秒前（5分以上前）
      const payload = {
        iss: 'xcockpit-api',
        aud: 'xcockpit-client',
        iat: expiredTime - 300,
        exp: expiredTime,
        requirements: 'scheme="x402-exact", amount="0.01"'
      };
      
      const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
      const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
      const signingInput = `${headerB64}.${payloadB64}`;
      
      // 手動で署名を作成
      const privateKey = fs.readFileSync(path.join(testKeysDir, 'test-rsa-key.key'), 'utf8');
      const signature = crypto.sign('RSA-SHA256', Buffer.from(signingInput), privateKey);
      const signatureB64 = signature.toString('base64url');
      
      const jws = `jws=${headerB64}.${payloadB64}.${signatureB64}`;
      
      const result = verifier.verifyPaymentRequirements('scheme="x402-exact", amount="0.01"', jws);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('expired');
    });

    it('should reject JWS with future timestamps (clock skew protection)', () => {
      // 未来の時刻でJWSトークンを手動作成
      const header = {
        alg: 'RS256',
        typ: 'JWT',
        kid: 'test-rsa-key'
      };
      
      const futureTime = Math.floor(Date.now() / 1000) + 120; // 2分後
      const payload = {
        iss: 'xcockpit-api',
        aud: 'xcockpit-client',
        iat: futureTime,
        exp: futureTime + 300,
        requirements: 'scheme="x402-exact", amount="0.01"'
      };
      
      const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
      const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
      const signingInput = `${headerB64}.${payloadB64}`;
      
      const privateKey = fs.readFileSync(path.join(testKeysDir, 'test-rsa-key.key'), 'utf8');
      const signature = crypto.sign('RSA-SHA256', Buffer.from(signingInput), privateKey);
      const signatureB64 = signature.toString('base64url');
      
      const jws = `jws=${headerB64}.${payloadB64}.${signatureB64}`;
      
      const result = verifier.verifyPaymentRequirements('scheme="x402-exact", amount="0.01"', jws);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('future');
    });

    it('should reject JWS with unknown key ID', () => {
      const { requirementsHeader } = verifier.signPaymentRequirements(sampleRequirements);
      
      // 存在しない鍵IDでJWSを作成
      const header = {
        alg: 'RS256',
        typ: 'JWT',
        kid: 'unknown-key'
      };
      
      const payload = {
        iss: 'xcockpit-api',
        aud: 'xcockpit-client',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 300,
        requirements: requirementsHeader
      };
      
      const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
      const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
      const fakeSignature = crypto.randomBytes(32).toString('base64url');
      
      const jws = `jws=${headerB64}.${payloadB64}.${fakeSignature}`;
      
      const result = verifier.verifyPaymentRequirements(requirementsHeader, jws);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Key not found');
      expect(result.keyId).toBe('unknown-key');
    });

    it('should reject malformed JWS tokens', () => {
      const requirementsHeader = 'scheme="x402-exact", amount="0.01"';
      
      const malformedTokens = [
        'jws=not-base64-!@#$%',
        'jws=onlyonepart',
        'jws=two.parts',
        'jws=invalid.base64.signature',
        'not-jws-format',
        ''
      ];
      
      malformedTokens.forEach(token => {
        const result = verifier.verifyPaymentRequirements(requirementsHeader, token);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    it('should reject JWS with tampered signature', () => {
      const { requirementsHeader, signature } = verifier.signPaymentRequirements(sampleRequirements);
      
      // 署名部分を改ざん
      const parts = signature.substring(4).split('.');
      const tamperedSignature = parts[2].slice(0, -2) + 'XX'; // 署名の末尾を改ざん
      const tamperedJws = `jws=${parts[0]}.${parts[1]}.${tamperedSignature}`;
      
      const result = verifier.verifyPaymentRequirements(requirementsHeader, tamperedJws);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('signature verification failed');
    });
  });

  describe('JWKS (JSON Web Key Set)', () => {
    beforeEach(() => {
      verifier.generateRSAKeyPair('rsa-key-1', 2048);
      verifier.generateECKeyPair('ec-key-1', 'prime256v1');
    });

    it('should generate valid JWKS with all public keys', () => {
      const jwks = verifier.getJWKS();
      
      expect(jwks.keys).toHaveLength(2);
      
      // RSA鍵の確認
      const rsaKey = jwks.keys.find(k => k.kid === 'rsa-key-1');
      expect(rsaKey).toBeDefined();
      expect(rsaKey?.kty).toBe('RSA');
      expect(rsaKey?.alg).toBe('RS256');
      expect(rsaKey?.use).toBe('sig');
      expect(rsaKey?.n).toBeDefined(); // RSA modulus
      expect(rsaKey?.e).toBeDefined(); // RSA exponent
      
      // ECDSA鍵の確認
      const ecKey = jwks.keys.find(k => k.kid === 'ec-key-1');
      expect(ecKey).toBeDefined();
      expect(ecKey?.kty).toBe('EC');
      expect(ecKey?.alg).toBe('ES256');
      expect(ecKey?.use).toBe('sig');
      expect(ecKey?.crv).toBe('P-256');
      expect(ecKey?.x).toBeDefined(); // EC x coordinate
      expect(ecKey?.y).toBeDefined(); // EC y coordinate
    });

    it('should not include private key material in JWKS', () => {
      const jwks = verifier.getJWKS();
      
      jwks.keys.forEach(key => {
        expect((key as any).d).toBeUndefined(); // 秘密鍵情報は含まれない
        expect((key as any).p).toBeUndefined(); // RSA prime factor
        expect((key as any).q).toBeUndefined(); // RSA prime factor
      });
    });

    it('should handle empty key store gracefully', () => {
      const emptyVerifier = new JWSSignatureVerifier();
      const jwks = emptyVerifier.getJWKS();
      
      expect(jwks.keys).toHaveLength(0);
    });
  });

  describe('Algorithm Support', () => {
    it('should support ES256 with ECDSA keys', () => {
      verifier.generateECKeyPair('test-ec-key', 'secp256r1');
      process.env.X402_JWS_CURRENT_KID = 'test-ec-key';
      process.env.X402_JWS_DEFAULT_ALGORITHM = 'ES256';
      
      const ecVerifier = new JWSSignatureVerifier();
      const { requirementsHeader, signature } = ecVerifier.signPaymentRequirements(sampleRequirements);
      
      expect(signature).toMatch(/^jws=.+\..+\..+$/);
      
      // ヘッダーを確認
      const parts = signature.substring(4).split('.');
      const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
      expect(header.alg).toBe('ES256');
      expect(header.kid).toBe('test-ec-key');
      
      // 検証も成功することを確認
      const result = ecVerifier.verifyPaymentRequirements(requirementsHeader, signature);
      expect(result.valid).toBe(true);
      expect(result.algorithm).toBe('ES256');
    });

    it('should reject unsupported algorithms', () => {
      expect(() => {
        verifier.generateRSAKeyPair('test-key', 2048);
        // 手動でサポートされていないアルゴリズムを設定
        const header = {
          alg: 'HS256', // HMAC - JWSでサポートしていない
          typ: 'JWT',
          kid: 'test-key'
        };
        
        // この段階ではエラーは発生しないが、verifyで失敗する
        const payload = {
          iss: 'x402-payment-service',
          aud: 'x402-client',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 300,
          requirements: 'test'
        };
        
        const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
        const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
        const fakeSignature = crypto.randomBytes(32).toString('base64url');
        
        const jws = `jws=${headerB64}.${payloadB64}.${fakeSignature}`;
        
        const result = verifier.verifyPaymentRequirements('test', jws);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Unsupported algorithm');
      }).not.toThrow();
    });
  });

  describe('Statistics and Monitoring', () => {
    beforeEach(() => {
      verifier.generateRSAKeyPair('rsa-key-1', 2048);
      verifier.generateECKeyPair('ec-key-1', 'prime256v1');
    });

    it('should provide meaningful stats', () => {
      const stats = verifier.getStats();
      
      expect(stats.keyCount).toBe(2);
      expect(stats.algorithms).toContain('RS256');
      expect(stats.algorithms).toContain('ES256');
      expect(stats.currentKeyId).toBe('rsa-key-1'); // 最初に作成されたキーが現在のキー
    });

    it('should validate keys correctly', () => {
      const validation = verifier.validateKeys();
      
      expect(validation.valid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    it('should detect missing key files', () => {
      // キーファイルを削除
      const keyPath = path.join(testKeysDir, 'rsa-key-1.key');
      if (fs.existsSync(keyPath)) {
        fs.unlinkSync(keyPath);
      }
      
      const validation = verifier.validateKeys();
      
      expect(validation.valid).toBe(false);
      expect(validation.issues.some(issue => issue.includes('Private key file not found'))).toBe(true);
    });
  });

  afterEach(() => {
    // テスト後のクリーンアップ
    if (fs.existsSync(testKeysDir)) {
      const files = fs.readdirSync(testKeysDir);
      files.forEach(file => {
        fs.unlinkSync(path.join(testKeysDir, file));
      });
      fs.rmdirSync(testKeysDir);
    }
    
    // 環境変数をクリア
    delete process.env.X402_JWS_KEYS_DIR;
    delete process.env.X402_JWS_CURRENT_KID;
    delete process.env.X402_JWS_DEFAULT_ALGORITHM;
  });
});