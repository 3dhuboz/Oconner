import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './pages/Login';
import { DevLogin } from './pages/DevLogin';
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
import { PromoFlyer } from './pages/PromoFlyer';


import { DemoTour } from './components/DemoTour';

import { Job, Electrician } from './types';
import { db } from './services/firebase';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { Toaster } from 'react-hot-toast';

import { ProtectedRoute, AdminRoute, DevRoute } from './components/ProtectedRoute';

const MOCK_JOBS: Job[] = [
  { id: 'j1', title: 'No Power to Kitchen', status: 'UNASSIGNED', location: '123 Smith St', description: 'Client reported all kitchen outlets are dead.', createdAt: new Date().toISOString() },
  { id: 'j2', title: 'Install EV Charger', status: 'ASSIGNED', assignedTo: 'e1', location: '456 Oak Ave', description: 'Tesla Wall Connector installation.', createdAt: new Date().toISOString() },
  { id: 'j3', title: 'Flickering Lights', status: 'COMPLETED', assignedTo: 'e2', location: '789 Pine Rd', description: 'Resolved loose neutral in main panel.', createdAt: new Date().toISOString() }
];

const MOCK_ELECTRICIANS: Electrician[] = [
  { id: 'e1', name: 'Mike Volt', status: 'AVAILABLE', phone: '555-0101' },
  { id: 'e2', name: 'Sarah Watt', status: 'ON_JOB', phone: '555-0102' }
];

function AppContent() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [electricians, setElectricians] = useState<Electrician[]>([]);
  const { user } = useAuth(); // Get user to prevent fetches on logout

  // Effect for real-time jobs
  useEffect(() => {
    if (!user) return;
    if (user.isDemo) {
      setJobs(MOCK_JOBS);
      return;
    }
    if (!db) return;
    const unsubscribe = onSnapshot(collection(db, 'jobs'), (snapshot) => {
      const jobsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job));
      setJobs(jobsData);
    });
    return unsubscribe;
  }, [user]);

  // Effect for real-time electricians
  useEffect(() => {
    if (!user) return;
    if (user.isDemo) {
      setElectricians(MOCK_ELECTRICIANS);
      return;
    }
    if (!db) return;
    const unsubscribe = onSnapshot(collection(db, 'electricians'), (snapshot) => {
      const electriciansData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Electrician));
      setElectricians(electriciansData);
    });
    return unsubscribe;
  }, [user]);

  const updateJob = async (id: string, updates: Partial<Job>) => {
    if (user?.isDemo) {
      setJobs(prev => prev.map(j => j.id === id ? { ...j, ...updates } : j));
      return;
    }
    if (!db) return;
    const jobRef = doc(db, 'jobs', id);
    await updateDoc(jobRef, updates);
  };

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/dev/login" element={<DevLogin />} />
      <Route path="/promo" element={<PromoFlyer />} />
      
      {/* Dev Only Route */}
      <Route path="/admin" element={
        <DevRoute>
          <SuperAdmin />
        </DevRoute>
      } />

      {/* Admin & Dev Routes */}
      <Route path="/billing" element={
        <AdminRoute>
          <Billing />
        </AdminRoute>
      } />
      <Route path="/team" element={
        <AdminRoute>
          <Team electricians={electricians} setElectricians={setElectricians} />
        </AdminRoute>
      } />
      <Route path="/integrations" element={
        <AdminRoute>
          <Integrations />
        </AdminRoute>
      } />

      {/* General Protected Routes */}
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
      <Route path="/field/:id" element={
        <ProtectedRoute>
          <FieldPortal jobs={jobs} updateJob={updateJob} />
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
        <DemoTour />
        <Toaster position="bottom-right" />
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
