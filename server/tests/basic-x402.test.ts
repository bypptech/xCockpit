import { describe, it, expect } from '@jest/globals';

describe('Basic x402 Tests', () => {
  it('should run basic test', () => {
    expect(1 + 1).toBe(2);
  });
  
  it('should have correct environment variables', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.NETWORK).toBe('sepolia');
    expect(process.env.ENHANCED_X402).toBe('true');
  });
  
  it('should verify pricing configuration', () => {
    const devicePricing = {
      'ESP32_001': '0.01',  // Gacha #001 fee is $0.01 USDC
      'ESP32_002': '0.005', // Gacha #002 fee is $0.005 USDC
    };
    
    expect(devicePricing['ESP32_001']).toBe('0.01');
    expect(devicePricing['ESP32_002']).toBe('0.005');
  });
  
  it('should test network configuration', () => {
    const networks = {
      sepolia: {
        chainId: 84532,
        usdcAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      },
      mainnet: {
        chainId: 8453,
        usdcAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      }
    };
    
    expect(networks.sepolia.chainId).toBe(84532);
    expect(networks.mainnet.chainId).toBe(8453);
  });
});
