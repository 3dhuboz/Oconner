import { useEffect, useState } from 'react';
import { api } from '@butcher/shared';
import type { DeliveryRun, Stop } from '@butcher/shared';
import { Plus, X, Truck, User, Pencil, Trash2, ChevronRight, MapPin, CheckCircle, Clock, AlertTriangle, MoreHorizontal, Package, Route } from 'lucide-react';
import { toast } from '../lib/toast';

const RUN_COLORS = [
  '#1B3A2E', '#2563eb', '#dc2626', '#d97706', '#7c3aed', '#db2777', '#0891b2', '#059669',
];

interface DriverUser { id: string; name?: string; email: string; }

const STOP_STATUS_CFG: Record<string, { label: string; cls: string }> = {
  pending:   { label: 'Pending',   cls: 'bg-gray-100 text-gray-600' },
  en_route:  { label: 'En Route',  cls: 'bg-blue-100 text-blue-700' },
  arrived:   { label: 'Arrived',   cls: 'bg-yellow-100 text-yellow-700' },
  delivered: { label: 'Delivered', cls: 'bg-green-100 text-green-700' },
  failed:    { label: 'Failed',    cls: 'bg-red-100 text-red-700' },
  skipped:   { label: 'Skipped',   cls: 'bg-gray-100 text-gray-400' },
};

const EMPTY_RUN_FORM = { name: '', zone: '', color: '#1B3A2E', driverUid: '', notes: '', postcodes: '' };

