import type {Metadata} from 'next';
import './globals.css';
import { AppShell } from '@/components/AppShell';
import { Toaster } from "@/components/ui/toaster";
import { FirebaseClientProvider } from '@/firebase';

export const metadata: Metadata = {
  title: 'LabTrack Mobile',
  description: 'Lab Management Application',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  try {
    return (
      <html lang="en" suppressHydrationWarning>
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        </head>
        <body className="font-body antialiased">
          <FirebaseClientProvider>
            <AppShell>
              {children}
            </AppShell>
            <Toaster />
          </FirebaseClientProvider>
        </body>
      </html>
    );
  } catch (error: any) {
    return (
      <html lang="en">
        <body>
          <div className="p-10 bg-red-100 text-red-900 border border-red-500 rounded-xl m-10">
            <h2 className="text-xl font-bold">Layout SSR Error</h2>
            <pre className="whitespace-pre-wrap mt-4">{error.stack || error.message || String(error)}</pre>
          </div>
        </body>
      </html>
    );
  }
}
