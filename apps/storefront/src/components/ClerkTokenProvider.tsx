'use client';

import { useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { setTokenProvider } from '@butcher/shared';

export default function ClerkTokenProvider() {
  const { getToken } = useAuth();

  useEffect(() => {
    setTokenProvider(() => getToken());
  }, [getToken]);

  return null;
}
