import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';
import ChatWidget from '@/components/ChatWidget';
import ClerkTokenProvider from '@/components/ClerkTokenProvider';

export const metadata: Metadata = {
  title: { default: "O'Connor Agriculture", template: "%s | O'Connor Agriculture" },
  description:
    "Local grass fed beef from Calliope & the Boyne Valley, QLD. First generation family farm — locally raised, grass fed, naturally healthy. Delivered to your door.",
  keywords: [
    'grass fed beef', 'beef boxes', 'local beef Queensland', 'Calliope QLD', 'Boyne Valley beef',
    "O'Connor Agriculture", 'regenerative farming', 'beef delivery QLD', 'free range beef',
  ],
  icons: {
    icon: [{ url: '/favicon.jpg', type: 'image/jpeg' }],
    shortcut: '/favicon.jpg',
    apple: '/favicon.jpg',
  },
  openGraph: {
    siteName: "O'Connor Agriculture",
    type: 'website',
    title: "O'Connor Agriculture — Local Grass Fed Beef, Calliope QLD",
    description:
      "First generation family farm from the Boyne Valley, QLD. Grass fed & naturally healthy beef boxes delivered to your door.",
    images: [{ url: '/oc-logo.jpg', width: 500, height: 500, alt: "O'Connor Agriculture Logo" }],
    locale: 'en_AU',
  },
  twitter: {
    card: 'summary',
    title: "O'Connor Agriculture",
    description: 'Local grass fed beef from the Boyne Valley, QLD. Delivered to your door.',
    images: ['/oc-logo.jpg'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="min-h-screen flex flex-col">
          <ClerkTokenProvider />
          {children}
          <ChatWidget />
        </body>
      </html>
    </ClerkProvider>
  );
}
