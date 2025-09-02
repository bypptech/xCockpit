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
    if (!address) {
      setBasename(null);
      setLoading(false);
      setError(null);
      return;
    }

    const fetchBasename = async () => {
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
            case '0x1': // Ethereum Mainnet (1) - Base MainnetのENSを試す
              rpcUrl = 'https://mainnet.base.org';
              networkName = 'Base Mainnet (via Ethereum)';
              break;
            default:
              // その他のネットワークでもBase Mainnetを試す
              rpcUrl = 'https://mainnet.base.org';
              networkName = 'Base Mainnet (fallback)';
              break;
          }
        } catch (networkError) {
          console.warn('Failed to get network info, using Base Mainnet:', networkError);
          rpcUrl = 'https://mainnet.base.org';
          networkName = 'Base Mainnet (error fallback)';
        }

        console.log('🔍 Using RPC for Basename lookup:', { rpcUrl, networkName });

        // ethers.jsでリバースルックアップ実行
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const result = await provider.lookupAddress(address);

        console.log('🔍 Basename lookup result:', {
          address,
          basename: result,
          rpcUrl,
          networkName
        });

        setBasename(result || null);
      } catch (err) {
        console.warn('Failed to fetch Basename:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch Basename');
        setBasename(null);
      } finally {
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
        // Base Mainnet RPC (Basenames は主にMainnetで使用される)
        const rpcUrl = 'https://mainnet.base.org';
        
        console.log('🔍 Resolving basename to address:', { basename, rpcUrl });

        // ethers.jsで正引きルックアップ実行
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const result = await provider.resolveName(basename);

        console.log('🔍 Address resolution result:', {
          basename,
          address: result,
          rpcUrl
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
    // Base Mainnet RPC (デフォルト)
    const rpcUrl = 'https://mainnet.base.org';
    
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const result = await provider.lookupAddress(address);

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
    // Base Mainnet RPC (デフォルト)
    const rpcUrl = 'https://mainnet.base.org';
    
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const result = await provider.resolveName(basename);

    addressCache.set(basename, result || null);
    return result || null;
  } catch (error) {
    console.warn('Failed to fetch cached address:', error);
    addressCache.set(basename, null);
    return null;
  }
}