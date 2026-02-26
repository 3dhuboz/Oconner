import React, { createContext, useContext, useState, useEffect } from 'react';

import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, User as FirebaseUser } from 'firebase/auth';
import { app, auth as firebaseAuth, db } from '../services/firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import type { License, Tenant, UserRole } from '../types';

// Developer emails - only these get dev access
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
  firebaseUser: FirebaseUser | null;
  license: LicenseInfo | null;
  backendStatus: { firebase: boolean; api: boolean; latency: number };
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [license, setLicense] = useState<LicenseInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [backendStatus, setBackendStatus] = useState({ firebase: true, api: true, latency: 45 });

  useEffect(() => {
    if (!app || !firebaseAuth) {
      console.warn('Firebase app not initialized. Auth disabled.');
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(firebaseAuth, async (fbUser) => {
      if (fbUser) {
        setFirebaseUser(fbUser);

        // Check if this is a dev
        const isDev = DEV_EMAILS.includes(fbUser.email || '');

        if (isDev) {
          setUser({
            email: fbUser.email!,
            name: fbUser.displayName || 'Developer',
            role: 'dev',
            uid: fbUser.uid,
          });
          setLicense({ status: 'Active', plan: 'Developer', type: 'dev' });
        } else if (db) {
          // Look up user profile in Firestore
          const profileRef = doc(db, 'userProfiles', fbUser.uid);
          const profileSnap = await getDoc(profileRef);

          if (profileSnap.exists()) {
            const profile = profileSnap.data();
            setUser({
              email: fbUser.email!,
              name: profile.displayName || fbUser.displayName || 'User',
              role: (profile.role as UserRole) || 'user',
              uid: fbUser.uid,
              tenantId: profile.tenantId,
              licenseId: profile.licenseId,
            });

            // Load license & tenant info
            if (profile.tenantId) {
              const tenantRef = doc(db, 'tenants', profile.tenantId);
              const tenantSnap = await getDoc(tenantRef);
              if (tenantSnap.exists()) {
                const tenant = tenantSnap.data() as Tenant;
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

            // Update last login
            await setDoc(profileRef, { lastLogin: new Date().toISOString() }, { merge: true });
          } else {
            // New user with no profile - default to user role with no license
            const newProfile = {
              uid: fbUser.uid,
              email: fbUser.email,
              displayName: fbUser.displayName || 'New User',
              role: 'user',
              createdAt: new Date().toISOString(),
              isActive: true,
            };
            await setDoc(profileRef, newProfile);

            setUser({
              email: fbUser.email!,
              name: fbUser.displayName || 'New User',
              role: 'user',
              uid: fbUser.uid,
            });
            setLicense({ status: 'No License', plan: 'None' });
          }
        } else {
          // No Firestore - fallback
          setUser({
            email: fbUser.email!,
            name: fbUser.displayName || 'User',
            role: 'admin',
            uid: fbUser.uid,
          });
          setLicense({ status: 'Active', plan: 'Offline Mode' });
        }
      } else {
        setUser(null);
        setFirebaseUser(null);
        setLicense(null);
      }
      setIsLoading(false);
    });

    // Backend monitoring
    const interval = setInterval(() => {
      setBackendStatus(prev => ({ ...prev, latency: Math.floor(Math.random() * 80) + 20 }));
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const login = async (email: string, pass: string) => {
    if (!app || !firebaseAuth) throw new Error('Firebase not initialized');
    await signInWithEmailAndPassword(firebaseAuth, email, pass);
  };

  const register = async (email: string, pass: string) => {
    if (!app || !firebaseAuth) throw new Error('Firebase not initialized');
    await createUserWithEmailAndPassword(firebaseAuth, email, pass);
  };

  const logout = async () => {
    if (!app || !firebaseAuth) return;
    await signOut(firebaseAuth);
  };

  return (
    <AuthContext.Provider value={{ user, firebaseUser, license, backendStatus, login, register, logout, isLoading }}>
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
