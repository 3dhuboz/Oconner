import React, { createContext, useContext, useState, useEffect } from 'react';

// Mock User Database
const USERS = [
  { email: 'dev@agency.com', password: 'dev', name: 'Dev User', role: 'SUPER_ADMIN', licenseKey: 'DEV-MASTER-KEY' },
  { email: 'john@wirezrus.com', password: 'admin', name: 'John Spark', role: 'ADMIN', licenseKey: 'WRU-PRO-2024' },
  { email: 'mike@wirezrus.com', password: 'tech', name: 'Mike Volt', role: 'TECH', licenseKey: 'WRU-PRO-2024' },
];

// Mock License Definitions
const LICENSES: Record<string, any> = {
  'DEV-MASTER-KEY': { plan: 'Developer', features: { all: true }, status: 'Active' },
  'WRU-PRO-2024': { plan: 'Pro', features: { sms: true, xero: true, compliance: true }, status: 'Active' },
  'WRU-BASIC-2024': { plan: 'Basic', features: { sms: false, xero: false, compliance: true }, status: 'Active' },
};

interface User {
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'TECH';
  licenseKey: string;
}

interface AuthContextType {
  user: User | null;
  license: any | null;
  backendStatus: { firebase: boolean; api: boolean; latency: number };
  login: (licenseKey: string, email: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [license, setLicense] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [backendStatus, setBackendStatus] = useState({ firebase: true, api: true, latency: 45 });

  // Simulate persistent login check
  useEffect(() => {
    const storedUser = localStorage.getItem('wru_user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      setLicense(LICENSES[parsedUser.licenseKey]);
    }
    setIsLoading(false);

    // Simulate backend monitoring ping
    const interval = setInterval(() => {
      setBackendStatus(prev => ({
        ...prev,
        latency: Math.floor(Math.random() * (120 - 20) + 20), // Random latency between 20-120ms
        firebase: Math.random() > 0.05 // 95% uptime simulation
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const login = async (licenseKey: string, email: string) => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    const validLicense = LICENSES[licenseKey];
    if (!validLicense) {
      setIsLoading(false);
      throw new Error('Invalid License Key');
    }

    if (validLicense.status !== 'Active') {
      setIsLoading(false);
      throw new Error('License is inactive or expired');
    }

    const foundUser = USERS.find(u => u.email === email && (u.licenseKey === licenseKey || u.role === 'SUPER_ADMIN'));
    
    if (!foundUser) {
      setIsLoading(false);
      throw new Error('User not found for this license');
    }

    const userData = {
      email: foundUser.email,
      name: foundUser.name,
      role: foundUser.role as any,
      licenseKey: foundUser.licenseKey
    };

    setUser(userData);
    setLicense(validLicense);
    localStorage.setItem('wru_user', JSON.stringify(userData));
    setIsLoading(false);
  };

  const logout = () => {
    setUser(null);
    setLicense(null);
    localStorage.removeItem('wru_user');
  };

  return (
    <AuthContext.Provider value={{ user, license, backendStatus, login, logout, isLoading }}>
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
