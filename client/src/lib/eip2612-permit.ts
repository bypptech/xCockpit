import { walletService } from './coinbase-wallet';

export interface PermitSignature {
  v: number;
  r: string;
  s: string;
  deadline: number;
  nonce: number;
}

export interface PermitData {
  owner: string;
  spender: string;
  value: string;
  nonce: number;
  deadline: number;
}

export class EIP2612PermitService {
  private static USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
  private static BACKEND_SPENDER = '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238';
  private static CHAIN_ID = 84532; // Base Sepolia

  /**
   * Check if USDC contract supports EIP-2612 permit
   */
  static async supportsPermit(): Promise<boolean> {
    try {
      const provider = walletService['provider'];
      
      // Check if contract has PERMIT_TYPEHASH or permit function
      const permitSelector = '0xd505accf'; // permit(owner,spender,value,deadline,v,r,s)
      
      const result = await provider.request({
        method: 'eth_call',
        params: [{
          to: this.USDC_ADDRESS,
          data: permitSelector + '0'.repeat(200) // Dummy data to test function existence
        }, 'latest']
      });
      
      // If call doesn't revert, permit is likely supported
      return true;
    } catch (error) {
      console.log('Permit not supported or failed to check:', error);
      return false;
    }
  }

  /**
   * Get current nonce for permit signature
   */
  static async getNonce(userAddress: string): Promise<number> {
    try {
      const provider = walletService['provider'];
      
      // nonces(address owner) returns uint256
      const nonceData = `0x7ecebe00` + // nonces function selector
        `000000000000000000000000${userAddress.slice(2).toLowerCase()}`; // owner (32 bytes)
      
      const result = await provider.request({
        method: 'eth_call',
        params: [{
          to: this.USDC_ADDRESS,
          data: nonceData
        }, 'latest']
      });
      
      return parseInt(result, 16);
    } catch (error) {
      console.error('Failed to get nonce:', error);
      return 0;
    }
  }

  /**
   * Create EIP-712 domain separator for USDC
   */
  private static createDomain() {
    return {
      name: 'USD Coin',
      version: '2',
      chainId: this.CHAIN_ID,
      verifyingContract: this.USDC_ADDRESS
    };
  }

  /**
   * Create EIP-712 Permit type definition
   */
  private static createTypes() {
    return {
      Permit: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' }
      ]
    };
  }

  /**
   * Generate permit signature using EIP-712
   */
  static async signPermit(
    userAddress: string,
    amount: string,
    deadline?: number
  ): Promise<PermitSignature> {
    try {
      const provider = walletService['provider'];
      
      // Get current nonce
      const nonce = await this.getNonce(userAddress);
      
      // Set deadline (5 minutes from now if not specified)
      const permitDeadline = deadline || Math.floor(Date.now() / 1000) + 300;
      
      // Convert amount to wei (6 decimals for USDC)
      const amountWei = Math.floor(parseFloat(amount) * Math.pow(10, 6));
      
      // Create EIP-712 message
      const domain = this.createDomain();
      const types = this.createTypes();
      const message = {
        owner: userAddress,
        spender: this.BACKEND_SPENDER,
        value: amountWei.toString(),
        nonce: nonce,
        deadline: permitDeadline
      };
      
      console.log('🔏 Signing permit:', { domain, types, message });
      
      // Sign the permit using EIP-712
      const signature = await provider.request({
        method: 'eth_signTypedData_v4',
        params: [
          userAddress,
          JSON.stringify({
            domain,
            types,
            primaryType: 'Permit',
            message
          })
        ]
      });
      
      console.log('✅ Permit signature:', signature);
      
      // Parse signature into v, r, s components
      const sig = signature.slice(2); // Remove 0x
      const r = '0x' + sig.slice(0, 64);
      const s = '0x' + sig.slice(64, 128);
      const v = parseInt(sig.slice(128, 130), 16);
      
      return {
        v,
        r,
        s,
        deadline: permitDeadline,
        nonce
      };
      
    } catch (error) {
      console.error('Failed to sign permit:', error);
      throw error;
    }
  }

  /**
   * Create payment intent with permit signature (gasless approval)
   */
  static async createPaymentIntentWithPermit(
    userAddress: string,
    amount: string
  ): Promise<{
    permitSignature: PermitSignature;
    paymentIntent: {
      from: userAddress;
      to: string;
      amount: string;
      nonce: string;
      deadline: number;
    };
  }> {
    try {
      // Generate permit signature
      const permitSignature = await this.signPermit(userAddress, amount);
      
      // Create payment intent
      const paymentIntent = {
        from: userAddress,
        to: this.BACKEND_SPENDER,
        amount: amount,
        nonce: `permit_${permitSignature.nonce}_${Date.now()}`,
        deadline: permitSignature.deadline
      };
      
      return {
        permitSignature,
        paymentIntent
      };
      
    } catch (error) {
      console.error('Failed to create payment intent with permit:', error);
      throw error;
    }
  }
}