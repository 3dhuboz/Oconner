'use client';

import { useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { setTokenProvider } from '@butcher/shared';

export default function ClerkTokenProvider() {
  const { getToken } = useAuth();

  useEffect(() => {
    setTokenProvider((options) => getToken({ skipCache: options?.skipCache }));
  }, [getToken]);

  return null;
}
