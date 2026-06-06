import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';
import ChatWidget from '@/components/ChatWidget';
import ClerkTokenProvider from '@/components/ClerkTokenProvider';
import InstallPrompt from '@/components/InstallPrompt';
import AnnouncementBanner from '@/components/AnnouncementBanner';
import PageTracker from '@/components/PageTracker';
import Toaster from '@/components/Toaster';
import { defaultDescription, defaultShareImage, siteName, siteUrl } from '@/lib/siteMetadata';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: siteName, template: `%s | ${siteName}` },
  description: defaultDescription,
  keywords: [
    'grass fed beef', 'beef boxes', 'local beef Queensland', 'Calliope QLD', 'Boyne Valley beef',
    "O'Connor Agriculture", 'regenerative farming', 'beef delivery QLD', 'free range beef',
  ],
  alternates: { canonical: siteUrl },
  manifest: '/manifest.json',
  icons: {
    icon: [{ url: '/favicon.jpg', type: 'image/jpeg' }],
    shortcut: '/favicon.jpg',
    apple: '/favicon.jpg',
  },
  openGraph: {
    siteName,
    type: 'website',
    url: siteUrl,
    title: "O'Connor Agriculture - Local Grass Fed Beef, Calliope QLD",
    description: defaultDescription,
    images: [defaultShareImage],
    locale: 'en_AU',
  },
  twitter: {
    card: 'summary_large_image',
    title: "O'Connor Agriculture - Local Grass Fed Beef",
    description: defaultDescription,
    images: [defaultShareImage.url],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="min-h-screen flex flex-col">
          <ClerkTokenProvider />
          <PageTracker />
          <AnnouncementBanner />
          {children}
          <ChatWidget />
          <InstallPrompt />
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  );
}
