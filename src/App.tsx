import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ClerkProvider } from '@clerk/react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
const Login          = React.lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const DevLogin       = React.lazy(() => import('./pages/DevLogin').then(m => ({ default: m.DevLogin })));
const Dashboard      = React.lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const JobBoard       = React.lazy(() => import('./pages/JobBoard').then(m => ({ default: m.JobBoard })));
const JobDetail      = React.lazy(() => import('./pages/JobDetail').then(m => ({ default: m.JobDetail })));
const Integrations   = React.lazy(() => import('./pages/Integrations').then(m => ({ default: m.Integrations })));
const Calendar       = React.lazy(() => import('./pages/Calendar').then(m => ({ default: m.Calendar })));
const Team           = React.lazy(() => import('./pages/Team').then(m => ({ default: m.Team })));
const FieldPortal    = React.lazy(() => import('./pages/FieldPortal').then(m => ({ default: m.FieldPortal })));
const SuperAdmin     = React.lazy(() => import('./pages/SuperAdmin').then(m => ({ default: m.SuperAdmin })));
const Billing        = React.lazy(() => import('./pages/Billing').then(m => ({ default: m.Billing })));
const PromoFlyer     = React.lazy(() => import('./pages/PromoFlyer').then(m => ({ default: m.PromoFlyer })));
const Purchase       = React.lazy(() => import('./pages/Purchase').then(m => ({ default: m.Purchase })));
const DashboardWidget = React.lazy(() => import('./pages/DashboardWidget').then(m => ({ default: m.DashboardWidget })));
const LiveMap        = React.lazy(() => import('./pages/LiveMap').then(m => ({ default: m.LiveMap })));
const TechDashboard  = React.lazy(() => import('./pages/TechDashboard').then(m => ({ default: m.TechDashboard })));
const TechToday      = React.lazy(() => import('./pages/TechToday').then(m => ({ default: m.TechToday })));
const TechProfile    = React.lazy(() => import('./pages/TechProfile').then(m => ({ default: m.TechProfile })));
const PartsCatalog   = React.lazy(() => import('./pages/PartsCatalog').then(m => ({ default: m.PartsCatalog })));
const Stocktake      = React.lazy(() => import('./pages/Stocktake').then(m => ({ default: m.Stocktake })));
const NewJob         = React.lazy(() => import('./pages/NewJob').then(m => ({ default: m.NewJob })));
const PropertyHistory = React.lazy(() => import('./pages/PropertyHistory').then(m => ({ default: m.PropertyHistory })));
const Pricing        = React.lazy(() => import('./pages/Pricing').then(m => ({ default: m.Pricing })));


import { Job, Electrician, CatalogPart } from './types';
import { jobsApi, electriciansApi, partsApi } from './services/api';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';

import { ProtectedRoute, AdminRoute, DevRoute, TechRoute } from './components/ProtectedRoute';

