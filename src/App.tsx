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
import { NewJob } from './pages/NewJob';


import { Job, Electrician, CatalogPart } from './types';
import { db } from './services/firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, setDoc, addDoc } from 'firebase/firestore';
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

  // Real-time Firestore sync — also persists to IndexedDB
  useEffect(() => {
    if (!user || !db) return;
    const unsubscribe = onSnapshot(
      collection(db, 'jobs'),
      (snapshot) => {
        const jobsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Job));
        setJobs(jobsData);
        offlineJobs.putAll(jobsData); // cache locally
      },
      (error) => {
        console.warn('[Offline] Firestore jobs listener error, using cached data:', error.message);
      }
    );
    return unsubscribe;
  }, [user]);

  // Firestore sync — parts catalog
  useEffect(() => {
    if (!user || !db) return;
    const unsubscribe = onSnapshot(
      collection(db, 'partsCatalog'),
      (snapshot) => {
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CatalogPart));
        setPartsCatalog(data);
      },
      (error) => {
        console.warn('[Offline] Firestore partsCatalog listener error:', error.message);
      }
    );
    return unsubscribe;
  }, [user]);

  // Persist parts catalog changes to Firestore
  const setPartsCatalogWithSync = ((updater: React.SetStateAction<CatalogPart[]>) => {
    setPartsCatalog(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      // Sync to Firestore
      if (db) {
        // Find added/updated
        for (const part of next) {
          const old = prev.find(p => p.id === part.id);
          if (!old || JSON.stringify(old) !== JSON.stringify(part)) {
            setDoc(doc(db, 'partsCatalog', part.id), part).catch(() => {});
          }
        }
        // Find deleted
        for (const old of prev) {
          if (!next.find(p => p.id === old.id)) {
            deleteDoc(doc(db, 'partsCatalog', old.id)).catch(() => {});
          }
        }
      }
      return next;
    });
  }) as React.Dispatch<React.SetStateAction<CatalogPart[]>>;

  useEffect(() => {
    if (!user || !db) return;
    const unsubscribe = onSnapshot(
      collection(db, 'electricians'),
      (snapshot) => {
        const electriciansData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Electrician));
        setElectricians(electriciansData);
        offlineElectricians.putAll(electriciansData); // cache locally
      },
      (error) => {
        console.warn('[Offline] Firestore electricians listener error, using cached data:', error.message);
      }
    );
    return unsubscribe;
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

    // Try Firestore, queue if offline
    if (navigator.onLine && db) {
      try {
        const jobRef = doc(db, 'jobs', id);
        await updateDoc(jobRef, updates);
        return;
      } catch (error: any) {
        console.warn('[Offline] Firestore update failed, queuing:', error.message);
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
    // Remove from local state
    setJobs(prev => prev.filter(j => j.id !== id));
    await offlineJobs.delete(id);

    // Delete from Firestore
    if (navigator.onLine && db) {
      try {
        await deleteDoc(doc(db, 'jobs', id));
      } catch (error: any) {
        console.error('[Delete] Firestore delete failed:', error.message);
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
        <AdminRoute>
          <LiveMap jobs={jobs} electricians={electricians} />
        </AdminRoute>
      } />
      <Route path="/parts" element={
        <AdminRoute>
          <PartsCatalog parts={partsCatalog} setParts={setPartsCatalogWithSync} />
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
        <ProtectedRoute>
          <JobBoard jobs={jobs} />
        </ProtectedRoute>
      } />
      <Route path="/jobs/new" element={
        <AdminRoute>
          <NewJob electricians={electricians} />
        </AdminRoute>
      } />
      <Route path="/jobs/:id" element={
        <ProtectedRoute>
          <JobDetail jobs={jobs} updateJob={updateJob} deleteJob={deleteJob} electricians={electricians} />
        </ProtectedRoute>
      } />
      <Route path="/calendar" element={
        <ProtectedRoute>
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
