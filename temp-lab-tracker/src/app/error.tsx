'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Next.js Page Error caught by error.tsx:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-red-950 text-white">
      <h2 className="text-3xl font-bold mb-4">Something went wrong!</h2>
      <div className="bg-black/50 p-6 rounded-xl w-full max-w-3xl overflow-auto border border-red-500">
        <p className="font-mono text-red-400 font-bold mb-2">Error Message:</p>
        <pre className="font-mono text-sm whitespace-pre-wrap">{error.message}</pre>
        <p className="font-mono text-red-400 font-bold mt-4 mb-2">Stack Trace:</p>
        <pre className="font-mono text-xs whitespace-pre-wrap opacity-70">{error.stack}</pre>
        {error.digest && (
          <p className="font-mono text-xs mt-4 text-gray-400">Digest: {error.digest}</p>
        )}
      </div>
      <button
        className="mt-8 px-6 py-3 bg-white text-red-950 font-bold rounded-xl hover:bg-gray-200 transition-colors"
        onClick={() => reset()}
      >
        Try again
      </button>
    </div>
  );
}
