import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Layout } from './Layout';
import { TechLayout } from './TechLayout';

const RoleRoute = ({ children, roles, forceLayout }: { children: React.ReactNode, roles: string[], forceLayout?: 'admin' | 'tech' }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50">Loading...</div>;
  }

  if (!user || !roles.includes(user.role)) {
    // If it's a dev-only route, redirect to the dev login page
    if (roles.includes('dev') && roles.length === 1) {
      return <Navigate to="/dev/login" state={{ from: location }} replace />;
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Use TechLayout for user role (technicians), Layout for admin/dev
  if (forceLayout === 'tech' || (user.role === 'user' && forceLayout !== 'admin')) {
    return <TechLayout>{children}</TechLayout>;
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

export const TechRoute = ({ children }: { children: React.ReactNode }) => (
  <RoleRoute roles={['dev', 'admin', 'user']} forceLayout="tech">{children}</RoleRoute>
);
