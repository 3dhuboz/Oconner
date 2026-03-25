import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Store, Crown, BarChart3, Users, DollarSign, Zap, XCircle,
  CheckCircle, Sparkles, Palette, Eye, Plus, Trash2, Edit, Loader2,
  Star, Shield, Globe, Brain, Wand2, Code, Layers, Settings, Workflow, Gift, Save
} from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';
import './Admin.css';

const ICON_MAP = {
  sparkles: Sparkles, zap: Zap, 'bar-chart': BarChart3, brain: Brain,
  wand: Wand2, palette: Palette, globe: Globe, workflow: Workflow,
  settings: Settings, code: Code, layers: Layers, star: Star
};

const AdminApps = () => {
  const [stats, setStats] = useState(null);
  const [apps, setApps] = useState([]);
  const [subs, setSubs] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSubModal, setShowSubModal] = useState(false);
  const [newSub, setNewSub] = useState({ userId: '', appSlug: '', planKey: '' });
  const [showFreeModal, setShowFreeModal] = useState(false);
  const [freeLicense, setFreeLicense] = useState({ userId: '', appSlug: '', planKey: '' });
  const [editingApp, setEditingApp] = useState(null);
  const [editForm, setEditForm] = useState({});

  const loadAll = async () => {
    try {
      const [statsRes, appsRes, subsRes, custRes] = await Promise.all([
        api.get('/marketplace/admin/stats').catch(() => ({ data: null })),
        api.get('/marketplace/admin/apps').catch(() => ({ data: [] })),
        api.get('/marketplace/admin/subscriptions').catch(() => ({ data: [] })),
        api.get('/customers').catch(() => ({ data: [] }))
      ]);
      setStats(statsRes.data);
      setApps(appsRes.data);
      setSubs(subsRes.data);
      setCustomers(custRes.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const seedApps = async () => {
    try {
      const res = await api.post('/marketplace/admin/seed');
      toast.success(res.data.message);
      loadAll();
    } catch (err) {
      toast.error('Seed failed');
    }
  };

  const cancelSub = async (subId) => {
    if (!window.confirm('Cancel this subscription?')) return;
    try {
      await api.post('/marketplace/admin/cancel', { subscriptionId: subId });
      toast.success('Subscription cancelled');
      loadAll();
    } catch (err) {
      toast.error('Failed to cancel');
    }
  };

  const activateSub = async () => {
    if (!newSub.userId || !newSub.appSlug || !newSub.planKey) return toast.error('Fill all fields');
    try {
      await api.post('/marketplace/admin/subscribe', newSub);
      toast.success('Subscription activated');
      setShowSubModal(false);
      setNewSub({ userId: '', appSlug: '', planKey: '' });
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Activation failed');
    }
  };

  const grantFree = async () => {
    if (!freeLicense.appSlug || !freeLicense.planKey) return toast.error('Select app and plan');
    try {
      const res = await api.post('/marketplace/admin/grant-free', freeLicense);
      toast.success(res.data.message);
      setShowFreeModal(false);
      setFreeLicense({ userId: '', appSlug: '', planKey: '' });
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const openEditApp = (app) => {
    setEditingApp(app);
    setEditForm({
      name: app.name,
      shortDescription: app.shortDescription,
      setupFee: app.setupFee || 0,
      isActive: app.isActive,
      isPublished: app.isPublished,
      plans: app.plans.map(p => ({ ...p }))
    });
  };

  const saveApp = async () => {
    try {
      await api.put(`/marketplace/admin/apps/${editingApp._id}`, editForm);
      toast.success('App updated');
      setEditingApp(null);
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    }
  };

  const updatePlan = (idx, key, value) => {
    const plans = [...editForm.plans];
    plans[idx] = { ...plans[idx], [key]: value };
    setEditForm(prev => ({ ...prev, plans }));
  };

  if (loading) return <div className="page-loading">Loading app management...</div>;

  const activeSubs = subs.filter(s => s.status === 'active');

  return (
    <div className="admin-page">
      <div className="container" style={{ padding: '2rem 1.5rem' }}>
        <Link to="/admin" className="back-link"><ArrowLeft size={16} /> Back to Admin</Link>
        <div className="admin-header">
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Store size={24} style={{ color: 'var(--primary)' }} /> App Marketplace Management
            </h1>
            <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>
              Manage apps, subscriptions, and white-label configurations
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button onClick={seedApps} className="btn btn-secondary btn-sm"><Zap size={14} /> Seed Apps</button>
            <button onClick={() => setShowFreeModal(true)} className="btn btn-secondary btn-sm" style={{ color: '#10b981' }}><Gift size={14} /> Free License</button>
            <button onClick={() => setShowSubModal(true)} className="btn btn-primary btn-sm"><Plus size={14} /> New Subscription</button>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="admin-stats">
            <div className="stat-card card">
              <div className="stat-icon" style={{ background: 'rgba(37,99,235,0.1)', color: '#2563eb' }}><Store size={24} /></div>
              <div className="stat-info"><strong>{stats.totalApps}</strong><span>Apps</span></div>
            </div>
            <div className="stat-card card">
              <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}><Crown size={24} /></div>
              <div className="stat-info"><strong>{stats.activeSubscriptions}</strong><span>Active Subs</span></div>
            </div>
            <div className="stat-card card">
              <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}><DollarSign size={24} /></div>
              <div className="stat-info"><strong>${stats.monthlyRevenue}</strong><span>Monthly Revenue</span></div>
            </div>
            <div className="stat-card card">
              <div className="stat-icon" style={{ background: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }}><Users size={24} /></div>
              <div className="stat-info"><strong>{stats.totalSubscriptions}</strong><span>Total Subs</span></div>
            </div>
          </div>
        )}

        {/* Revenue by App */}
        {stats?.subsByApp?.length > 0 && (
          <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '0.75rem' }}>Revenue by App</h3>
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
              {stats.subsByApp.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Sparkles size={16} style={{ color: '#f59e0b' }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{s.appName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{s.count} subs &middot; ${s.revenue}/mo</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Apps Catalog */}
        <div className="admin-section">
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Store size={18} /> App Catalog ({apps.length})
          </h2>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>App</th>
                  <th>Category</th>
                  <th>Plans</th>
                  <th>Status</th>
                  <th>Active Subs</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {apps.map(app => {
                  const Icon = ICON_MAP[app.icon] || Sparkles;
                  const appSubs = activeSubs.filter(s => {
                    const appId = s.app?._id || s.app;
                    return appId === app._id;
                  });
                  return (
                    <tr key={app._id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Icon size={16} style={{ color: 'var(--primary)' }} />
                          <div>
                            <div style={{ fontWeight: 600 }}>{app.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{app.slug}</div>
                          </div>
                        </div>
                      </td>
                      <td><span className="badge badge-info" style={{ textTransform: 'capitalize' }}>{app.category}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                          {app.plans.map(p => (
                            <span key={p.key} style={{ fontSize: '0.6875rem', padding: '0.125rem 0.375rem', borderRadius: 4, background: `${p.color}15`, color: p.color, fontWeight: 600 }}>
                              {p.name} ${p.price}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${app.isActive ? 'badge-success' : 'badge-gray'}`}>
                          {app.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700 }}>{appSubs.length}</td>
                      <td>
                        <button onClick={() => openEditApp(app)} className="btn btn-sm btn-secondary" style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem' }}>
                          <Edit size={12} /> Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {apps.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--gray-400)', padding: '2rem' }}>No apps yet. Click "Seed Apps" to add SocialAI Studio.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* All Subscriptions */}
        <div className="admin-section" style={{ marginTop: '1.5rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Crown size={18} style={{ color: '#f59e0b' }} /> All Subscriptions ({subs.length})
          </h2>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>App</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Amount</th>
                  <th>White-Label</th>
                  <th>Started</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {subs.map(sub => (
                  <tr key={sub._id}>
                    <td style={{ fontWeight: 600 }}>{sub.user?.firstName} {sub.user?.lastName}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        {(() => { const I = ICON_MAP[sub.app?.icon] || Sparkles; return <I size={14} />; })()}
                        {sub.app?.name || '—'}
                      </div>
                    </td>
                    <td><span style={{ textTransform: 'capitalize', fontWeight: 600, fontSize: '0.8125rem' }}>{sub.planKey}</span></td>
                    <td>
                      <span className={`badge ${sub.status === 'active' ? 'badge-success' : sub.status === 'cancelled' ? 'badge-gray' : 'badge-info'}`}>
                        {sub.status}
                      </span>
                    </td>
                    <td>${sub.amount}/mo</td>
                    <td>
                      {sub.whiteLabel?.brandName ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8125rem' }}>
                          <Palette size={12} style={{ color: sub.whiteLabel.primaryColor || '#3b82f6' }} />
                          {sub.whiteLabel.brandName}
                        </span>
                      ) : <span style={{ color: 'var(--gray-400)' }}>—</span>}
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>
                      {sub.startDate ? new Date(sub.startDate).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      {sub.status === 'active' && (
                        <button onClick={() => cancelSub(sub._id)} className="btn btn-sm btn-danger" style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem' }}>
                          <XCircle size={12} /> Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {subs.length === 0 && (
                  <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--gray-400)', padding: '2rem' }}>No subscriptions yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* New Subscription Modal */}
        {showSubModal && (
          <div className="modal-overlay" onClick={() => setShowSubModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
              <h2>Activate Subscription</h2>
              <div className="form-group">
                <label>Customer</label>
                <select value={newSub.userId} onChange={e => setNewSub({ ...newSub, userId: e.target.value })}>
                  <option value="">Select customer...</option>
                  {customers.map(c => (
                    <option key={c._id} value={c._id}>{c.firstName} {c.lastName} — {c.email}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>App</label>
                <select value={newSub.appSlug} onChange={e => setNewSub({ ...newSub, appSlug: e.target.value, planKey: '' })}>
                  <option value="">Select app...</option>
                  {apps.map(a => (
                    <option key={a._id} value={a.slug}>{a.name}</option>
                  ))}
                </select>
              </div>
              {newSub.appSlug && (
                <div className="form-group">
                  <label>Plan</label>
                  <select value={newSub.planKey} onChange={e => setNewSub({ ...newSub, planKey: e.target.value })}>
                    <option value="">Select plan...</option>
                    {apps.find(a => a.slug === newSub.appSlug)?.plans.map(p => (
                      <option key={p.key} value={p.key}>{p.name} — ${p.price}/mo</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="modal-actions">
                <button onClick={() => setShowSubModal(false)} className="btn btn-secondary">Cancel</button>
                <button onClick={activateSub} className="btn btn-primary"><Zap size={14} /> Activate</button>
              </div>
            </div>
          </div>
        )}

        {/* Grant Free License Modal */}
        {showFreeModal && (
          <div className="modal-overlay" onClick={() => setShowFreeModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Gift size={20} style={{ color: '#10b981' }} /> Grant Free License</h2>
              <p style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginBottom: '1rem' }}>
                Issue a free 1-year license for testing or promotional purposes. Leave customer blank to grant to yourself.
              </p>
              <div className="form-group">
                <label>Customer (optional — blank = yourself)</label>
                <select value={freeLicense.userId} onChange={e => setFreeLicense({ ...freeLicense, userId: e.target.value })}>
                  <option value="">Myself (Admin)</option>
                  {customers.map(c => (
                    <option key={c._id} value={c._id}>{c.firstName} {c.lastName} — {c.email}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>App</label>
                <select value={freeLicense.appSlug} onChange={e => setFreeLicense({ ...freeLicense, appSlug: e.target.value, planKey: '' })}>
                  <option value="">Select app...</option>
                  {apps.map(a => (
                    <option key={a._id} value={a.slug}>{a.name}</option>
                  ))}
                </select>
              </div>
              {freeLicense.appSlug && (
                <div className="form-group">
                  <label>Plan</label>
                  <select value={freeLicense.planKey} onChange={e => setFreeLicense({ ...freeLicense, planKey: e.target.value })}>
                    <option value="">Select plan...</option>
                    {apps.find(a => a.slug === freeLicense.appSlug)?.plans.map(p => (
                      <option key={p.key} value={p.key}>{p.name} (normally ${p.price}/mo)</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="modal-actions">
                <button onClick={() => setShowFreeModal(false)} className="btn btn-secondary">Cancel</button>
                <button onClick={grantFree} className="btn btn-primary" style={{ background: '#10b981' }}><Gift size={14} /> Grant Free License</button>
              </div>
            </div>
          </div>
        )}

        {/* Edit App Modal */}
        {editingApp && (
          <div className="modal-overlay" onClick={() => setEditingApp(null)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px', maxHeight: '80vh', overflow: 'auto' }}>
              <h2>Edit: {editingApp.name}</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label>App Name</label>
                  <input value={editForm.name || ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Setup Fee ($)</label>
                  <input type="number" value={editForm.setupFee || 0} onChange={e => setEditForm({ ...editForm, setupFee: parseFloat(e.target.value) })} />
                </div>
              </div>
              <div className="form-group">
                <label>Short Description</label>
                <textarea rows={2} value={editForm.shortDescription || ''} onChange={e => setEditForm({ ...editForm, shortDescription: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div className="form-group">
                  <label>Active</label>
                  <select value={editForm.isActive ? 'true' : 'false'} onChange={e => setEditForm({ ...editForm, isActive: e.target.value === 'true' })}>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Published</label>
                  <select value={editForm.isPublished ? 'true' : 'false'} onChange={e => setEditForm({ ...editForm, isPublished: e.target.value === 'true' })}>
                    <option value="true">Published</option>
                    <option value="false">Hidden</option>
                  </select>
                </div>
              </div>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '0.75rem' }}>Plans & Pricing</h3>
              {(editForm.plans || []).map((plan, idx) => (
                <div key={idx} className="card" style={{ padding: '0.75rem', marginBottom: '0.75rem', borderLeft: `3px solid ${plan.color || '#3b82f6'}` }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '0.6875rem' }}>Plan Name</label>
                      <input value={plan.name} onChange={e => updatePlan(idx, 'name', e.target.value)} style={{ fontSize: '0.8125rem' }} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '0.6875rem' }}>Plan Key</label>
                      <input value={plan.key || ''} onChange={e => updatePlan(idx, 'key', e.target.value)} style={{ fontSize: '0.8125rem' }} placeholder="e.g. starter" />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '0.6875rem' }}>Color</label>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <input type="color" value={plan.color || '#3b82f6'} onChange={e => updatePlan(idx, 'color', e.target.value)} style={{ width: 32, height: 32, padding: 0, border: 'none', cursor: 'pointer' }} />
                        <input value={plan.color || ''} onChange={e => updatePlan(idx, 'color', e.target.value)} style={{ fontSize: '0.8125rem', flex: 1 }} placeholder="#hex" />
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '0.6875rem' }}>Monthly ($)</label>
                      <input type="number" value={plan.price} onChange={e => updatePlan(idx, 'price', parseFloat(e.target.value))} style={{ fontSize: '0.8125rem' }} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '0.6875rem' }}>Yearly ($)</label>
                      <input type="number" value={plan.yearlyPrice || 0} onChange={e => updatePlan(idx, 'yearlyPrice', parseFloat(e.target.value))} style={{ fontSize: '0.8125rem' }} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '0.6875rem' }}>Popular?</label>
                      <select value={plan.popular ? 'true' : 'false'} onChange={e => updatePlan(idx, 'popular', e.target.value === 'true')} style={{ fontSize: '0.8125rem' }}>
                        <option value="false">No</option>
                        <option value="true">Yes</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group" style={{ marginBottom: '0.375rem' }}>
                    <label style={{ fontSize: '0.6875rem' }}>Description</label>
                    <input value={plan.description || ''} onChange={e => updatePlan(idx, 'description', e.target.value)} style={{ fontSize: '0.8125rem' }} placeholder="Plan description..." />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.6875rem' }}>Features (one per line)</label>
                    <textarea
                      rows={4}
                      value={(plan.features || []).join('\n')}
                      onChange={e => updatePlan(idx, 'features', e.target.value.split('\n'))}
                      style={{ fontSize: '0.75rem', lineHeight: 1.5 }}
                      placeholder="AI Content Generation&#10;Content Calendar&#10;Smart Scheduler"
                    />
                  </div>
                </div>
              ))}
              <div className="modal-actions">
                <button onClick={() => setEditingApp(null)} className="btn btn-secondary">Cancel</button>
                <button onClick={saveApp} className="btn btn-primary"><Save size={14} /> Save Changes</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminApps;
