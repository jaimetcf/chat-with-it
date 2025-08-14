'use client';

import { useToast } from './toast';

export function ToastExample() {
  const { toast, success, error, warning, info } = useToast();

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Toast Examples</h2>
      
      <div className="space-y-2">
        <button
          onClick={() => success('Operation completed successfully!', 'Success')}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Show Success Toast
        </button>
        
        <button
          onClick={() => error('Something went wrong!', 'Error')}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Show Error Toast
        </button>
        
        <button
          onClick={() => warning('Please check your input.', 'Warning')}
          className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
        >
          Show Warning Toast
        </button>
        
        <button
          onClick={() => info('Here is some information.', 'Info')}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Show Info Toast
        </button>
        
        <button
          onClick={() => toast({
            type: 'success',
            message: 'Custom toast with 10 second duration',
            title: 'Custom Toast',
            duration: 10000
          })}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
        >
          Show Custom Toast (10s)
        </button>
      </div>
    </div>
  );
}

