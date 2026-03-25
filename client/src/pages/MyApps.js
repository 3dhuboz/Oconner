import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Layers, Sparkles, Crown, CheckCircle, Palette, ArrowRight, Settings,
  Zap, XCircle, ExternalLink, Calendar, DollarSign, Store,
  Star, Shield, BarChart3, Brain, Wand2, Globe, Workflow, Code
} from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';
import './MyApps.css';

const ICON_MAP = {
  sparkles: Sparkles, zap: Zap, 'bar-chart': BarChart3, brain: Brain,
  wand: Wand2, palette: Palette, globe: Globe, workflow: Workflow,
  settings: Settings, code: Code, layers: Layers, star: Star
};

const MyApps = () => {
  const navigate = useNavigate();
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadSubs = async () => {
    try {
      const res = await api.get('/marketplace/my-apps');
      setSubs(res.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => { loadSubs(); }, []);

  const handleCancel = async (appSlug, appName) => {
    if (!window.confirm(`Cancel your ${appName} subscription? You'll keep access until end of billing period.`)) return;
    try {
      await api.post('/marketplace/cancel', { appSlug });
      toast.success('Subscription cancelled');
      loadSubs();
    } catch (err) {
      toast.error('Cancellation failed');
    }
  };

  const activeSubs = subs.filter(s => s.isActive);
  const inactiveSubs = subs.filter(s => !s.isActive);

  if (loading) return <div className="page-loading">Loading your apps...</div>;

  return (
    <div className="myapps-page">
      <div className="container" style={{ padding: '2rem 1.5rem' }}>
        <div className="myapps-header">
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Layers size={24} style={{ color: 'var(--primary)' }} /> My Apps
            </h1>
            <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>
              Manage your subscriptions, branding, and app access
            </p>
          </div>
          <Link to="/marketplace" className="btn btn-primary btn-sm">
            <Store size={14} /> Browse Marketplace
          </Link>
        </div>

        {subs.length === 0 ? (
          <div className="myapps-empty">
            <Store size={56} style={{ color: 'var(--gray-300)', marginBottom: '1rem' }} />
            <h2>No Apps Yet</h2>
            <p>Head to the Marketplace to browse and subscribe to your first app.</p>
            <Link to="/marketplace" className="btn btn-primary" style={{ marginTop: '1rem' }}>
              <Store size={16} /> Explore Marketplace
            </Link>
          </div>
        ) : (
          <>
            {/* Active Subscriptions */}
            {activeSubs.length > 0 && (
              <div className="myapps-section">
                <h2 className="myapps-section-title">
                  <CheckCircle size={18} style={{ color: '#10b981' }} /> Active Subscriptions ({activeSubs.length})
                </h2>
                <div className="myapps-grid">
                  {activeSubs.map(sub => {
                    const app = sub.app || {};
                    const Icon = ICON_MAP[app.icon] || Sparkles;
                    const plan = app.plans?.find(p => p.key === sub.planKey);
                    const canWhiteLabel = plan?.whiteLabel;
                    const wl = sub.whiteLabel || {};
                    const brandName = wl.brandName || app.name;

                    return (
                      <div key={sub._id} className="myapp-card">
                        <div className="myapp-card-top">
                          <div className="myapp-card-icon" style={{ background: `${plan?.color || 'var(--primary)'}15`, color: plan?.color || 'var(--primary)' }}>
                            {wl.logoUrl ? (
                              <img src={wl.logoUrl} alt="" style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover' }} />
                            ) : (
                              <Icon size={24} />
                            )}
                          </div>
                          <div style={{ flex: 1 }}>
                            <h3>{brandName}</h3>
                            {wl.brandName && <span className="myapp-original-name">{app.name}</span>}
                          </div>
                          <div className="myapp-plan-badge" style={{ background: `${plan?.color || '#3b82f6'}20`, color: plan?.color || '#3b82f6' }}>
                            <Crown size={12} /> {plan?.name || sub.planKey}
                          </div>
                        </div>

                        <div className="myapp-stats">
                          <div className="myapp-stat">
                            <DollarSign size={14} />
                            <div>
                              <strong>${sub.amount}/mo</strong>
                              <span>{sub.currency}</span>
                            </div>
                          </div>
                          <div className="myapp-stat">
                            <Calendar size={14} />
                            <div>
                              <strong>{sub.endDate ? new Date(sub.endDate).toLocaleDateString() : '—'}</strong>
                              <span>Renews</span>
                            </div>
                          </div>
                          <div className="myapp-stat">
                            <CheckCircle size={14} style={{ color: '#10b981' }} />
                            <div>
                              <strong style={{ color: '#10b981', textTransform: 'capitalize' }}>{sub.status}</strong>
                              <span>Status</span>
                            </div>
                          </div>
                        </div>

                        {wl.brandName && (
                          <div className="myapp-branding-preview">
                            <div className="myapp-brand-bar" style={{ background: wl.headerBg || '#0f172a' }}>
                              {wl.logoUrl ? (
                                <img src={wl.logoUrl} alt="" style={{ width: 20, height: 20, borderRadius: 4, objectFit: 'cover' }} />
                              ) : (
                                <Icon size={16} style={{ color: wl.primaryColor || '#f59e0b' }} />
                              )}
                              <span style={{ color: 'white', fontSize: '0.75rem', fontWeight: 600 }}>{wl.brandName}</span>
                              {wl.tagline && <span style={{ color: '#9ca3af', fontSize: '0.6rem' }}>{wl.tagline}</span>}
                            </div>
                          </div>
                        )}

                        <div className="myapp-actions">
                          {app.routePath && (
                            <Link to={app.routePath} className="btn btn-primary btn-sm">
                              <ExternalLink size={14} /> Open App
                            </Link>
                          )}
                          {canWhiteLabel && (
                            <Link to={app.routePath || '#'} className="btn btn-secondary btn-sm">
                              <Palette size={14} /> Branding
                            </Link>
                          )}
                          <button onClick={() => handleCancel(app.slug, app.name)} className="btn btn-danger btn-sm" style={{ marginLeft: 'auto' }}>
                            <XCircle size={14} /> Cancel
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Inactive / Cancelled */}
            {inactiveSubs.length > 0 && (
              <div className="myapps-section" style={{ marginTop: '2rem' }}>
                <h2 className="myapps-section-title" style={{ color: 'var(--gray-500)' }}>
                  <XCircle size={18} /> Inactive ({inactiveSubs.length})
                </h2>
                <div className="myapps-grid">
                  {inactiveSubs.map(sub => {
                    const app = sub.app || {};
                    const Icon = ICON_MAP[app.icon] || Sparkles;
                    return (
                      <div key={sub._id} className="myapp-card myapp-card-inactive">
                        <div className="myapp-card-top">
                          <div className="myapp-card-icon"><Icon size={24} /></div>
                          <div style={{ flex: 1 }}>
                            <h3>{app.name}</h3>
                          </div>
                          <span className="myapp-status-badge" style={{ color: 'var(--gray-500)' }}>{sub.status}</span>
                        </div>
                        <div className="myapp-actions">
                          <Link to="/marketplace" className="btn btn-primary btn-sm">
                            <Zap size={14} /> Resubscribe
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MyApps;
