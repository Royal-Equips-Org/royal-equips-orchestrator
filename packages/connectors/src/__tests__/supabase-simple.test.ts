import { SupabaseConnector } from '../supabase-simple';

// Mock supabase
jest.mock('@supabase/supabase-js');

describe('SupabaseConnector (Simple)', () => {
  let connector: SupabaseConnector;

  beforeEach(() => {
    connector = new SupabaseConnector('https://test.supabase.co', 'test-key');
  });

  it('should create a connector instance', () => {
    expect(connector).toBeInstanceOf(SupabaseConnector);
  });

  it('should have proper type definitions', () => {
    expect(typeof connector.saveExecution).toBe('function');
    expect(typeof connector.getMetrics).toBe('function');
    expect(typeof connector.testConnection).toBe('function');
  });

  it('should return proper metrics structure', () => {
    const metrics = connector.getMetrics();
    
    expect(typeof metrics.totalExecutions).toBe('number');
    expect(typeof metrics.successRate).toBe('number');
    expect(typeof metrics.activeAgents).toBe('number');
    expect(typeof metrics.avgExecutionTime).toBe('number');
  });

  it('should properly type execution parameters', () => {
    const execution = {
      agent_id: 'test-agent',
      plan_id: 'test-plan',
      parameters: { key: 'value' },
      results: { success: true },
      metrics: { duration: 100 }
    };

    // This should not throw type errors
    expect(typeof execution.agent_id).toBe('string');
    expect(typeof execution.parameters).toBe('object');
    expect(typeof execution.results).toBe('object');
    expect(typeof execution.metrics).toBe('object');
  });
});