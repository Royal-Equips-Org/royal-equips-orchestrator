/**
 * Global Type Definitions for Workers, 3D/XR, and DevTools
 * Isolates globals to correct environments
 */

// Web Workers and Service Worker globals
declare global {
  // Worker-specific globals
  interface WorkerGlobalScope {
    readonly crypto: Crypto;
    readonly performance: Performance;
    readonly console: Console;
  }

  // Offscreen Canvas for workers
  interface OffscreenCanvas {
    readonly width: number;
    readonly height: number;
    getContext(contextId: '2d'): OffscreenCanvasRenderingContext2D | null;
    getContext(contextId: 'webgl' | 'webgl2'): WebGLRenderingContext | null;
  }

  // WebXR and 3D globals (browser only)
  interface Window {
    // XR globals
    XRWebGLLayer?: typeof XRWebGLLayer;
    XRSession?: typeof XRSession;
    
    // Three.js DevTools (development only)
    __THREE_DEVTOOLS__?: {
      enabled: boolean;
      dispatcherTakeScreenshot: () => void;
    };
    
    // React DevTools (development only)  
    __REACT_DEVTOOLS_GLOBAL_HOOK__?: {
      isDisabled?: boolean;
      supportsFiber: boolean;
    };
    
    // Performance monitoring (development)
    __PERFORMANCE_OBSERVER__?: PerformanceObserver;
  }

  // Cloudflare Workers globals
  interface CloudflareWorkerGlobalScope {
    readonly caches: CacheStorage;
    readonly crypto: Crypto;
    readonly fetch: typeof fetch;
    readonly Request: typeof Request;
    readonly Response: typeof Response;
    readonly Headers: typeof Headers;
    readonly URL: typeof URL;
    readonly WebSocketPair: typeof WebSocketPair;
    readonly ReadableStream: typeof ReadableStream;
    readonly WritableStream: typeof WritableStream;
    readonly TransformStream: typeof TransformStream;
  }

  // Edge Runtime globals (Vercel, Netlify)
  interface EdgeRuntimeGlobalScope {
    readonly crypto: Crypto;
    readonly fetch: typeof fetch;
    readonly Request: typeof Request;
    readonly Response: typeof Response;
    readonly Headers: typeof Headers;
    readonly URL: typeof URL;
    readonly AbortController: typeof AbortController;
    readonly AbortSignal: typeof AbortSignal;
  }
}

// Module augmentation for Node.js crypto
declare module 'node:crypto' {
  interface Crypto {
    readonly subtle: SubtleCrypto;
  }
}

// DevTools type guards
export function isDevToolsEnabled(): boolean {
  return typeof window !== 'undefined' && (
    Boolean(window.__REACT_DEVTOOLS_GLOBAL_HOOK__) ||
    Boolean(window.__THREE_DEVTOOLS__)
  );
}

export function isWorkerEnvironment(): boolean {
  return typeof WorkerGlobalScope !== 'undefined' && 
         typeof importScripts === 'function';
}

export function isCloudflareWorker(): boolean {
  return typeof caches !== 'undefined' && 
         typeof WebSocketPair !== 'undefined';
}

export {};