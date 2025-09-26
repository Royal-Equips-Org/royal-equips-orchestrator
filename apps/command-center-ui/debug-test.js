import { apiClient } from './src/services/api-client.js';

const mockFetch = {
  mockResolvedValueOnce: (value) => {
    global.fetch = () => Promise.resolve(value);
  },
  mockRejectedValueOnce: (error) => {
    global.fetch = () => Promise.reject(error);
  }
};

async function testHttpError() {
  console.log('Testing HTTP error...');
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status: 404,
    statusText: 'Not Found'
  });
  
  try {
    await apiClient.get('/test', { retries: 0 });
  } catch (error) {
    console.log('HTTP Error caught:', error);
    console.log('Error type:', typeof error);
    console.log('Error keys:', Object.keys(error || {}));
  }
}

async function testNetworkError() {
  console.log('\nTesting network error...');
  mockFetch.mockRejectedValueOnce(new Error('Failed to fetch'));
  
  try {
    await apiClient.get('/test', { retries: 0 });
  } catch (error) {
    console.log('Network Error caught:', error);
    console.log('Error type:', typeof error);
    console.log('Error keys:', Object.keys(error || {}));
  }
}

testHttpError().then(() => testNetworkError());
