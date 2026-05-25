import { useUser, useAuth as useClerkAuth } from '@clerk/clerk-react';
import { setTokenProvider } from '@butcher/shared';
import { useLayoutEffect } from 'react';

export function useAuth() {
  const { user, isLoaded } = useUser();
  const { getToken } = useClerkAuth();

  useLayoutEffect(() => {
    setTokenProvider((options) => getToken({ skipCache: options?.skipCache }));
  }, [getToken]);

  return { user, loading: !isLoaded };
}
