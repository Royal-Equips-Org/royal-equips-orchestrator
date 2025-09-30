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
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(undefined)
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
      expect.stringContaining('Agents data invalid type'),
      expect.objectContaining({
        event: 'AGENTS_DATA_INVALID'
      })
    );
  });

  it('handles null agents data without crashing', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(null)
    });

    render(<AgentsModule />);

    await waitFor(() => {
      expect(screen.queryByText(/Loading Agent Management System/)).not.toBeInTheDocument();
    });

    // Should log warning about invalid data
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('Agents data invalid type'),
      expect.objectContaining({
        event: 'AGENTS_DATA_INVALID'
      })
    );
  });

  it('handles empty agents array gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ agents: [] })
    });

    render(<AgentsModule />);

    await waitFor(() => {
      expect(screen.queryByText(/Loading Agent Management System/)).not.toBeInTheDocument();
    });

    // Should log warning about empty data
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('No agents data available'),
      expect.objectContaining({
        event: 'AGENTS_DATA_EMPTY'
      })
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
      expect.stringContaining('Successfully processed agents data'),
      expect.objectContaining({
        event: 'AGENTS_DATA_PROCESSED',
        count: 1
      })
    );
  });

  it('implements autonomous retry on fetch failure', async () => {
    // First call fails
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    
    // Second call succeeds
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ agents: [] })
    });

    render(<AgentsModule />);

    // Should trigger retry
    await waitFor(() => {
      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('Triggering automatic retry'),
        expect.objectContaining({
          event: 'AGENTS_FETCH_RETRY'
        })
      );
    }, { timeout: 3000 });
  });

  it('handles malformed API response structure', async () => {
    // API returns object without agents property
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: "some random data" })
    });

    render(<AgentsModule />);

    await waitFor(() => {
      expect(screen.queryByText(/Loading Agent Management System/)).not.toBeInTheDocument();
    });

    // Should handle gracefully without crashing
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('No agents data available'),
      expect.objectContaining({
        event: 'AGENTS_DATA_EMPTY'
      })
    );
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