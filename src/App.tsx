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
import { Purchase } from './pages/Purchase';
import { DashboardWidget } from './pages/DashboardWidget';
import { LiveMap } from './pages/LiveMap';
import { TechDashboard } from './pages/TechDashboard';
import { TechToday } from './pages/TechToday';
import { TechProfile } from './pages/TechProfile';
import { PartsCatalog } from './pages/PartsCatalog';
import { Stocktake } from './pages/Stocktake';
import { NewJob } from './pages/NewJob';
import { PropertyHistory } from './pages/PropertyHistory';
import { Pricing } from './pages/Pricing';

import { Job, Electrician, CatalogPart } from './types';
import { jobsApi, electriciansApi, partsCatalogApi } from './services/api';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';

import { ProtectedRoute, AdminRoute, DevRoute, TechRoute } from './components/ProtectedRoute';

import { offlineJobs, offlineElectricians, syncQueue } from './services/offlineDb';
import { startSyncCron, stopSyncCron } from './services/syncService';
import { useSyncStatus } from './hooks/useOfflineSync';
import { NetworkStatusBar } from './components/NetworkStatusBar';

const POLL_INTERVAL = 5000; // 5 seconds

function AppContent() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [electricians, setElectricians] = useState<Electrician[]>([]);
  const [partsCatalog, setPartsCatalog] = useState<CatalogPart[]>([]);
  const { user } = useAuth();
  const syncStatus = useSyncStatus();

  // Start background sync cron on mount
  useEffect(() => {
    startSyncCron();
    return () => stopSyncCron();
  }, []);

  // Load cached data from IndexedDB immediately (offline-first)
  useEffect(() => {
    if (!user) return;
    offlineJobs.getAll().then(cached => {
      if (cached.length > 0) setJobs(cached as Job[]);
    });
    offlineElectricians.getAll().then(cached => {
      if (cached.length > 0) setElectricians(cached as Electrician[]);
    });
  }, [user]);

  // Poll Worker API for jobs (replaces Firestore onSnapshot)
  const knownJobIds = React.useRef<Set<string>>(new Set());
  const isFirstLoad = React.useRef(true);

  useEffect(() => {
    if (!user) return;

    const isAdmin = user.role === 'admin' || user.role === 'dev';

    async function fetchJobs() {
      try {
        const jobsData = await jobsApi.list();
        setJobs(jobsData);
        offlineJobs.putAll(jobsData);

        // Detect genuinely new jobs (skip initial load)
        if (isFirstLoad.current) {
          jobsData.forEach((j: Job) => knownJobIds.current.add(j.id));
          isFirstLoad.current = false;
          return;
        }

        if (isAdmin) {
          for (const job of jobsData) {
            if (knownJobIds.current.has(job.id)) continue;
            knownJobIds.current.add(job.id);

            const isUrgent = ['urgent', 'emergency'].some(
              u => (job.urgency || '').toLowerCase().includes(u) ||
                   (job.title || '').toLowerCase().includes(u)
            );

            if (isUrgent) {
              toast.custom(
                (t) => (
                  <div
                    className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-sm w-full bg-red-600 text-white shadow-2xl rounded-2xl pointer-events-auto flex ring-2 ring-red-400 cursor-pointer`}
                    onClick={() => { window.location.href = `/jobs/${job.id}`; toast.dismiss(t.id); }}
                  >
                    <div className="flex-1 p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">🚨</span>
                        <span className="font-black uppercase tracking-wide text-sm">Urgent Job Received</span>
                      </div>
                      <p className="font-semibold text-sm truncate">{job.title}</p>
                      <p className="text-red-200 text-xs truncate">{job.propertyAddress}</p>
                    </div>
                    <div className="flex items-center pr-4">
                      <span className="text-red-200 text-xs font-bold">View →</span>
                    </div>
                  </div>
                ),
                { duration: 12000, position: 'top-right' }
              );
              if (Notification.permission === 'granted') {
                new Notification('🚨 Urgent Job Received', {
                  body: `${job.title} — ${job.propertyAddress}`,
                  icon: '/favicon.ico',
                });
              }
            } else {
              toast.custom(
                (t) => (
                  <div
                    className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-sm w-full bg-slate-900 text-white shadow-xl rounded-2xl pointer-events-auto flex cursor-pointer`}
                    onClick={() => { window.location.href = `/jobs/${job.id}`; toast.dismiss(t.id); }}
                  >
                    <div className="flex-1 p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-base">📋</span>
                        <span className="font-bold text-sm">New Job</span>
                      </div>
                      <p className="text-slate-200 text-xs truncate">{job.title}</p>
                      <p className="text-slate-400 text-xs truncate">{job.propertyAddress}</p>
                    </div>
                    <div className="flex items-center pr-4">
                      <span className="text-slate-400 text-xs font-bold">View →</span>
                    </div>
                  </div>
                ),
                { duration: 6000, position: 'top-right' }
              );
            }
          }
        }
      } catch (error: any) {
        console.warn('[Poll] Jobs fetch error, using cached data:', error.message);
      }
    }

    fetchJobs();
    const interval = setInterval(fetchJobs, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [user]);

  // Poll for parts catalog
  useEffect(() => {
    if (!user) return;

    async function fetchParts() {
      try {
        const data = await partsCatalogApi.list();
        setPartsCatalog(data);
      } catch (error: any) {
        console.warn('[Poll] Parts catalog fetch error:', error.message);
      }
    }

    fetchParts();
    const interval = setInterval(fetchParts, POLL_INTERVAL * 2);
    return () => clearInterval(interval);
  }, [user]);

  // Persist parts catalog changes to Worker API
  const setPartsCatalogWithSync = ((updater: React.SetStateAction<CatalogPart[]>) => {
    setPartsCatalog(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      // Sync to Worker API
      for (const part of next) {
        const old = prev.find(p => p.id === part.id);
        if (!old || JSON.stringify(old) !== JSON.stringify(part)) {
          partsCatalogApi.upsert(part).catch(() => {});
        }
      }
      for (const old of prev) {
        if (!next.find(p => p.id === old.id)) {
          partsCatalogApi.delete(old.id).catch(() => {});
        }
      }
      return next;
    });
  }) as React.Dispatch<React.SetStateAction<CatalogPart[]>>;

  // Poll for electricians
  useEffect(() => {
    if (!user) return;

    async function fetchElectricians() {
      try {
        const data = await electriciansApi.list();
        setElectricians(data);
        offlineElectricians.putAll(data);
      } catch (error: any) {
        console.warn('[Poll] Electricians fetch error, using cached data:', error.message);
      }
    }

    fetchElectricians();
    const interval = setInterval(fetchElectricians, POLL_INTERVAL * 2);
    return () => clearInterval(interval);
  }, [user]);

  // Offline-aware job update
  const updateJob = async (id: string, updates: Partial<Job>) => {
    // Optimistic local update
    setJobs(prev => prev.map(j => j.id === id ? { ...j, ...updates } : j));
    const allJobs = await offlineJobs.getAll();
    const existing = allJobs.find((j: any) => j.id === id);
    if (existing) {
      await offlineJobs.put({ ...existing, ...updates });
    }

    // Try Worker API, queue if offline
    if (navigator.onLine) {
      try {
        await jobsApi.update(id, updates);
        return;
      } catch (error: any) {
        console.warn('[Offline] API update failed, queuing:', error.message);
      }
    }

    // Queue for background sync
    await syncQueue.add({
      collection: 'jobs',
      docId: id,
      operation: 'update',
      data: updates,
    });
    toast('Saved offline — will sync when connection returns', { icon: '📡' });
  };

  // Admin-only job deletion
  const deleteJob = async (id: string) => {
    setJobs(prev => prev.filter(j => j.id !== id));
    await offlineJobs.delete(id);

    if (navigator.onLine) {
      try {
        await jobsApi.delete(id);
      } catch (error: any) {
        console.error('[Delete] API delete failed:', error.message);
        toast.error('Failed to delete from server');
      }
    }
  };

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/dev/login" element={<DevLogin />} />
      <Route path="/purchase" element={<Purchase />} />
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
      <Route path="/map" element={
        <ProtectedRoute>
          <LiveMap jobs={jobs} electricians={electricians} />
        </ProtectedRoute>
      } />
      <Route path="/parts" element={
        <AdminRoute>
          <PartsCatalog parts={partsCatalog} setParts={setPartsCatalogWithSync} />
        </AdminRoute>
      } />
      <Route path="/stocktake" element={
        <AdminRoute>
          <Stocktake electricians={electricians} partsCatalog={partsCatalog} />
        </AdminRoute>
      } />

      {/* Technician-specific routes */}
      <Route path="/today" element={
        <TechRoute>
          <TechToday jobs={jobs} electricians={electricians} />
        </TechRoute>
      } />
      <Route path="/profile" element={
        <TechRoute>
          <TechProfile />
        </TechRoute>
      } />

      {/* General Protected Routes */}
      <Route path="/" element={
        <ProtectedRoute>
          {user?.role === 'user'
            ? <TechDashboard jobs={jobs} electricians={electricians} />
            : <Dashboard jobs={jobs} electricians={electricians} />}
        </ProtectedRoute>
      } />
      <Route path="/jobs" element={
        <ProtectedRoute jobs={jobs}>
          <JobBoard jobs={jobs} />
        </ProtectedRoute>
      } />
      <Route path="/jobs/new" element={
        <AdminRoute jobs={jobs}>
          <NewJob electricians={electricians} />
        </AdminRoute>
      } />
      <Route path="/jobs/:id" element={
        <ProtectedRoute jobs={jobs}>
          <JobDetail jobs={jobs} updateJob={updateJob} deleteJob={deleteJob} electricians={electricians} />
        </ProtectedRoute>
      } />
      <Route path="/calendar" element={
        <ProtectedRoute jobs={jobs}>
          <Calendar jobs={jobs} electricians={electricians} />
        </ProtectedRoute>
      } />
      <Route path="/field/:id" element={
        <TechRoute>
          <FieldPortal jobs={jobs} updateJob={updateJob} partsCatalog={partsCatalog} />
        </TechRoute>
      } />

      <Route path="/widget" element={
        <ProtectedRoute>
          <DashboardWidget jobs={jobs} electricians={electricians} />
        </ProtectedRoute>
      } />
      <Route path="/properties" element={
        <AdminRoute jobs={jobs}>
          <PropertyHistory jobs={jobs} updateJob={updateJob} electricians={electricians} />
        </AdminRoute>
      } />
      <Route path="/pricing" element={
        <AdminRoute>
          <Pricing />
        </AdminRoute>
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
        <NetworkStatusBar />
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
