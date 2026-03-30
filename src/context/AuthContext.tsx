import React, { createContext, useContext, useState, useEffect } from 'react';
import { useUser, useAuth as useClerkAuth } from '@clerk/react';
import { userProfilesApi, setAuthTokenGetter } from '../services/api';
import type { UserRole } from '../types';

// Developer emails — these get dev access
const DEV_EMAILS = ['admin@cupcycle.au', 'steve@3dhub.au'];

interface User {
  email: string;
  name: string;
  role: UserRole;
  uid: string;
  tenantId?: string;
  licenseId?: string;
}

interface LicenseInfo {
  status: string;
  plan: string;
  type?: string;
  tenantName?: string;
  adminLicenses?: number;
  techLicenses?: number;
  maxTechLicenses?: number;
}

interface AuthContextType {
  user: User | null;
  license: LicenseInfo | null;
  backendStatus: { database: boolean; api: boolean; latency: number };
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user: clerkUser, isLoaded, isSignedIn } = useUser();
  const { getToken, signOut } = useClerkAuth();
  const [user, setUser] = useState<User | null>(null);
  const [license, setLicense] = useState<LicenseInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [backendStatus, setBackendStatus] = useState({ database: true, api: true, latency: 45 });

  // Register the token getter for the API client
  useEffect(() => {
    setAuthTokenGetter(() => getToken());
  }, [getToken]);

  // Load user profile when Clerk user changes
  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn || !clerkUser) {
      setUser(null);
      setLicense(null);
      setIsLoading(false);
      return;
    }

    const email = clerkUser.primaryEmailAddress?.emailAddress || '';
    const isDev = DEV_EMAILS.includes(email);

    if (isDev) {
      setUser({
        email,
        name: clerkUser.fullName || 'Developer',
        role: 'dev',
        uid: clerkUser.id,
      });
      setLicense({ status: 'Active', plan: 'Developer', type: 'dev' });
      setIsLoading(false);
      return;
    }

    // Look up user profile from D1 via API
    (async () => {
      try {
        let profile: any = null;
        try {
          profile = await userProfilesApi.get(clerkUser.id);
        } catch {
          // Not found — create a new profile
          const newProfile = {
            uid: clerkUser.id,
            email,
            displayName: clerkUser.fullName || email.split('@')[0],
            role: 'user',
            createdAt: new Date().toISOString(),
            isActive: true,
          };
          try {
            profile = await userProfilesApi.upsert(newProfile);
          } catch { /* swallow — API may not be reachable yet */ }
          if (!profile) {
            profile = newProfile;
          }
        }

        setUser({
          email,
          name: profile.displayName || clerkUser.fullName || email.split('@')[0],
          role: (profile.role as UserRole) || 'user',
          uid: clerkUser.id,
          tenantId: profile.tenantId || undefined,
          licenseId: profile.licenseId || undefined,
        });

        setLicense(
          profile.tenantId
            ? { status: 'Active', plan: 'Professional', type: profile.role === 'admin' ? 'admin' : 'technician' }
            : { status: 'No License', plan: 'None' }
        );

        // Fire-and-forget last login update
        userProfilesApi.update(clerkUser.id, { lastLogin: new Date().toISOString() }).catch(() => {});
      } catch (err) {
        console.error('[AuthContext] Unexpected profile load error:', err);
        // Fallback — let user in as basic user so they at least see the pending screen
        setUser({ email, name: clerkUser.fullName || 'User', role: 'user', uid: clerkUser.id });
        setLicense({ status: 'No License', plan: 'None' });
      } finally {
        setIsLoading(false);
      }
    })();
  }, [isLoaded, isSignedIn, clerkUser]);

  // Backend monitoring
  useEffect(() => {
    const interval = setInterval(() => {
      setBackendStatus(prev => ({
        ...prev,
        api: navigator.onLine,
        latency: navigator.onLine ? prev.latency : 0,
      }));
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const login = async (email: string, pass: string) => {
    // With Clerk, login is handled by Clerk components (<SignIn>)
    // This method exists for backward compat — redirect to Clerk sign-in
    throw new Error('Use Clerk sign-in components');
  };

  const register = async (email: string, pass: string) => {
    throw new Error('Use Clerk sign-up components');
  };

  const logout = async () => {
    await signOut();
  };

  return (
    <AuthContext.Provider value={{ user, license, backendStatus, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
