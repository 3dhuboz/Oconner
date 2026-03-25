import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Server, RefreshCw, Shield, Database, HardDrive, Wifi, AlertTriangle, CheckCircle } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';
import './Admin.css';

const AdminSiteGround = () => {
  const [account, setAccount] = useState(null);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/siteground/account').catch(err => ({ data: err.response?.data || {} })),
      api.get('/siteground/sites').catch(err => ({ data: { configured: false, sites: [] } }))
    ]).then(([accRes, sitesRes]) => {
      setAccount(accRes.data);
      setSites(sitesRes.data.sites || []);
      setConfigured(sitesRes.data.configured || false);
      setLoading(false);
    });
  }, []);

  const purgeCache = async (siteId) => {
    try {
      await api.post(`/siteground/sites/${siteId}/cache/purge`);
      toast.success('Cache purged successfully');
    } catch (err) {
      toast.error('Failed to purge cache');
    }
  };

  const createBackup = async (siteId) => {
    try {
      await api.post(`/siteground/sites/${siteId}/backups`);
      toast.success('Backup initiated');
    } catch (err) {
      toast.error('Failed to create backup');
    }
  };

  if (loading) return <div className="page-loading">Loading SiteGround data...</div>;

  return (
    <div className="admin-page">
      <div className="container" style={{ padding: '2rem 1.5rem' }}>
        <Link to="/admin" className="back-link"><ArrowLeft size={16} /> Back to Admin</Link>
        <div className="admin-header">
          <div>
            <h1>SiteGround Management</h1>
            <p>Manage your GoGeek hosting account and client sites</p>
          </div>
        </div>

        {!configured ? (
          <div className="card" style={{ padding: '2.5rem', textAlign: 'center' }}>
            <AlertTriangle size={48} style={{ color: 'var(--warning)', marginBottom: '1rem' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem' }}>SiteGround API Not Configured</h2>
            <p style={{ color: 'var(--gray-500)', marginBottom: '1.5rem', maxWidth: 500, margin: '0 auto 1.5rem' }}>
              To integrate with your SiteGround GoGeek account, you need to configure the API token in your environment settings.
            </p>
            <div className="card" style={{ textAlign: 'left', maxWidth: 500, margin: '0 auto', padding: '1.5rem', background: 'var(--gray-50)' }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '1rem' }}>Setup Instructions</h3>
              <ol style={{ paddingLeft: '1.25rem', fontSize: '0.875rem', color: 'var(--gray-600)', lineHeight: 2 }}>
                <li>Log into your <strong>SiteGround Site Tools</strong> panel</li>
                <li>Navigate to <strong>Dev &gt; API</strong></li>
                <li>Generate a new API token for this application</li>
                <li>Open the <code>.env</code> file in the project root</li>
                <li>Set <code>SITEGROUND_API_TOKEN=your-token-here</code></li>
                <li>Restart the server</li>
              </ol>
            </div>

            <div className="card" style={{ textAlign: 'left', maxWidth: 500, margin: '1.5rem auto 0', padding: '1.5rem' }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '0.75rem' }}>What You'll Be Able To Do</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--gray-600)' }}>
                  <Server size={16} style={{ color: 'var(--primary)' }} /> View all hosted sites
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--gray-600)' }}>
                  <Database size={16} style={{ color: 'var(--primary)' }} /> Manage site backups
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--gray-600)' }}>
                  <RefreshCw size={16} style={{ color: 'var(--primary)' }} /> Purge site caches
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--gray-600)' }}>
                  <Shield size={16} style={{ color: 'var(--primary)' }} /> Check SSL status
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--gray-600)' }}>
                  <HardDrive size={16} style={{ color: 'var(--primary)' }} /> View site statistics
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--gray-600)' }}>
                  <Wifi size={16} style={{ color: 'var(--primary)' }} /> Monitor performance
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {account && (
              <div className="admin-stats" style={{ marginBottom: '2rem' }}>
                <div className="stat-card card">
                  <div className="stat-icon" style={{ background: 'rgba(37,99,235,0.1)', color: '#2563eb' }}><Server size={24} /></div>
                  <div className="stat-info"><strong>{sites.length}</strong><span>Hosted Sites</span></div>
                </div>
                <div className="stat-card card">
                  <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}><CheckCircle size={24} /></div>
                  <div className="stat-info"><strong>GoGeek</strong><span>Account Plan</span></div>
                </div>
                <div className="stat-card card">
                  <div className="stat-icon" style={{ background: 'rgba(6,182,212,0.1)', color: '#06b6d4' }}><Shield size={24} /></div>
                  <div className="stat-info"><strong>Active</strong><span>SSL Certificates</span></div>
                </div>
              </div>
            )}

            <div className="admin-section">
              <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Hosted Sites</h2>
              {sites.length === 0 ? (
                <div className="empty-state card"><p>No sites found. Your SiteGround sites will appear here once the API is connected.</p></div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                  {sites.map((site, idx) => (
                    <div key={idx} className="card" style={{ padding: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <h3 style={{ fontSize: '0.9375rem', fontWeight: 600 }}>{site.name || site.domain}</h3>
                        <span className="badge badge-success">Active</span>
                      </div>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginBottom: '1rem' }}>{site.domain}</p>
                      <div style={{ display: 'flex', gap: '0.375rem' }}>
                        <button onClick={() => purgeCache(site.id)} className="btn btn-sm btn-secondary"><RefreshCw size={14} /> Cache</button>
                        <button onClick={() => createBackup(site.id)} className="btn btn-sm btn-secondary"><Database size={14} /> Backup</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminSiteGround;
