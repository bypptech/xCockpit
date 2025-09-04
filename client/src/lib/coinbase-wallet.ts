import { CoinbaseWalletSDK } from '@coinbase/wallet-sdk';

const APP_NAME = 'xCockpit';
const APP_LOGO_URL = 'https://example.com/logo.png';

class WalletService {
  private sdk: CoinbaseWalletSDK;
  private provider: any;
  private accounts: string[] = [];
  private isWebView: boolean;
  private environmentInfo: {
    isWebView: boolean;
    isMobile: boolean;
    userAgent: string;
  };

  constructor() {
    // Detect environment
    this.isWebView = /wv|WebView/i.test(navigator.userAgent);
    this.environmentInfo = {
      isWebView: this.isWebView,
      isMobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
      userAgent: navigator.userAgent
    };

    console.log('🔍 Wallet SDK Environment Detection:', this.environmentInfo);

    // Initialize SDK with environment-specific options
    const sdkOptions: any = {
      appName: APP_NAME,
      appLogoUrl: APP_LOGO_URL
    };

    // Add WebView-specific configurations
    if (this.isWebView) {
      console.log('⚠️  WebView environment detected - adjusting SDK configuration');
      // In WebView, prefer mobile linking over QR codes
      sdkOptions.enableMobileWalletLink = true;
      // Additional mobile optimizations
      sdkOptions.darkMode = false; // Ensure consistent theme
      sdkOptions.headlessMode = false; // Ensure UI is shown
    }

    // Add mobile-specific optimizations regardless of WebView
    if (this.environmentInfo.isMobile) {
      console.log('📱 Mobile environment detected - optimizing for mobile');
      sdkOptions.enableMobileWalletLink = true;
      // Ensure mobile wallet deep linking works
      sdkOptions.linkAPIUrl = 'https://www.walletlink.org';
    }

    this.sdk = new CoinbaseWalletSDK(sdkOptions);
    this.provider = this.sdk.makeWeb3Provider();
  }

