import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Set up test environment
process.env.NODE_ENV = 'test';
process.env.NETWORK = 'sepolia';
process.env.ENHANCED_X402 = 'true';
process.env.X402_HMAC_SECRET = 'test-secret-key-32-chars-long-12345';

// Test individual services without external dependencies
describe('X402 Services', () => {
  describe('OrderManager', () => {
    let OrderManager: any;
    let testOrderManager: any;
    
    beforeEach(async () => {
      // Dynamic import to avoid module loading issues
      const module = await import('../services/order-manager.js');
      OrderManager = module.OrderManager;
      testOrderManager = new OrderManager();
    });
    
    afterEach(() => {
      if (testOrderManager) {
        testOrderManager.stopCleanup();
        testOrderManager.reset();
      }
    });
    
    it('should generate valid order with nonce', () => {
      const { orderId, nonce, nonceExp } = testOrderManager.generateOrder(5);
      
      expect(orderId).toMatch(/^ord_[0-9a-f]{32}$/);
      expect(nonce).toMatch(/^nx_[0-9a-f]{32}$/);
      expect(new Date(nonceExp)).toBeInstanceOf(Date);
      expect(new Date(nonceExp) > new Date()).toBe(true);
    });
    
    it('should validate order correctly', () => {
      const { orderId, nonce } = testOrderManager.generateOrder(5);
      
      const validation = testOrderManager.validateOrder(orderId, nonce);
      expect(validation.valid).toBe(true);
      expect(validation.order).toBeDefined();
    });
    
    it('should consume order only once', () => {
      const { orderId, nonce } = testOrderManager.generateOrder(5);
      
      const firstUse = testOrderManager.consumeOrder(orderId, nonce, 'tx1');
      expect(firstUse).toBe(true);
      
      const secondUse = testOrderManager.consumeOrder(orderId, nonce, 'tx2');
      expect(secondUse).toBe(false);
    });
  });
  
  describe('SignatureVerifier', () => {
    let SignatureVerifier: any;
    let testVerifier: any;
    
    beforeEach(async () => {
      const module = await import('../services/signature-verifier.js');
      SignatureVerifier = module.SignatureVerifier;
      testVerifier = new SignatureVerifier('test-secret-key');
    });
    
    it('should sign and verify data correctly', () => {
      const data = 'test-data-to-sign';
      const signature = SignatureVerifier.sign(data, 'test-secret');
      const isValid = SignatureVerifier.verify(data, signature, 'test-secret');
      
      expect(isValid).toBe(true);
    });
    
    it('should reject tampered signatures', () => {
      const data = 'test-data-to-sign';
      const signature = SignatureVerifier.sign(data, 'test-secret');
      const isValid = SignatureVerifier.verify('tampered-data', signature, 'test-secret');
      
      expect(isValid).toBe(false);
    });
    
    it('should sign payment requirements', () => {
      const requirements = {
        scheme: 'x402-exact',
        chain: 'eip155:8453',
        token: 'erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        amount: '12.34',
        currency: 'USDC',
        to: '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238',
        minConfirmations: 2,
        orderId: 'ord_test123',
        nonce: 'nx_test456',
        nonceExp: '2025-09-01T09:05:00Z',
      };
      
      const { requirementsHeader, signature } = testVerifier.signPaymentRequirements(requirements);
      
      expect(requirementsHeader).toContain('scheme="x402-exact"');
      expect(signature).toMatch(/^v1=[0-9a-f]+$/);
      
      const isValid = testVerifier.verifyPaymentRequirements(requirementsHeader, signature);
      expect(isValid).toBe(true);
    });
  });
  
  describe('X402Service', () => {
    let X402Service: any;
    
    beforeEach(async () => {
      const module = await import('../services/x402.js');
      X402Service = module.X402Service;
    });
    
    it('should calculate correct device pricing', () => {
      const price001 = X402Service.calculateDevicePrice('ESP32_001', 'dispense');
      const price002 = X402Service.calculateDevicePrice('ESP32_002', 'dispense');
      
      // Verify pricing as specified in CLAUDE.md
      expect(price001).toBe('0.010'); // Gacha #001 fee $0.01 USDC
      expect(price002).toBe('0.005'); // Gacha #002 fee $0.005 USDC
    });
    
    it('should create enhanced 402 response', () => {
      const response = X402Service.create402Response('ESP32_001', 'dispense', 5);
      
      expect(response.status).toBe(402);
      expect(response.headers['X-Payment-Requirements']).toBeDefined();
      expect(response.headers['X-Payment-Signature']).toBeDefined();
      expect(response.body.orderId).toBeDefined();
      expect(response.body.nonce).toBeDefined();
    });
    
    it('should fallback to basic verification when enhanced mode disabled', async () => {
      process.env.ENHANCED_X402 = 'false';
      
      const payment = {
        amount: '0.01',
        currency: 'USDC',
        network: 'eip155:84532',
        recipient: '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238',
        metadata: {
          txHash: '0x1234567890abcdef',
        },
      };
      
      const result = await X402Service.verifyPayment(payment);
      expect(result.verified).toBe(true);
      
      // Reset for other tests
      process.env.ENHANCED_X402 = 'true';
    });
  });
});
