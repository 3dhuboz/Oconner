export const runtime = 'edge';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <p className="text-8xl mb-4">🥩</p>
      <h1 className="text-4xl font-black uppercase tracking-wide text-brand mb-2">Page Not Found</h1>
      <p className="text-gray-500 mb-8">Looks like this cut doesn&apos;t exist.</p>
      <Link href="/" className="bg-brand text-white font-bold px-8 py-3 rounded-lg hover:bg-brand-mid transition-colors uppercase tracking-wide">
        Back to Home
      </Link>
    </div>
  );
}
