import type { Metadata } from 'next';
import './globals.css';
import { AppShell } from '@/components/layout/app-shell';
import { DataProvider } from '@/contexts/data-context';
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from '@/components/theme-provider';

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
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <DataProvider>
            <AppShell>
              {children}
            </AppShell>
            <Toaster />
          </DataProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
