import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Ticket, Workflow, Globe, Server, Settings, AlertCircle, TrendingUp, ArrowRight, Sparkles, Store, FileText, FolderKanban, Zap, GitBranch } from 'lucide-react';
import api from '../api';
import { useClientConfig } from '../context/ClientConfigContext';
import './Admin.css';

const AdminDashboard = () => {
  const { clientMode, brandName, enabledApps } = useClientConfig();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/dashboard').then(res => { setData(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const seedData = async () => {
    try {
      await api.post('/admin/seed');
      window.location.reload();
    } catch (err) {
      console.error('Seed failed', err);
    }
  };

  if (loading) return <div className="page-loading">Loading admin dashboard...</div>;

  const stats = data?.stats || {};

  return (
    <div className="admin-page">
      <div className="container" style={{ padding: '2rem 1.5rem' }}>
        <div className="admin-header">
          <div>
            <h1>{clientMode ? `${brandName || 'App'} Admin` : 'Admin Dashboard'}</h1>
            <p>{clientMode ? 'Manage your app settings and content' : 'Manage your business, customers, and services'}</p>
          </div>
          {!clientMode && <button onClick={seedData} className="btn btn-secondary btn-sm">Seed Initial Data</button>}
        </div>

        <div className="admin-nav-cards">
          {!clientMode && (
            <>
              <Link to="/admin/customers" className="admin-nav-card card">
                <Users size={24} />
                <h3>Customers</h3>
                <p>Manage customer accounts</p>
              </Link>
              <Link to="/admin/services" className="admin-nav-card card">
                <Globe size={24} />
                <h3>Services</h3>
                <p>Edit service offerings</p>
              </Link>
              <Link to="/admin/workflows" className="admin-nav-card card">
                <Workflow size={24} />
                <h3>Workflows</h3>
                <p>Manage workflow templates</p>
              </Link>
              <Link to="/admin/siteground" className="admin-nav-card card">
                <Server size={24} />
                <h3>SiteGround</h3>
                <p>GoGeek hosting management</p>
              </Link>
            </>
          )}
          {clientMode && enabledApps.includes('foodtruck') && (
            <Link to="/foodtruck-app" className="admin-nav-card card">
              <Zap size={24} />
              <h3>Food Truck</h3>
              <p>Manage orders, menu, cook days & more</p>
            </Link>
          )}
          {clientMode && enabledApps.includes('simplewebsite') && (
            <Link to="/simplewebsite-app" className="admin-nav-card card">
              <Globe size={24} />
              <h3>SimpleWebsite</h3>
              <p>Manage products, orders, pages & more</p>
            </Link>
          )}
          <Link to={clientMode && enabledApps.includes('foodtruck') ? '/foodtruck-app' : clientMode && enabledApps.includes('simplewebsite') ? '/simplewebsite-app' : '/admin/social'} className="admin-nav-card card">
            <Sparkles size={24} />
            <h3>Social AI</h3>
            <p>{clientMode ? 'Manage your social content' : 'Manage client social content'}</p>
          </Link>
          {!clientMode && (
            <>
              <Link to="/admin/projects" className="admin-nav-card card">
                <FolderKanban size={24} />
                <h3>Client Projects</h3>
                <p>Deployments, onboarding & tracking</p>
              </Link>
              <Link to="/admin/templates" className="admin-nav-card card">
                <GitBranch size={24} />
                <h3>App Templates</h3>
                <p>Push updates to all client deployments</p>
              </Link>
              <Link to="/admin/apps" className="admin-nav-card card">
                <Store size={24} />
                <h3>App Marketplace</h3>
                <p>Apps, subscriptions & white-label</p>
              </Link>
              <Link to="/admin/invoices" className="admin-nav-card card">
                <FileText size={24} />
                <h3>Invoicing</h3>
                <p>Create & send invoices via Square</p>
              </Link>
            </>
          )}
          <Link to="/tickets" className="admin-nav-card card">
            <Ticket size={24} />
            <h3>{clientMode ? 'Support' : 'All Tickets'}</h3>
            <p>{clientMode ? 'Get help from Penny Wise I.T' : 'View & manage support tickets'}</p>
          </Link>
          <Link to="/admin/settings" className="admin-nav-card card">
            <Settings size={24} />
            <h3>Settings</h3>
            <p>{clientMode ? 'App configuration' : 'Payment, email, hosting & config'}</p>
          </Link>
        </div>

        {!clientMode && <div className="admin-stats">
          <div className="stat-card card">
            <div className="stat-icon" style={{ background: 'rgba(37,99,235,0.1)', color: '#2563eb' }}><Users size={24} /></div>
            <div className="stat-info"><strong>{stats.totalCustomers || 0}</strong><span>Total Customers</span></div>
          </div>
          <div className="stat-card card">
            <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}><TrendingUp size={24} /></div>
            <div className="stat-info"><strong>{stats.activeCustomers || 0}</strong><span>Active Customers</span></div>
          </div>
          <div className="stat-card card">
            <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}><AlertCircle size={24} /></div>
            <div className="stat-info"><strong>{stats.openTickets || 0}</strong><span>Open Tickets</span></div>
          </div>
          <div className="stat-card card">
            <div className="stat-icon" style={{ background: 'rgba(6,182,212,0.1)', color: '#06b6d4' }}><Workflow size={24} /></div>
            <div className="stat-info"><strong>{stats.activeWorkflows || 0}</strong><span>Active Workflows</span></div>
          </div>
        </div>}

        {!clientMode && data?.recentTickets && data.recentTickets.length > 0 && (
          <div className="admin-section">
            <div className="section-title">
              <h2>Recent Tickets</h2>
              <Link to="/tickets" className="btn btn-sm btn-secondary">View All <ArrowRight size={14} /></Link>
            </div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Ticket</th>
                    <th>Customer</th>
                    <th>Subject</th>
                    <th>Status</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentTickets.map(t => (
                    <tr key={t._id}>
                      <td><Link to={`/tickets/${t._id}`}>{t.ticketNumber}</Link></td>
                      <td>{t.customer?.firstName} {t.customer?.lastName}</td>
                      <td>{t.subject}</td>
                      <td><span className={`badge badge-${t.status === 'open' ? 'warning' : t.status === 'resolved' ? 'success' : 'info'}`}>{t.status}</span></td>
                      <td>{new Date(t.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
