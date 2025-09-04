import { recoverAddress, hashMessage, recoverTypedDataAddress } from 'viem';

// Farcaster Frame Message Types
interface FarcasterFrameMessage {
  untrustedData: {
    fid: number;
    url: string;
    messageHash: string;
    timestamp: number;
    network: number;
    buttonIndex: number;
    castId?: {
      fid: number;
      hash: string;
    };
  };
  trustedData: {
    messageBytes: string;
  };
}

interface FarcasterPayload {
  aud: string; // audience (Mini-App URL)
  exp: number; // expiration timestamp
  iat: number; // issued at timestamp
  iss: string; // issuer (usually custody address)
  sub: string; // subject (FID)
  [key: string]: any;
}

export class FarcasterVerifier {
  private appUrl: string;
  
  constructor(appUrl: string) {
    // Ensure consistent URL format
    this.appUrl = appUrl.endsWith('/') ? appUrl.slice(0, -1) : appUrl;
  }

  /**
   * 方法A: FID → custody アドレス確認（開発用コンソール出力）
   */
  async verifyCustodyAddress(message: string, signature: string, expectedFid?: number): Promise<{
    recovered: string;
    isValid: boolean;
    fid?: number;
  }> {
    try {
      // EIP-191 personal_sign recovery
      const recovered = await recoverAddress({
        hash: hashMessage(message),
        signature: signature as `0x${string}`,
      });

      console.log('🔍 Farcaster Signature Verification:');
      console.log('  Message:', message);
      console.log('  Signature:', signature);
      console.log('  Recovered Address (custody):', recovered);
      
      if (expectedFid) {
        console.log('  Expected FID:', expectedFid);
        // In production, you would query Farcaster Hub API to get actual custody address for FID
        console.log('  ⚠️  Manual verification required: Compare recovered address with FID custody address');
      }

      return {
        recovered,
        isValid: true, // In production, compare with actual custody address
        fid: expectedFid
      };
    } catch (error) {
      console.error('❌ Custody address recovery failed:', error);
      return {
        recovered: '',
        isValid: false,
        fid: expectedFid
      };
    }
  }

  /**
   * 方法B: EIP-712 Typed Data 検証（Farcaster Frames用）
   */
  async verifyTypedDataSignature(
    domain: any,
    types: any,
    message: any,
    signature: string
  ): Promise<{
    recovered: string;
    isValid: boolean;
  }> {
    try {
      const recovered = await recoverTypedDataAddress({
        domain,
        types,
        message,
        signature: signature as `0x${string}`,
      });

      console.log('🔍 EIP-712 Typed Data Verification:');
      console.log('  Domain:', domain);
      console.log('  Message:', message);
      console.log('  Recovered Address:', recovered);

      return {
        recovered,
        isValid: true
      };
    } catch (error) {
      console.error('❌ EIP-712 verification failed:', error);
      return {
        recovered: '',
        isValid: false
      };
    }
  }

