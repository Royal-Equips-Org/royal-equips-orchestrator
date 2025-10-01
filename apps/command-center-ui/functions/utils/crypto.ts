/**
 * Cryptographic utilities for webhook signature verification
 * Production-ready implementations for GitHub and Shopify webhook validation
 */

/**
 * Timing-safe comparison function for Cloudflare runtime
 * Prevents timing attacks on signature comparison
 */
function timingSafeEqual(a: Uint8Array | ArrayBuffer, b: Uint8Array | ArrayBuffer): boolean {
  const aBytes = new Uint8Array(a);
  const bBytes = new Uint8Array(b);
  
  if (aBytes.length !== bBytes.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < aBytes.length; i++) {
    result |= aBytes[i] ^ bBytes[i];
  }
  
  return result === 0;
}

/**
 * Verify GitHub webhook signature using SHA-256 HMAC
 * @param signature The X-Hub-Signature-256 header value
 * @param body The raw request body as string
 * @param secret The webhook secret
 * @returns Promise<boolean> True if signature is valid
 */
export async function verifyGitHubSignature(
  signature: string,
  body: string,
  secret: string
): Promise<boolean> {
  try {
    if (!signature.startsWith('sha256=')) {
      return false;
    }

    const expectedSignature = signature.slice(7); // Remove 'sha256=' prefix
    
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const mac = await crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(body)
    );

    const computedSignature = Array.from(new Uint8Array(mac))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return timingSafeEqual(
      new TextEncoder().encode(computedSignature),
      new TextEncoder().encode(expectedSignature)
    );
  } catch (error) {
    console.error('GitHub signature verification failed:', error);
    return false;
  }
}

/**
 * Verify Shopify webhook HMAC signature
 * @param signature The X-Shopify-Hmac-Sha256 header value (base64)
 * @param body The raw request body as string
 * @param secret The webhook secret
 * @returns Promise<boolean> True if signature is valid
 */
export async function verifyShopifySignature(
  signature: string,
  body: string,
  secret: string
): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const mac = await crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(body)
    );

    // Convert ArrayBuffer to base64
    const bytes = new Uint8Array(mac);
    const computedSignature = btoa(String.fromCharCode.apply(null, Array.from(bytes)));

    return timingSafeEqual(
      new TextEncoder().encode(computedSignature),
      new TextEncoder().encode(signature)
    );
  } catch (error) {
    console.error('Shopify signature verification failed:', error);
    return false;
  }
}

/**
 * Generate a unique request ID for tracking
 */
export function generateRequestId(): string {
  return crypto.randomUUID();
}