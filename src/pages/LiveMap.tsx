import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from 'react-router-dom';
import { techLocationsApi } from '../services/api';
import { Job, Electrician } from '../types';
import { MapPin, Users, Briefcase, Clock, Zap, RefreshCw, Navigation, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { cn } from '../utils';

// ── Fix Leaflet default icon paths (broken in Vite) ──────────────
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface TechLocation {
  uid: string;
  technicianName?: string;
  lat: number;
  lng: number;
  accuracy: number;
  updatedAt: string;
}

interface LiveMapProps {
  jobs: Job[];
  electricians: Electrician[];
}

// ── Custom icon creators ─────────────────────────────────────────
const createTechIcon = (initials: string) =>
  L.divIcon({
    html: `
      <div style="position:relative;width:44px;height:44px">
        <div style="
          background:#10b981;color:white;width:44px;height:44px;border-radius:50%;
          border:3px solid white;box-shadow:0 3px 12px rgba(0,0,0,0.35);
          display:flex;align-items:center;justify-content:center;
          font-weight:800;font-size:14px;font-family:system-ui,sans-serif;
          letter-spacing:-0.5px;
        ">${initials}</div>
        <div style="
          position:absolute;bottom:0;right:0;width:14px;height:14px;
          background:#4ade80;border-radius:50%;border:2px solid white;
          animation:pulse 2s infinite;
        "></div>
      </div>`,
    className: '',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -24],
  });

const createJobIcon = (color: string) =>
  L.divIcon({
    html: `<div style="
      background:${color};width:18px;height:18px;border-radius:50%;
      border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);
    "></div>`,
    className: '',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -12],
  });

// ── Fit map to markers helper ────────────────────────────────────
function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length === 0) return;
    if (positions.length === 1) {
      map.setView(positions[0], 14);
    } else {
      map.fitBounds(L.latLngBounds(positions), { padding: [60, 60], maxZoom: 14 });
    }
  }, [positions.length]); // eslint-disable-line
  return null;
}

const STATUS_COLORS: Record<string, string> = {
  INTAKE: '#3b82f6',
  SCHEDULING: '#8b5cf6',
  DISPATCHED: '#f59e0b',
  EXECUTION: '#ef4444',
  REVIEW: '#10b981',
  CLOSED: '#64748b',
};

const GEOCODE_CACHE: Record<string, [number, number]> = {};
const BRISBANE: [number, number] = [-27.4698, 153.0251];

async function geocodeAddress(address: string): Promise<[number, number] | null> {
  if (GEOCODE_CACHE[address]) return GEOCODE_CACHE[address];
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address + ', Australia')}&format=json&limit=1`;
    const res = await fetch(url, { headers: { 'User-Agent': 'WirezRUs/1.0' } });
    const data = await res.json();
    if (data?.[0]) {
      const coords: [number, number] = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      GEOCODE_CACHE[address] = coords;
      return coords;
    }
  } catch {}
  return null;
}

function timeSince(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60000) return 'just now';
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ago`;
  return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m ago`;
}

function clockedOnDuration(job: Job): string | null {
  const log = job.timeLog;
  if (!log || log.length === 0) return null;
  const lastOn = [...log].reverse().find(e => e.type === 'clock_on' || e.type === 'break_end');
  if (!lastOn) return null;
  const ms = Date.now() - new Date(lastOn.timestamp).getTime();
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m on site` : `${m}m on site`;
}

