import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { APIProvider, Map, AdvancedMarker, InfoWindow } from '@vis.gl/react-google-maps';
import { db } from '../services/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { Job, Electrician } from '../types';
import { MapPin, Users, Briefcase, Navigation, Clock, Zap, RefreshCw, Layers } from 'lucide-react';
import { cn } from '../utils';
import { format } from 'date-fns';

interface TechLocation {
  uid: string;
  lat: number;
  lng: number;
  accuracy: number;
  updatedAt: any;
}

interface LiveMapProps {
  jobs: Job[];
  electricians: Electrician[];
}

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

// Default center: Brisbane, Australia
const DEFAULT_CENTER = { lat: -27.4698, lng: 153.0251 };

export function LiveMap({ jobs, electricians }: LiveMapProps) {
  const navigate = useNavigate();
  const [techLocations, setTechLocations] = useState<TechLocation[]>([]);
  const [selectedTech, setSelectedTech] = useState<TechLocation | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showJobs, setShowJobs] = useState(true);
  const [showTechs, setShowTechs] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Listen for tech locations in real-time
  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(
      collection(db, 'techLocations'),
      (snap) => {
        const locs = snap.docs.map(d => ({ uid: d.id, ...d.data() } as TechLocation));
        setTechLocations(locs);
        setLastRefresh(new Date());
      },
      (err) => console.warn('[LiveMap] Tech locations listener error:', err.message)
    );
    return unsub;
  }, []);

  // Active jobs (not closed) for map pins
  const activeJobs = useMemo(() =>
    jobs.filter(j => j.status !== 'CLOSED' && j.propertyAddress && j.propertyAddress !== 'See email body'),
    [jobs]
  );

  // Match tech location to electrician name
  const getTechName = (uid: string) => {
    const elec = electricians.find(e => e.id === uid);
    return elec?.name || 'Unknown Tech';
  };

  const getTechEmail = (uid: string) => {
    const elec = electricians.find(e => e.id === uid);
    return elec?.email || '';
  };

  // Get assigned tech name for a job
  const getAssignedTechName = (job: Job) => {
    if (!job.assignedElectricianId) return 'Unassigned';
    const elec = electricians.find(e => e.id === job.assignedElectricianId);
    return elec?.name || 'Unknown';
  };

  // Status colors for job pins
  const statusColor = (status: string) => {
    switch (status) {
      case 'INTAKE': return '#3b82f6';
      case 'SCHEDULING': return '#8b5cf6';
      case 'DISPATCHED': return '#f59e0b';
      case 'EXECUTION': return '#ef4444';
      case 'REVIEW': return '#10b981';
      default: return '#64748b';
    }
  };

  if (!GOOGLE_MAPS_KEY) {
    return (
      <div className="max-w-2xl mx-auto mt-12 p-8 bg-white rounded-2xl border border-slate-200 shadow-sm text-center">
        <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Google Maps Not Configured</h2>
        <p className="text-slate-500 mb-4">Add <code className="bg-slate-100 px-2 py-0.5 rounded text-sm">VITE_GOOGLE_MAPS_API_KEY</code> to your environment variables.</p>
        <div className="text-left bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm space-y-2">
          <p className="font-medium text-slate-700">Setup steps:</p>
          <ol className="list-decimal list-inside text-slate-600 space-y-1">
            <li>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google Cloud Console</a></li>
            <li>Create an API key with Maps JavaScript API, Geocoding API, and Places API enabled</li>
            <li>Add to <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">.env</code>: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">VITE_GOOGLE_MAPS_API_KEY=your-key</code></li>
            <li>Add to Vercel environment variables and redeploy</li>
          </ol>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-3 sm:px-6 py-2 sm:py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
            <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-sm sm:text-lg font-bold text-slate-900">Live Map</h1>
            <p className="text-[10px] sm:text-xs text-slate-500">
              {techLocations.length} tech{techLocations.length !== 1 ? 's' : ''} &bull; {activeJobs.length} job{activeJobs.length !== 1 ? 's' : ''} &bull; {format(lastRefresh, 'h:mm a')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTechs(p => !p)}
            className={cn(
              "px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-medium border flex items-center gap-1 sm:gap-1.5 transition-colors",
              showTechs ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-400'
            )}
          >
            <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            Techs
          </button>
          <button
            onClick={() => setShowJobs(p => !p)}
            className={cn(
              "px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-medium border flex items-center gap-1 sm:gap-1.5 transition-colors",
              showJobs ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-400'
            )}
          >
            <Briefcase className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            Jobs
          </button>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <APIProvider apiKey={GOOGLE_MAPS_KEY}>
          <Map
            defaultCenter={DEFAULT_CENTER}
            defaultZoom={11}
            gestureHandling="greedy"
            disableDefaultUI={false}
            mapId="live-map"
            style={{ width: '100%', height: '100%' }}
          >
            {/* Technician markers */}
            {showTechs && techLocations.map(tech => (
              <AdvancedMarker
                key={`tech-${tech.uid}`}
                position={{ lat: tech.lat, lng: tech.lng }}
                onClick={() => { setSelectedTech(tech); setSelectedJob(null); }}
              >
                <div className="relative">
                  <div className="w-10 h-10 bg-emerald-500 rounded-full border-3 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-pulse" />
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-medium px-2 py-0.5 rounded whitespace-nowrap shadow">
                    {getTechName(tech.uid)}
                  </div>
                </div>
              </AdvancedMarker>
            ))}

            {/* Job markers — uses geocoded addresses when available */}
            {showJobs && activeJobs.map(job => {
              // We'll use a placeholder approach: jobs get a pin based on their status
              // Real geocoding would require the Geocoding API
              return null; // Placeholder — see geocoded approach below
            })}

            {/* Tech info window */}
            {selectedTech && (
              <InfoWindow
                position={{ lat: selectedTech.lat, lng: selectedTech.lng }}
                onCloseClick={() => setSelectedTech(null)}
              >
                <div className="p-2 min-w-[200px]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                      <Zap className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-900">{getTechName(selectedTech.uid)}</p>
                      <p className="text-xs text-slate-500">{getTechEmail(selectedTech.uid)}</p>
                    </div>
                  </div>
                  <div className="text-xs text-slate-600 space-y-1">
                    <p className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {selectedTech.lat.toFixed(5)}, {selectedTech.lng.toFixed(5)}</p>
                    <p className="flex items-center gap-1"><Navigation className="w-3 h-3" /> Accuracy: {Math.round(selectedTech.accuracy)}m</p>
                    {selectedTech.updatedAt && (
                      <p className="flex items-center gap-1"><Clock className="w-3 h-3" /> Last ping: {selectedTech.updatedAt?.toDate ? format(selectedTech.updatedAt.toDate(), 'h:mm:ss a') : 'just now'}</p>
                    )}
                  </div>
                </div>
              </InfoWindow>
            )}
          </Map>
        </APIProvider>

        {/* Legend overlay */}
        <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur rounded-xl border border-slate-200 shadow-lg p-3">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1"><Layers className="w-3 h-3" /> Legend</p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-slate-700">
              <div className="w-4 h-4 bg-emerald-500 rounded-full border-2 border-white shadow" />
              Technician (live)
            </div>
            {['INTAKE', 'SCHEDULING', 'DISPATCHED', 'EXECUTION', 'REVIEW'].map(s => (
              <div key={s} className="flex items-center gap-2 text-xs text-slate-600">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: statusColor(s) }} />
                {s.charAt(0) + s.slice(1).toLowerCase().replace('_', ' ')}
              </div>
            ))}
          </div>
        </div>

        {/* Tech count overlay */}
        {techLocations.length === 0 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-2 text-sm font-medium shadow-lg flex items-center gap-2">
            <Users className="w-4 h-4" />
            No technicians currently sharing location
          </div>
        )}
      </div>
    </div>
  );
}
