import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './pages/Login';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { JobBoard } from './pages/JobBoard';
import { JobDetail } from './pages/JobDetail';
import { Integrations } from './pages/Integrations';
import { Calendar } from './pages/Calendar';
import { Team } from './pages/Team';
import { FieldPortal } from './pages/FieldPortal';
import { SuperAdmin } from './pages/SuperAdmin';
import { Billing } from './pages/Billing';
import { mockJobs, mockElectricians } from './data/mockData';
import { Job, Electrician } from './types';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Layout>{children}</Layout>;
}

function AppContent() {
  const [jobs, setJobs] = useState<Job[]>(mockJobs);
  const [electricians, setElectricians] = useState<Electrician[]>(mockElectricians);

  // Poll for new jobs arriving via Email Webhook
  useEffect(() => {
    const interval = setInterval(() => {
      fetch('/api/jobs/sync')
        .then(res => res.json())
        .then(data => {
          if (data.jobs && data.jobs.length > 0) {
            setJobs(current => [...data.jobs, ...current]);
            console.log("New jobs received from email!", data.jobs);
          }
        })
        .catch(console.error);
    }, 3000); // Check every 3 seconds for the demo
    return () => clearInterval(interval);
  }, []);

  const updateJob = (id: string, updates: Partial<Job>) => {
    setJobs(current => 
      current.map(job => job.id === id ? { ...job, ...updates } : job)
    );
  };

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      {/* Protected Routes */}
      <Route path="/field/:id" element={
        <ProtectedRoute>
          <FieldPortal jobs={jobs} updateJob={updateJob} />
        </ProtectedRoute>
      } />
      <Route path="/admin" element={
        <ProtectedRoute>
          <SuperAdmin />
        </ProtectedRoute>
      } />
      <Route path="/billing" element={
        <ProtectedRoute>
          <Billing />
        </ProtectedRoute>
      } />
      <Route path="/" element={
        <ProtectedRoute>
          <Dashboard jobs={jobs} />
        </ProtectedRoute>
      } />
      <Route path="/jobs" element={
        <ProtectedRoute>
          <JobBoard jobs={jobs} />
        </ProtectedRoute>
      } />
      <Route path="/jobs/:id" element={
        <ProtectedRoute>
          <JobDetail jobs={jobs} updateJob={updateJob} electricians={electricians} />
        </ProtectedRoute>
      } />
      <Route path="/calendar" element={
        <ProtectedRoute>
          <Calendar jobs={jobs} electricians={electricians} />
        </ProtectedRoute>
      } />
      <Route path="/team" element={
        <ProtectedRoute>
          <Team electricians={electricians} setElectricians={setElectricians} />
        </ProtectedRoute>
      } />
      <Route path="/integrations" element={
        <ProtectedRoute>
          <Integrations />
        </ProtectedRoute>
      } />
      <Route path="*" element={<div className="p-8 text-slate-500">Page not found or under construction.</div>} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContentWrapper />
      </AuthProvider>
    </Router>
  );
}

function AppContentWrapper() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="text-lg font-semibold text-slate-700">Wirez R Us</p>
          <p className="text-sm text-slate-500">Loading Field Management System...</p>
        </div>
      </div>
    );
  }

  return <AppContent />;
}

export default App;
