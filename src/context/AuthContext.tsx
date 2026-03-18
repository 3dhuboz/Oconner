import React, { createContext, useContext, useState, useEffect } from 'react';
import { useUser, useSignIn, useSignUp, useClerk } from '@clerk/react';
import { profilesApi, tenantsApi } from '../services/api';
import type { Tenant, UserRole } from '../types';

// Developer emails — only these get dev access
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
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Inner provider (must be inside ClerkProvider) ────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const { signOut } = useClerk();

  const [user, setUser] = useState<User | null>(null);
  const [license, setLicense] = useState<LicenseInfo | null>(null);
  const [backendStatus, setBackendStatus] = useState({ database: true, api: true, latency: 45 });

  // Sync Clerk user → D1 profile → app user state
  useEffect(() => {
    if (!clerkLoaded) return;

    if (!clerkUser) {
      setUser(null);
      setLicense(null);
      return;
    }

    const email = clerkUser.emailAddresses[0]?.emailAddress || '';
    const uid = clerkUser.id;
    const displayName = clerkUser.fullName || clerkUser.firstName || 'User';

    // Dev shortcut — no D1 lookup needed
    if (DEV_EMAILS.includes(email)) {
      setUser({ email, name: displayName, role: 'dev', uid });
      setLicense({ status: 'Active', plan: 'Developer', type: 'dev' });
      return;
    }

    // Load profile via REST API
    (async () => {
      try {
        const profile = await profilesApi.get(uid).catch(() => null);

        if (profile) {
          setUser({
            email,
            name: profile.displayName || displayName,
            role: (profile.role as UserRole) || 'user',
            uid,
            tenantId: profile.tenantId,
            licenseId: profile.licenseId,
          });

          if (profile.tenantId) {
            const tenant = await tenantsApi.get(profile.tenantId).catch(() => null) as Tenant | null;
            if (tenant) {
              setLicense({
                status: tenant.status === 'active' ? 'Active' : 'Suspended',
                plan: tenant.plan.charAt(0).toUpperCase() + tenant.plan.slice(1),
                type: profile.role === 'admin' ? 'admin' : 'technician',
                tenantName: tenant.companyName,
                adminLicenses: tenant.adminLicenses,
                techLicenses: tenant.techLicenses,
                maxTechLicenses: tenant.maxTechLicenses,
              });
            }
          } else {
            setLicense({ status: 'No License', plan: 'None' });
          }

          await profilesApi.upsert(uid, { lastLogin: new Date().toISOString() });
        } else {
          // First login — create profile
          await profilesApi.upsert(uid, {
            uid, email, displayName,
            role: 'user',
            createdAt: new Date().toISOString(),
            isActive: true,
          });
          setUser({ email, name: displayName, role: 'user', uid });
          setLicense({ status: 'No License', plan: 'None' });
        }
      } catch {
        // API not available yet (first boot / dev)
        setUser({ email, name: displayName, role: 'user', uid });
        setLicense({ status: 'Active', plan: 'Offline Mode' });
      }
    })();
  }, [clerkUser, clerkLoaded]);

  // Backend health monitor
  useEffect(() => {
    const interval = setInterval(() => {
      setBackendStatus(prev => ({ ...prev, database: navigator.onLine, api: navigator.onLine, latency: navigator.onLine ? prev.latency : 0 }));
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const login = async (email: string, pass: string) => {
    if (!signIn) throw new Error('Clerk not initialized');
    const result = await (signIn as any).create({ identifier: email, password: pass });
    if (result?.status && result.status !== 'complete') throw new Error('Sign-in incomplete. Check your email for a verification link.');
  };

  const register = async (email: string, pass: string) => {
    if (!signUp) throw new Error('Clerk not initialized');
    await (signUp as any).create({ emailAddress: email, password: pass });
  };

  const logout = async () => {
    await signOut();
    setUser(null);
    setLicense(null);
  };

  const isLoading = !clerkLoaded;

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
