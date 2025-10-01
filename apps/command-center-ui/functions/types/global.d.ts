/**
 * Global type definitions for Cloudflare Pages Functions
 */

declare global {
  interface PagesFunction<Env = any> {
    (context: {
      request: Request;
      env: Env;
      params: Record<string, string>;
      data: Record<string, any>;
      next: () => Promise<Response>;
    }): Promise<Response> | Response;
  }

  // Extend crypto to include timingSafeEqual if not available
  interface Crypto {
    timingSafeEqual(a: Uint8Array | ArrayBuffer, b: Uint8Array | ArrayBuffer): boolean;
  }
}

// Implementation of timingSafeEqual for environments that don't have it
if (!crypto.timingSafeEqual) {
  crypto.timingSafeEqual = function(a: Uint8Array | ArrayBuffer, b: Uint8Array | ArrayBuffer): boolean {
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
  };
}

export {};