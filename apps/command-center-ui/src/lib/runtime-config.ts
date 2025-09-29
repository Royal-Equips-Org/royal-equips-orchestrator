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
    
    // Validate required fields
    if (!config.apiRelativeBase) {
      throw new Error('Missing required config field: apiRelativeBase');
    }
    
    // Set defaults for optional fields
    globalConfig = {
      apiRelativeBase: config.apiRelativeBase,
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
        resetEndpoint: config.circuitBreaker?.resetEndpoint ?? '/api/admin/circuit/reset',
      },
    };
    
    console.log('✅ Runtime config loaded successfully:', globalConfig);
    return globalConfig;
  } catch (error) {
    console.error('❌ Failed to load runtime config, using defaults:', error);
    
    // Fallback configuration
    globalConfig = {
      apiRelativeBase: '/api',
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
        resetEndpoint: '/api/admin/circuit/reset',
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