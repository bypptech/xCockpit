import { ethers } from 'ethers';

interface VerificationOptions {
  txHash: string;
  expectedTo: string;
  minAmount: string;
  minConfirmations?: number;
}

export class BlockchainVerifier {
  private provider: ethers.JsonRpcProvider;
  private usdcContract: ethers.Contract;
  private readonly USDC_ADDRESS_MAINNET = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
  private readonly USDC_ADDRESS_SEPOLIA = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
  
  constructor(network: 'mainnet' | 'sepolia' = 'sepolia') {
    const rpcUrl = network === 'mainnet' 
      ? process.env.BASE_MAINNET_RPC || 'https://mainnet.base.org'
      : process.env.BASE_SEPOLIA_RPC || 'https://sepolia.base.org';
      
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    
    const usdcAddress = network === 'mainnet' 
      ? this.USDC_ADDRESS_MAINNET 
      : this.USDC_ADDRESS_SEPOLIA;
    
    const abi = [
      'event Transfer(address indexed from, address indexed to, uint256 value)',
      'function decimals() view returns (uint8)',
      'function balanceOf(address) view returns (uint256)'
    ];
    
    this.usdcContract = new ethers.Contract(usdcAddress, abi, this.provider);
  }
  
  async verifyUSDCTransfer(options: VerificationOptions): Promise<{
    verified: boolean;
    confirmations?: number;
    actualAmount?: string;
    blockNumber?: number;
    from?: string;
    error?: string;
  }> {
    try {
      const { txHash, expectedTo, minAmount, minConfirmations = 0 } = options;
      
      const receipt = await this.provider.getTransactionReceipt(txHash);
      
      if (!receipt) {
        return { verified: false, error: 'Transaction not found' };
      }
      
      if (receipt.status !== 1) {
        return { verified: false, error: 'Transaction failed' };
      }
      
      const currentBlock = await this.provider.getBlockNumber();
      const confirmations = currentBlock - receipt.blockNumber;
      
      if (confirmations < minConfirmations) {
        return { 
          verified: false, 
          confirmations,
          error: `Insufficient confirmations: ${confirmations}/${minConfirmations}` 
        };
      }
      
      const transferEvents = [];
      for (const log of receipt.logs) {
        if (log.address.toLowerCase() === this.usdcContract.target.toString().toLowerCase()) {
          try {
            const parsedLog = this.usdcContract.interface.parseLog({
              topics: log.topics as string[],
              data: log.data
            });
            if (parsedLog?.name === 'Transfer') {
              transferEvents.push(parsedLog);
            }
          } catch (e) {
            continue;
          }
        }
      }
      
      const minAmountWei = ethers.parseUnits(minAmount, 6);
      
      const validTransfer = transferEvents.find(event => {
        const toAddress = event.args.to.toLowerCase();
        const amount = event.args.value;
        return toAddress === expectedTo.toLowerCase() && amount >= minAmountWei;
      });
      
      if (!validTransfer) {
        return { 
          verified: false, 
          confirmations,
          error: 'No valid USDC transfer found' 
        };
      }
      
      return {
        verified: true,
        confirmations,
        actualAmount: ethers.formatUnits(validTransfer.args.value, 6),
        blockNumber: receipt.blockNumber,
        from: validTransfer.args.from
      };
      
    } catch (error) {
      console.error('Blockchain verification failed:', error);
      return { 
        verified: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
  
  async getConfirmations(blockNumber: number): Promise<number> {
    try {
      const currentBlock = await this.provider.getBlockNumber();
      return Math.max(0, currentBlock - blockNumber);
    } catch (error) {
      console.error('Failed to get confirmations:', error);
      return 0;
    }
  }
  
  async checkBalance(address: string): Promise<string> {
    try {
      const balance = await this.usdcContract.balanceOf(address);
      return ethers.formatUnits(balance, 6);
    } catch (error) {
      console.error('Failed to check balance:', error);
      return '0';
    }
  }
  
  async waitForConfirmations(
    txHash: string, 
    targetConfirmations: number,
    maxWaitTime: number = 60000
  ): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      const receipt = await this.provider.getTransactionReceipt(txHash);
      if (!receipt) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        continue;
      }
      
      const confirmations = await this.getConfirmations(receipt.blockNumber);
      if (confirmations >= targetConfirmations) {
        return true;
      }
      
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    return false;
  }
}