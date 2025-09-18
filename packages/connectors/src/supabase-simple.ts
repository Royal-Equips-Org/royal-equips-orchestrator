import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Type definitions for simple connector
export interface SimpleExecutionParams {
  agent_id: string;
  plan_id: string;
  status?: string;
  parameters?: Record<string, unknown>;
  results?: Record<string, unknown>;
  metrics?: Record<string, number>;
}

export interface SimpleMetrics {
  totalExecutions: number;
  successRate: number;
  activeAgents: number;
  avgExecutionTime: number;
}

export class SupabaseConnector {
  private client: SupabaseClient;

  constructor(url: string, serviceRoleKey: string) {
    this.client = createClient(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }) as SupabaseClient;
  }

  async saveExecution(execution: SimpleExecutionParams): Promise<string> {
    try {
      const { data, error } = await this.client
        .from('executions')
        .insert(execution)
        .select('id')
        .single();

      if (error) throw error;
      return (data as { id: string }).id;
    } catch (error) {
      console.error('Failed to save execution:', error);
      throw error;
    }
  }

  getMetrics(): SimpleMetrics {
    // Simple implementation that returns default values
    // In a real implementation, this would query the database
    return {
      totalExecutions: 0,
      successRate: 100,
      activeAgents: 0,
      avgExecutionTime: 0
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('agents')
        .select('count')
        .limit(1);

      return !error;
    } catch (_error) {
      console.error('Supabase connection test failed:', _error);
      return false;
    }
  }
}