import { offlineJobs, offlineElectricians, syncQueue } from './services/offlineDb';
import { startSyncCron, stopSyncCron } from './services/syncService';
import { useSyncStatus } from './hooks/useOfflineSync';
import { NetworkStatusBar } from './components/NetworkStatusBar';

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

  // ── Polling: jobs (30s interval) ─────────────────────────────────────────
  const knownJobIds = React.useRef<Set<string>>(new Set());
  const isFirstLoad = React.useRef(true);

  const fetchJobs = React.useCallback(async () => {
    if (!user) return;
    try {
      const jobsData = (await jobsApi.list()) as Job[];
      setJobs(jobsData);
      offlineJobs.putAll(jobsData);

      if (isFirstLoad.current) {
        jobsData.forEach(j => knownJobIds.current.add(j.id));
        isFirstLoad.current = false;
        return;
      }

      if (user.role === 'admin' || user.role === 'dev') {
        for (const job of jobsData) {
          if (knownJobIds.current.has(job.id)) continue;
          knownJobIds.current.add(job.id);
          const isUrgent = /urgent|emergency/i.test(`${job.urgency} ${job.title}`);
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
                  <div className="flex items-center pr-4"><span className="text-red-200 text-xs font-bold">View →</span></div>
                </div>
              ),
              { duration: 12000, position: 'top-right' }
            );
            if (Notification.permission === 'granted') {
              new Notification('🚨 Urgent Job Received', { body: `${job.title} — ${job.propertyAddress}`, icon: '/favicon.ico' });
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
                  <div className="flex items-center pr-4"><span className="text-slate-400 text-xs font-bold">View →</span></div>
                </div>
              ),
              { duration: 6000, position: 'top-right' }
            );
          }
        }
      }
    } catch (err) {
      console.warn('[Poll] Jobs fetch failed, using cached data');
    }
  }, [user]);

  useEffect(() => {
    fetchJobs();
    const id = setInterval(fetchJobs, 30_000);
    return () => clearInterval(id);
  }, [fetchJobs]);

  // ── Polling: parts catalog (60s interval) ────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const fetchParts = async () => {
      try { setPartsCatalog((await partsApi.list()) as CatalogPart[]); } catch {}
    };
    fetchParts();
    const id = setInterval(fetchParts, 60_000);
    return () => clearInterval(id);
  }, [user]);

  // Persist parts catalog changes via REST API
  const setPartsCatalogWithSync = ((updater: React.SetStateAction<CatalogPart[]>) => {
    setPartsCatalog(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      for (const part of next) {
        const old = prev.find(p => p.id === part.id);
        if (!old || JSON.stringify(old) !== JSON.stringify(part)) partsApi.upsert(part).catch(() => {});
      }
      for (const old of prev) {
        if (!next.find(p => p.id === old.id)) partsApi.delete(old.id).catch(() => {});
      }
      return next;
    });
  }) as React.Dispatch<React.SetStateAction<CatalogPart[]>>;

  // ── Polling: electricians (60s interval) ─────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const fetchElectricians = async () => {
      try {
        const data = (await electriciansApi.list()) as Electrician[];
        setElectricians(data);
        offlineElectricians.putAll(data);
      } catch { console.warn('[Poll] Electricians fetch failed, using cached data'); }
    };
    fetchElectricians();
    const id = setInterval(fetchElectricians, 60_000);
    return () => clearInterval(id);
  }, [user]);

  // Offline-aware job update
  const updateJob = async (id: string, updates: Partial<Job>) => {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, ...updates } : j));
    const allJobs = await offlineJobs.getAll();
    const existing = allJobs.find((j: any) => j.id === id);
    if (existing) await offlineJobs.put({ ...existing, ...updates });

    if (navigator.onLine) {
      try { await jobsApi.update(id, updates); return; }
      catch (error: any) { console.warn('[Offline] API update failed, queuing:', error.message); }
    }

    await syncQueue.add({ collection: 'jobs', docId: id, operation: 'update', data: updates });
    toast('Saved offline — will sync when connection returns', { icon: '📡' });
  };

  // Admin-only job deletion
  const deleteJob = async (id: string) => {
    setJobs(prev => prev.filter(j => j.id !== id));
    await offlineJobs.delete(id);
    if (navigator.onLine) {
      try { await jobsApi.delete(id); }
      catch (error: any) { console.error('[Delete] API delete failed:', error.message); toast.error('Failed to delete from server'); }
    }
  };

  return (
    <React.Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
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

      {/* Technician-specific routes (user role gets TechLayout) */}
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

      {/* General Protected Routes — user role auto-gets TechLayout */}
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
    </React.Suspense>
  );
}
function App() {
  const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  return (
    <ClerkProvider publishableKey={clerkKey || ''}>
      <Router>
        <AuthProvider>
          <AppContentWrapper />
          <NetworkStatusBar />
          <Toaster position="bottom-right" />
        </AuthProvider>
      </Router>
    </ClerkProvider>
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
