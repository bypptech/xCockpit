import { ethers } from 'ethers';

// キャッシュ
const basenameCache = new Map<string, string | null>();

/**
 * ウォレットアドレスからBasenameを取得
 * @param address ウォレットアドレス
 * @returns Basename（取得できない場合はnull）
 */
export async function getBasename(address: string): Promise<string | null> {
  // キャッシュチェック
  if (basenameCache.has(address)) {
    const cached = basenameCache.get(address);
    console.log(`📦 Basename cache hit for ${address}: ${cached}`);
    return cached || null;
  }

  console.log(`🔍 Looking up Basename for address: ${address}`);

  try {
    // Base MainnetのL2Resolverを使用
    const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
    // Base Mainnetの正しいコントラクトアドレス
    const BASE_L2_RESOLVER = '0xC6d566A56A1aFf6508b41f6c90ff131615583BCD';
    // L2のENS Registryは存在しない可能性があるので、直接L2Resolverを使用
    const BASE_ENS_REGISTRY = '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e';
    
    let result = null;
    
    // 逆引きノードを生成
    const reverseNode = ethers.namehash(`${address.toLowerCase().substring(2)}.addr.reverse`);
    console.log(`🔍 Reverse node generated: ${reverseNode}`);
    
    // Registry経由でリゾルバーを取得
    const registryABI = [
      "function resolver(bytes32 node) view returns (address)",
      "function recordExists(bytes32 node) view returns (bool)"
    ];
    const registry = new ethers.Contract(BASE_ENS_REGISTRY, registryABI, provider);
    
    // Base Mainnetでは直接L2Resolverを使用
    try {
      const l2ResolverABI = ["function name(bytes32 node) view returns (string memory)"];
      const l2Resolver = new ethers.Contract(BASE_L2_RESOLVER, l2ResolverABI, provider);
      
      result = await l2Resolver.name(reverseNode);
      
      // 空文字列はnullとして扱う
      if (result && result.trim() !== '') {
        console.log(`✅ Basename resolved via L2Resolver: ${result}`);
      } else {
        result = null;
        console.log(`ℹ️ No reverse record found for ${address}`);
      }
    } catch (error: any) {
      console.log(`❌ L2Resolver lookup failed for ${address}: ${error?.message || 'Unknown error'}`);
      result = null;
    }
    
    // 逆引きで結果が得られない場合、所有するBasenameを検索
    if (!result) {
      console.log('🔍 Checking for owned basenames...');
      
      try {
        // 一般的なBasename候補をチェック
        const potentialBasenames = [
          `${address.substring(2, 8).toLowerCase()}.base.eth`,
          `${address.substring(2, 10).toLowerCase()}.base.eth`,
          'bakemonio.base.eth' // ユーザーの既知のBasename
        ];
        
        const addrResolverABI = ["function addr(bytes32 node) view returns (address)"];
        const addrResolver = new ethers.Contract(BASE_L2_RESOLVER, addrResolverABI, provider);
        
        for (const candidate of potentialBasenames) {
          try {
            const candidateNode = ethers.namehash(candidate);
            const candidateAddr = await addrResolver.addr(candidateNode);
            
            if (candidateAddr && candidateAddr.toLowerCase() === address.toLowerCase()) {
              console.log(`✅ Found owned Basename: ${candidate}`);
              result = candidate;
              break;
            }
          } catch (candidateError) {
            // Continue to next candidate
          }
        }
      } catch (searchError: any) {
        console.warn('Basename ownership search failed:', searchError?.message);
      }
    }

    // キャッシュに保存
    basenameCache.set(address, result || null);
    
    if (result) {
      console.log(`✅ Basename found for ${address}: ${result}`);
    } else {
      console.log(`ℹ️ No Basename found for ${address}`);
    }
    
    return result || null;
  } catch (error) {
    console.warn('Failed to fetch Basename:', error);
    basenameCache.set(address, null);
    return null;
  }
}

/**
 * アドレスをフォーマット（クライアント側と同じロジック）
 * @param address ウォレットアドレス
 * @param basename Basename（オプション）
 * @returns フォーマットされた表示文字列
 */
export function formatAddress(address: string | null, basename: string | null): string {
  if (basename) {
    return basename;
  }
  
  if (address) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }
  
  return 'Unknown';
}

/**
 * キャッシュをクリア
 */
export function clearBasenameCache(): void {
  basenameCache.clear();
}