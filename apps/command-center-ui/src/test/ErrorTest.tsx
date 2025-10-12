/**
 * Test component to demonstrate error boundary functionality
 * This component simulates the original "Cannot read properties of undefined (reading 'map')" error
 */

import React, { useState } from 'react';
import { Button } from '../components/ui/Button';
import ErrorBoundary from '../components/error/ErrorBoundary';
import { ArrayUtils } from '../utils/array-utils';

// Component that would cause the original error
const BadComponent = ({ data }: { data: any }) => {
  return (
    <div className="p-4 bg-gray-800 rounded">
      <h3 className="text-white mb-2">This would crash without ArrayUtils:</h3>
      {/* This would throw "Cannot read properties of undefined (reading 'map')" */}
      {/* data.items.map(item => <div key={item.id}>{item.name}</div>) */}
      
      <h3 className="text-green-400 mb-2">But with ArrayUtils, it works safely:</h3>
      {ArrayUtils.map(data?.items, (item: any, index: number) => (
        <div key={item?.id || index} className="text-cyan-400 text-sm">
          {item?.name || 'Unknown item'}
        </div>
      ))}
      
      {ArrayUtils.length(data?.items) === 0 && (
        <div className="text-gray-400 text-sm">No items to display</div>
      )}
    </div>
  );
};

// Component that deliberately throws an error to test ErrorBoundary
const CrashingComponent = () => {
  const badData: any = null;
  
  // This will throw an error to test the ErrorBoundary
  return (
    <div>
      {badData.nonExistentProperty.map((item: any) => (
        <div key={item.id}>{item.name}</div>
      ))}
    </div>
  );
};

export default function ErrorTest() {
  const [showCrash, setShowCrash] = useState(false);
  const [testData, setTestData] = useState<any>(null);

  const generateGoodData = () => {
    setTestData({
      items: [
        { id: 1, name: 'Product A' },
        { id: 2, name: 'Product B' },
        { id: 3, name: 'Product C' }
      ]
    });
  };

  const generateBadData = () => {
    setTestData({
      // items is missing, which would cause the original error
    });
  };

  const generateNullData = () => {
    setTestData(null);
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-cyan-400 mb-6">
          Royal Equips Error Handling Test
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Safe Array Utilities Test */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-purple-400">Safe Array Utilities</h2>
            
            <div className="space-x-2">
              <Button onClick={generateGoodData} className="bg-green-600 hover:bg-green-700">
                Good Data
              </Button>
              <Button onClick={generateBadData} className="bg-yellow-600 hover:bg-yellow-700">
                Missing Array
              </Button>
              <Button onClick={generateNullData} className="bg-red-600 hover:bg-red-700">
                Null Data
              </Button>
            </div>
            
            <BadComponent data={testData} />
            
            <div className="text-sm text-gray-400 bg-gray-900 p-3 rounded">
              <strong>Test Results:</strong>
              <br />• Good Data: Shows items normally
              <br />• Missing Array: Shows "No items to display"
              <br />• Null Data: Shows "No items to display"
              <br />• Original code would crash on missing/null arrays
            </div>
          </div>

          {/* Error Boundary Test */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-purple-400">Error Boundary</h2>
            
            <Button 
              onClick={() => setShowCrash(!showCrash)}
              className="bg-red-600 hover:bg-red-700"
            >
              {showCrash ? 'Hide Crash Test' : 'Test Error Boundary'}
            </Button>
            
            <ErrorBoundary
              fallback={(error, retry) => (
                <div className="p-4 bg-red-900/20 border border-red-500/30 rounded">
                  <h3 className="text-red-400 font-semibold mb-2">🚨 Error Caught!</h3>
                  <div className="text-sm text-red-300 mb-3">
                    {error.message}
                  </div>
                  <Button onClick={retry} className="bg-cyan-600 hover:bg-cyan-700">
                    Retry
                  </Button>
                </div>
              )}
            >
              {showCrash ? (
                <CrashingComponent />
              ) : (
                <div className="p-4 bg-green-900/20 border border-green-500/30 rounded text-green-400">
                  ✅ Component working normally
                </div>
              )}
            </ErrorBoundary>
            
            <div className="text-sm text-gray-400 bg-gray-900 p-3 rounded">
              <strong>Error Boundary Features:</strong>
              <br />• Catches JavaScript errors in component tree
              <br />• Shows user-friendly error message
              <br />• Provides retry functionality
              <br />• Logs errors for debugging
              <br />• Prevents white screen of death
            </div>
          </div>
        </div>

        <div className="mt-8 p-4 bg-cyan-900/20 border border-cyan-500/30 rounded">
          <h3 className="text-cyan-400 font-semibold mb-2">🛡️ Protection Summary</h3>
          <div className="text-sm text-gray-300">
            <p><strong>Before Fix:</strong> "Cannot read properties of undefined (reading 'map')" → White screen crash</p>
            <p><strong>After Fix:</strong> Safe array operations + error boundaries → Graceful handling with user-friendly messages</p>
          </div>
        </div>
      </div>
    </div>
  );
}