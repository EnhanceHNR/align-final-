import "@/styles/globals.css";
import { Inter } from "next/font/google";
import Providers from "@/app/_components/Providers";
import { Toaster } from "@/components/ui/toaster";
import { TRPCReactProvider } from "~/trpc/react"; // Imported to provide global tRPC and React Query context

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

import type { Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        {/* Wrapped the application with TRPCReactProvider to resolve the runtime context error */}
        <TRPCReactProvider>
          <Providers>
            {children}
            <Toaster />
          </Providers>
        </TRPCReactProvider>
      </body>
    </html>
  );
}