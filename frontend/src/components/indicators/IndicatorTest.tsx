/**
 * IndicatorTest Component
 * 
 * Test component for message sender indicators
 */

import React, { useState } from 'react';
import { IndicatorWrapper } from './IndicatorWrapper';
import { useMessageIndicators } from '../../hooks/useMessageIndicators';

export function IndicatorTest() {
  const [testUserId] = useState('test-user-123');
  const { handleMessageSent, hasActiveIndicator } = useMessageIndicators();

  const triggerIndicator = () => {
    handleMessageSent(testUserId, 'test-chat', 'test-message');
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md mx-auto">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
        Message Indicator Test
      </h3>
      
      <div className="flex items-center gap-4 mb-4">
        <IndicatorWrapper userId={testUserId}>
          <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
            T
          </div>
        </IndicatorWrapper>
        
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            Test User
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Status: {hasActiveIndicator(testUserId) ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      <button
        onClick={triggerIndicator}
        className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
      >
        Trigger Message Indicator
      </button>

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        Click the button to see the indicator animation on the avatar above.
        The indicator should pulse for 3 seconds.
      </div>
    </div>
  );
}

export default IndicatorTest;