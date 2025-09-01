import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { X402Service } from '../services/x402';
import { PaymentRequirements } from '../services/signature-verifier';
import * as fs from 'fs';
import * as path from 'path';

describe('X402 Signature System Integration', () => {
  const testKeysDir = path.join(__dirname, 'test-integration-keys');
  
  const sampleDeviceId = 'ESP32_001';
  const sampleCommand = 'activate';
  
  beforeEach(() => {
    // テスト用ディレクトリ作成
    if (!fs.existsSync(testKeysDir)) {
      fs.mkdirSync(testKeysDir, { recursive: true });
    }
    
    // 共通の環境変数設定
    process.env.PAYMENT_RECIPIENT = '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238';
    process.env.NETWORK = 'sepolia';
    process.env.X402_JWS_KEYS_DIR = testKeysDir;
  });

  describe('Strategy: Enhanced HMAC (v2)', () => {
    beforeEach(() => {
      process.env.X402_SIGNATURE_STRATEGY = 'enhanced-hmac';
      process.env.X402_HMAC_KEYS = JSON.stringify({
        'test-hmac-key': 'a'.repeat(64),
        'default': 'b'.repeat(64)
      });
      process.env.X402_CURRENT_KEY_ID = 'test-hmac-key';
    });

    it('should create 402 response with Enhanced HMAC signature', () => {
      const response = X402Service.create402Response(sampleDeviceId, sampleCommand);
      
      expect(response.status).toBe(402);
      expect(response.headers['X-Payment-Requirements']).toBeDefined();
      expect(response.headers['X-Payment-Signature']).toBeDefined();
      expect(response.headers['X-Payment-Signature']).toMatch(/^v2=/);
      
      // 署名ペイロードを確認
      const signaturePayload = JSON.parse(
        Buffer.from(response.headers['X-Payment-Signature'].substring(3), 'base64').toString()
      );
      expect(signaturePayload.v).toBe('v2');
      expect(signaturePayload.kid).toBe('test-hmac-key');
      expect(signaturePayload.ts).toBeDefined();
      expect(signaturePayload.sig).toBeDefined();
    });

    it('should verify Enhanced HMAC payment correctly', async () => {
      const response = X402Service.create402Response(sampleDeviceId, sampleCommand);
      
      // 模擬的な支払い情報を作成
      const payment = {
        amount: response.body.payment.accepts[0].amount,
        currency: 'USDC',
        network: 'sepolia',
        recipient: response.body.payment.accepts[0].recipient,
        metadata: {
          txHash: '0x' + 'a'.repeat(64),
          orderId: response.body.orderId,
          nonce: response.body.nonce
        }
      };
      
      process.env.ENHANCED_X402 = 'false'; // 簡易検証モード
      
      const verificationResult = await X402Service.verifyPayment(
        payment,
        response.headers['X-Payment-Requirements'],
        response.headers['X-Payment-Signature']
      );
      
      expect(verificationResult.verified).toBe(true);
    });
  });

  describe('Strategy: JWS', () => {
    beforeEach(() => {
      process.env.X402_SIGNATURE_STRATEGY = 'jws';
      process.env.X402_JWS_CURRENT_KID = 'test-rsa-key';
      process.env.X402_JWS_DEFAULT_ALGORITHM = 'RS256';
      
      // JWS用のキーを生成（実際のテストではこれが事前に存在する想定）
      const { JWSSignatureVerifier } = require('../services/jws-signature-verifier');
      const jwsVerifier = new JWSSignatureVerifier();
      jwsVerifier.generateRSAKeyPair('test-rsa-key', 2048);
    });

    it('should create 402 response with JWS signature', () => {
      const response = X402Service.create402Response(sampleDeviceId, sampleCommand);
      
      expect(response.status).toBe(402);
      expect(response.headers['X-Payment-Requirements']).toBeDefined();
      expect(response.headers['X-Payment-Signature']).toBeDefined();
      expect(response.headers['X-Payment-Signature']).toMatch(/^jws=.+\..+\..+$/);
      
      // JWSヘッダーを確認
      const jwsParts = response.headers['X-Payment-Signature'].substring(4).split('.');
      const header = JSON.parse(Buffer.from(jwsParts[0], 'base64url').toString());
      expect(header.alg).toBe('RS256');
      expect(header.kid).toBe('test-rsa-key');
      expect(header.typ).toBe('JWT');
    });

    it('should verify JWS payment correctly', async () => {
      const response = X402Service.create402Response(sampleDeviceId, sampleCommand);
      
      // 模擬的な支払い情報を作成
      const payment = {
        amount: response.body.payment.accepts[0].amount,
        currency: 'USDC',
        network: 'sepolia',
        recipient: response.body.payment.accepts[0].recipient,
        metadata: {
          txHash: '0x' + 'a'.repeat(64),
          orderId: response.body.orderId,
          nonce: response.body.nonce
        }
      };
      
      process.env.ENHANCED_X402 = 'false'; // 簡易検証モード
      
      const verificationResult = await X402Service.verifyPayment(
        payment,
        response.headers['X-Payment-Requirements'],
        response.headers['X-Payment-Signature']
      );
      
      expect(verificationResult.verified).toBe(true);
    });

    it('should generate JWKS correctly', () => {
      const jwks = X402Service.getJWKS();
      
      expect(jwks.keys).toBeDefined();
      expect(jwks.keys.length).toBeGreaterThan(0);
      
      const rsaKey = jwks.keys.find((k: any) => k.kid === 'test-rsa-key');
      expect(rsaKey).toBeDefined();
      expect(rsaKey.kty).toBe('RSA');
      expect(rsaKey.alg).toBe('RS256');
      expect(rsaKey.n).toBeDefined();
      expect(rsaKey.e).toBeDefined();
    });
  });

  describe('Strategy: Dual (JWS + HMAC fallback)', () => {
    beforeEach(() => {
      process.env.X402_SIGNATURE_STRATEGY = 'dual';
      process.env.X402_JWS_CURRENT_KID = 'test-rsa-key';
      process.env.X402_HMAC_KEYS = JSON.stringify({
        'test-hmac-key': 'a'.repeat(64)
      });
      
      // 両方のキーを準備
      const { JWSSignatureVerifier } = require('../services/jws-signature-verifier');
      const jwsVerifier = new JWSSignatureVerifier();
      jwsVerifier.generateRSAKeyPair('test-rsa-key', 2048);
    });

    it('should create 402 response with JWS signature (JWS優先)', () => {
      const response = X402Service.create402Response(sampleDeviceId, sampleCommand);
      
      expect(response.status).toBe(402);
      expect(response.headers['X-Payment-Signature']).toMatch(/^jws=/);
    });

    it('should verify both JWS and HMAC signatures', async () => {
      const response = X402Service.create402Response(sampleDeviceId, sampleCommand);
      
      const payment = {
        amount: response.body.payment.accepts[0].amount,
        currency: 'USDC',
        network: 'sepolia',
        recipient: response.body.payment.accepts[0].recipient,
        metadata: {
          txHash: '0x' + 'a'.repeat(64),
          orderId: response.body.orderId,
          nonce: response.body.nonce
        }
      };
      
      process.env.ENHANCED_X402 = 'false';
      
      // JWS署名の検証
      const jwsResult = await X402Service.verifyPayment(
        payment,
        response.headers['X-Payment-Requirements'],
        response.headers['X-Payment-Signature']
      );
      
      expect(jwsResult.verified).toBe(true);
      
      // HMAC署名も動作することを確認（手動でHMAC署名を作成）
      process.env.X402_SIGNATURE_STRATEGY = 'enhanced-hmac';
      const hmacResponse = X402Service.create402Response(sampleDeviceId, sampleCommand);
      
      process.env.X402_SIGNATURE_STRATEGY = 'dual'; // 元に戻す
      
      const hmacResult = await X402Service.verifyPayment(
        payment,
        hmacResponse.headers['X-Payment-Requirements'],
        hmacResponse.headers['X-Payment-Signature']
      );
      
      expect(hmacResult.verified).toBe(true);
    });
  });

  describe('Strategy: Legacy HMAC (v1)', () => {
    beforeEach(() => {
      process.env.X402_SIGNATURE_STRATEGY = 'legacy';
      process.env.X402_HMAC_SECRET = 'legacy-secret-key';
    });

    it('should create 402 response with legacy HMAC signature', () => {
      const response = X402Service.create402Response(sampleDeviceId, sampleCommand);
      
      expect(response.status).toBe(402);
      expect(response.headers['X-Payment-Requirements']).toBeDefined();
      expect(response.headers['X-Payment-Signature']).toBeDefined();
      expect(response.headers['X-Payment-Signature']).toMatch(/^v1=/);
    });

    it('should verify legacy HMAC payment correctly', async () => {
      const response = X402Service.create402Response(sampleDeviceId, sampleCommand);
      
      const payment = {
        amount: response.body.payment.accepts[0].amount,
        currency: 'USDC',
        network: 'sepolia',
        recipient: response.body.payment.accepts[0].recipient,
        metadata: {
          txHash: '0x' + 'a'.repeat(64),
          orderId: response.body.orderId,
          nonce: response.body.nonce
        }
      };
      
      process.env.ENHANCED_X402 = 'false';
      
      const verificationResult = await X402Service.verifyPayment(
        payment,
        response.headers['X-Payment-Requirements'],
        response.headers['X-Payment-Signature']
      );
      
      expect(verificationResult.verified).toBe(true);
    });
  });

  describe('System Management', () => {
    beforeEach(() => {
      process.env.X402_SIGNATURE_STRATEGY = 'jws';
      
      const { JWSSignatureVerifier } = require('../services/jws-signature-verifier');
      const jwsVerifier = new JWSSignatureVerifier();
      jwsVerifier.generateRSAKeyPair('management-key', 2048);
    });

    it('should provide signature system info', () => {
      const info = X402Service.getSignatureSystemInfo();
      
      expect(info.current).toBe('jws');
      expect(info.strategy).toBe('jws');
      expect(info.jws).toBeDefined();
      expect(info.jws.keyInfo).toBeDefined();
      expect(info.jws.validation).toBeDefined();
      expect(info.validation.valid).toBe(true);
    });

    it('should perform health check correctly', () => {
      const health = X402Service.healthCheck();
      
      expect(health.signature.system).toBe('jws');
      expect(health.signature.valid).toBe(true);
      expect(health.blockchain.network).toBe('sepolia');
      expect(health.orderManager.active).toBe(true);
    });

    it('should handle key rotation for JWS', () => {
      const result = X402Service.rotateSigningKey('new-jws-key', undefined, 'RS256');
      
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      
      // 新しいキーが使用されることを確認
      const info = X402Service.getSignatureSystemInfo();
      expect(info.jws.keyInfo.currentKid).toBe('new-jws-key');
    });

    it('should handle key rotation for HMAC', () => {
      process.env.X402_SIGNATURE_STRATEGY = 'enhanced-hmac';
      process.env.X402_HMAC_KEYS = JSON.stringify({
        'old-key': 'a'.repeat(64)
      });
      
      const result = X402Service.rotateSigningKey('new-hmac-key', 'b'.repeat(64));
      
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject key rotation without required parameters', () => {
      process.env.X402_SIGNATURE_STRATEGY = 'enhanced-hmac';
      
      const result = X402Service.rotateSigningKey('new-key'); // HMAC requires secret
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('HMAC key rotation requires newSecret parameter');
    });
  });

  describe('Error Handling', () => {
    it('should handle unsupported signature format', async () => {
      process.env.X402_SIGNATURE_STRATEGY = 'enhanced-hmac';
      process.env.ENHANCED_X402 = 'true';
      
      const payment = {
        amount: '0.01',
        currency: 'USDC',
        network: 'sepolia',
        recipient: '0x1234567890123456789012345678901234567890',
        metadata: {
          txHash: '0x' + 'a'.repeat(64),
          orderId: 'test-order',
          nonce: 'test-nonce'
        }
      };
      
      // サポートされていない署名形式
      const result = await X402Service.verifyPayment(
        payment,
        'test-requirements',
        'v99=unsupported-format'
      );
      
      expect(result.verified).toBe(false);
      expect(result.error).toContain('Unsupported signature format');
    });

    it('should handle missing environment variables gracefully', () => {
      // 全ての関連環境変数をクリア
      delete process.env.X402_SIGNATURE_STRATEGY;
      delete process.env.X402_HMAC_KEYS;
      delete process.env.X402_JWS_KEYS_DIR;
      
      // デフォルトの動作を確認
      expect(() => {
        X402Service.create402Response(sampleDeviceId, sampleCommand);
      }).not.toThrow();
    });

    it('should handle JWKS error when not using JWS strategy', () => {
      process.env.X402_SIGNATURE_STRATEGY = 'enhanced-hmac';
      
      const jwks = X402Service.getJWKS();
      
      expect(jwks.error).toContain('JWKS is only available with JWS signature strategy');
      expect(jwks.keys).toEqual([]);
    });
  });

  afterEach(() => {
    // テスト用ファイルのクリーンアップ
    if (fs.existsSync(testKeysDir)) {
      const files = fs.readdirSync(testKeysDir);
      files.forEach(file => {
        fs.unlinkSync(path.join(testKeysDir, file));
      });
      fs.rmdirSync(testKeysDir);
    }
    
    // 環境変数のクリーンアップ
    delete process.env.X402_SIGNATURE_STRATEGY;
    delete process.env.X402_HMAC_KEYS;
    delete process.env.X402_CURRENT_KEY_ID;
    delete process.env.X402_JWS_KEYS_DIR;
    delete process.env.X402_JWS_CURRENT_KID;
    delete process.env.X402_JWS_DEFAULT_ALGORITHM;
    delete process.env.X402_HMAC_SECRET;
    delete process.env.ENHANCED_X402;
    delete process.env.PAYMENT_RECIPIENT;
    delete process.env.NETWORK;
  });
});