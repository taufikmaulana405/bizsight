import type { Metadata } from 'next';
// import { GeistSans } from 'geist/font/sans'; // Removed problematic import
// import { GeistMono } from 'geist/font/mono'; // Removed problematic import
import './globals.css';
import { AppShell } from '@/components/layout/app-shell';
import { DataProvider } from '@/contexts/data-context';
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: 'BizSight - Small Business ERP',
  description: 'Manage your small business finances and appointments with BizSight.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en"> {/* Removed GeistSans.variable */}
      <body className="antialiased">
        <DataProvider>
          <AppShell>
            {children}
          </AppShell>
          <Toaster />
        </DataProvider>
      </body>
    </html>
  );
}
