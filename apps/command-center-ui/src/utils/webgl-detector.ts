/**
 * WebGL Support Detection
 * Detects WebGL capabilities before attempting to render 3D content
 */

export interface WebGLCapabilities {
  supported: boolean;
  version: 1 | 2 | null;
  renderer: string | null;
  vendor: string | null;
  maxTextureSize: number | null;
  error: string | null;
}

/**
 * Detect WebGL support and capabilities
 */
export function detectWebGL(): WebGLCapabilities {
  try {
    // Create a temporary canvas
    const canvas = document.createElement('canvas');
    
    // Try WebGL 2 first
    let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
    let version: 1 | 2 | null = null;
    
    try {
      gl = canvas.getContext('webgl2');
      if (gl) {
        version = 2;
      }
    } catch (e) {
      // WebGL 2 not supported
    }
    
    // Fall back to WebGL 1
    if (!gl) {
      try {
        gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl) {
          version = 1;
        }
      } catch (e) {
        // WebGL 1 not supported
      }
    }
    
    if (!gl) {
      return {
        supported: false,
        version: null,
        renderer: null,
        vendor: null,
        maxTextureSize: null,
        error: 'WebGL is not supported in this browser'
      };
    }
    
    // Get WebGL info
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = debugInfo 
      ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) 
      : gl.getParameter(gl.RENDERER);
    const vendor = debugInfo
      ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)
      : gl.getParameter(gl.VENDOR);
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    
    return {
      supported: true,
      version,
      renderer: renderer as string,
      vendor: vendor as string,
      maxTextureSize: maxTextureSize as number,
      error: null
    };
  } catch (error) {
    return {
      supported: false,
      version: null,
      renderer: null,
      vendor: null,
      maxTextureSize: null,
      error: error instanceof Error ? error.message : 'Unknown WebGL error'
    };
  }
}

/**
 * Check if WebGL is available (cached result)
 */
let cachedCapabilities: WebGLCapabilities | null = null;

export function isWebGLAvailable(): boolean {
  if (!cachedCapabilities) {
    cachedCapabilities = detectWebGL();
  }
  return cachedCapabilities.supported;
}

/**
 * Get WebGL capabilities (cached result)
 */
export function getWebGLCapabilities(): WebGLCapabilities {
  if (!cachedCapabilities) {
    cachedCapabilities = detectWebGL();
  }
  return cachedCapabilities;
}

/**
 * Log WebGL capabilities for debugging
 */
export function logWebGLInfo(): void {
  const capabilities = getWebGLCapabilities();
  console.group('WebGL Capabilities');
  console.log('Supported:', capabilities.supported);
  console.log('Version:', capabilities.version);
  console.log('Renderer:', capabilities.renderer);
  console.log('Vendor:', capabilities.vendor);
  console.log('Max Texture Size:', capabilities.maxTextureSize);
  if (capabilities.error) {
    console.error('Error:', capabilities.error);
  }
  console.groupEnd();
}
