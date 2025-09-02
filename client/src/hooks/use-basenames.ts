import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { walletService } from '@/lib/coinbase-wallet';

interface BasenameResult {
  basename: string | null;
  ownedBasename: string | null;
  hasReverseRecord: boolean;
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
  const [ownedBasename, setOwnedBasename] = useState<string | null>(null);
  const [hasReverseRecord, setHasReverseRecord] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('useBasename Hook Called - Address:', address);
    
    if (!address) {
      console.log('❌ useBasename: No address provided');
      setBasename(null);
      setOwnedBasename(null);
      setHasReverseRecord(false);
      setLoading(false);
      setError(null);
      return;
    }

    const fetchBasename = async () => {
      console.log('🚀 useBasename: Starting fetch for:', address);
      setLoading(true);
      setError(null);

      try {
        // Base Mainnetを直接使用してL2Resolverでの逆引きを実行
        const rpcUrl = 'https://mainnet.base.org';
        const networkName = 'Base Mainnet';
        
        console.log('🔍 Using Base Mainnet L2Resolver for Basename lookup:', { rpcUrl, networkName });

        // Base MainnetのL2Resolverを使用
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const BASE_L2_RESOLVER = '0xC6d566A56A1aFf6508b41f6c90ff131615583BCD';
        const BASE_ENS_REGISTRY = '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e';
        
        // L2Resolver ABI
        const l2ResolverABI = [
          "function name(bytes32 node) view returns (string memory)"
        ];
        
        // Registry ABI
        const registryABI = [
          "function resolver(bytes32 node) view returns (address)",
          "function recordExists(bytes32 node) view returns (bool)"
        ];
        
        let result = null;
        
        try {
          // 1. 逆引きノードを生成
          const reverseNode = ethers.namehash(`${address.toLowerCase().substring(2)}.addr.reverse`);
          console.log('🔍 Reverse node:', reverseNode);
          
          // 2. Registryでリゾルバーアドレスをチェック
          const registry = new ethers.Contract(BASE_ENS_REGISTRY, registryABI, provider);
          
          try {
            const recordExists = await registry.recordExists(reverseNode);
            console.log('🔍 Reverse record exists:', recordExists);
            
            if (recordExists) {
              const resolverAddress = await registry.resolver(reverseNode);
              console.log('🔍 Resolver address:', resolverAddress);
              
              if (resolverAddress && resolverAddress !== ethers.ZeroAddress) {
                // 3. リゾルバーからBasename取得
                const resolver = new ethers.Contract(resolverAddress, l2ResolverABI, provider);
                result = await resolver.name(reverseNode);
                console.log('🔍 Name from resolver:', result);
              } else {
                console.log('ℹ️ No resolver set for reverse record');
              }
            } else {
              console.log('ℹ️ No reverse record exists for this address');
            }
          } catch (registryError: any) {
            console.warn('Registry lookup failed, trying direct L2Resolver:', registryError.message);
            
            // フォールバック: L2Resolverを直接使用
            const l2Resolver = new ethers.Contract(BASE_L2_RESOLVER, l2ResolverABI, provider);
            try {
              result = await l2Resolver.name(reverseNode);
              console.log('🔍 Direct L2Resolver result:', result);
            } catch (directError) {
              console.warn('Direct L2Resolver also failed:', directError.message);
            }
          }
        } catch (error: any) {
          console.error('Base Basename lookup error:', error);
          throw error;
        }

        console.log('🔍 Basename lookup result:', {
          address,
          basename: result,
          networkName
        });

        let finalResult = result;
        let foundOwnedBasename: string | null = null;
        const reverseRecordExists = !!result;

        // 逆引きで結果が得られない場合、所有するBasenameを検索
        if (!finalResult) {
          console.log('ℹ️ No reverse record found, checking for owned basenames...');
          
          try {
            // 一般的なBasename候補をチェック
            const potentialBasenames = [
              `${address.substring(2, 8)}.base.eth`,
              `${address.substring(2, 10)}.base.eth`,
              'bakemonio.base.eth' // ユーザーの既知のBasename
            ];
            
            const l2ResolverABI = ["function addr(bytes32 node) view returns (address)"];
            const l2Resolver = new ethers.Contract(BASE_L2_RESOLVER, l2ResolverABI, provider);
            
            for (const candidate of potentialBasenames) {
              try {
                const candidateNode = ethers.namehash(candidate);
                const candidateAddr = await l2Resolver.addr(candidateNode);
                
                if (candidateAddr && candidateAddr.toLowerCase() === address.toLowerCase()) {
                  console.log(`✅ Found owned Basename: ${candidate}`);
                  foundOwnedBasename = candidate;
                  finalResult = candidate;
                  break;
                }
              } catch (candidateError) {
                // Continue to next candidate
              }
            }
          } catch (searchError) {
            console.warn('Basename ownership search failed:', searchError);
          }
        } else {
          // 逆引きがある場合、それを所有Basenameとしても設定
          foundOwnedBasename = result;
        }

        if (finalResult) {
          console.log('✅ Basename found:', finalResult, 'for address:', address);
        } else {
          console.log('ℹ️ No basename found for address:', address);
        }
        
        // 結果をアラートでも表示（デバッグ用）
        if (process.env.NODE_ENV === 'development') {
          console.log('🎯 BASENAME DEBUG - Final result:', { 
            address, 
            finalResult, 
            foundOwnedBasename,
            reverseRecordExists,
            networkName 
          });
          
          // 逆引きが設定されていない場合の案内
          if (!reverseRecordExists && foundOwnedBasename) {
            console.log('💡 TIP: Set your primary name by calling setName() on ReverseRegistrar');
            console.log('This will enable automatic reverse lookup');
          }
        }

        setBasename(finalResult || null);
        setOwnedBasename(foundOwnedBasename);
        setHasReverseRecord(reverseRecordExists);
      } catch (err) {
        console.error('❌ Failed to fetch Basename:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch Basename');
        setBasename(null);
        setOwnedBasename(null);
        setHasReverseRecord(false);
      } finally {
        console.log('🏁 Basename lookup completed, loading=false');
        setLoading(false);
      }
    };

