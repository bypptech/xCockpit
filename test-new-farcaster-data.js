
const fetch = require('node-fetch');

async function testFarcasterData() {
  console.log('🧪 Testing new Farcaster Mini App data...\n');
  
  try {
    // Test environment validation
    const response = await fetch('http://localhost:5000/api/frame/test-env');
    const result = await response.json();
    
    console.log('📊 Test Results:');
    console.log('================');
    console.log('Success:', result.success);
    
    if (result.environmentValidation) {
      console.log('\n🔍 Environment Validation:');
      console.log('Valid:', result.environmentValidation.isValid);
      if (result.environmentValidation.errors?.length > 0) {
        console.log('Errors:', result.environmentValidation.errors);
      }
    }
    
    if (result.decodedData) {
      console.log('\n📦 Decoded Data:');
      console.log('Header:', result.decodedData.header);
      console.log('Payload:', result.decodedData.payload);
    }
    
    if (result.payloadValidation) {
      console.log('\n✅ Payload Validation:');
      console.log('Valid:', result.payloadValidation.isValid);
      if (result.payloadValidation.errors?.length > 0) {
        console.log('Errors:', result.payloadValidation.errors);
      }
    }
    
    console.log('\n🌐 App URL:', result.appUrl);
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// デコードテスト
function decodeTestData() {
  console.log('\n🔍 Manual decode test:');
  
  const header = "eyJmaWQiOjEzMjIwNDYsInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHgxQUZFNjc2RDBCRjAyYzk2OTM2YzREMzQ3MTc5MDY0QkRiMWU5RUY4In0";
  const payload = "eyJkb21haW4iOiIyMDI1MDl2aWJlY29kaW5nbWluaWhhY2tlcnNvbi5ieXBwLnRlY2gifQ";
  
  try {
    const decodedHeader = JSON.parse(Buffer.from(header, 'base64url').toString('utf-8'));
    const decodedPayload = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
    
    console.log('Header:', decodedHeader);
    console.log('Payload:', decodedPayload);
    
    console.log('\n📋 Analysis:');
    console.log('- FID:', decodedHeader.fid);
    console.log('- Type:', decodedHeader.type);
    console.log('- Key:', decodedHeader.key);
    console.log('- Domain:', decodedPayload.domain);
    
  } catch (error) {
    console.error('❌ Decode failed:', error);
  }
}

// Run tests
decodeTestData();
console.log('\n' + '='.repeat(50));
testFarcasterData();
