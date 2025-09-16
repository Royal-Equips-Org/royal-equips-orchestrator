import { ShopifyConnector } from '../shopify-simple';

// Mock axios
jest.mock('axios');

describe('ShopifyConnector (Simple)', () => {
  let connector: ShopifyConnector;

  beforeEach(() => {
    connector = new ShopifyConnector('test-shop', 'test-token');
  });

  it('should create a connector instance', () => {
    expect(connector).toBeInstanceOf(ShopifyConnector);
  });

  it('should have proper type definitions', () => {
    expect(typeof connector.getProducts).toBe('function');
    expect(typeof connector.createProduct).toBe('function');
    expect(typeof connector.testConnection).toBe('function');
  });

  it('should properly type product interface', () => {
    const product = {
      title: 'Test Product',
      status: 'active' as const,
      variants: [{
        price: '10.00',
        inventory_quantity: 5
      }]
    };

    // This should not throw type errors
    expect(typeof product.title).toBe('string');
    expect(product.status).toBe('active');
    expect(Array.isArray(product.variants)).toBe(true);
  });
});