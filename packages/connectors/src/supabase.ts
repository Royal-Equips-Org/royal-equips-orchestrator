import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Logger } from 'pino';

// Supabase response types
interface SupabaseResponse<T> {
  data: T | null;
  error: Error | null;
}

interface IdResponse {
  id: string;
}

// Helper function for type-safe data extraction
function extractData<T>(response: SupabaseResponse<T>): T {
  if (response.error) {
    throw response.error;
  }
  if (!response.data) {
    throw new Error('No data returned from Supabase');
  }
  return response.data;
}
interface ConnectorLogger {
  info: (msg: string, obj?: Record<string, unknown>) => void;
  error: (msg: string, obj?: Record<string, unknown>) => void;
  warn: (msg: string, obj?: Record<string, unknown>) => void;
  debug: (msg: string, obj?: Record<string, unknown>) => void;
  child: (obj: Record<string, unknown>) => ConnectorLogger;
}

// Proper type definitions for configuration, parameters, results, and metrics
export interface AgentConfig {
  [key: string]: string | number | boolean | null;
}

export interface ExecutionParameters {
  [key: string]: string | number | boolean | null | ExecutionParameters | ExecutionParameters[];
}

export interface ExecutionResults {
  success: boolean;
  data?: unknown;
  errors?: string[];
  [key: string]: unknown;
}

export interface ExecutionMetrics {
  duration: number | undefined;
  apiCalls: number | undefined;
  resourcesUsed: number | undefined;
  dataProcessed: number | undefined;
  [key: string]: number | undefined;
}

export interface Database {
  public: {
    Tables: {
      agents: {
        Row: {
          id: string;
          name: string;
          type: string;
          status: string;
          config: AgentConfig;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type: string;
          status?: string;
          config?: AgentConfig;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          type?: string;
          status?: string;
          config?: AgentConfig;
          updated_at?: string;
        };
      };
      executions: {
        Row: {
          id: string;
          agent_id: string;
          plan_id: string;
          status: string;
          parameters: ExecutionParameters;
          results: ExecutionResults;
          metrics: ExecutionMetrics;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          agent_id: string;
          plan_id: string;
          status?: string;
          parameters?: ExecutionParameters;
          results?: ExecutionResults;
          metrics?: ExecutionMetrics;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          status?: string;
          results?: ExecutionResults;
          metrics?: ExecutionMetrics;
          completed_at?: string | null;
        };
      };
      products: {
        Row: {
          id: string;
          shopify_id: number | null;
          title: string;
          description: string | null;
          price: number;
          inventory: number;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          shopify_id?: number | null;
          title: string;
          description?: string | null;
          price: number;
          inventory?: number;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          shopify_id?: number | null;
          title?: string;
          description?: string | null;
          price?: number;
          inventory?: number;
          status?: string;
          updated_at?: string;
        };
      };
    };
  };
}

export class SupabaseConnector {
  private client: SupabaseClient;
  private logger: ConnectorLogger;

