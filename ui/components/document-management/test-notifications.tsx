'use client';

import { useToast } from '@/components/toast';

export function TestNotifications() {
  const { success, error, info, warning } = useToast();

  const testNotifications = () => {
    // Test different notification types
    info('Document uploaded successfully. Processing will begin shortly...');
    
    setTimeout(() => {
      info('document.pdf is being processed...');
    }, 1000);
    
    setTimeout(() => {
      info('document.pdf is being vectorized for search...');
    }, 2000);
    
    setTimeout(() => {
      success('document.pdf is ready for chat!');
    }, 3000);
  };

  const testErrorNotification = () => {
    error('document.pdf processing failed: File type not supported');
  };

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-lg font-semibold">Test Notifications</h3>
      <div className="space-x-2">
        <button
          onClick={testNotifications}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Test Success Flow
        </button>
        <button
          onClick={testErrorNotification}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Test Error Flow
        </button>
      </div>
    </div>
  );
}
