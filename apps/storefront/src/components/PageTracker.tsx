'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { trackPageview } from '@/lib/track';

export default function PageTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname) trackPageview(pathname);
  }, [pathname]);

  return null;
}