  constructor(url: string, serviceRoleKey: string, logger: Logger) {
    this.logger = logger.child({ connector: 'supabase' }) as ConnectorLogger;
    this.client = createClient(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }) as SupabaseClient;
  }

  /**
   * Save agent execution record
   */
  async saveExecution(execution: Database['public']['Tables']['executions']['Insert']): Promise<string> {
    try {
      const response = await this.client
        .from('executions')
        .insert(execution)
        .select('id')
        .single();

      const data = extractData(response) as IdResponse;
      this.logger.info('Execution saved successfully', { executionId: data.id });
      return data.id;
    } catch (error) {
      this.logger.error('Error saving execution', { error });
      throw error;
    }
  }

  /**
   * Update execution status and results
   */
  async updateExecution(
    executionId: string, 
    updates: Database['public']['Tables']['executions']['Update']
  ): Promise<void> {
    try {
      const response = await this.client
        .from('executions')
        .update({
          ...updates,
          completed_at: updates.status === 'success' || updates.status === 'error' 
            ? new Date().toISOString() 
            : updates.completed_at
        })
        .eq('id', executionId);

      if (response.error) {
        this.logger.error('Failed to update execution', { error: response.error, executionId });
        throw response.error;
      }

      this.logger.info('Execution updated successfully', { executionId });
    } catch (error) {
      this.logger.error('Error updating execution', { error, executionId });
      throw error;
    }
  }

  /**
   * Get execution history for an agent
   */
  async getExecutionHistory(
    agentId: string, 
    limit = 50
  ): Promise<Database['public']['Tables']['executions']['Row'][]> {
    try {
      const response = await this.client
        .from('executions')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(limit);

      const data = extractData(response) as Database['public']['Tables']['executions']['Row'][];
      this.logger.info('Retrieved execution history', { 
        agentId, 
        count: data.length 
      });
      return data;
    } catch (error) {
      this.logger.error('Error getting execution history', { error, agentId });
      throw error;
    }
  }

  /**
   * Save or update agent configuration
   */
  async saveAgent(agent: Database['public']['Tables']['agents']['Insert']): Promise<string> {
    try {
      const response = await this.client
        .from('agents')
        .upsert(agent, { onConflict: 'id' })
        .select('id')
        .single();

      const data = extractData(response) as IdResponse;
      this.logger.info('Agent saved successfully', { agentId: data.id });
      return data.id;
    } catch (error) {
      this.logger.error('Error saving agent', { error, agentName: agent.name });
      throw error;
    }
  }

  /**
   * Get all agents
   */
  async getAgents(): Promise<Database['public']['Tables']['agents']['Row'][]> {
    try {
      const response = await this.client
        .from('agents')
        .select('*')
        .order('created_at', { ascending: false });

      const data = extractData(response) as Database['public']['Tables']['agents']['Row'][];
      this.logger.info('Retrieved agents', { count: data.length });
      return data;
    } catch (error) {
      this.logger.error('Error getting agents', { error });
      throw error;
    }
  }

  /**
   * Save or update product data
   */
  async saveProduct(product: Database['public']['Tables']['products']['Insert']): Promise<string> {
    try {
      const response = await this.client
        .from('products')
        .upsert(product, { onConflict: 'shopify_id' })
        .select('id')
        .single();

      const data = extractData(response) as IdResponse;
      this.logger.info('Product saved successfully', { productId: data.id });
      return data.id;
    } catch (error) {
      this.logger.error('Error saving product', { error, productTitle: product.title });
      throw error;
    }
  }

  /**
   * Get products with filters
   */
  async getProducts(filters: {
    status?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<Database['public']['Tables']['products']['Row'][]> {
    try {
      let query = this.client
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
      }

      const response = await query;
      const data = extractData(response) as Database['public']['Tables']['products']['Row'][];
      
      this.logger.info('Retrieved products', { count: data.length, filters });
      return data;
    } catch (error) {
      this.logger.error('Error getting products', { error, filters });
      throw error;
    }
  }

  /**
   * Get system metrics for dashboard
   */
  async getMetrics(timeRange: 'hour' | 'day' | 'week' = 'day'): Promise<{
    totalExecutions: number;
    successRate: number;
    activeAgents: number;
    avgExecutionTime: number;
  }> {
    try {
      const timeFilter = new Date();
      switch (timeRange) {
        case 'hour':
          timeFilter.setHours(timeFilter.getHours() - 1);
          break;  
        case 'day':
          timeFilter.setDate(timeFilter.getDate() - 1);
          break;
        case 'week':
          timeFilter.setDate(timeFilter.getDate() - 7);
          break;
      }

      // Get execution metrics with proper typing
      const executionsResponse = await this.client
        .from('executions')
        .select('status, metrics')
        .gte('created_at', timeFilter.toISOString());

      const executions = extractData(executionsResponse) as Array<{
        status: string;
        metrics: ExecutionMetrics;
      }>;

      // Get active agents count
      const agentsResponse = await this.client
        .from('agents')
        .select('id')
        .eq('status', 'active');

      const agents = extractData(agentsResponse) as Array<{ id: string }>;

      const totalExecutions = executions.length;
      const successfulExecutions = executions.filter(e => e.status === 'success').length;
      const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;
      
      const avgExecutionTime = executions.length > 0
        ? executions.reduce((sum, exec) => sum + (exec.metrics?.duration || 0), 0) / executions.length
        : 0;

      const metrics = {
        totalExecutions,
        successRate,
        activeAgents: agents.length,
        avgExecutionTime
      };

      this.logger.info('Retrieved system metrics', { metrics, timeRange });
      return metrics;
    } catch (error) {
      this.logger.error('Error getting system metrics', { error, timeRange });
      throw error;
    }
  }

  /**
   * Test connection to Supabase
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client
        .from('agents')
        .select('count')
        .limit(1);

      if (response.error) {
        this.logger.error('Supabase connection test failed', { error: response.error });
        return false;
      }

      this.logger.info('Supabase connection test successful');
      return true;
    } catch (error) {
      this.logger.error('Supabase connection test failed', { error });
      return false;
    }
  }
}