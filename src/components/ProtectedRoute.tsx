import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Layout } from './Layout';

const RoleRoute = ({ children, roles }: { children: React.ReactNode, roles: string[] }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50">Loading...</div>;
  }

  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Layout>{children}</Layout>;
};

export const DevRoute = ({ children }: { children: React.ReactNode }) => (
  <RoleRoute roles={['dev']}>{children}</RoleRoute>
);

export const AdminRoute = ({ children }: { children: React.ReactNode }) => (
  <RoleRoute roles={['dev', 'admin']}>{children}</RoleRoute>
);

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => (
  <RoleRoute roles={['dev', 'admin', 'user']}>{children}</RoleRoute>
);
