import { walletService } from './coinbase-wallet';

export interface ApprovalState {
  spender: string;
  allowance: string;
  isApproved: boolean;
  needsApproval: boolean;
}

export class ERC20ApprovalService {
  private static USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e'; // Base Sepolia USDC
  private static BACKEND_SPENDER = '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238'; // Backend wallet

  /**
   * ERC-20 allowance function signature: allowance(owner, spender)
   */
  static async getCurrentAllowance(userAddress: string): Promise<string> {
    try {
      const provider = walletService['provider'];
      
      // allowance(address owner, address spender) returns uint256
      const allowanceData = `0xdd62ed3e` + // allowance function selector
        `000000000000000000000000${userAddress.slice(2).toLowerCase()}` + // owner (32 bytes)
        `000000000000000000000000${this.BACKEND_SPENDER.slice(2).toLowerCase()}`; // spender (32 bytes)
      
      const result = await provider.request({
        method: 'eth_call',
        params: [{
          to: this.USDC_ADDRESS,
          data: allowanceData
        }, 'latest']
      });
      
      // Convert from wei (6 decimals for USDC)
      const allowance = parseInt(result, 16) / Math.pow(10, 6);
      return allowance.toFixed(2);
    } catch (error) {
      console.error('Failed to get allowance:', error);
      return '0.00';
    }
  }

  /**
   * ERC-20 approve function: approve(spender, amount)
   */
  static async approveSpending(amount: string): Promise<string> {
    try {
      const provider = walletService['provider'];
      const accounts = walletService['accounts'];
      
      // Convert amount to wei (6 decimals for USDC)
      const amountWei = Math.floor(parseFloat(amount) * Math.pow(10, 6)).toString(16);
      
      // approve(address spender, uint256 amount)
      const approveData = `0x095ea7b3` + // approve function selector
        `000000000000000000000000${this.BACKEND_SPENDER.slice(2).toLowerCase()}` + // spender (32 bytes)
        `${amountWei.padStart(64, '0')}`; // amount (32 bytes)
      
      // Estimate gas for approval
      let gasLimit;
      try {
        const estimatedGas = await provider.request({
          method: 'eth_estimateGas',
          params: [{
            from: accounts[0],
            to: this.USDC_ADDRESS,
            data: approveData
          }]
        });
        
        const gasEstimate = parseInt(estimatedGas, 16);
        const gasWithBuffer = Math.floor(gasEstimate * 1.2);
        gasLimit = `0x${gasWithBuffer.toString(16)}`;
      } catch (estimateError) {
        console.warn('Gas estimation failed, using fallback:', estimateError);
        gasLimit = '0x15F90'; // 90000 gas
      }
      
      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: accounts[0],
          to: this.USDC_ADDRESS,
          data: approveData,
          gas: gasLimit
        }]
      });
      
      console.log(`✅ USDC Approval transaction:`, txHash);
      return txHash;
    } catch (error) {
      console.error('Failed to approve spending:', error);
      throw error;
    }
  }

  /**
   * Check if current allowance is sufficient for the amount
   */
  static async checkApprovalStatus(userAddress: string, requiredAmount: string): Promise<ApprovalState> {
    try {
      const currentAllowance = parseFloat(await this.getCurrentAllowance(userAddress));
      const required = parseFloat(requiredAmount);
      
      return {
        spender: this.BACKEND_SPENDER,
        allowance: currentAllowance.toFixed(2),
        isApproved: currentAllowance >= required,
        needsApproval: currentAllowance < required
      };
    } catch (error) {
      console.error('Failed to check approval status:', error);
      return {
        spender: this.BACKEND_SPENDER,
        allowance: '0.00',
        isApproved: false,
        needsApproval: true
      };
    }
  }

  /**
   * Get recommended approval amount (with buffer)
   */
  static getRecommendedApprovalAmount(immediateAmount: string): string {
    const immediate = parseFloat(immediateAmount);
    
    // Recommend 10x the immediate amount or minimum 10 USDC
    const recommended = Math.max(immediate * 10, 10);
    
    return recommended.toFixed(2);
  }
}