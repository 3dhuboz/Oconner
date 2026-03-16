import type { Metadata } from 'next';
import { Inter, Barlow_Condensed } from 'next/font/google';
import './globals.css';
import ChatWidget from '@/components/ChatWidget';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-heading',
});

export const metadata: Metadata = {
  title: { default: "O'Connor Agriculture", template: "%s | O'Connor Agriculture" },
  description:
    "Local grass fed beef from Calliope & the Boyne Valley, QLD. First generation family farm — locally raised, grass fed, naturally healthy. Delivered to your door.",
  keywords: [
    'grass fed beef', 'beef boxes', 'local beef Queensland', 'Calliope QLD', 'Boyne Valley beef',
    "O'Connor Agriculture", 'regenerative farming', 'beef delivery QLD', 'free range beef',
  ],
  icons: {
    icon: [{ url: '/oc-logo.jpg', type: 'image/jpeg' }],
    shortcut: '/oc-logo.jpg',
    apple: '/oc-logo.jpg',
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
    <html lang="en" className={`${inter.variable} ${barlowCondensed.variable}`}>
      <body className="min-h-screen flex flex-col">
        {children}
        <ChatWidget />
      </body>
    </html>
  );
}
