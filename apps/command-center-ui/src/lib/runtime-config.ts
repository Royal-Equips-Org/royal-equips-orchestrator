/**
 * Runtime configuration loader.
 * Loaded once before React render; avoids build-time base URL embedding.
 */
export interface RuntimeConfig {
  apiRelativeBase: string;
  featureFlags: {
    enable3D: boolean;
    enableMetricsPolling: boolean;
    enableCircuitBreaker: boolean;
    enableHealthMonitoring: boolean;
  };
  polling: {
    metricsInterval: number;
    healthCheckInterval: number;
  };
  circuitBreaker: {
    enabled: boolean;
    resetEndpoint: string;
  };
}

let globalConfig: RuntimeConfig | null = null;

/**
 * Detect if we're running in a development environment
 */
function isDevelopment(): boolean {
  // Check for common development indicators
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const port = typeof window !== 'undefined' ? window.location.port : '';
  
  // Development indicators:
  // 1. Running on localhost
  // 2. Running on development ports (3000, 5173, etc.)
  // 3. Vite dev server detected
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  // Make dev ports configurable via environment variable, fallback to defaults
  const devPortsEnv = (typeof process !== 'undefined' && process.env && process.env.REACT_APP_DEV_PORTS) ? process.env.REACT_APP_DEV_PORTS : '';
  const devPorts = devPortsEnv
    ? devPortsEnv.split(',').map(p => p.trim())
    : ['3000', '5173', '8080', '4000'];
  const isDevPort = devPorts.includes(port);
  const isViteDev = typeof window !== 'undefined' && window.location.search.includes('vite');
  
  return isLocalhost || isDevPort || isViteDev || (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development');
}

/**
 * Get the appropriate API base URL based on environment
 */
function getApiBaseUrl(config: any): string {
  // Always target Fastify API base /v1 (reverse-proxied in prod)
  if (isDevelopment()) {
    return config.development?.apiRelativeBase || 'http://localhost:10000/v1';
  }
  return (config.apiRelativeBase ? `${config.apiRelativeBase.replace(/\/$/, '')}` : '') + '/v1';
}

/**
 * Get the appropriate circuit breaker reset endpoint based on environment
 */
function getCircuitBreakerEndpoint(config: any): string {
  // In development, use development endpoint if available
  if (isDevelopment()) {
    if (config.development?.circuitBreaker?.resetEndpoint) {
      return config.development.circuitBreaker.resetEndpoint;
    }
    // Fallback to localhost if no development config
    return 'http://localhost:10000/admin/circuit/reset';
  }
  
  // In production, always use relative paths
  return config.circuitBreaker?.resetEndpoint || '/api/admin/circuit/reset';
}

/**
 * Load runtime configuration from /public/config.json
 * This is called once during app initialization
 */
export async function loadRuntimeConfig(): Promise<RuntimeConfig> {
  if (globalConfig) {
    return globalConfig;
  }

  try {
    const response = await fetch('/config.json');
    if (!response.ok) {
      throw new Error(`Failed to load config: ${response.status} ${response.statusText}`);
    }
    
    const config = await response.json();
    
    // Get environment-appropriate URLs
    const apiRelativeBase = getApiBaseUrl(config);
    const resetEndpoint = getCircuitBreakerEndpoint(config);
    
    // Set defaults for optional fields
    globalConfig = {
      apiRelativeBase,
      featureFlags: {
        enable3D: config.featureFlags?.enable3D ?? true,
        enableMetricsPolling: config.featureFlags?.enableMetricsPolling ?? true,
        enableCircuitBreaker: config.featureFlags?.enableCircuitBreaker ?? true,
        enableHealthMonitoring: config.featureFlags?.enableHealthMonitoring ?? true,
      },
      polling: {
        metricsInterval: config.polling?.metricsInterval ?? 30000,
        healthCheckInterval: config.polling?.healthCheckInterval ?? 10000,
      },
      circuitBreaker: {
        enabled: config.circuitBreaker?.enabled ?? true,
        resetEndpoint,
      },
    };
    
    const env = isDevelopment() ? 'development' : 'production';
    console.log(`✅ Runtime config loaded successfully (${env}):`, globalConfig);
    return globalConfig;
  } catch (error) {
    console.error('❌ Failed to load runtime config, using defaults:', error);
    
    // Fallback configuration with environment detection
    const apiRelativeBase = isDevelopment() ? 'http://localhost:10000' : '/api';
    const resetEndpoint = isDevelopment() ? 'http://localhost:10000/admin/circuit/reset' : '/api/admin/circuit/reset';
    
    globalConfig = {
      apiRelativeBase,
      featureFlags: {
        enable3D: true,
        enableMetricsPolling: true,
        enableCircuitBreaker: true,
        enableHealthMonitoring: true,
      },
      polling: {
        metricsInterval: 30000,
        healthCheckInterval: 10000,
      },
      circuitBreaker: {
        enabled: true,
        resetEndpoint,
      },
    };
    
    return globalConfig;
  }
}

/**
 * Get the current runtime configuration
 * Must be called after loadRuntimeConfig()
 */
export function getConfig(): RuntimeConfig {
  if (!globalConfig) {
    throw new Error('Runtime config not loaded. Call loadRuntimeConfig() first.');
  }
  return globalConfig;
}

/**
 * Reset the configuration cache (mainly for testing)
 */
export function resetConfig(): void {
  globalConfig = null;
}