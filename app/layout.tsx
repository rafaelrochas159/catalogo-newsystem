import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { META_DEFAULTS } from '@/lib/constants';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: META_DEFAULTS.title,
  description: META_DEFAULTS.description,
  keywords: META_DEFAULTS.keywords,
  authors: [{ name: 'NEW SYSTEM DISTRIBUIDORA' }],
  creator: 'NEW SYSTEM DISTRIBUIDORA',
  metadataBase: new URL('https://newsystem.com.br'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: META_DEFAULTS.title,
    description: META_DEFAULTS.description,
    url: 'https://newsystem.com.br',
    siteName: 'NEW SYSTEM DISTRIBUIDORA',
    locale: 'pt_BR',
    type: 'website',
    images: [
      {
        url: META_DEFAULTS.ogImage,
        width: 1200,
        height: 630,
        alt: 'NEW SYSTEM DISTRIBUIDORA',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: META_DEFAULTS.title,
    description: META_DEFAULTS.description,
    images: [META_DEFAULTS.ogImage],
    creator: META_DEFAULTS.twitterHandle,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      </head>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}