export default function DeliveryRunsTab({ dayId }: { dayId: string }) {
  const [runs, setRuns] = useState<DeliveryRun[]>([]);
  const [allStops, setAllStops] = useState<Stop[]>([]);
  const [unassigned, setUnassigned] = useState<Stop[]>([]);
  const [drivers, setDrivers] = useState<DriverUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRun, setEditingRun] = useState<DeliveryRun | null>(null);
  const [form, setForm] = useState(EMPTY_RUN_FORM);
  const [saving, setSaving] = useState(false);
  const [expandedRun, setExpandedRun] = useState<string | null>(null);
  const [assigningStop, setAssigningStop] = useState<string | null>(null);
  const [autoAssigning, setAutoAssigning] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [optimising, setOptimising] = useState(false);

  const load = async () => {
    try {
      const [runsData, stopsData, driversData] = await Promise.all([
        api.deliveryRuns.list(dayId) as Promise<DeliveryRun[]>,
        api.stops.list(dayId) as Promise<Stop[]>,
        api.users.drivers() as Promise<DriverUser[]>,
      ]);
      setRuns(runsData);
      setAllStops(stopsData);
      setUnassigned(stopsData.filter((s) => !s.runId));
      setDrivers(driversData);
    } catch {
      toast('Failed to load runs', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [dayId]);

  const openCreate = () => { setEditingRun(null); setForm(EMPTY_RUN_FORM); setShowForm(true); };
  const openEdit = (run: DeliveryRun) => {
    setEditingRun(run);
    setForm({ name: run.name, zone: run.zone ?? '', color: run.color, driverUid: run.driverUid ?? '', notes: run.notes ?? '', postcodes: '' });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editingRun) {
        await api.deliveryRuns.update(editingRun.id, {
          name: form.name, zone: form.zone || undefined, color: form.color,
          driverUid: form.driverUid || null, notes: form.notes || undefined,
        });
      } else {
        await api.deliveryRuns.create({
          deliveryDayId: dayId, name: form.name, zone: form.zone || undefined,
          color: form.color, driverUid: form.driverUid || undefined, notes: form.notes || undefined,
        });
      }
      setShowForm(false);
      await load();
      toast(editingRun ? 'Run updated' : 'Run created');
    } catch {
      toast('Failed to save run', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (run: DeliveryRun) => {
    // Show the actual stop count so admin knows what they're unassigning,
    // not just the abstract "all stops" warning.
    const runStops = allStops.filter((s) => s.runId === run.id);
    const stopWord = runStops.length === 1 ? 'stop' : 'stops';
    const message = runStops.length > 0
      ? `Delete "${run.name}"?\n\n${runStops.length} ${stopWord} will be unassigned (status preserved). The driver app may still show stale data until they reload.`
      : `Delete "${run.name}"? It has no stops assigned.`;
    if (!confirm(message)) return;
    try {
      await api.deliveryRuns.remove(run.id);
      await load();
      toast('Run deleted');
    } catch {
      toast('Failed to delete run', 'error');
    }
  };

  const assignStop = async (stopId: string, runId: string | null) => {
    setAssigningStop(stopId);
    try {
      await api.stops.assignRun(stopId, runId);
      await load();
    } catch {
      toast('Failed to assign stop', 'error');
    } finally {
      setAssigningStop(null);
    }
  };

  const autoAssign = async (runId: string, postcodesStr: string) => {
    const postcodes = postcodesStr.split(',').map((p) => p.trim()).filter(Boolean);
    if (!postcodes.length) { toast('Enter postcode(s) first', 'error'); return; }
    setAutoAssigning(runId);
    try {
      const res = await api.deliveryRuns.autoAssign(runId, postcodes) as { assigned: number };
      await load();
      toast(`${res.assigned} stops assigned to run`);
    } catch {
      toast('Auto-assign failed', 'error');
    } finally {
      setAutoAssigning(null);
    }
  };

  const generateStops = async () => {
    setGenerating(true);
    try {
      await api.deliveryDays.generateStops(dayId);
      await load();
      toast('Stops generated');
    } catch {
      toast('Failed to generate stops', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const optimiseRun = async (runId: string) => {
    const runStops = allStops.filter((s) => s.runId === runId);
    if (runStops.length < 2) return;
    setOptimising(true);
    try {
      // Anti-clockwise spiral outward from Boynedale depot. Nearest stop first,
      // furthest last, middle sorted by anti-clockwise bearing from start.
      const DEPOT = { lat: -24.2119, lng: 151.2833 };
      const R = 6371;
      const toRad = Math.PI / 180;
      const hav = (lat1: number, lng1: number, lat2: number, lng2: number) => {
        const dLat = (lat2 - lat1) * toRad;
        const dLng = (lng2 - lng1) * toRad;
        const a = Math.sin(dLat / 2) ** 2 +
          Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLng / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      };
      const bearing = (lat1: number, lng1: number, lat2: number, lng2: number) => {
        const y = Math.sin((lng2 - lng1) * toRad) * Math.cos(lat2 * toRad);
        const x = Math.cos(lat1 * toRad) * Math.sin(lat2 * toRad) -
                  Math.sin(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.cos((lng2 - lng1) * toRad);
        return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
      };

      const annotated = runStops.map((s) => {
        const lat = (s as any).lat ?? 0;
        const lng = (s as any).lng ?? 0;
        return {
          stop: s,
          dist: (lat && lng) ? hav(DEPOT.lat, DEPOT.lng, lat, lng) : 0,
          bearing: (lat && lng) ? bearing(DEPOT.lat, DEPOT.lng, lat, lng) : 0,
        };
      });

      const start = annotated.reduce((a, b) => a.dist < b.dist ? a : b);
      const end = annotated.reduce((a, b) => a.dist > b.dist ? a : b);
      const middle = annotated
        .filter((a) => a !== start && a !== end)
        .map((a) => ({ ...a, acDist: (start.bearing - a.bearing + 360) % 360 }))
        .sort((a, b) => a.acDist - b.acDist);
      const ordered = [start, ...middle, end].map((a) => a.stop);

      await Promise.all(ordered.map((s, i) => api.stops.updateSequence(s.id!, i + 1)));
      await load();
      toast('Route optimised — anti-clockwise from base');
    } catch {
      toast('Failed to optimise', 'error');
    } finally {
      setOptimising(false);
    }
  };

  const getRunStops = (runId: string) => allStops.filter((s) => s.runId === runId);

  const getDriver = (uid?: string) => drivers.find((d) => d.id === uid);

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-brand border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{runs.length} run{runs.length !== 1 ? 's' : ''} · {allStops.length} total stops · {unassigned.length} unassigned</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={generateStops} disabled={generating}
            className="flex items-center gap-2 bg-green-600 text-white px-3 py-2 rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-50">
            <Package className="h-3.5 w-3.5" /> {generating ? 'Generating…' : 'Generate Stops'}
          </button>
          <button onClick={openCreate} className="flex items-center gap-2 bg-brand text-white px-3 py-2 rounded-lg text-xs font-medium hover:opacity-90">
            <Plus className="h-3.5 w-3.5" /> Add Run
          </button>
        </div>
      </div>

      {/* Runs list */}
      {runs.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center py-16 text-gray-400">
          <Truck className="h-12 w-12 mb-3 opacity-30" />
          <p className="font-medium">No runs yet</p>
          <p className="text-sm mt-1">Create a run to assign drivers and group stops by area.</p>
          <button onClick={openCreate} className="mt-4 flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Plus className="h-4 w-4" /> Add First Run
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {runs.map((run) => {
            const driver = getDriver(run.driverUid ?? undefined);
            const runStops = getRunStops(run.id);
            const completed = runStops.filter((s) => s.status === 'delivered').length;
            const isExpanded = expandedRun === run.id;

            return (
              <div key={run.id} className="bg-white rounded-2xl border overflow-hidden">
                {/* Run header */}
                <div className="flex items-center gap-4 px-5 py-4">
                  <div className="w-3 h-12 rounded-full flex-shrink-0" style={{ background: run.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-brand text-base">{run.name}</h3>
                      {run.zone && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{run.zone}</span>}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${run.status === 'completed' ? 'bg-green-100 text-green-700' : run.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                        {run.status === 'in_progress' ? 'In Progress' : run.status === 'completed' ? 'Completed' : 'Pending'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {runStops.length} stops{runStops.length > 0 ? ` (${completed} delivered)` : ''}
                      </span>
                      {driver ? (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <User className="h-3 w-3" /> {driver.name ?? driver.email}
                        </span>
                      ) : (
                        <span className="text-xs text-red-500 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> No driver assigned
                        </span>
                      )}
                    </div>
                    {runStops.length > 0 && (
                      <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden w-48">
                        <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${(completed / runStops.length) * 100}%` }} />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {runStops.length >= 2 && (
                      <button onClick={() => optimiseRun(run.id)} disabled={optimising}
                        className="flex items-center gap-1 text-xs text-brand border border-brand/30 px-2 py-1 rounded-lg hover:bg-brand/5 disabled:opacity-50">
                        <Route className="h-3 w-3" /> {optimising ? '…' : 'Optimise'}
                      </button>
                    )}
                    <button onClick={() => openEdit(run)} className="p-2 text-gray-400 hover:text-brand rounded-lg hover:bg-gray-50"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => handleDelete(run)} className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-50"><Trash2 className="h-4 w-4" /></button>
                    <button onClick={() => setExpandedRun(isExpanded ? null : run.id)} className={`p-2 rounded-lg hover:bg-gray-50 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </button>
                  </div>
                </div>

                {/* Expanded: stops + auto-assign */}
                {isExpanded && (
                  <div className="border-t bg-gray-50">
                    {/* Auto-assign by postcode */}
                    <div className="px-5 py-3 border-b bg-white flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-brand flex-shrink-0" />
                      <input
                        placeholder="Auto-assign postcodes, e.g. 4700, 4701"
                        className="flex-1 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            autoAssign(run.id, (e.target as HTMLInputElement).value);
                            (e.target as HTMLInputElement).value = '';
                          }
                        }}
                      />
                      <button
                        disabled={autoAssigning === run.id}
                        onClick={(e) => {
                          const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                          autoAssign(run.id, input.value);
                          input.value = '';
                        }}
                        className="text-xs bg-brand text-white px-3 py-1.5 rounded-lg disabled:opacity-50"
                      >
                        {autoAssigning === run.id ? 'Assigning…' : 'Auto-assign'}
                      </button>
                    </div>

                    {/* Assigned stops */}
                    {runStops.length === 0 ? (
                      <div className="px-5 py-6 text-center text-sm text-gray-400">No stops assigned yet</div>
                    ) : (
                      <div className="divide-y">
                        {runStops.map((stop, i) => {
                          const cfg = STOP_STATUS_CFG[stop.status] ?? STOP_STATUS_CFG.pending;
                          return (
                            <div key={stop.id} className="px-5 py-3 flex items-center gap-3">
                              <span className="w-6 h-6 bg-brand/10 rounded-full flex items-center justify-center text-xs font-bold text-brand flex-shrink-0">{i + 1}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{stop.customerName}</p>
                                <p className="text-xs text-gray-400 truncate">{(stop.address as any).line1}, {(stop.address as any).suburb}</p>
                              </div>
                              <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${cfg.cls}`}>{cfg.label}</span>
                              <button
                                disabled={assigningStop === stop.id}
                                onClick={() => assignStop(stop.id, null)}
                                className="p-1.5 text-gray-300 hover:text-red-400 rounded"
                                title="Remove from run"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Unassigned stops */}
      {unassigned.length > 0 && (
        <div className="bg-white rounded-2xl border overflow-hidden">
          <div className="px-5 py-3 border-b bg-amber-50 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h3 className="font-semibold text-sm text-amber-700">{unassigned.length} unassigned stop{unassigned.length !== 1 ? 's' : ''}</h3>
          </div>
          <div className="divide-y">
            {unassigned.map((stop) => (
              <div key={stop.id} className="px-5 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{stop.customerName}</p>
                  <p className="text-xs text-gray-400 truncate">{(stop.address as any).line1}, {(stop.address as any).suburb} {(stop.address as any).postcode}</p>
                </div>
                {runs.length > 0 && (
                  <select
                    disabled={assigningStop === stop.id}
                    defaultValue=""
                    onChange={(e) => { if (e.target.value) assignStop(stop.id, e.target.value); }}
                    className="text-xs border rounded-lg px-2 py-1.5 text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand"
                  >
                    <option value="" disabled>Assign to run…</option>
                    {runs.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create/Edit Run Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-lg">{editingRun ? 'Edit Run' : 'New Run'}</h2>
              <button onClick={() => setShowForm(false)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Run Name *</label>
                <input
                  placeholder="e.g. Rockhampton North"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Zone / Area Label</label>
                <input
                  placeholder="e.g. Gladstone, Rocky South"
                  value={form.zone}
                  onChange={(e) => setForm((f) => ({ ...f, zone: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Assign Driver</label>
                <select
                  value={form.driverUid}
                  onChange={(e) => setForm((f) => ({ ...f, driverUid: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  <option value="">— Unassigned —</option>
                  {drivers.map((d) => <option key={d.id} value={d.id}>{d.name ?? d.email}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Colour</label>
                <div className="flex gap-2 flex-wrap">
                  {RUN_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setForm((f) => ({ ...f, color: c }))}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${form.color === c ? 'border-gray-900 scale-110' : 'border-transparent'}`}
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Notes</label>
                <textarea
                  placeholder="Any notes for this run"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowForm(false)} className="flex-1 border py-2 rounded-lg text-sm">Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.name.trim()} className="flex-1 bg-brand text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                {saving ? 'Saving…' : editingRun ? 'Save Changes' : 'Create Run'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
