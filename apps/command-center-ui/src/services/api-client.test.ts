import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiClient, ApiClient } from './api-client';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('ApiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset AbortController mock
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('GET requests', () => {
    it('should make successful GET request', async () => {
      const mockData = { test: 'data' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData
      });

      const result = await apiClient.get('/test');
      
      expect(result).toEqual(mockData);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );
    });

    it('should handle HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      await expect(apiClient.get('/test', { retries: 0 })).rejects.toMatchObject({
        kind: 'http',
        status: 404,
        message: 'HTTP 404: Not Found'
      });
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Failed to fetch'));

      await expect(apiClient.get('/test', { retries: 0 })).rejects.toMatchObject({
        kind: 'network',
        message: expect.stringContaining('Network error')
      });
    });

    it('should handle timeout', async () => {
      // Mock AbortController to simulate timeout
      const mockAbortController = {
        signal: { aborted: false },
        abort: vi.fn()
      };
      
      vi.spyOn(global, 'AbortController').mockImplementation(() => mockAbortController as any);
      
      // Mock fetch to throw AbortError when called
      mockFetch.mockImplementationOnce(() => {
        const error = new Error('The operation was aborted');
        error.name = 'AbortError';
        throw error;
      });

      await expect(apiClient.get('/test', { timeout: 100, retries: 0 })).rejects.toMatchObject({
        kind: 'timeout'
      });
    });

    it('should retry on failure', async () => {
      vi.useRealTimers(); // Use real timers for this test to avoid timeout issues
      
      // First two calls fail, third succeeds
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        });

      const result = await apiClient.get('/test', { retries: 3 });
      
      expect(result).toEqual({ success: true });
      expect(mockFetch).toHaveBeenCalledTimes(3);
      
      vi.useFakeTimers(); // Restore fake timers
    }, 10000); // Increase timeout for this test
  });

  describe('POST requests', () => {
    it('should make successful POST request with data', async () => {
      const mockData = { created: true };
      const postData = { name: 'test' };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData
      });

      const result = await apiClient.post('/test', postData, { retries: 0 });
      
      expect(result).toEqual(mockData);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(postData),
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );
    });
  });

  describe('Circuit Breaker', () => {
    it('should open circuit after failure threshold', async () => {
      // Reset circuit breaker state by creating a new instance
      const testApiClient = new ApiClient();
      
      // Trigger enough failures to exceed both the failure threshold and minimum request window
      for (let i = 0; i < 10; i++) {
        mockFetch.mockRejectedValueOnce(new Error('Network error'));
        try {
          await testApiClient.get('/test', { retries: 0 });
        } catch (e) {
          // Expected to fail
        }
      }

      // Next request should fail with circuit open
      await expect(testApiClient.get('/test', { retries: 0 })).rejects.toMatchObject({
        kind: 'circuit_open'
      });
    });
  });
});