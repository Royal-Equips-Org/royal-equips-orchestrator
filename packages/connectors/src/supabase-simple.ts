import { createClient, SupabaseClient } from '@supabase/supabase-js';

export class SupabaseConnector {
  private client: SupabaseClient;

  constructor(url: string, serviceRoleKey: string) {
    this.client = createClient(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }

  async saveExecution(execution: {
    agent_id: string;
    plan_id: string;
    status?: string;
    parameters?: any;
    results?: any;
    metrics?: any;
  }): Promise<string> {
    try {
      const { data, error } = await this.client
        .from('executions')
        .insert(execution)
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Failed to save execution:', error);
      throw error;
    }
  }

  async getMetrics(): Promise<{
    totalExecutions: number;
    successRate: number;
    activeAgents: number;
    avgExecutionTime: number;
  }> {
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
    } catch (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }
  }
}