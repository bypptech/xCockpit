import { CoinbaseWalletSDK } from '@coinbase/wallet-sdk';

const APP_NAME = 'xCockpit';
const APP_LOGO_URL = 'https://example.com/logo.png';

class WalletService {
  private sdk: CoinbaseWalletSDK;
  private provider: any;
  private accounts: string[] = [];

  constructor() {
    this.sdk = new CoinbaseWalletSDK({
      appName: APP_NAME,
      appLogoUrl: APP_LOGO_URL
    });

    this.provider = this.sdk.makeWeb3Provider();
  }

  async connect(): Promise<string[]> {
    try {
      // Request account access
      this.accounts = await this.provider.request({
        method: 'eth_requestAccounts'
      });

      // Switch to Base Sepolia if not already connected
      await this.switchToBaseSepolia();

      return this.accounts;
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.provider.disconnect();
      this.accounts = [];
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
      throw error;
    }
  }

  async switchToBaseSepolia(): Promise<void> {
    try {
      await this.provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x14A34' }] // Base Sepolia chain ID (84532)
      });
    } catch (switchError: any) {
      // If chain doesn't exist, add it
      if (switchError.code === 4902) {
        await this.provider.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0x14A34',
            chainName: 'Base Sepolia',
            nativeCurrency: {
              name: 'ETH',
              symbol: 'ETH',
              decimals: 18
            },
            rpcUrls: ['https://sepolia.base.org'],
            blockExplorerUrls: ['https://sepolia-explorer.base.org']
          }]
        });
      } else {
        throw switchError;
      }
    }
  }

  async switchToSepoliaEthereum(): Promise<void> {
    try {
      await this.provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xAA36A7' }] // Sepolia Ethereum chain ID (11155111)
      });
    } catch (switchError: any) {
      // If chain doesn't exist, add it
      if (switchError.code === 4902) {
        await this.provider.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0xAA36A7',
            chainName: 'Sepolia',
            nativeCurrency: {
              name: 'ETH',
              symbol: 'ETH',
              decimals: 18
            },
            rpcUrls: ['https://rpc.sepolia.org'],
            blockExplorerUrls: ['https://sepolia.etherscan.io']
          }]
        });
      } else {
        throw switchError;
      }
    }
  }

  async switchNetwork(network: 'base-sepolia' | 'sepolia-ethereum'): Promise<void> {
    if (network === 'base-sepolia') {
      await this.switchToBaseSepolia();
    } else if (network === 'sepolia-ethereum') {
      await this.switchToSepoliaEthereum();
    } else {
      throw new Error(`Unsupported network: ${network}`);
    }
  }

  async getCurrentNetwork(): Promise<{ chainId: string; name: string }> {
    const chainId = await this.provider.request({ method: 'eth_chainId' });
    
    const networks: Record<string, string> = {
      '0x14a34': 'Base Sepolia',
      '0x14A34': 'Base Sepolia',
      '0xaa36a7': 'Sepolia',
      '0xAA36A7': 'Sepolia',
      '0x2105': 'Base Mainnet',
      '0x1': 'Ethereum Mainnet'
    };
    
    return {
      chainId,
      name: networks[chainId] || 'Unknown Network'
    };
  }

  async getETHBalance(address: string): Promise<string> {
    try {
      const result = await this.provider.request({
        method: 'eth_getBalance',
        params: [address, 'latest']
      });

      // Convert from wei to ETH (18 decimals)
      const balance = parseInt(result, 16) / Math.pow(10, 18);
      return balance.toFixed(4);
    } catch (error) {
      console.error('Failed to get ETH balance:', error);
      return '0.0000';
    }
  }

  async getUSDCBalance(address: string): Promise<string> {
    try {
      // Ensure we're on the correct network
      const chainId = await this.provider.request({ method: 'eth_chainId' });
      console.log('Current chain ID:', chainId);
      
      // USDC contract addresses by network
      const usdcContracts: Record<string, string[]> = {
        // Base Sepolia
        '0x14a34': [
          '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Primary (255k holders)
          '0x8a04d904055528a69f3e4594dda308a31aeb8457', // Alternative (3k holders)
        ],
        '0x14A34': [
          '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
          '0x8a04d904055528a69f3e4594dda308a31aeb8457',
        ],
        // Sepolia Ethereum
        '0xaa36a7': [
          '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // USDC on Sepolia
          '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8', // Alternative USDC
        ],
        '0xAA36A7': [
          '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
          '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8',
        ],
        // Base Mainnet
        '0x2105': ['0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'],
        // Ethereum Mainnet
        '0x1': ['0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'],
      };
      
      let usdcAddresses: string[] = [];
      
      if (import.meta.env.VITE_USDC_CONTRACT_ADDRESS) {
        usdcAddresses = [import.meta.env.VITE_USDC_CONTRACT_ADDRESS];
      } else if (usdcContracts[chainId]) {
        usdcAddresses = usdcContracts[chainId];
      } else if (usdcContracts[chainId.toLowerCase()]) {
        usdcAddresses = usdcContracts[chainId.toLowerCase()];
      } else {
        console.warn('Unknown chain ID:', chainId);
        return '0.00';
      }
      
      // Try each address until we get a valid balance
      for (const usdcAddress of usdcAddresses) {
        try {
          console.log('Trying USDC address:', usdcAddress);
          
          // ERC-20 balanceOf function signature
          const balanceOfData = `0x70a08231000000000000000000000000${address.slice(2).toLowerCase()}`;
          
          const result = await this.provider.request({
            method: 'eth_call',
            params: [{
              to: usdcAddress.toLowerCase(),
              data: balanceOfData
            }, 'latest']
          });
          
          console.log('Balance result from', usdcAddress, ':', result);
          
          if (result !== undefined && result !== null) {
            // Convert from wei (6 decimals for USDC)
            const balance = parseInt(result, 16) / Math.pow(10, 6);
            console.log('Parsed balance:', balance, 'from contract:', usdcAddress);
            
            // Return balance even if it's 0 (valid result from contract)
            console.log('✅ Successfully got USDC balance from:', usdcAddress, '→', balance);
            return balance.toFixed(2);
          }
        } catch (err) {
          console.log('❌ Failed to get balance from', usdcAddress, ':', err);
          // Continue to next address
        }
      }
      
      // No balance found on any contract
      console.log('No USDC balance found on any contract');
      return '0.00';
    } catch (error) {
      console.error('Failed to get USDC balance:', error);
      return '0.00';
    }
  }

  async sendUSDCPayment(to: string, amount: string): Promise<string> {
    try {
      const usdcAddress = import.meta.env.VITE_USDC_CONTRACT_ADDRESS || '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
      
      // Convert amount to wei (6 decimals for USDC)
      const amountWei = Math.floor(parseFloat(amount) * Math.pow(10, 6)).toString(16);
      
      // ERC-20 transfer function signature
      const transferData = `0xa9059cbb000000000000000000000000${to.slice(2)}${amountWei.padStart(64, '0')}`;
      
      // Get wallet info to determine gas limits
      const walletInfo = await this.getWalletInfo();
      
      // Try to estimate gas first
      let gasLimit;
      try {
        const estimatedGas = await this.provider.request({
          method: 'eth_estimateGas',
          params: [{
            from: this.accounts[0],
            to: usdcAddress,
            data: transferData
          }]
        });
        
        // Add 20% buffer to estimated gas
        const gasEstimate = parseInt(estimatedGas, 16);
        const gasWithBuffer = Math.floor(gasEstimate * 1.2);
        gasLimit = `0x${gasWithBuffer.toString(16)}`;
        
        console.log(`Estimated gas: ${gasEstimate}, with buffer: ${gasWithBuffer}`);
      } catch (estimateError) {
        console.warn('Gas estimation failed, using fallback values:', estimateError);
        
        // Fallback gas limits
        if (walletInfo.isSmartWallet) {
          // Smart Wallets need more gas for execution
          gasLimit = '0x15F90'; // 90000 in hex
        } else {
          // Regular wallets for ERC-20 transfers
          gasLimit = '0xC350'; // 50000 in hex
        }
      }
      
      console.log(`Using gas limit: ${gasLimit} for ${walletInfo.isSmartWallet ? 'Smart Wallet' : 'EOA'}`);
      
      const txHash = await this.provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: this.accounts[0],
          to: usdcAddress,
          data: transferData,
          gas: gasLimit
        }]
      });

      return txHash;
    } catch (error) {
      console.error('Failed to send USDC payment:', error);
      throw error;
    }
  }

  async getWalletInfo(): Promise<{
    address: string | null;
    isSmartWallet: boolean;
    walletType: string;
  }> {
    const address = this.getCurrentAccount();
    if (!address) {
      return { address: null, isSmartWallet: false, walletType: 'none' };
    }

    try {
      // Check if the address is a smart contract (Smart Wallet)
      const code = await this.provider.request({
        method: 'eth_getCode',
        params: [address, 'latest']
      });

      const isSmartWallet = code && code !== '0x' && code.length > 2;
      
      // Detect wallet type from provider
      let walletType = 'unknown';
      if (this.provider.isCoinbaseWallet) {
        walletType = isSmartWallet ? 'Coinbase Smart Wallet' : 'Coinbase Wallet';
      } else if (this.provider.isMetaMask) {
        walletType = 'MetaMask';
      } else if (this.provider.isWalletConnect) {
        walletType = 'WalletConnect';
      }

      return {
        address,
        isSmartWallet,
        walletType
      };
    } catch (error) {
      console.error('Failed to get wallet info:', error);
      return {
        address,
        isSmartWallet: false,
        walletType: 'unknown'
      };
    }
  }

  getCurrentAccount(): string | null {
    return this.accounts.length > 0 ? this.accounts[0] : null;
  }

  isConnected(): boolean {
    return this.accounts.length > 0;
  }

  onAccountsChanged(callback: (accounts: string[]) => void): void {
    this.provider.on('accountsChanged', callback);
  }

  onChainChanged(callback: (chainId: string) => void): void {
    this.provider.on('chainChanged', callback);
  }
}

export const walletService = new WalletService();
