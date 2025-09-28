/**
 * Test setup file for Jest
 * Configures global test environment and mocks
 */

// Mock performance API for Node.js environment
global.performance = global.performance || {
  now: () => Date.now(),
  mark: () => {},
  measure: () => {},
  clearMarks: () => {},
  clearMeasures: () => {},
  getEntries: () => [],
  getEntriesByName: () => [],
  getEntriesByType: () => []
};

// Mock console methods for cleaner test output
const originalConsole = { ...console };

beforeEach(() => {
  // Reset console mocks before each test
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
  console.info = jest.fn();
  console.debug = jest.fn();
});

afterEach(() => {
  // Optionally restore console for debugging
  // Uncomment these lines if you need to see console output in tests
  // console.log = originalConsole.log;
  // console.warn = originalConsole.warn;
  // console.error = originalConsole.error;
});

// Mock crypto for Node.js environment
if (!global.crypto) {
  const crypto = require('crypto');
  global.crypto = {
    getRandomValues: (arr: any) => crypto.randomBytes(arr.length),
    randomUUID: () => crypto.randomUUID(),
    subtle: {} // Not needed for our tests
  };
}

export {};