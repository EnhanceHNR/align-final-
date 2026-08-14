'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div style={{ padding: '40px', backgroundColor: '#500', color: 'white', fontFamily: 'monospace' }}>
          <h2>Global Error Caught!</h2>
          <p>{error.message}</p>
          <pre>{error.stack}</pre>
        </div>
      </body>
    </html>
  );
}
