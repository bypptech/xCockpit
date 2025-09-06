import { getBasename, formatAddress } from './server/utils/basename-resolver.js';

// Test addresses
const addresses = [
  '0xE5E28cE1F8eEAE58Bf61D1E22fcF9954327Bfd1B', // bakemonio.base.eth (with uppercase)
  '0xe5e28ce1f8eeae58bf61d1e22fcf9954327bfd1b', // bakemonio.base.eth (with lowercase)
  '0xe5e2B1F8819F517ad7Dc58f1c23Ae2eFd9b8fd1b', // Different address (typo in original?)
];

console.log('🧪 Testing Basename resolution...\n');

for (const address of addresses) {
  console.log(`Testing address: ${address}`);
  console.log('─'.repeat(50));
  
  try {
    const basename = await getBasename(address);
    const formatted = formatAddress(address, basename);
    
    console.log(`  Basename: ${basename || 'NOT FOUND'}`);
    console.log(`  Formatted: ${formatted}`);
    
  } catch (error) {
    console.error(`  Error: ${error.message}`);
  }
  
  console.log('');
}

console.log('✅ Test complete');
process.exit(0);