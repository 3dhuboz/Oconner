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
  title: { default: 'O\'Connor Agriculture', template: '%s | O\'Connor Agriculture' },
  description: 'Local grass fed beef from the Boyne Valley, QLD. Locally raised, grass fed, naturally healthy. Delivered to your door.',
  openGraph: {
    siteName: 'O\'Connor Agriculture',
    type: 'website',
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
