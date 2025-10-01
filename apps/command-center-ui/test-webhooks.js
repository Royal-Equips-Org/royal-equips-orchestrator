/**
 * Webhook test script for local development
 * Tests the basic structure and imports of webhook functions
 */

import crypto from 'crypto';

// Mock Cloudflare Pages Functions environment 
// Note: We no longer need to mock timingSafeEqual since we use our own implementation
const mockCrypto = {
  subtle: crypto.webcrypto.subtle,
  randomUUID: crypto.randomUUID,
  // No timingSafeEqual - we use our own implementation
};

// Override globalThis.crypto for testing
Object.defineProperty(globalThis, 'crypto', {
  value: mockCrypto,
  writable: false,
  configurable: true
});

// Test the crypto utilities
async function testCrypto() {
  console.log('Testing crypto utilities...');
  
  const { verifyGitHubSignature, verifyShopifySignature } = await import('./functions/utils/crypto.ts');
  
  const testBody = '{"test": "data"}';
  const secret = 'test-secret';
  
  // Test GitHub signature
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(testBody);
  const githubSig = 'sha256=' + hmac.digest('hex');
  
  const githubValid = await verifyGitHubSignature(githubSig, testBody, secret);
  console.log('GitHub signature verification:', githubValid ? '✅ PASS' : '❌ FAIL');
  
  // Test Shopify signature
  const shopifyHmac = crypto.createHmac('sha256', secret);
  shopifyHmac.update(testBody);
  const shopifySig = shopifyHmac.digest('base64');
  
  const shopifyValid = await verifyShopifySignature(shopifySig, testBody, secret);
  console.log('Shopify signature verification:', shopifyValid ? '✅ PASS' : '❌ FAIL');
  
  return githubValid && shopifyValid;
}

// Test the logging utilities
function testLogger() {
  console.log('Testing logger utilities...');
  const { WebhookLogger } = require('./functions/utils/logger.ts');
  
  const logger = new WebhookLogger('test-123', 'test-webhook');
  logger.info('Test log message', { test: true });
  
  console.log('Logger test: ✅ PASS');
  return true;
}

// Run tests
async function runTests() {
  console.log('🧪 Running webhook function tests...\n');
  
  try {
    const cryptoPass = await testCrypto();
    const loggerPass = testLogger();
    
    if (cryptoPass && loggerPass) {
      console.log('\n🎉 All tests passed! Webhook functions are ready for deployment.');
    } else {
      console.log('\n❌ Some tests failed. Please check the implementation.');
      process.exit(1);
    }
  } catch (error) {
    console.error('Test error:', error);
    process.exit(1);
  }
}

runTests();