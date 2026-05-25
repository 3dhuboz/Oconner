import { useUser, useAuth as useClerkAuth } from '@clerk/clerk-react';
import { setTokenProvider } from '@butcher/shared';
import { useEffect } from 'react';

export function useAuth() {
  const { user, isLoaded } = useUser();
  const { getToken } = useClerkAuth();

  useEffect(() => {
    setTokenProvider((options) => getToken({ skipCache: options?.skipCache }));
  }, [getToken]);

  return { user, loading: !isLoaded };
}
