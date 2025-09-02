import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { walletService } from '@/lib/coinbase-wallet';

interface BasenameResult {
  basename: string | null;
  loading: boolean;
  error: string | null;
}

interface AddressResult {
  address: string | null;
  loading: boolean;
  error: string | null;
}

// アドレスからBasenameを取得するフック
export function useBasename(address: string | null): BasenameResult {
  const [basename, setBasename] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('useBasename Hook Called - Address:', address);
    
    if (!address) {
      console.log('❌ useBasename: No address provided');
      setBasename(null);
      setLoading(false);
      setError(null);
      return;
    }

    const fetchBasename = async () => {
      console.log('🚀 useBasename: Starting fetch for:', address);
      setLoading(true);
      setError(null);

      try {
        // 現在接続されているネットワークを動的に取得
        let rpcUrl = 'https://sepolia.base.org'; // デフォルト (Base Sepolia)
        let networkName = 'Base Sepolia';
        
        try {
          const networkInfo = await walletService.getCurrentNetwork();
          console.log('🌐 Current network:', networkInfo);
          
          // Chain IDに基づいてRPC URLを選択
          switch (networkInfo.chainId.toLowerCase()) {
            case '0x2105': // Base Mainnet (8453)
              rpcUrl = 'https://mainnet.base.org';
              networkName = 'Base Mainnet';
              break;
            case '0x14a34': // Base Sepolia (84532)  
              rpcUrl = 'https://sepolia.base.org';
              networkName = 'Base Sepolia';
              break;
            case '0x1': // Ethereum Mainnet (1) - Base SepoliaとMainnetの両方を試す
              // Ethereum Mainnetの場合、Base SepoliaとMainnetの両方でBasename lookupを試行
              rpcUrl = 'https://sepolia.base.org';
              networkName = 'Base Sepolia (via Ethereum)';
              break;
            default:
              // その他のネットワークでもBase Sepoliaを優先して試す（開発環境用）
              rpcUrl = 'https://sepolia.base.org';
              networkName = 'Base Sepolia (fallback)';
              break;
          }
        } catch (networkError) {
          console.warn('Failed to get network info, using Base Sepolia:', networkError);
          rpcUrl = 'https://sepolia.base.org';
          networkName = 'Base Sepolia (error fallback)';
        }

        console.log('🔍 Using RPC for Basename lookup:', { rpcUrl, networkName });

        // ethers.jsでリバースルックアップ実行
        let provider = new ethers.JsonRpcProvider(rpcUrl);
        let result = null;
        
        try {
          result = await provider.lookupAddress(address);
        } catch (error: any) {
          // Base SepoliaはENSをサポートしていない場合、Base Mainnetにフォールバック
          if (error.code === 'UNSUPPORTED_OPERATION' && networkName.includes('Sepolia')) {
            console.log('🔄 Base Sepolia does not support ENS, trying Base Mainnet...');
            provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
            try {
              result = await provider.lookupAddress(address);
              networkName = 'Base Mainnet (fallback from Sepolia)';
            } catch (fallbackError) {
              console.warn('Failed to lookup on Base Mainnet as well:', fallbackError);
              throw error; // 元のエラーを再投げ
            }
          } else {
            throw error;
          }
        }

        console.log('🔍 Basename lookup result:', {
          address,
          basename: result,
          rpcUrl: provider._network ? provider._network.name : rpcUrl,
          networkName
        });

        // 開発環境でのテスト用: 特定のアドレスに対して模擬Basenameを返す
        let finalResult = result;
        if (!result && process.env.NODE_ENV === 'development') {
          // ユーザーの実際のアドレスに対してテスト用Basenameを表示
          if (address === '0xe5e28ce1f8eeae58bf61d1e22fcf9954327bfd1b') {
            finalResult = 'yourname.base.eth'; // あなたのBasenameがあると仮定
            console.log('🧪 Using mock basename for user address:', finalResult);
          }
          // 古いテストアドレスもサポート
          else if (address === '0x1234567890123456789012345678901234567890') {
            finalResult = networkName.includes('Sepolia') ? 'testsepolia.base.eth' : 'testmainnet.base.eth';
            console.log('🧪 Using mock basename for test address:', finalResult);
          }
        }

        if (finalResult) {
          console.log('✅ Basename found:', finalResult, 'for address:', address);
        } else {
          console.log('ℹ️ No basename found for address:', address);
        }
        
        // 結果をアラートでも表示（デバッグ用）
        if (process.env.NODE_ENV === 'development') {
          console.log('🎯 BASENAME DEBUG - Final result:', { address, finalResult, networkName });
        }

        setBasename(finalResult || null);
      } catch (err) {
        console.error('❌ Failed to fetch Basename:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch Basename');
        setBasename(null);
      } finally {
        console.log('🏁 Basename lookup completed, loading=false');
        setLoading(false);
      }
    };

    fetchBasename();
  }, [address]);

  return { basename, loading, error };
}

