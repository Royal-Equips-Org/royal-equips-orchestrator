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

  // Crypto interface is already available in Cloudflare runtime
  // No need to extend - we use our own timing-safe comparison
}

export {};