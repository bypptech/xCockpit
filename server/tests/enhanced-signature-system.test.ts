import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { EnhancedSignatureVerifier } from '../services/enhanced-signature-verifier';
import { PaymentRequirements } from '../services/signature-verifier';
import * as crypto from 'crypto';

describe('Enhanced Signature System', () => {
  let verifier: EnhancedSignatureVerifier;
  
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
    // テスト用の環境変数設定
    process.env.X402_HMAC_KEYS = JSON.stringify({
      'test-key-1': 'a'.repeat(64), // 64文字の有効な鍵
      'test-key-2': 'b'.repeat(64),
      'default': 'c'.repeat(64)
    });
    process.env.X402_CURRENT_KEY_ID = 'test-key-1';
    
    verifier = new EnhancedSignatureVerifier();
  });

  describe('Key Management', () => {
    it('should load keys correctly', () => {
      const keyInfo = verifier.getKeyInfo();
      
      expect(keyInfo.currentKid).toBe('test-key-1');
      expect(keyInfo.availableKids).toContain('test-key-1');
      expect(keyInfo.availableKids).toContain('test-key-2');
      expect(keyInfo.availableKids).toContain('default');
    });

    it('should validate keys correctly', () => {
      const validation = verifier.validateKeys();
      
      expect(validation.valid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    it('should detect invalid key lengths', () => {
      process.env.X402_HMAC_KEYS = JSON.stringify({
        'short-key': 'short'  // 32文字未満
      });
      process.env.X402_CURRENT_KEY_ID = 'short-key';
      
      const verifierWithShortKey = new EnhancedSignatureVerifier();
      const validation = verifierWithShortKey.validateKeys();
      
      expect(validation.valid).toBe(false);
      expect(validation.issues.some(issue => issue.includes('too short'))).toBe(true);
    });

    it('should handle key rotation', () => {
      const newKeyId = 'rotated-key';
      const newSecret = 'd'.repeat(64);
      
      verifier.rotateKey(newKeyId, newSecret);
      
      const keyInfo = verifier.getKeyInfo();
      expect(keyInfo.currentKid).toBe(newKeyId);
      expect(keyInfo.availableKids).toContain(newKeyId);
    });

    it('should reject short keys during rotation', () => {
      expect(() => {
        verifier.rotateKey('bad-key', 'short');
      }).toThrow('Key must be at least 32 characters');
    });
  });

  describe('V2 Signature Generation', () => {
    it('should generate v2 signature with correct format', () => {
      const { requirementsHeader, signature } = verifier.signPaymentRequirementsV2(sampleRequirements);
      
      expect(signature).toMatch(/^v2=/);
      
      // Base64デコードして中身を確認
      const payloadJson = Buffer.from(signature.substring(3), 'base64').toString();
      const payload = JSON.parse(payloadJson);
      
      expect(payload.v).toBe('v2');
      expect(payload.kid).toBe('test-key-1');
      expect(payload.ts).toBeGreaterThan(Date.now() / 1000 - 10); // 10秒以内
      expect(payload.sig).toBeDefined();
      expect(typeof payload.sig).toBe('string');
    });

    it('should include timestamp in signature data', () => {
      const { signature: signature1 } = verifier.signPaymentRequirementsV2(sampleRequirements);
      
      // 少し待ってから再度署名（実際のテストでは省略、タイムスタンプの違いは別のテストで確認）
      // setTimeout(() => {
      //   const { signature: signature2 } = verifier.signPaymentRequirementsV2(sampleRequirements);
      //   expect(signature1).not.toBe(signature2); // タイムスタンプが異なるので署名も異なる
      // }, 1000);
    });
  });

  describe('V2 Signature Verification', () => {
    it('should verify valid v2 signature', () => {
      const { requirementsHeader, signature } = verifier.signPaymentRequirementsV2(sampleRequirements);
      
      const result = verifier.verifyPaymentRequirements(requirementsHeader, signature);
      
      expect(result.valid).toBe(true);
      expect(result.version).toBe('v2');
      expect(result.keyId).toBe('test-key-1');
      expect(result.timestamp).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it('should reject expired signatures', () => {
      // 手動で古いタイムスタンプの署名を作成
      const oldTimestamp = Math.floor(Date.now() / 1000) - 400; // 400秒前（5分以上前）
      const requirementsHeader = 'scheme="x402-exact", amount="0.01"';
      const signingData = requirementsHeader + '|ts=' + oldTimestamp;
      const hmacSig = crypto.createHmac('sha256', 'a'.repeat(64)).update(signingData).digest('hex');
      
      const payload = {
        v: 'v2',
        ts: oldTimestamp,
        kid: 'test-key-1',
        sig: hmacSig
      };
      
      const signature = `v2=${Buffer.from(JSON.stringify(payload)).toString('base64')}`;
      
      const result = verifier.verifyPaymentRequirements(requirementsHeader, signature);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('expired');
    });

    it('should reject signatures from future (clock skew protection)', () => {
      // 未来のタイムスタンプの署名を作成
      const futureTimestamp = Math.floor(Date.now() / 1000) + 120; // 2分後
      const requirementsHeader = 'scheme="x402-exact", amount="0.01"';
      const signingData = requirementsHeader + '|ts=' + futureTimestamp;
      const hmacSig = crypto.createHmac('sha256', 'a'.repeat(64)).update(signingData).digest('hex');
      
      const payload = {
        v: 'v2',
        ts: futureTimestamp,
        kid: 'test-key-1',
        sig: hmacSig
      };
      
      const signature = `v2=${Buffer.from(JSON.stringify(payload)).toString('base64')}`;
      
      const result = verifier.verifyPaymentRequirements(requirementsHeader, signature);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('future');
    });

    it('should reject signatures with unknown key ID', () => {
      const { requirementsHeader } = verifier.signPaymentRequirementsV2(sampleRequirements);
      
      // 存在しない鍵IDで署名を偽装
      const payload = {
        v: 'v2',
        ts: Math.floor(Date.now() / 1000),
        kid: 'unknown-key',
        sig: 'fake-signature'
      };
      
      const signature = `v2=${Buffer.from(JSON.stringify(payload)).toString('base64')}`;
      
      const result = verifier.verifyPaymentRequirements(requirementsHeader, signature);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unknown key ID');
      expect(result.keyId).toBe('unknown-key');
    });

    it('should reject malformed v2 signatures', () => {
      const requirementsHeader = 'scheme="x402-exact", amount="0.01"';
      
      // 不正な形式の署名
      const invalidSignatures = [
        'v2=not-base64-!@#$%',
        'v2=' + Buffer.from('not json').toString('base64'),
        'v2=' + Buffer.from('{"incomplete": true}').toString('base64')
      ];
      
      invalidSignatures.forEach(signature => {
        const result = verifier.verifyPaymentRequirements(requirementsHeader, signature);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });
  });

  describe('Backward Compatibility (V1)', () => {
    it('should verify legacy v1 signatures', () => {
      // レガシーのv1署名を手動で作成
      const requirementsHeader = 'scheme="x402-exact", amount="0.01"';
      const legacySignature = crypto.createHmac('sha256', 'c'.repeat(64)) // default鍵を使用
        .update(requirementsHeader)
        .digest('hex');
      const signature = `v1=${legacySignature}`;
      
      const result = verifier.verifyPaymentRequirements(requirementsHeader, signature);
      
      expect(result.valid).toBe(true);
      expect(result.version).toBe('v1');
      expect(result.keyId).toBe('legacy');
    });

    it('should reject unsupported signature versions', () => {
      const requirementsHeader = 'scheme="x402-exact", amount="0.01"';
      const unsupportedSignature = 'v3=some-future-signature-format';
      
      const result = verifier.verifyPaymentRequirements(requirementsHeader, unsupportedSignature);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unsupported signature version');
    });
  });

  describe('Security Features', () => {
    it('should use different signatures for same data at different times', () => {
      const { signature: sig1 } = verifier.signPaymentRequirementsV2(sampleRequirements);
      
      // 少し時間を置く（タイムスタンプが変わるように）
      return new Promise<void>(resolve => {
        setTimeout(() => {
          const { signature: sig2 } = verifier.signPaymentRequirementsV2(sampleRequirements);
          expect(sig1).not.toBe(sig2);
          resolve();
        }, 1000);
      });
    });

    it('should use timing-safe comparison for signature verification', () => {
      const { requirementsHeader, signature } = verifier.signPaymentRequirementsV2(sampleRequirements);
      
      // 正しい署名
      const result1 = verifier.verifyPaymentRequirements(requirementsHeader, signature);
      expect(result1.valid).toBe(true);
      
      // 署名の内容を改ざん（HMAC部分を変更）
      const payloadJson = Buffer.from(signature.substring(3), 'base64').toString();
      const payload = JSON.parse(payloadJson);
      payload.sig = payload.sig.slice(0, -2) + 'XX'; // HMAC署名の末尾を改ざん
      
      const tamperedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
      const tamperedSignature = 'v2=' + tamperedPayload;
      
      const result2 = verifier.verifyPaymentRequirements(requirementsHeader, tamperedSignature);
      expect(result2.valid).toBe(false);
      expect(result2.error).toContain('mismatch');
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should provide meaningful stats', () => {
      const stats = verifier.getStats();
      
      expect(stats.keyCount).toBeGreaterThan(0);
      expect(stats.currentKeyId).toBe('test-key-1');
    });

    it('should estimate key ages from date-based key IDs', () => {
      // 日付ベースの鍵IDでテスト
      process.env.X402_HMAC_KEYS = JSON.stringify({
        'prod-2025-01-15': 'a'.repeat(64),
        'prod-2025-02-01': 'b'.repeat(64),
      });
      
      const dateBasedVerifier = new EnhancedSignatureVerifier();
      const stats = dateBasedVerifier.getStats();
      
      expect(stats.oldestKeyAge).toBeDefined();
      expect(stats.newestKeyAge).toBeDefined();
      if (stats.oldestKeyAge !== undefined && stats.newestKeyAge !== undefined) {
        expect(stats.oldestKeyAge).toBeGreaterThanOrEqual(stats.newestKeyAge);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle missing environment variables gracefully', () => {
      delete process.env.X402_HMAC_KEYS;
      delete process.env.X402_CURRENT_KEY_ID;
      
      // エラーが投げられずに初期化できることを確認
      expect(() => new EnhancedSignatureVerifier()).not.toThrow();
      
      const gracefulVerifier = new EnhancedSignatureVerifier();
      const keyInfo = gracefulVerifier.getKeyInfo();
      
      // 緊急鍵が生成されることを確認
      expect(keyInfo.availableKids.length).toBeGreaterThan(0);
    });

    it('should handle JSON parse errors in key configuration', () => {
      process.env.X402_HMAC_KEYS = 'invalid-json';
      
      expect(() => new EnhancedSignatureVerifier()).not.toThrow();
      
      const errorHandlingVerifier = new EnhancedSignatureVerifier();
      const validation = errorHandlingVerifier.validateKeys();
      
      // 緊急鍵が生成され、動作することを確認
      expect(validation.valid).toBe(true);
    });
  });

  afterEach(() => {
    // テスト後のクリーンアップ
    delete process.env.X402_HMAC_KEYS;
    delete process.env.X402_CURRENT_KEY_ID;
    delete process.env.X402_MAX_KEYS;
  });
});