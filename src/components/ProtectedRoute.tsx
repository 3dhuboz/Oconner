import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Layout } from './Layout';
import { TechLayout } from './TechLayout';
import type { Job } from '../types';

const RoleRoute = ({ children, roles, forceLayout, jobs }: { children: React.ReactNode, roles: string[], forceLayout?: 'admin' | 'tech', jobs?: Job[] }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50">Loading...</div>;
  }

  if (!user || !roles.includes(user.role)) {
    if (roles.includes('dev') && roles.length === 1) {
      return <Navigate to="/dev/login" state={{ from: location }} replace />;
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Use TechLayout for user role (technicians), Layout for admin/dev
  if (forceLayout === 'tech' || (user.role === 'user' && forceLayout !== 'admin')) {
    return <TechLayout>{children}</TechLayout>;
  }

  return <Layout jobs={jobs}>{children}</Layout>;
};

export const DevRoute = ({ children, jobs }: { children: React.ReactNode, jobs?: Job[] }) => (
  <RoleRoute roles={['dev']} jobs={jobs}>{children}</RoleRoute>
);

export const AdminRoute = ({ children, jobs }: { children: React.ReactNode, jobs?: Job[] }) => (
  <RoleRoute roles={['dev', 'admin']} jobs={jobs}>{children}</RoleRoute>
);

export const ProtectedRoute = ({ children, jobs }: { children: React.ReactNode, jobs?: Job[] }) => (
  <RoleRoute roles={['dev', 'admin', 'user']} jobs={jobs}>{children}</RoleRoute>
);

export const TechRoute = ({ children }: { children: React.ReactNode }) => (
  <RoleRoute roles={['dev', 'admin', 'user']} forceLayout="tech">{children}</RoleRoute>
);
