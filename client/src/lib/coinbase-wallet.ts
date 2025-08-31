import { CoinbaseWalletSDK } from '@coinbase/wallet-sdk';

const APP_NAME = 'IoT Payment Gateway';
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

  async getUSDCBalance(address: string): Promise<string> {
    try {
      // USDC contract address on Base Sepolia (testnet)
      const usdcAddress = import.meta.env.VITE_USDC_CONTRACT_ADDRESS || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
      
      // ERC-20 balanceOf function signature
      const balanceOfData = `0x70a08231000000000000000000000000${address.slice(2)}`;
      
      const result = await this.provider.request({
        method: 'eth_call',
        params: [{
          to: usdcAddress,
          data: balanceOfData
        }, 'latest']
      });

      // Convert from wei (6 decimals for USDC)
      const balance = parseInt(result, 16) / Math.pow(10, 6);
      return balance.toFixed(2);
    } catch (error) {
      console.error('Failed to get USDC balance:', error);
      return '0.00';
    }
  }

  async sendUSDCPayment(to: string, amount: string): Promise<string> {
    try {
      const usdcAddress = import.meta.env.VITE_USDC_CONTRACT_ADDRESS || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
      
      // Convert amount to wei (6 decimals for USDC)
      const amountWei = Math.floor(parseFloat(amount) * Math.pow(10, 6)).toString(16);
      
      // ERC-20 transfer function signature
      const transferData = `0xa9059cbb000000000000000000000000${to.slice(2)}${amountWei.padStart(64, '0')}`;
      
      const txHash = await this.provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: this.accounts[0],
          to: usdcAddress,
          data: transferData,
          gas: '0x5208' // 21000 in hex
        }]
      });

      return txHash;
    } catch (error) {
      console.error('Failed to send USDC payment:', error);
      throw error;
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