  /**
   * JWT形式のペイロード検証
   */
  verifyPayload(header: string, payload: string): {
    isValid: boolean;
    decodedHeader?: any;
    decodedPayload?: FarcasterPayload;
    errors: string[];
  } {
    const errors: string[] = [];

    try {
      // Base64URL デコード
      const decodedHeader = JSON.parse(Buffer.from(header, 'base64url').toString('utf-8'));
      const decodedPayload = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8')) as FarcasterPayload;

      console.log('🔍 JWT Payload Verification:');
      console.log('  Header:', decodedHeader);
      console.log('  Payload:', decodedPayload);

      // 1. Audience (domain) 一致確認
      if (decodedPayload.aud) {
        const normalizedAud = decodedPayload.aud.endsWith('/') ? decodedPayload.aud.slice(0, -1) : decodedPayload.aud;
        if (normalizedAud !== this.appUrl) {
          errors.push(`Audience mismatch: expected ${this.appUrl}, got ${normalizedAud}`);
          console.log('❌ Audience mismatch:', { expected: this.appUrl, actual: normalizedAud });
        } else {
          console.log('✅ Audience match:', normalizedAud);
        }
      }

      // 2. Expiration 確認
      if (decodedPayload.exp) {
        const now = Math.floor(Date.now() / 1000);
        if (decodedPayload.exp < now) {
          errors.push(`Token expired: exp ${decodedPayload.exp}, now ${now}`);
          console.log('❌ Token expired:', { exp: decodedPayload.exp, now });
        } else {
          console.log('✅ Token not expired');
        }
      }

      // 3. Issued At 確認
      if (decodedPayload.iat) {
        const now = Math.floor(Date.now() / 1000);
        if (decodedPayload.iat > now + 60) { // 1分の時差を許容
          errors.push(`Token issued in future: iat ${decodedPayload.iat}, now ${now}`);
          console.log('❌ Token issued in future:', { iat: decodedPayload.iat, now });
        } else {
          console.log('✅ Token issued at valid time');
        }
      }

      return {
        isValid: errors.length === 0,
        decodedHeader,
        decodedPayload,
        errors
      };
    } catch (error) {
      const errorMsg = `JWT decode failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      console.error('❌', errorMsg);
      
      return {
        isValid: false,
        errors
      };
    }
  }

  /**
   * Base64URL エンコーディング検証
   */
  validateBase64Url(input: string, name: string): boolean {
    try {
      // Base64URLには +, /, = が含まれないことを確認
      if (input.includes('+') || input.includes('/') || input.includes('=')) {
        console.log(`❌ ${name} contains invalid base64url characters (+, /, =)`);
        return false;
      }

      // デコードできることを確認
      Buffer.from(input, 'base64url');
      console.log(`✅ ${name} is valid base64url format`);
      return true;
    } catch (error) {
      console.log(`❌ ${name} base64url decode failed:`, error);
      return false;
    }
  }

  /**
   * フレームメッセージの完全検証
   */
  async verifyFrameMessage(frameMessage: FarcasterFrameMessage): Promise<{
    isValid: boolean;
    custodyAddress?: string;
    fid?: number;
    errors: string[];
  }> {
    const errors: string[] = [];

    try {
      console.log('🔍 Frame Message Verification:');
      console.log('  Untrusted Data:', frameMessage.untrustedData);
      
      // TODO: Implement Farcaster Hub API verification
      // This would involve:
      // 1. Verify messageBytes signature
      // 2. Get custody address from Farcaster Hub for FID
      // 3. Compare with recovered address

      console.log('  ⚠️  Hub API verification not implemented - using mock validation');
      
      return {
        isValid: true, // Mock validation
        custodyAddress: '0x0000000000000000000000000000000000000000',
        fid: frameMessage.untrustedData.fid,
        errors
      };
    } catch (error) {
      const errorMsg = `Frame message verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      console.error('❌', errorMsg);
      
      return {
        isValid: false,
        errors
      };
    }
  }
}

// Environment variables validation helper
export function validateFarcasterEnvVars(): {
  isValid: boolean;
  errors: string[];
  header?: string;
  payload?: string;
  signature?: string;
} {
  const errors: string[] = [];
  const header = process.env.FARCASTER_HEADER;
  const payload = process.env.FARCASTER_PAYLOAD;
  const signature = process.env.FARCASTER_SIGNATURE;

  console.log('🔍 Environment Variables Check:');
  console.log('  FARCASTER_HEADER:', header ? '✅ Set' : '❌ Missing');
  console.log('  FARCASTER_PAYLOAD:', payload ? '✅ Set' : '❌ Missing');
  console.log('  FARCASTER_SIGNATURE:', signature ? '✅ Set' : '❌ Missing');

  if (!header) errors.push('FARCASTER_HEADER is required');
  if (!payload) errors.push('FARCASTER_PAYLOAD is required');
  if (!signature) errors.push('FARCASTER_SIGNATURE is required');

  // Base64URL format validation
  const verifier = new FarcasterVerifier('https://example.com');
  if (header && !verifier.validateBase64Url(header, 'FARCASTER_HEADER')) {
    errors.push('FARCASTER_HEADER is not valid base64url format');
  }
  if (payload && !verifier.validateBase64Url(payload, 'FARCASTER_PAYLOAD')) {
    errors.push('FARCASTER_PAYLOAD is not valid base64url format');
  }

  return {
    isValid: errors.length === 0,
    errors,
    header,
    payload,
    signature
  };
}

export default FarcasterVerifier;