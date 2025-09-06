#!/usr/bin/env node

// Farcaster Account Association JWT Generator
// This script helps generate the JWT tokens needed for domain verification

import crypto from 'crypto';

// Configuration
const DOMAIN = '202509vibecodingminihackerson.bypp.tech';
const FID = '12345'; // Replace with your actual Farcaster ID

// Base64URL encode function
function base64urlEncode(str) {
  return Buffer.from(str, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Generate JWT header
const header = {
  "alg": "EdDSA",
  "typ": "JWT"
};

// Generate JWT payload
const payload = {
  "domain": DOMAIN,
  "subject": `fid:${FID}`,
  "iat": Math.floor(Date.now() / 1000),
  "exp": Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60) // 1 year
};

const encodedHeader = base64urlEncode(JSON.stringify(header));
const encodedPayload = base64urlEncode(JSON.stringify(payload));

console.log('🔐 Farcaster Account Association JWT Generator');
console.log('================================================');
console.log('');
console.log('📋 Configuration:');
console.log(`   Domain: ${DOMAIN}`);
console.log(`   FID: ${FID}`);
console.log('');
console.log('📤 Generated JWT Components:');
console.log('');
console.log('🔹 Header (encoded):');
console.log(encodedHeader);
console.log('');
console.log('🔹 Header (decoded):');
console.log(JSON.stringify(header, null, 2));
console.log('');
console.log('🔹 Payload (encoded):');
console.log(encodedPayload);
console.log('');
console.log('🔹 Payload (decoded):');
console.log(JSON.stringify(payload, null, 2));
console.log('');
console.log('🔹 Unsigned Token:');
console.log(`${encodedHeader}.${encodedPayload}`);
console.log('');
console.log('⚠️  NEXT STEPS:');
console.log('1. Copy the unsigned token above');
console.log('2. Sign it with your Farcaster private key using EdDSA');
console.log('3. Append the signature to complete: header.payload.signature');
console.log('4. Update the farcaster.json manifest with the signed JWT');
console.log('');
console.log('🌐 Useful Resources:');
console.log('- Farcaster Dev Portal: https://developers.farcaster.xyz/');
console.log('- JWT.io for debugging: https://jwt.io/');
console.log('- Farcaster Mini Apps Docs: https://miniapps.farcaster.xyz/');
console.log('');

// Generate sample manifest update
console.log('📝 Sample manifest update:');
console.log(JSON.stringify({
  "accountAssociation": {
    "header": encodedHeader,
    "payload": encodedPayload,
    "signature": "REPLACE_WITH_ACTUAL_SIGNATURE_AFTER_SIGNING"
  }
}, null, 2));