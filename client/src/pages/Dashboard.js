import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Ticket, Plus, Clock, CheckCircle, AlertCircle, ArrowRight, Workflow,
  Store, Layers, ExternalLink, Crown, Sparkles, Palette, Zap,
  BarChart3, Brain, Wand2, Globe, Settings, Code, Star, DollarSign
} from 'lucide-react';
import api from '../api';
import { useClientConfig } from '../context/ClientConfigContext';
import './Dashboard.css';

const ICON_MAP = {
  sparkles: Sparkles, zap: Zap, 'bar-chart': BarChart3, brain: Brain,
  wand: Wand2, palette: Palette, globe: Globe, workflow: Workflow,
  settings: Settings, code: Code, layers: Layers, star: Star
};

const Dashboard = () => {
  const { user } = useAuth();
  const { clientMode, brandName } = useClientConfig();
  const [tickets, setTickets] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [myApps, setMyApps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/tickets').catch(() => ({ data: [] })),
      api.get('/workflows').catch(() => ({ data: [] })),
      api.get('/marketplace/my-apps').catch(() => ({ data: [] }))
    ]).then(([ticketRes, workflowRes, appsRes]) => {
      setTickets(ticketRes.data);
      setWorkflows(workflowRes.data);
      setMyApps(appsRes.data);
      setLoading(false);
    });
  }, []);

  const openTickets = tickets.filter(t => t.status === 'open' || t.status === 'in-progress');
  const resolvedTickets = tickets.filter(t => t.status === 'resolved' || t.status === 'closed');
  const activeApps = myApps.filter(s => s.isActive);

  const statusColor = (status) => {
    const map = { 'open': 'badge-warning', 'in-progress': 'badge-info', 'waiting-on-customer': 'badge-gray', 'resolved': 'badge-success', 'closed': 'badge-gray' };
    return map[status] || 'badge-gray';
  };

  const priorityColor = (priority) => {
    const map = { 'low': 'badge-gray', 'medium': 'badge-info', 'high': 'badge-warning', 'critical': 'badge-danger' };
    return map[priority] || 'badge-gray';
  };

  if (loading) return <div className="page-loading">Loading dashboard...</div>;

  return (
    <div className="dashboard-page">
      <div className="container" style={{ padding: '2rem 1.5rem' }}>
        <div className="dash-header">
          <div>
            <h1>Welcome back, {user?.firstName}!</h1>
            <p>Manage your apps, tickets, and workflows</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {!clientMode && <Link to="/marketplace" className="btn btn-secondary"><Store size={16} /> Marketplace</Link>}
            <Link to="/tickets/new" className="btn btn-primary"><Plus size={16} /> New Ticket</Link>
          </div>
        </div>

        {/* Stats */}
        <div className="dash-stats">
          <div className="stat-card card">
            <div className="stat-icon" style={{ background: 'rgba(37,99,235,0.1)', color: '#2563eb' }}><Layers size={24} /></div>
            <div className="stat-info"><strong>{activeApps.length}</strong><span>Active Apps</span></div>
          </div>
          <div className="stat-card card">
            <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}><AlertCircle size={24} /></div>
            <div className="stat-info"><strong>{openTickets.length}</strong><span>Open Tickets</span></div>
          </div>
          <div className="stat-card card">
            <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}><CheckCircle size={24} /></div>
            <div className="stat-info"><strong>{resolvedTickets.length}</strong><span>Resolved</span></div>
          </div>
          <div className="stat-card card">
            <div className="stat-icon" style={{ background: 'rgba(6,182,212,0.1)', color: '#06b6d4' }}><Workflow size={24} /></div>
            <div className="stat-info"><strong>{workflows.length}</strong><span>Workflows</span></div>
          </div>
        </div>

        {/* ── MY APPS — Primary Section ── */}
        <div className="dash-section" style={{ marginBottom: '2rem' }}>
          <div className="section-title">
            <h2><Layers size={18} /> My Apps</h2>
            <Link to="/my-apps" className="btn btn-sm btn-secondary">Manage All <ArrowRight size={14} /></Link>
          </div>

          {activeApps.length === 0 ? (
            <div className="empty-state card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
              <Store size={48} style={{ color: 'var(--gray-300)', marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>No Apps Yet</h3>
              <p style={{ marginBottom: '1rem' }}>{clientMode ? 'Your apps will appear here once they are activated.' : 'Browse our marketplace to subscribe to your first app. Each comes with its own white-label backend.'}</p>
              {!clientMode && <Link to="/marketplace" className="btn btn-primary"><Store size={16} /> Explore Marketplace</Link>}
            </div>
          ) : (
            <div className="dash-apps-grid">
              {activeApps.map(sub => {
                const app = sub.app || {};
                const Icon = ICON_MAP[app.icon] || Sparkles;
                const plan = app.plans?.find(p => p.key === sub.planKey);
                const wl = sub.whiteLabel || {};
                const brandName = wl.brandName || app.name;

                return (
                  <div key={sub._id} className="dash-app-card card">
                    <div className="dash-app-top">
                      <div className="dash-app-icon" style={{ background: `${plan?.color || 'var(--primary)'}15`, color: plan?.color || 'var(--primary)' }}>
                        {wl.logoUrl ? (
                          <img src={wl.logoUrl} alt="" style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover' }} />
                        ) : (
                          <Icon size={24} />
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{brandName}</h3>
                        {wl.brandName && <span style={{ fontSize: '0.6875rem', color: 'var(--gray-400)' }}>{app.name}</span>}
                      </div>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '0.25rem',
                        fontSize: '0.6875rem', fontWeight: 700,
                        background: `${plan?.color || '#3b82f6'}20`, color: plan?.color || '#3b82f6',
                        padding: '0.2rem 0.5rem', borderRadius: '9999px'
                      }}>
                        <Crown size={10} /> {plan?.name || sub.planKey}
                      </div>
                    </div>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', margin: '0.75rem 0' }}>
                      {app.shortDescription?.substring(0, 100)}...
                    </p>
                    <div className="dash-app-meta">
                      <span><DollarSign size={12} /> ${sub.amount}/mo</span>
                      <span><CheckCircle size={12} style={{ color: '#10b981' }} /> Active</span>
                    </div>
                    <div className="dash-app-actions">
                      {app.routePath && (
                        <Link to={app.routePath} className="btn btn-primary btn-sm" style={{ flex: 1 }}>
                          <ExternalLink size={14} /> Open App
                        </Link>
                      )}
                      <Link to="/my-apps" className="btn btn-secondary btn-sm">
                        <Settings size={14} /> Manage
                      </Link>
                    </div>
                  </div>
                );
              })}

              {/* Browse more card — hidden in client mode */}
              {!clientMode && (
                <Link to="/marketplace" className="dash-app-card card dash-app-browse">
                  <Store size={32} style={{ color: 'var(--gray-300)' }} />
                  <span style={{ fontWeight: 600, color: 'var(--gray-500)', fontSize: '0.875rem' }}>Browse More Apps</span>
                  <ArrowRight size={16} style={{ color: 'var(--primary)' }} />
                </Link>
              )}
            </div>
          )}
        </div>

        {/* ── Tickets & Workflows ── */}
        <div className="dash-grid">
          <div className="dash-section">
            <div className="section-title">
              <h2><Clock size={18} /> Recent Tickets</h2>
              <Link to="/tickets" className="btn btn-sm btn-secondary">View All <ArrowRight size={14} /></Link>
            </div>
            {tickets.length === 0 ? (
              <div className="empty-state card">
                <p>No tickets yet. Need help? Create a support ticket.</p>
                <Link to="/tickets/new" className="btn btn-primary btn-sm"><Plus size={14} /> Create Ticket</Link>
              </div>
            ) : (
              <div className="ticket-list">
                {tickets.slice(0, 5).map(ticket => (
                  <Link key={ticket._id} to={`/tickets/${ticket._id}`} className="ticket-item card">
                    <div className="ti-header">
                      <span className="ti-number">{ticket.ticketNumber}</span>
                      <span className={`badge ${statusColor(ticket.status)}`}>{ticket.status}</span>
                    </div>
                    <h4>{ticket.subject}</h4>
                    <div className="ti-meta">
                      <span className={`badge ${priorityColor(ticket.priority)}`}>{ticket.priority}</span>
                      <span className="ti-date">{new Date(ticket.createdAt).toLocaleDateString()}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="dash-section">
            <div className="section-title">
              <h2><Workflow size={18} /> Active Workflows</h2>
            </div>
            {workflows.length === 0 ? (
              <div className="empty-state card">
                <p>No active workflows. Your workflows will appear here when created by the team.</p>
              </div>
            ) : (
              <div className="workflow-list">
                {workflows.filter(w => w.status === 'active').slice(0, 5).map(wf => {
                  const completed = wf.steps?.filter(s => s.status === 'completed').length || 0;
                  const total = wf.steps?.length || 0;
                  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
                  return (
                    <div key={wf._id} className="workflow-item card">
                      <h4>{wf.name}</h4>
                      <p className="wf-desc">{wf.description}</p>
                      <div className="wf-progress">
                        <div className="wf-bar"><div className="wf-fill" style={{ width: `${pct}%` }}></div></div>
                        <span>{pct}% ({completed}/{total})</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
