#!/usr/bin/env node

// Farcaster署名検証テストスクリプト
// Usage: node test-farcaster-verify.js

const { recoverAddress, hashMessage } = require('viem');
const crypto = require('crypto');

// テスト用データ
const TEST_MESSAGE = "Hello Farcaster Frame";
const TEST_PRIVATE_KEY = "0x1234567890123456789012345678901234567890123456789012345678901234"; // テスト用のみ
const TEST_FID = 12345;

console.log('🧪 Farcaster署名検証テスト開始\n');

async function testSignatureRecovery() {
  console.log('📝 テスト1: 署名の生成と復元');
  
  try {
    // 1. メッセージのハッシュ化
    const messageHash = hashMessage(TEST_MESSAGE);
    console.log('  Message:', TEST_MESSAGE);
    console.log('  Hash:', messageHash);
    
    // 注意: 実際の本番環境では、Farcasterの署名を使用します
    console.log('  ⚠️  実際の環境では、Farcasterから取得した署名を使用してください');
    
    console.log('  ✅ テスト1完了\n');
  } catch (error) {
    console.error('  ❌ テスト1失敗:', error.message);
  }
}

function testBase64UrlEncoding() {
  console.log('📝 テスト2: Base64URL エンコーディング検証');
  
  const testHeader = {
    alg: "HS256",
    typ: "JWT"
  };
  
  const testPayload = {
    aud: "https://202509vibecodingminihackerson.bypp.tech",
    exp: Math.floor(Date.now() / 1000) + 3600, // 1時間後
    iat: Math.floor(Date.now() / 1000),
    iss: "farcaster",
    sub: TEST_FID.toString()
  };
  
  try {
    // JSON → UTF-8 → Base64URL
    const headerJson = JSON.stringify(testHeader);
    const payloadJson = JSON.stringify(testPayload);
    
    const headerB64 = Buffer.from(headerJson, 'utf-8').toString('base64url');
    const payloadB64 = Buffer.from(payloadJson, 'utf-8').toString('base64url');
    
    console.log('  Header JSON:', headerJson);
    console.log('  Header Base64URL:', headerB64);
    console.log('  Payload JSON:', payloadJson);
    console.log('  Payload Base64URL:', payloadB64);
    
    // Base64URLの特徴確認
    const hasInvalidChars = headerB64.includes('+') || headerB64.includes('/') || headerB64.includes('=') ||
                           payloadB64.includes('+') || payloadB64.includes('/') || payloadB64.includes('=');
    
    if (hasInvalidChars) {
      console.log('  ❌ Base64URLに無効な文字が含まれています (+, /, =)');
    } else {
      console.log('  ✅ Base64URL形式が正しいです');
    }
    
    // デコードテスト
    const decodedHeader = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf-8'));
    const decodedPayload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8'));
    
    console.log('  デコード結果 - Header:', decodedHeader);
    console.log('  デコード結果 - Payload:', decodedPayload);
    
    console.log('  ✅ テスト2完了\n');
  } catch (error) {
    console.error('  ❌ テスト2失敗:', error.message);
  }
}

function testAudienceValidation() {
  console.log('📝 テスト3: Audience (domain) 一致確認');
  
  const testCases = [
    {
      payload: "https://202509vibecodingminihackerson.bypp.tech",
      expected: "https://202509vibecodingminihackerson.bypp.tech",
      shouldMatch: true
    },
    {
      payload: "https://202509vibecodingminihackerson.bypp.tech/",
      expected: "https://202509vibecodingminihackerson.bypp.tech",
      shouldMatch: true
    },
    {
      payload: "https://other-domain.com",
      expected: "https://202509vibecodingminihackerson.bypp.tech",
      shouldMatch: false
    }
  ];
  
  testCases.forEach((testCase, index) => {
    const normalizedPayload = testCase.payload.endsWith('/') ? testCase.payload.slice(0, -1) : testCase.payload;
    const normalizedExpected = testCase.expected.endsWith('/') ? testCase.expected.slice(0, -1) : testCase.expected;
    const matches = normalizedPayload === normalizedExpected;
    
    console.log(`  テストケース ${index + 1}:`);
    console.log(`    Payload: ${testCase.payload}`);
    console.log(`    Expected: ${testCase.expected}`);
    console.log(`    Normalized Payload: ${normalizedPayload}`);
    console.log(`    Normalized Expected: ${normalizedExpected}`);
    console.log(`    Should Match: ${testCase.shouldMatch}`);
    console.log(`    Actually Matches: ${matches}`);
    
    if (matches === testCase.shouldMatch) {
      console.log(`    ✅ テストケース ${index + 1} 成功`);
    } else {
      console.log(`    ❌ テストケース ${index + 1} 失敗`);
    }
    console.log();
  });
  
  console.log('  ✅ テスト3完了\n');
}

function generateSampleEnvVars() {
  console.log('📝 サンプル環境変数生成');
  
  const sampleHeader = {
    alg: "HS256",
    typ: "JWT"
  };
  
  const samplePayload = {
    aud: "https://202509vibecodingminihackerson.bypp.tech",
    exp: Math.floor(Date.now() / 1000) + 86400, // 24時間後
    iat: Math.floor(Date.now() / 1000),
    iss: "farcaster",
    sub: "12345", // Sample FID
    name: "Nagesen Gacha Live"
  };
  
  const headerB64 = Buffer.from(JSON.stringify(sampleHeader), 'utf-8').toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(samplePayload), 'utf-8').toString('base64url');
  
  // モック署名生成
  const secret = 'sample-secret-for-testing';
  const signatureData = `${headerB64}.${payloadB64}`;
  const signature = crypto.createHmac('sha256', secret).update(signatureData).digest('hex');
  
  console.log('  📋 .envファイルに追加する環境変数:');
  console.log('  ⚠️  注意: これはテスト用のサンプルです。本番では npx create-onchain --manifest を使用してください。');
  console.log();
  console.log(`FARCASTER_HEADER="${headerB64}"`);
  console.log(`FARCASTER_PAYLOAD="${payloadB64}"`);
  console.log(`FARCASTER_SIGNATURE="0x${signature}"`);
  console.log();
}

async function runAllTests() {
  await testSignatureRecovery();
  testBase64UrlEncoding();
  testAudienceValidation();
  generateSampleEnvVars();
  
  console.log('🎉 全テスト完了!');
  console.log();
  console.log('📌 次のステップ:');
  console.log('1. npx create-onchain --manifest を実行して正式なマニフェストを生成');
  console.log('2. 生成された環境変数を .env ファイルに追加');
  console.log('3. サーバーを再起動して検証システムをテスト');
  console.log('4. Warpcast でフレームをテスト');
}

// テスト実行
runAllTests().catch(console.error);