    fetchBasename();
  }, [address]);

  return { basename, ownedBasename, hasReverseRecord, loading, error };
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
        // Base MainnetのL2Resolverを使用
        const rpcUrl = 'https://mainnet.base.org';
        const networkName = 'Base Mainnet';
        
        console.log('🔍 Resolving basename to address:', { basename, rpcUrl, networkName });

        // Base MainnetのL2Resolverを使用
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const BASE_L2_RESOLVER = '0xC6d566A56A1aFf6508b41f6c90ff131615583BCD';
        
        // 正引きノードを生成
        const node = ethers.namehash(basename);
        console.log('🔍 Forward lookup node:', node);
        
        // L2Resolverでアドレス解決
        const l2ResolverABI = ["function addr(bytes32 node) view returns (address)"];
        const l2Resolver = new ethers.Contract(BASE_L2_RESOLVER, l2ResolverABI, provider);
        
        const result = await l2Resolver.addr(node);
        
        console.log('🔍 Address resolution result:', {
          basename,
          address: result,
          networkName
        });

        // ZeroAddressの場合はnullに変換
        const finalResult = result && result !== ethers.ZeroAddress ? result : null;
        setAddress(finalResult);
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
    // Base MainnetのL2Resolverを使用
    const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
    const BASE_L2_RESOLVER = '0xC6d566A56A1aFf6508b41f6c90ff131615583BCD';
    const BASE_ENS_REGISTRY = '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e';
    
    let result = null;
    
    // 逆引きノードを生成
    const reverseNode = ethers.namehash(`${address.toLowerCase().substring(2)}.addr.reverse`);
    
    // Registry経由でリゾルバーを取得
    const registryABI = [
      "function resolver(bytes32 node) view returns (address)",
      "function recordExists(bytes32 node) view returns (bool)"
    ];
    const registry = new ethers.Contract(BASE_ENS_REGISTRY, registryABI, provider);
    
    try {
      const recordExists = await registry.recordExists(reverseNode);
      
      if (recordExists) {
        const resolverAddress = await registry.resolver(reverseNode);
        
        if (resolverAddress && resolverAddress !== ethers.ZeroAddress) {
          const resolverABI = ["function name(bytes32 node) view returns (string memory)"];
          const resolver = new ethers.Contract(resolverAddress, resolverABI, provider);
          result = await resolver.name(reverseNode);
        }
      }
    } catch (registryError) {
      // フォールバック: L2Resolverを直接使用
      const l2ResolverABI = ["function name(bytes32 node) view returns (string memory)"];
      const l2Resolver = new ethers.Contract(BASE_L2_RESOLVER, l2ResolverABI, provider);
      
      try {
        result = await l2Resolver.name(reverseNode);
      } catch (directError) {
        console.warn('Cached lookup failed:', directError);
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
    // Base MainnetのL2Resolverを使用
    const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
    const BASE_L2_RESOLVER = '0xC6d566A56A1aFf6508b41f6c90ff131615583BCD';
    
    let result = null;
    
    // 正引きノードを生成
    const node = ethers.namehash(basename);
    
    // L2Resolverでアドレス解決
    const l2ResolverABI = ["function addr(bytes32 node) view returns (address)"];
    const l2Resolver = new ethers.Contract(BASE_L2_RESOLVER, l2ResolverABI, provider);
    
    result = await l2Resolver.addr(node);
    
    if (result && result === ethers.ZeroAddress) {
      result = null;
    }

    addressCache.set(basename, result || null);
    return result || null;
  } catch (error) {
    console.warn('Failed to fetch cached address:', error);
    addressCache.set(basename, null);
    return null;
  }
}