import type { Metadata, Viewport } from 'next';
import { Anybody, Fraunces, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

import { CartProvider } from '@/components/cart/CartProvider';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { Ticker } from '@/components/Ticker';
import { UniverseProvider } from '@/components/universe/UniverseProvider';
import { site } from '@/lib/copy';
import { isStorefrontConfigured } from '@/lib/shopify/client';
import { NO_FLASH_SCRIPT } from '@/lib/universe';

const anybody = Anybody({
  subsets: ['latin'],
  axes: ['wdth'],
  variable: '--font-anybody',
  display: 'swap',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  axes: ['SOFT', 'WONK', 'opsz'],
  style: ['normal', 'italic'],
  variable: '--font-fraunces',
  display: 'swap',
});

const plex = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — We mean it.`,
    template: `%s — ${site.name}`,
  },
  description: site.description,
  openGraph: {
    type: 'website',
    siteName: site.name,
    title: `${site.name} — We mean it.`,
    description: site.description,
    url: site.url,
  },
  twitter: { card: 'summary_large_image' },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f3f3f0' },
    { media: '(prefers-color-scheme: dark)', color: '#0d0d0d' },
  ],
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  const storefrontLive = isStorefrontConfigured();

  return (
    <html
      lang="en"
      data-universe="sincere"
      suppressHydrationWarning
      className={`${anybody.variable} ${fraunces.variable} ${plex.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }} />
      </head>
      <body className="min-h-dvh flex flex-col">
        <UniverseProvider>
          <CartProvider live={storefrontLive}>
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
            <CartDrawer />
            <Ticker />
          </CartProvider>
        </UniverseProvider>
      </body>
    </html>
  );
}
