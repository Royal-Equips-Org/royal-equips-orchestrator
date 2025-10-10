/**
 * Health endpoint tests
 * 
 * Tests to ensure health endpoints return proper JSON responses
 * and never return HTML content.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import Fastify from 'fastify';
import healthRoutes from './health.js';

describe('Health Endpoints', () => {
  const app = Fastify();
  
  beforeAll(async () => {
    await app.register(healthRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /health', () => {
    it('should return JSON with status ok', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health'
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
      
      const body = JSON.parse(response.payload);
      expect(body.status).toBe('ok');
      expect(body.service).toBe('Royal Equips API');
      expect(body.timestamp).toBeDefined();
      expect(body.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should not return HTML', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
        headers: {
          'Accept': 'text/html'
        }
      });

      expect(response.headers['content-type']).toContain('application/json');
      expect(response.payload).not.toContain('<!DOCTYPE html>');
      expect(response.payload).not.toContain('<html');
    });

    it('should include version information', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health'
      });

      const body = JSON.parse(response.payload);
      expect(body.version).toBeDefined();
      expect(typeof body.version).toBe('string');
    });

    it('should include permissions', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health'
      });

      const body = JSON.parse(response.payload);
      expect(body.permissions).toBeDefined();
      expect(body.permissions.contents).toBeDefined();
      expect(body.permissions.issues).toBeDefined();
      expect(body.permissions.pullRequests).toBeDefined();
      expect(body.permissions.actions).toBeDefined();
    });
  });

  describe('GET /healthz', () => {
    it('should return JSON with status ok', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/healthz'
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
      
      const body = JSON.parse(response.payload);
      expect(body.status).toBe('ok');
      expect(body.service).toBe('Royal Equips API');
      expect(body.timestamp).toBeDefined();
      expect(body.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should not return HTML', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/healthz',
        headers: {
          'Accept': 'text/html'
        }
      });

      expect(response.headers['content-type']).toContain('application/json');
      expect(response.payload).not.toContain('<!DOCTYPE html>');
      expect(response.payload).not.toContain('<html');
    });
  });

  describe('GET /liveness', () => {
    it('should return JSON with status ok', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/liveness'
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
      
      const body = JSON.parse(response.payload);
      expect(body.status).toBe('ok');
      expect(body.service).toBe('Royal Equips API');
    });

    it('should not return HTML', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/liveness',
        headers: {
          'Accept': 'text/html'
        }
      });

      expect(response.headers['content-type']).toContain('application/json');
      expect(response.payload).not.toContain('<!DOCTYPE html>');
    });
  });

  describe('GET /readyz', () => {
    it('should return JSON with dependency checks', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/readyz'
      });

      // Can be 200 or 503 depending on dependencies
      expect([200, 503]).toContain(response.statusCode);
      expect(response.headers['content-type']).toContain('application/json');
      
      const body = JSON.parse(response.payload);
      expect(body.status).toBeDefined();
      expect(body.service).toBe('Royal Equips API');
      expect(body.timestamp).toBeDefined();
      expect(body.dependencies).toBeDefined();
      expect(Array.isArray(body.dependencies)).toBe(true);
    });

    it('should not return HTML', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/readyz',
        headers: {
          'Accept': 'text/html'
        }
      });

      expect(response.headers['content-type']).toContain('application/json');
      expect(response.payload).not.toContain('<!DOCTYPE html>');
      expect(response.payload).not.toContain('<html');
    });

    it('should include dependency status checks', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/readyz'
      });

      const body = JSON.parse(response.payload);
      expect(body.dependencies).toBeDefined();
      expect(body.dependencies.length).toBeGreaterThan(0);
      
      // Check each dependency has required fields
      body.dependencies.forEach((dep: any) => {
        expect(dep.name).toBeDefined();
        expect(dep.status).toBeDefined();
        expect(['ok', 'error', 'degraded']).toContain(dep.status);
      });
    });
  });

  describe('GET /readiness', () => {
    it('should return JSON with readiness status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/readiness'
      });

      expect([200, 503]).toContain(response.statusCode);
      expect(response.headers['content-type']).toContain('application/json');
      
      const body = JSON.parse(response.payload);
      expect(body.status).toBeDefined();
      expect(body.ready).toBeDefined();
      expect(typeof body.ready).toBe('boolean');
    });

    it('should not return HTML', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/readiness',
        headers: {
          'Accept': 'text/html'
        }
      });

      expect(response.headers['content-type']).toContain('application/json');
      expect(response.payload).not.toContain('<!DOCTYPE html>');
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to health endpoints', async () => {
      // Make multiple requests to trigger rate limit
      const requests = Array(35).fill(null).map(() => 
        app.inject({
          method: 'GET',
          url: '/health'
        })
      );

      const responses = await Promise.all(requests);
      
      // At least one should be rate limited (429)
      const rateLimited = responses.some(r => r.statusCode === 429);
      expect(rateLimited).toBe(true);
    });
  });

  describe('Content-Type Handling', () => {
    it('should always return application/json regardless of Accept header', async () => {
      const acceptHeaders = [
        'text/html',
        'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'application/xml',
        '*/*'
      ];

      for (const accept of acceptHeaders) {
        const response = await app.inject({
          method: 'GET',
          url: '/health',
          headers: { 'Accept': accept }
        });

        expect(response.headers['content-type']).toContain('application/json');
        expect(response.payload).not.toContain('<!DOCTYPE');
        expect(response.payload).not.toContain('<html');
        
        // Verify it's valid JSON
        expect(() => JSON.parse(response.payload)).not.toThrow();
      }
    });
  });
});
