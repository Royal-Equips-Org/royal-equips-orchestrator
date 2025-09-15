import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Logger } from 'pino';

export interface Database {
  public: {
    Tables: {
      agents: {
        Row: {
          id: string;
          name: string;
          type: string;
          status: string;
          config: any;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type: string;
          status?: string;
          config?: any;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          type?: string;
          status?: string;
          config?: any;
          updated_at?: string;
        };
      };
      executions: {
        Row: {
          id: string;
          agent_id: string;
          plan_id: string;
          status: string;
          parameters: any;
          results: any;
          metrics: any;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          agent_id: string;
          plan_id: string;
          status?: string;
          parameters?: any;
          results?: any;
          metrics?: any;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          status?: string;
          results?: any;
          metrics?: any;
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
  private client: SupabaseClient<Database>;
  private logger: Logger;

  constructor(url: string, serviceRoleKey: string, logger: Logger) {
    this.logger = logger.child({ connector: 'supabase' });
    this.client = createClient<Database>(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }

  /**
   * Save agent execution record
   */
  async saveExecution(execution: Database['public']['Tables']['executions']['Insert']): Promise<string> {
    try {
      const { data, error } = await this.client
        .from('executions')
        .insert(execution)
        .select('id')
        .single();

      if (error) throw error;

      this.logger.info('Execution saved', { executionId: data.id });
      return data.id;
    } catch (error) {
      this.logger.error('Failed to save execution', { error, execution });
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
      const { error } = await this.client
        .from('executions')
        .update({
          ...updates,
          completed_at: updates.status === 'success' || updates.status === 'error' 
            ? new Date().toISOString() 
            : updates.completed_at
        })
        .eq('id', executionId);

      if (error) throw error;

      this.logger.info('Execution updated', { executionId, updates });
    } catch (error) {
      this.logger.error('Failed to update execution', { error, executionId, updates });
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
      const { data, error } = await this.client
        .from('executions')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      this.logger.info('Retrieved execution history', { agentId, count: data?.length || 0 });
      return data || [];
    } catch (error) {
      this.logger.error('Failed to get execution history', { error, agentId });
      throw error;
    }
  }

  /**
   * Save or update agent configuration
   */
  async saveAgent(agent: Database['public']['Tables']['agents']['Insert']): Promise<string> {
    try {
      const { data, error } = await this.client
        .from('agents')
        .upsert(agent, { onConflict: 'id' })
        .select('id')
        .single();

      if (error) throw error;

      this.logger.info('Agent saved', { agentId: data.id, name: agent.name });
      return data.id;
    } catch (error) {
      this.logger.error('Failed to save agent', { error, agent });
      throw error;
    }
  }

  /**
   * Get all agents
   */
  async getAgents(): Promise<Database['public']['Tables']['agents']['Row'][]> {
    try {
      const { data, error } = await this.client
        .from('agents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      this.logger.info('Retrieved agents', { count: data?.length || 0 });
      return data || [];
    } catch (error) {
      this.logger.error('Failed to get agents', { error });
      throw error;
    }
  }

  /**
   * Save or update product data
   */
  async saveProduct(product: Database['public']['Tables']['products']['Insert']): Promise<string> {
    try {
      const { data, error } = await this.client
        .from('products')
        .upsert(product, { onConflict: 'shopify_id' })
        .select('id')
        .single();

      if (error) throw error;

      this.logger.info('Product saved', { productId: data.id, title: product.title });
      return data.id;
    } catch (error) {
      this.logger.error('Failed to save product', { error, product });
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

      const { data, error } = await query;

      if (error) throw error;

      this.logger.info('Retrieved products', { count: data?.length || 0, filters });
      return data || [];
    } catch (error) {
      this.logger.error('Failed to get products', { error, filters });
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

      // Get execution metrics
      const { data: executions, error: execError } = await this.client
        .from('executions')
        .select('status, metrics')
        .gte('created_at', timeFilter.toISOString());

      if (execError) throw execError;

      // Get active agents count
      const { data: agents, error: agentsError } = await this.client
        .from('agents')
        .select('id')
        .eq('status', 'active');

      if (agentsError) throw agentsError;

      const totalExecutions = executions?.length || 0;
      const successfulExecutions = executions?.filter(e => e.status === 'success').length || 0;
      const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;
      
      const avgExecutionTime = executions && executions.length > 0
        ? executions.reduce((sum, exec) => sum + (exec.metrics?.duration || 0), 0) / executions.length
        : 0;

      const metrics = {
        totalExecutions,
        successRate,
        activeAgents: agents?.length || 0,
        avgExecutionTime
      };

      this.logger.info('Retrieved system metrics', { metrics, timeRange });
      return metrics;
    } catch (error) {
      this.logger.error('Failed to get metrics', { error, timeRange });
      throw error;
    }
  }

  /**
   * Test connection to Supabase
   */
  async testConnection(): Promise<boolean> {
    try {
      const { data, error } = await this.client
        .from('agents')
        .select('count')
        .limit(1);

      if (error) throw error;

      this.logger.info('Supabase connection test successful');
      return true;
    } catch (error) {
      this.logger.error('Supabase connection test failed', { error });
      return false;
    }
  }
}