import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Layout } from './Layout';
import { TechLayout } from './TechLayout';
import { Clock, Mail, LogOut } from 'lucide-react';
import type { Job } from '../types';

function PendingSetup({ email, onLogout }: { email: string; onLogout: () => void }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock className="w-8 h-8 text-amber-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Account Pending Setup</h2>
        <p className="text-slate-500 mb-2">
          Your account <span className="font-medium text-slate-700">{email}</span> has been created successfully.
        </p>
        <p className="text-slate-500 mb-6">
          An administrator needs to assign your account to a workspace before you can access the system. Please contact your manager or support.
        </p>
        <div className="space-y-3">
          <a
            href="https://www.facebook.com/pennywiseitoz"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-sm font-medium hover:bg-amber-100 transition-colors"
          >
            <Mail className="w-4 h-4" /> Contact Support — Penny Wise I.T
          </a>
          <button
            onClick={onLogout}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

const RoleRoute = ({ children, roles, forceLayout, jobs }: { children: React.ReactNode, roles: string[], forceLayout?: 'admin' | 'tech', jobs?: Job[] }) => {
  const { user, isLoading, logout } = useAuth();
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

  // Block access for signed-in users who haven't been assigned a tenant yet
  if (user.role !== 'dev' && !user.tenantId) {
    return <PendingSetup email={user.email} onLogout={logout} />;
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
