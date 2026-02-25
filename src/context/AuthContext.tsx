import React, { createContext, useContext, useState, useEffect } from 'react';

import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, User as FirebaseUser } from 'firebase/auth';

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
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setFirebaseUser(user);
        const tokenResult = await user.getIdTokenResult();
        const claims = tokenResult.claims;
        setUser({
          email: user.email!,
          name: user.displayName || 'User',
          role: claims.role || 'user', // 'dev', 'admin', or 'user'
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
    const auth = getAuth();
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const logout = async () => {
    const auth = getAuth();
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