// Basenameからアドレスを取得するフック
export function useAddress(basename: string | null): AddressResult {
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!basename) {
      setAddress(null);
      setLoading(false);
      setError(null);
      return;
    }

    const fetchAddress = async () => {
      setLoading(true);
      setError(null);

      try {
        // Base Mainnet と Base Sepolia の両方でBasenameを試行
        // まずBase Sepoliaを試し、失敗した場合はMainnetを試す
        let rpcUrl = 'https://sepolia.base.org';
        let networkName = 'Base Sepolia';
        
        console.log('🔍 Resolving basename to address:', { basename, rpcUrl, networkName });

        // ethers.jsで正引きルックアップ実行
        let provider = new ethers.JsonRpcProvider(rpcUrl);
        let result = null;
        
        try {
          result = await provider.resolveName(basename);
        } catch (error: any) {
          // Base SepoliaはENSをサポートしていない場合、Base Mainnetにフォールバック
          if (error.code === 'UNSUPPORTED_OPERATION' && networkName.includes('Sepolia')) {
            console.log('🔄 Base Sepolia does not support ENS, trying Base Mainnet for address resolution...');
            provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
            try {
              result = await provider.resolveName(basename);
              networkName = 'Base Mainnet (fallback from Sepolia)';
            } catch (fallbackError) {
              console.warn('Failed to resolve on Base Mainnet as well:', fallbackError);
              throw error;
            }
          } else {
            throw error;
          }
        }

        console.log('🔍 Address resolution result:', {
          basename,
          address: result,
          rpcUrl: provider._network ? provider._network.name : rpcUrl,
          networkName
        });

        setAddress(result || null);
      } catch (err) {
        console.warn('Failed to fetch address for Basename:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch address');
        setAddress(null);
      } finally {
        setLoading(false);
      }
    };

    fetchAddress();
  }, [basename]);

  return { address, loading, error };
}

// アドレス表示用のユーティリティ関数
export function formatAddress(address: string | null, basename: string | null): string {
  if (basename) {
    return basename;
  }
  
  if (address) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }
  
  return 'Unknown';
}

// Basenameかアドレスかを判定する関数
export function isBasename(input: string): boolean {
  return input.includes('.base.eth') || input.includes('.eth');
}

// キャッシュ用のMap（パフォーマンス向上）
const basenameCache = new Map<string, string | null>();
const addressCache = new Map<string, string | null>();

// キャッシュ付きのBasename取得関数
export async function getCachedBasename(address: string): Promise<string | null> {
  if (basenameCache.has(address)) {
    return basenameCache.get(address) || null;
  }

  try {
    // まずBase Sepoliaを試し、ENSサポートがない場合はBase Mainnetにフォールバック
    let provider = new ethers.JsonRpcProvider('https://sepolia.base.org');
    let result = null;
    
    try {
      result = await provider.lookupAddress(address);
    } catch (error: any) {
      if (error.code === 'UNSUPPORTED_OPERATION') {
        console.log('🔄 Cached lookup: Base Sepolia does not support ENS, trying Base Mainnet...');
        provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
        result = await provider.lookupAddress(address);
      } else {
        throw error;
      }
    }

    basenameCache.set(address, result || null);
    return result || null;
  } catch (error) {
    console.warn('Failed to fetch cached Basename:', error);
    basenameCache.set(address, null);
    return null;
  }
}

// キャッシュ付きのアドレス取得関数
export async function getCachedAddress(basename: string): Promise<string | null> {
  if (addressCache.has(basename)) {
    return addressCache.get(basename) || null;
  }

  try {
    // まずBase Sepoliaを試し、ENSサポートがない場合はBase Mainnetにフォールバック
    let provider = new ethers.JsonRpcProvider('https://sepolia.base.org');
    let result = null;
    
    try {
      result = await provider.resolveName(basename);
    } catch (error: any) {
      if (error.code === 'UNSUPPORTED_OPERATION') {
        console.log('🔄 Cached address resolution: Base Sepolia does not support ENS, trying Base Mainnet...');
        provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
        result = await provider.resolveName(basename);
      } else {
        throw error;
      }
    }

    addressCache.set(basename, result || null);
    return result || null;
  } catch (error) {
    console.warn('Failed to fetch cached address:', error);
    addressCache.set(basename, null);
    return null;
  }
}