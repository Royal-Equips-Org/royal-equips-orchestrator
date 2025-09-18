import { ShopifyConnector } from '../shopify';
import { Logger } from 'pino';

// Mock axios
jest.mock('axios');

describe('ShopifyConnector', () => {
  let connector: ShopifyConnector;
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = {
      child: jest.fn().mockReturnThis(),
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as unknown as Logger;

    connector = new ShopifyConnector('test-shop', 'test-token', mockLogger);
  });

  it('should create a connector instance', () => {
    expect(connector).toBeInstanceOf(ShopifyConnector);
  });

  it('should have proper type definitions', () => {
    // Test that the connector has the expected methods
    expect(typeof connector.getProducts).toBe('function');
    expect(typeof connector.createProduct).toBe('function');
    expect(typeof connector.updateProduct).toBe('function');
    expect(typeof connector.getOrders).toBe('function');
    expect(typeof connector.testConnection).toBe('function');
  });

  // Integration test placeholder
  it.skip('should integrate with real Shopify API', async () => {
    // This would be implemented with real API credentials in integration tests
    const products = await connector.getProducts({ limit: 1 });
    expect(Array.isArray(products)).toBe(true);
  });
});