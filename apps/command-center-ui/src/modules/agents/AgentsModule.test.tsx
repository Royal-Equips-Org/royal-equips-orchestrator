/**
 * Business Logic Test for AgentsModule
 * 
 * Tests the core business logic fix for handling undefined .map() calls
 * Validates that the service layer properly handles invalid data
 */

import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import AgentsModule from './AgentsModule';

// Mock the empire store
vi.mock('../../store/empire-store', () => ({
  useEmpireStore: () => ({
    isConnected: true
  })
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  }
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('AgentsModule - Business Logic Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset console spy
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('handles undefined agents data without crashing', async () => {
    // Simulate API returning undefined data (the root cause of .map() error)
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(undefined)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true })
      });

    render(<AgentsModule />);

    // Should not crash and should show loading state initially
    expect(screen.getByText(/Loading Agent Management System/)).toBeInTheDocument();

    // Should handle undefined gracefully and show empty state
    await waitFor(() => {
      expect(screen.queryByText(/Loading Agent Management System/)).not.toBeInTheDocument();
    });

    // Should log warning about invalid data
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('[WARN] Agents data invalid type')
    );
  });

  it('handles null agents data without crashing', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(null)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true })
      });

    render(<AgentsModule />);

    await waitFor(() => {
      expect(screen.queryByText(/Loading Agent Management System/)).not.toBeInTheDocument();
    });

    // Should log warning about invalid data
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('[WARN] Agents data invalid type')
    );
  });

  it('handles empty agents array gracefully', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ agents: [] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true })
      });

    render(<AgentsModule />);

    await waitFor(() => {
      expect(screen.queryByText(/Loading Agent Management System/)).not.toBeInTheDocument();
    });

    // Should log warning about empty data
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('[WARN] No agents data available')
    );
  });

  it('processes valid agents data correctly', async () => {
    const validAgentsData = [
      {
        id: 'agent-1',
        name: 'Test Agent',
        type: 'product_research',
        status: 'active',
        total_executions: 100,
        successful_executions: 95,
        failed_executions: 5,
        avg_execution_time: 0.5
      }
    ];

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ agents: validAgentsData })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ active_sessions: 5, ok: true })
      });

    render(<AgentsModule />);

    await waitFor(() => {
      expect(screen.getByText('Test Agent')).toBeInTheDocument();
    });

    // Should log successful processing
    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining('[INFO] Successfully processed agents data')
    );
  });

  it('implements autonomous retry on fetch failure', async () => {
    // First call fails
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    
    // Second call succeeds
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ agents: [] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true })
      });

    render(<AgentsModule />);

    // Should trigger retry
    await waitFor(() => {
      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('[INFO] Triggering automatic retry')
      );
    }, { timeout: 3000 });
  });

  it('handles malformed API response structure', async () => {
    // API returns object without agents property
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: "some random data" })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true })
      });

    render(<AgentsModule />);

    await waitFor(() => {
      expect(screen.queryByText(/Loading Agent Management System/)).not.toBeInTheDocument();
    });

    // Should handle gracefully without crashing
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('[WARN] No agents data available')
    );
  });

  it('handles plain array response format', async () => {
    // Test the fix: API returns plain array [agent1, agent2, ...]
    const plainArrayData = [
      {
        id: 'agent-1',
        name: 'Plain Array Agent 1',
        type: 'product_research',
        status: 'active',
        total_executions: 50,
        successful_executions: 48,
        failed_executions: 2,
        avg_execution_time: 0.3
      },
      {
        id: 'agent-2',
        name: 'Plain Array Agent 2',
        type: 'inventory_forecasting',
        status: 'idle',
        total_executions: 30,
        successful_executions: 28,
        failed_executions: 2,
        avg_execution_time: 0.4
      }
    ];

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(plainArrayData)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ active_sessions: 3, ok: true })
      });

    render(<AgentsModule />);

    // Should successfully process plain array and display agents
    await waitFor(() => {
      expect(screen.getByText('Plain Array Agent 1')).toBeInTheDocument();
      expect(screen.getByText('Plain Array Agent 2')).toBeInTheDocument();
    });

    // Should log successful processing with correct count
    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining('[INFO] Successfully processed agents data')
    );
  });

  it('handles various nested response formats', async () => {
    // Test all supported response formats work correctly
    const testCases = [
      {
        description: 'nested data.agents format',
        response: {
          data: {
            agents: [
              { id: 'nested-1', name: 'Nested Agent', type: 'analytics', status: 'active' }
            ]
          }
        }
      },
      {
        description: 'nested data.results format',
        response: {
          data: {
            results: [
              { id: 'result-1', name: 'Result Agent', type: 'marketing', status: 'active' }
            ]
          }
        }
      },
      {
        description: 'top-level results format',
        response: {
          results: [
            { id: 'top-result-1', name: 'Top Result Agent', type: 'pricing', status: 'active' }
          ]
        }
      },
      {
        description: 'top-level data array format',
        response: {
          data: [
            { id: 'data-1', name: 'Data Agent', type: 'inventory', status: 'active' }
          ]
        }
      }
    ];

    for (const testCase of testCases) {
      vi.clearAllMocks();

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(testCase.response)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([])
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ active_sessions: 1, ok: true })
        });

      const { unmount } = render(<AgentsModule />);

      // Should successfully process the format
      await waitFor(() => {
        expect(console.info).toHaveBeenCalledWith(
          expect.stringContaining('[INFO] Successfully processed agents data')
        );
      }, { timeout: 2000 });

      unmount();
    }
  });

  it('ensures array validation prevents .map() on undefined', async () => {
    // This test specifically validates the core business logic fix
    const invalidResponses = [
      undefined,
      null,
      "string",
      123,
      { agents: undefined },
      { agents: null },
      { agents: "not an array" }
    ];

    for (const response of invalidResponses) {
      vi.clearAllMocks();
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(response)
      });

      const { unmount } = render(<AgentsModule />);

      // Should not throw an error about .map() being undefined
      await waitFor(() => {
        expect(screen.queryByText(/Loading Agent Management System/)).not.toBeInTheDocument();
      });

      // Should have logged validation warnings
      expect(console.warn).toHaveBeenCalled();

      unmount();
    }
  });
});