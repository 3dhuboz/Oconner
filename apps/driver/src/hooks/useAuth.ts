import { useUser, useAuth as useClerkAuth } from '@clerk/clerk-react';
import { setTokenProvider } from '@butcher/shared';
import { useEffect } from 'react';

export function useAuth() {
  const { user, isLoaded } = useUser();
  const { getToken } = useClerkAuth();

  useEffect(() => {
    setTokenProvider(() => getToken());
  }, [getToken]);

  return { user, loading: !isLoaded };
}