  async connect(): Promise<string[]> {
    try {
      console.log('🔗 Initiating wallet connection in', this.isWebView ? 'WebView' : 'Browser', 'environment');

      // WebView environment warnings
      if (this.isWebView) {
        console.warn('⚠️  WebView detected: Some wallet features may be limited');
        console.log('💡 If connection fails, try opening this app in your default browser');
      }

      // Mobile-specific optimizations
      if (this.environmentInfo.isMobile) {
        console.log('📱 Optimizing connection flow for mobile environment');
        
        // Add a small delay to ensure proper initialization
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Request account access with environment-specific error handling
      this.accounts = await this.provider.request({
        method: 'eth_requestAccounts'
      });

      console.log('✅ Wallet connected successfully:', {
        accountCount: this.accounts.length,
        primaryAccount: this.accounts[0],
        environment: this.environmentInfo
      });

      // Switch to Base Sepolia if not already connected
      await this.switchToBaseSepolia();

      return this.accounts;
    } catch (error: any) {
      console.error('❌ Failed to connect wallet:', error);
      
      // Enhanced error handling for WebView and mobile environments
      if (this.isWebView && error.code === 4001) {
        const webViewError = new Error('ウォレット接続が拒否されました。モバイルアプリ内では、デフォルトブラウザで開くことをお試しください。');
        webViewError.name = 'WebViewConnectionError';
        throw webViewError;
      }
      
      if (this.isWebView && (error.code === -32002 || error.message?.includes('request'))) {
        const webViewError = new Error('WebView環境でのウォレット接続がタイムアウトしました。デフォルトブラウザで開いてお試しください。');
        webViewError.name = 'WebViewTimeoutError';
        throw webViewError;
      }

      // Mobile-specific error handling
      if (this.environmentInfo.isMobile && error.code === 4001) {
        const mobileError = new Error('ウォレット接続が拒否されました。Coinbase Walletアプリがインストールされているか確認してください。');
        mobileError.name = 'MobileConnectionError';
        throw mobileError;
      }

      // Network connection issues common on mobile
      if (this.environmentInfo.isMobile && (error.code === -32002 || error.message?.includes('timeout'))) {
        const networkError = new Error('ネットワーク接続の問題が発生しました。Wi-Fi接続を確認して再試行してください。');
        networkError.name = 'MobileNetworkError';
        throw networkError;
      }

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
        // Base Sepolia (Chain ID 84532)
        '0x14a34': [
          '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Primary USDC contract
          '0x8a04d904055528a69f3e4594dda308a31aeb8457', // Alternative USDC contract
        ],
        '0x14A34': [
          '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
          '0x8a04d904055528a69f3e4594dda308a31aeb8457',
        ],
        // Alternative chain ID formats for Base Sepolia
        '84532': [
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
        console.log('Using custom USDC contract from env:', import.meta.env.VITE_USDC_CONTRACT_ADDRESS);
      } else if (usdcContracts[chainId]) {
        usdcAddresses = usdcContracts[chainId];
        console.log('Found USDC contracts for chainId (hex):', chainId, usdcAddresses);
      } else if (usdcContracts[chainId.toLowerCase()]) {
        usdcAddresses = usdcContracts[chainId.toLowerCase()];
        console.log('Found USDC contracts for chainId (lowercase hex):', chainId.toLowerCase(), usdcAddresses);
      } else {
        // Try decimal format for Base Sepolia (84532)
        const chainIdDecimal = parseInt(chainId, 16).toString();
        console.log('Trying decimal chain ID:', chainIdDecimal);
        if (usdcContracts[chainIdDecimal]) {
          usdcAddresses = usdcContracts[chainIdDecimal];
          console.log('Found USDC contracts for chainId (decimal):', chainIdDecimal, usdcAddresses);
        } else {
          console.warn('Unknown chain ID (tried hex, lowercase, decimal):', chainId, 'decimal:', chainIdDecimal);
          return '0.00';
        }
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
            const balanceHex = result.toString();
            const balanceRaw = parseInt(balanceHex, 16);
            const balance = balanceRaw / Math.pow(10, 6);
            
            console.log('📊 USDC Balance Details:', {
              contract: usdcAddress,
              rawHex: balanceHex,
              rawDecimal: balanceRaw,
              finalBalance: balance,
              chainId: await this.provider.request({ method: 'eth_chainId' })
            });
            
            // Return balance even if it's 0 (valid result from contract)
            console.log('✅ Successfully got USDC balance from:', usdcAddress, '→', balance.toFixed(4), 'USDC');
            return balance.toFixed(4);
          }
        } catch (err) {
          console.log('❌ Failed to get balance from', usdcAddress, 'on chain 84532:', err);
          // Continue to next address - this is important for Base Sepolia compatibility
        }
      }
      
      // No balance found on any contract
      console.log('No USDC balance found on any contract');
      return '0.0000';
    } catch (error) {
      console.error('Failed to get USDC balance:', error);
      return '0.0000';
    }
  }

  async sendUSDCPayment(to: string, amount: string): Promise<string> {
    try {
      const usdcAddress = import.meta.env.VITE_USDC_CONTRACT_ADDRESS || '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
      
      // Convert amount to wei (6 decimals for USDC)
      const amountFloat = parseFloat(amount);
      const amountMicroUsdc = Math.floor(amountFloat * Math.pow(10, 6));
      const amountWei = amountMicroUsdc.toString(16);
      
      console.log(`💳 USDC Payment Details:`, {
        requestedAmount: amount,
        amountFloat: amountFloat,
        amountMicroUsdc: amountMicroUsdc,
        amountWei: amountWei,
        to: to
      });
      
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

  getEnvironmentInfo() {
    return {
      ...this.environmentInfo,
      hasLimitations: this.isWebView,
      recommendedAction: this.isWebView ? 'Open in default browser for full functionality' : 'Full functionality available'
    };
  }

  onAccountsChanged(callback: (accounts: string[]) => void): void {
    this.provider.on('accountsChanged', callback);
  }

  onChainChanged(callback: (chainId: string) => void): void {
    this.provider.on('chainChanged', callback);
  }
}

export const walletService = new WalletService();