// ─── Main Component ──────────────────────────────────────────────
export function LiveMap({ jobs, electricians }: LiveMapProps) {
  const navigate = useNavigate();
  const [techLocations, setTechLocations] = useState<TechLocation[]>([]);
  const [jobCoords, setJobCoords] = useState<Record<string, [number, number]>>({});
  const [showJobs, setShowJobs] = useState(true);
  const [showTechs, setShowTechs] = useState(true);
  const [showSidebar, setShowSidebar] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [geocoding, setGeocoding] = useState(false);
  const geocodeQueueRef = useRef<string[]>([]);

  // ── Poll tech locations every 10 seconds ──────────────────
  useEffect(() => {
    let active = true;
    const fetch = async () => {
      try {
        const locs = await techLocationsApi.list();
        if (active) {
          setTechLocations(Array.isArray(locs) ? locs : []);
          setLastRefresh(new Date());
        }
      } catch {}
    };
    fetch();
    const iv = setInterval(fetch, 10000);
    return () => { active = false; clearInterval(iv); };
  }, []);

  // ── Geocode active job addresses ──────────────────────────
  const activeJobs = useMemo(() =>
    jobs.filter(j => j.status !== 'CLOSED' && j.propertyAddress && j.propertyAddress.length > 5 && j.propertyAddress !== 'See email body'),
    [jobs]
  );

  useEffect(() => {
    let cancelled = false;
    const toGeocode = activeJobs
      .filter(j => !jobCoords[j.id] && !GEOCODE_CACHE[j.propertyAddress])
      .slice(0, 20); // max 20 at a time

    if (toGeocode.length === 0) {
      // Use cached
      const cached: Record<string, [number, number]> = {};
      for (const j of activeJobs) {
        if (GEOCODE_CACHE[j.propertyAddress]) cached[j.id] = GEOCODE_CACHE[j.propertyAddress];
      }
      if (Object.keys(cached).length) setJobCoords(prev => ({ ...prev, ...cached }));
      return;
    }

    setGeocoding(true);
    (async () => {
      const results: Record<string, [number, number]> = {};
      for (const job of toGeocode) {
        if (cancelled) break;
        const coords = await geocodeAddress(job.propertyAddress);
        if (coords) results[job.id] = coords;
        await new Promise(r => setTimeout(r, 1100)); // Nominatim rate limit: 1 req/s
      }
      if (!cancelled) {
        setJobCoords(prev => ({ ...prev, ...results }));
        setGeocoding(false);
      }
    })();
    return () => { cancelled = true; setGeocoding(false); };
  }, [activeJobs.map(j => j.id).join(',')]); // eslint-disable-line

  // ── Match tech by uid or name ─────────────────────────────
  const getTechName = useCallback((uid: string, fallback?: string) => {
    const elec = electricians.find(e => e.id === uid || e.email === uid);
    return elec?.name || fallback || 'Technician';
  }, [electricians]);

  const getTechInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const getTechActiveJob = useCallback((uid: string) =>
    jobs.find(j =>
      (j.assignedElectricianId === uid) &&
      (j.status === 'DISPATCHED' || j.status === 'EXECUTION')
    ),
    [jobs]
  );

  // ── All map positions for FitBounds ──────────────────────
  const allPositions: [number, number][] = useMemo(() => {
    const pts: [number, number][] = [];
    if (showTechs) techLocations.forEach(t => pts.push([t.lat, t.lng]));
    if (showJobs) Object.values(jobCoords).forEach(c => pts.push(c));
    return pts;
  }, [techLocations, jobCoords, showTechs, showJobs]);

  const techCount = techLocations.length;
  const jobCount = Object.keys(jobCoords).length;
  const staleThreshold = 5 * 60 * 1000; // 5 min

  const formatTime = (d: Date) =>
    d.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] flex flex-col">

      {/* ── Header bar ── */}
      <div className="bg-white border-b border-slate-200 px-3 sm:px-5 py-2 flex items-center gap-2 shrink-0">
        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
          <MapPin className="w-4 h-4 text-emerald-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold text-slate-900 leading-tight">Live Map</h1>
          <p className="text-[10px] text-slate-400">
            {techCount} tech{techCount !== 1 ? 's' : ''} · {jobCount} job{jobCount !== 1 ? 's' : ''} · {formatTime(lastRefresh)}
            {geocoding && <span className="ml-1 text-amber-500">· Geocoding…</span>}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowTechs(p => !p)}
            className={cn(
              'px-2.5 py-1 rounded-lg text-[11px] font-semibold border flex items-center gap-1 transition-colors',
              showTechs ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-400'
            )}
          >
            <Users className="w-3 h-3" /> Techs
          </button>
          <button
            onClick={() => setShowJobs(p => !p)}
            className={cn(
              'px-2.5 py-1 rounded-lg text-[11px] font-semibold border flex items-center gap-1 transition-colors',
              showJobs ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-400'
            )}
          >
            <Briefcase className="w-3 h-3" /> Jobs
          </button>
          <button
            onClick={() => setShowSidebar(p => !p)}
            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-slate-200 bg-slate-50 text-slate-500 flex items-center gap-1"
          >
            {showSidebar ? <X className="w-3 h-3" /> : <Navigation className="w-3 h-3" />}
            {showSidebar ? 'Hide' : 'Panel'}
          </button>
        </div>
      </div>

      {/* ── Map + Sidebar ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Map */}
        <div className="flex-1 relative">
          <MapContainer
            center={BRISBANE}
            zoom={11}
            style={{ width: '100%', height: '100%' }}
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {allPositions.length > 0 && <FitBounds positions={allPositions} />}

            {/* ── Technician markers ── */}
            {showTechs && techLocations.map(tech => {
              const name = getTechName(tech.uid, tech.technicianName);
              const initials = getTechInitials(name);
              const activeJob = getTechActiveJob(tech.uid);
              const stale = Date.now() - new Date(tech.updatedAt).getTime() > staleThreshold;
              const duration = activeJob ? clockedOnDuration(activeJob) : null;

              return (
                <Marker
                  key={`tech-${tech.uid}`}
                  position={[tech.lat, tech.lng]}
                  icon={createTechIcon(initials)}
                >
                  <Popup maxWidth={260}>
                    <div className="font-sans text-slate-800" style={{ minWidth: 220 }}>
                      <div className="flex items-center gap-2 mb-2">
                        <div style={{
                          background: '#10b981', color: 'white', width: 36, height: 36,
                          borderRadius: '50%', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', fontWeight: 800, fontSize: 13,
                        }}>{initials}</div>
                        <div>
                          <p style={{ fontWeight: 700, margin: 0 }}>{name}</p>
                          <p style={{ fontSize: 11, color: stale ? '#ef4444' : '#10b981', margin: 0 }}>
                            {stale ? '⚠ Location outdated' : '● Live'}
                          </p>
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.7 }}>
                        <div>🕐 Last seen: {timeSince(tech.updatedAt)}</div>
                        <div>📍 Accuracy: ±{tech.accuracy}m</div>
                        {activeJob && (
                          <>
                            <div style={{ marginTop: 6, padding: '6px 8px', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                              <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: 2 }}>
                                {activeJob.title}
                              </div>
                              <div>{activeJob.propertyAddress}</div>
                              {duration && <div style={{ color: '#10b981', fontWeight: 600 }}>⏱ {duration}</div>}
                              <div style={{ marginTop: 4 }}>
                                <span style={{
                                  background: STATUS_COLORS[activeJob.status] + '20',
                                  color: STATUS_COLORS[activeJob.status],
                                  padding: '1px 6px', borderRadius: 4, fontSize: 11, fontWeight: 700,
                                }}>{activeJob.status}</span>
                              </div>
                            </div>
                            <button
                              onClick={() => navigate(`/jobs/${activeJob.id}`)}
                              style={{
                                marginTop: 8, width: '100%', background: '#1a1a2e', color: 'white',
                                border: 'none', borderRadius: 6, padding: '6px 0', fontWeight: 600,
                                fontSize: 12, cursor: 'pointer',
                              }}
                            >
                              Open Job →
                            </button>
                          </>
                        )}
                        {!activeJob && (
                          <div style={{ marginTop: 6, color: '#94a3b8', fontStyle: 'italic' }}>No active job assigned</div>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* ── Job markers ── */}
            {showJobs && activeJobs.map(job => {
              const coords = jobCoords[job.id];
              if (!coords) return null;
              const color = STATUS_COLORS[job.status] || '#64748b';
              const techName = job.assignedElectricianId
                ? getTechName(job.assignedElectricianId)
                : 'Unassigned';

              return (
                <Marker
                  key={`job-${job.id}`}
                  position={coords}
                  icon={createJobIcon(color)}
                >
                  <Popup maxWidth={240}>
                    <div className="font-sans" style={{ minWidth: 200 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{job.title}</div>
                      <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.7 }}>
                        <div>📍 {job.propertyAddress}</div>
                        <div>👷 {techName}</div>
                        <div>🏠 {job.tenantName || '—'}</div>
                        {job.tenantPhone && <div>📞 <a href={`tel:${job.tenantPhone}`}>{job.tenantPhone}</a></div>}
                      </div>
                      <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{
                          background: color + '20', color, padding: '2px 8px',
                          borderRadius: 4, fontSize: 11, fontWeight: 700,
                        }}>{job.status}</span>
                      </div>
                      <button
                        onClick={() => navigate(`/jobs/${job.id}`)}
                        style={{
                          marginTop: 8, width: '100%', background: '#1a1a2e', color: 'white',
                          border: 'none', borderRadius: 6, padding: '6px 0', fontWeight: 600,
                          fontSize: 12, cursor: 'pointer',
                        }}
                      >
                        Open Job →
                      </button>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>

          {/* No techs online banner */}
          {showTechs && techLocations.length === 0 && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-2 text-xs font-semibold shadow-lg flex items-center gap-2 pointer-events-none">
              <AlertCircle className="w-4 h-4" />
              No technicians sharing location — techs must open the app to broadcast GPS
            </div>
          )}

          {/* Legend */}
          <div className="absolute bottom-5 left-3 z-[1000] bg-white/95 backdrop-blur rounded-xl border border-slate-200 shadow-lg p-3">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Legend</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-slate-700">
                <div className="w-5 h-5 bg-emerald-500 rounded-full border-2 border-white shadow flex items-center justify-center">
                  <span className="text-white text-[8px] font-black">T</span>
                </div>
                Technician (live)
              </div>
              {Object.entries(STATUS_COLORS).filter(([s]) => s !== 'CLOSED').map(([s, c]) => (
                <div key={s} className="flex items-center gap-2 text-[11px] text-slate-600">
                  <div className="w-3.5 h-3.5 rounded-full shrink-0" style={{ background: c }} />
                  {s.charAt(0) + s.slice(1).toLowerCase().replace('_', ' ')}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Sidebar ── */}
        {showSidebar && (
          <div className="w-72 shrink-0 bg-white border-l border-slate-200 flex flex-col overflow-hidden">
            <div className="p-3 border-b border-slate-100">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Field Team</p>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
              {/* Techs section */}
              {techLocations.length > 0 && (
                <>
                  <div className="px-3 py-1.5 bg-slate-50">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <Users className="w-3 h-3" /> Active Techs ({techLocations.length})
                    </p>
                  </div>
                  {techLocations.map(tech => {
                    const name = getTechName(tech.uid, tech.technicianName);
                    const activeJob = getTechActiveJob(tech.uid);
                    const stale = Date.now() - new Date(tech.updatedAt).getTime() > staleThreshold;
                    const duration = activeJob ? clockedOnDuration(activeJob) : null;
                    return (
                      <div key={tech.uid} className="px-3 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className={cn(
                            'w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0',
                            stale ? 'bg-slate-400' : 'bg-emerald-500'
                          )}>
                            {getTechInitials(name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-800 truncate">{name}</p>
                            <p className={cn('text-[10px] font-semibold', stale ? 'text-slate-400' : 'text-emerald-600')}>
                              {stale ? '⚠ ' : '● '}{timeSince(tech.updatedAt)}
                            </p>
                          </div>
                        </div>
                        {activeJob && (
                          <div
                            className="mt-2 ml-11 bg-slate-50 rounded-lg p-2 border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors"
                            onClick={() => navigate(`/jobs/${activeJob.id}`)}
                          >
                            <p className="text-[11px] font-semibold text-slate-700 truncate">{activeJob.title}</p>
                            <p className="text-[10px] text-slate-500 truncate">{activeJob.propertyAddress}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {duration && (
                                <span className="text-[10px] text-emerald-600 font-bold">⏱ {duration}</span>
                              )}
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{
                                background: STATUS_COLORS[activeJob.status] + '20',
                                color: STATUS_COLORS[activeJob.status],
                              }}>{activeJob.status}</span>
                            </div>
                          </div>
                        )}
                        {!activeJob && (
                          <p className="text-[10px] text-slate-400 ml-11 mt-1">No active job</p>
                        )}
                      </div>
                    );
                  })}
                </>
              )}

              {techLocations.length === 0 && (
                <div className="p-4 text-center">
                  <Users className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-xs text-slate-400 font-semibold">No techs online</p>
                  <p className="text-[10px] text-slate-300 mt-1">Techs appear here when the field app is open</p>
                </div>
              )}

              {/* Jobs section */}
              <div className="px-3 py-1.5 bg-slate-50">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <Briefcase className="w-3 h-3" /> Active Jobs ({activeJobs.length})
                </p>
              </div>
              {activeJobs.slice(0, 30).map(job => (
                <div
                  key={job.id}
                  className="px-3 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => navigate(`/jobs/${job.id}`)}
                >
                  <div className="flex items-start gap-2">
                    <div className="w-2.5 h-2.5 rounded-full mt-1 shrink-0" style={{ background: STATUS_COLORS[job.status] }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{job.title}</p>
                      <p className="text-[10px] text-slate-500 truncate">{job.propertyAddress}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{
                          background: STATUS_COLORS[job.status] + '20',
                          color: STATUS_COLORS[job.status],
                        }}>{job.status}</span>
                        {job.assignedElectricianId && (
                          <span className="text-[9px] text-slate-400 truncate">
                            {getTechName(job.assignedElectricianId)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {activeJobs.length === 0 && (
                <div className="p-4 text-center">
                  <p className="text-xs text-slate-400">No active jobs</p>
                </div>
              )}
            </div>

            {/* Refresh footer */}
            <div className="p-2.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <p className="text-[10px] text-slate-400">Auto-refresh every 10s</p>
              <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-semibold">
                <RefreshCw className="w-3 h-3 animate-spin" style={{ animationDuration: '3s' }} />
                Live
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
