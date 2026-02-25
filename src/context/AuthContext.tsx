import React, { createContext, useContext, useState, useEffect } from 'react';

import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, User as FirebaseUser } from 'firebase/auth';
import { app } from '../services/firebase';

interface User {
  email: string;
  name: string;
  role: 'dev' | 'admin' | 'user';
  uid: string;
}

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  backendStatus: { firebase: boolean; api: boolean; latency: number };
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [backendStatus, setBackendStatus] = useState({ firebase: true, api: true, latency: 45 });

  useEffect(() => {
    if (!app) {
      console.warn('Firebase app not initialized. Auth disabled.');
      setIsLoading(false);
      return;
    }

    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setFirebaseUser(user);
        const tokenResult = await user.getIdTokenResult();
        const claims = tokenResult.claims;
        
        // Hardcode dev role for the main admin email
        let role = claims.role || 'user';
        if (user.email === 'admin@cupcycle.au') {
          role = 'dev';
        }

        setUser({
          email: user.email!,
          name: user.displayName || 'User',
          role: role as 'dev' | 'admin' | 'user',
          uid: user.uid,
        });
      } else {
        setUser(null);
        setFirebaseUser(null);
      }
      setIsLoading(false);
    });

    // Backend monitoring simulation
    const interval = setInterval(() => {
      setBackendStatus(prev => ({ ...prev, latency: Math.floor(Math.random() * 80) + 20 }));
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const login = async (email: string, pass: string) => {
    if (!app) throw new Error('Firebase not initialized');
    const auth = getAuth(app);
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const logout = async () => {
    if (!app) return;
    const auth = getAuth(app);
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, firebaseUser, backendStatus, login, logout, isLoading }}>
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
