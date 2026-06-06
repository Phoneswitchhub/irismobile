import type { Metadata, Viewport } from 'next';
import './globals.css';
import { LanguageProvider } from '@/lib/i18n';
import InAppBrowserEscaper from '@/components/InAppBrowserEscaper';

export const metadata: Metadata = {
  title: 'Phone Switch Hub — Premium Phone Marketplace',
  description: "Thailand's premium used smartphone marketplace. Trade safely with verified sellers.",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <LanguageProvider>
          <InAppBrowserEscaper />
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
