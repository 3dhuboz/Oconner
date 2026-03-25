import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Sparkles, Users, BarChart3, Instagram, Facebook,
  FileText, Clock, CheckCircle, Edit, Eye, Crown, Zap, XCircle, Palette
} from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';
import './Admin.css';

const AdminSocial = () => {
  const [data, setData] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [showModal, setShowModal] = useState(false);

  const loadAll = () => {
    Promise.all([
      api.get('/social/admin/stats').catch(() => ({ data: null })),
      api.get('/customers').catch(() => ({ data: [] })),
      api.get('/social/admin/subscribers').catch(() => ({ data: [] }))
    ]).then(([statsRes, custRes, subsRes]) => {
      setData(statsRes.data);
      setCustomers(custRes.data);
      setSubscribers(subsRes.data);
      setLoading(false);
    });
  };

  useEffect(() => { loadAll(); }, []);

  const viewUserSocial = async (userId) => {
    setSelectedUser(userId);
    try {
      const [profileRes, postsRes] = await Promise.all([
        api.get(`/social/admin/profile/${userId}`),
        api.get(`/social/posts?userId=${userId}`)
      ]);
      setUserProfile(profileRes.data);
      setUserPosts(postsRes.data);
      setShowModal(true);
    } catch (err) {
      toast.error('Failed to load user social data');
    }
  };

  const updateUserProfile = async () => {
    try {
      await api.put(`/social/admin/profile/${selectedUser}`, userProfile);
      toast.success('Social profile updated');
    } catch (err) {
      toast.error('Failed to update profile');
    }
  };

  const activatePlan = async (userId, plan) => {
    try {
      await api.post(`/social/admin/subscribe/${userId}`, { plan });
      toast.success(`${plan} plan activated`);
      loadAll();
    } catch (err) {
      toast.error('Failed to activate plan');
    }
  };

  const cancelPlan = async (userId) => {
    if (!window.confirm('Cancel this user\'s subscription?')) return;
    try {
      await api.post(`/social/admin/cancel-subscription/${userId}`);
      toast.success('Subscription cancelled');
      loadAll();
    } catch (err) {
      toast.error('Failed to cancel subscription');
    }
  };

  if (loading) return <div className="page-loading">Loading social admin...</div>;

  const stats = data?.stats || {};
  const activeSubscribers = subscribers.filter(s => s.subscription?.status === 'active');
  const totalRevenue = activeSubscribers.reduce((sum, s) => sum + (s.subscription?.amount || 0), 0);

  return (
    <div className="admin-page">
      <div className="container" style={{ padding: '2rem 1.5rem' }}>
        <Link to="/admin" className="back-link"><ArrowLeft size={16} /> Back to Admin</Link>
        <div className="admin-header">
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={24} style={{ color: '#f59e0b' }} /> Social AI Management
            </h1>
            <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>
              Manage customer social media AI profiles and content
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="admin-stats">
          <div className="stat-card card">
            <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}><Crown size={24} /></div>
            <div className="stat-info"><strong>{activeSubscribers.length}</strong><span>Active Subscribers</span></div>
          </div>
          <div className="stat-card card">
            <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}><BarChart3 size={24} /></div>
            <div className="stat-info"><strong>${totalRevenue}</strong><span>Monthly Revenue</span></div>
          </div>
          <div className="stat-card card">
            <div className="stat-icon" style={{ background: 'rgba(37,99,235,0.1)', color: '#2563eb' }}><FileText size={24} /></div>
            <div className="stat-info"><strong>{stats.totalPosts || 0}</strong><span>Total Posts</span></div>
          </div>
          <div className="stat-card card">
            <div className="stat-icon" style={{ background: 'rgba(6,182,212,0.1)', color: '#06b6d4' }}><Clock size={24} /></div>
            <div className="stat-info"><strong>{stats.scheduledPosts || 0}</strong><span>Scheduled</span></div>
          </div>
        </div>

        {/* Active Subscribers */}
        {subscribers.length > 0 && (
          <div className="admin-section" style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Crown size={18} style={{ color: '#f59e0b' }} /> Subscribers
            </h2>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Plan</th>
                    <th>Status</th>
                    <th>Amount</th>
                    <th>Brand Name</th>
                    <th>Started</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subscribers.map(s => (
                    <tr key={s._id}>
                      <td style={{ fontWeight: 600 }}>{s.user?.firstName} {s.user?.lastName}</td>
                      <td>
                        <span style={{
                          textTransform: 'capitalize', fontWeight: 700, fontSize: '0.8125rem',
                          color: s.subscription?.plan === 'enterprise' ? '#a855f7' : s.subscription?.plan === 'professional' ? '#f59e0b' : '#3b82f6'
                        }}>
                          {s.subscription?.plan}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${s.subscription?.status === 'active' ? 'badge-success' : 'badge-gray'}`}>
                          {s.subscription?.status}
                        </span>
                      </td>
                      <td>${s.subscription?.amount || 0}/mo</td>
                      <td>
                        {s.whiteLabel?.brandName ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Palette size={12} style={{ color: s.whiteLabel.primaryColor || '#f59e0b' }} />
                            {s.whiteLabel.brandName}
                          </span>
                        ) : <span style={{ color: 'var(--gray-400)' }}>—</span>}
                      </td>
                      <td style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>
                        {s.subscription?.startDate ? new Date(s.subscription.startDate).toLocaleDateString() : '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                          {s.subscription?.plan !== 'enterprise' && s.subscription?.status === 'active' && (
                            <button
                              onClick={() => activatePlan(s.user?._id, s.subscription?.plan === 'starter' ? 'professional' : 'enterprise')}
                              className="btn btn-sm btn-primary"
                              style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem' }}
                            >
                              <Zap size={12} /> Upgrade
                            </button>
                          )}
                          {s.subscription?.status === 'active' && (
                            <button
                              onClick={() => cancelPlan(s.user?._id)}
                              className="btn btn-sm btn-danger"
                              style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem' }}
                            >
                              <XCircle size={12} /> Cancel
                            </button>
                          )}
                          <button onClick={() => viewUserSocial(s.user?._id)} className="btn btn-sm btn-secondary" style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem' }}>
                            <Eye size={12} /> View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Platform breakdown */}
        {data?.postsByPlatform && data.postsByPlatform.length > 0 && (
          <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '0.75rem' }}>Posts by Platform</h3>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              {data.postsByPlatform.map(p => (
                <div key={p._id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {p._id === 'Instagram' ? <Instagram size={18} style={{ color: '#e1306c' }} /> : <Facebook size={18} style={{ color: '#1877f2' }} />}
                  <span style={{ fontWeight: 600 }}>{p.count}</span>
                  <span style={{ color: 'var(--gray-500)', fontSize: '0.8125rem' }}>{p._id}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Customer Social Profiles */}
        <div className="admin-section">
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={18} /> Customer Social Profiles
          </h2>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Email</th>
                  <th>Company</th>
                  <th>Social Profile</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map(c => (
                  <tr key={c._id}>
                    <td style={{ fontWeight: 600 }}>{c.firstName} {c.lastName}</td>
                    <td>{c.email}</td>
                    <td>{c.company || '-'}</td>
                    <td>
                      <span className="badge badge-info">
                        {stats.totalProfiles > 0 ? 'Configured' : 'Not Set'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.375rem' }}>
                        <button onClick={() => viewUserSocial(c._id)} className="btn btn-sm btn-secondary">
                          <Eye size={14} /> View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Posts */}
        {data?.recentPosts && data.recentPosts.length > 0 && (
          <div className="admin-section" style={{ marginTop: '1.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Recent Posts (All Users)</h2>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Platform</th>
                    <th>Content</th>
                    <th>Status</th>
                    <th>Scheduled</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentPosts.map(p => (
                    <tr key={p._id}>
                      <td style={{ fontWeight: 500 }}>{p.user?.firstName} {p.user?.lastName}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          {p.platform === 'Instagram' ? <Instagram size={14} style={{ color: '#e1306c' }} /> : <Facebook size={14} style={{ color: '#1877f2' }} />}
                          {p.platform}
                        </div>
                      </td>
                      <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.content}</td>
                      <td>
                        <span className={`badge ${p.status === 'Posted' ? 'badge-success' : p.status === 'Scheduled' ? 'badge-info' : 'badge-gray'}`}>
                          {p.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>{new Date(p.scheduledFor).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* User Social Detail Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
              <h2>Social AI Profile</h2>

              {userProfile && !userProfile.message ? (
                <>
                  {/* Subscription Management */}
                  <div style={{ background: 'var(--gray-50)', borderRadius: 8, padding: '1rem', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <Crown size={14} style={{ color: '#f59e0b' }} /> Subscription
                    </h3>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', fontSize: '0.8125rem' }}>
                      <span>
                        Plan: <strong style={{ textTransform: 'capitalize' }}>{userProfile.subscription?.plan || 'none'}</strong>
                      </span>
                      <span>
                        Status: <span className={`badge ${userProfile.subscription?.status === 'active' ? 'badge-success' : 'badge-gray'}`}>
                          {userProfile.subscription?.status || 'inactive'}
                        </span>
                      </span>
                      {userProfile.whiteLabel?.brandName && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Palette size={12} /> Brand: <strong>{userProfile.whiteLabel.brandName}</strong>
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                      {['starter', 'professional', 'enterprise'].map(plan => (
                        <button
                          key={plan}
                          onClick={() => activatePlan(selectedUser, plan)}
                          className={`btn btn-sm ${userProfile.subscription?.plan === plan ? 'btn-secondary' : 'btn-primary'}`}
                          style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem', textTransform: 'capitalize' }}
                          disabled={userProfile.subscription?.plan === plan && userProfile.subscription?.status === 'active'}
                        >
                          {userProfile.subscription?.plan === plan && userProfile.subscription?.status === 'active' ? <CheckCircle size={10} /> : <Zap size={10} />} {plan}
                        </button>
                      ))}
                      {userProfile.subscription?.status === 'active' && (
                        <button onClick={() => cancelPlan(selectedUser)} className="btn btn-sm btn-danger" style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem' }}>
                          <XCircle size={10} /> Cancel
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group">
                      <label>Business Name</label>
                      <input value={userProfile.businessName || ''} onChange={e => setUserProfile({...userProfile, businessName: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label>Business Type</label>
                      <input value={userProfile.businessType || ''} onChange={e => setUserProfile({...userProfile, businessType: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label>Location</label>
                      <input value={userProfile.location || ''} onChange={e => setUserProfile({...userProfile, location: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label>Tone</label>
                      <input value={userProfile.tone || ''} onChange={e => setUserProfile({...userProfile, tone: e.target.value})} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Gemini API Key</label>
                    <input type="password" value={userProfile.geminiApiKey || ''} onChange={e => setUserProfile({...userProfile, geminiApiKey: e.target.value})} placeholder="Paste API key for this customer..." />
                  </div>

                  <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, margin: '1.25rem 0 0.75rem' }}>Posts ({userPosts.length})</h3>
                  {userPosts.length === 0 ? (
                    <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>No social posts for this user.</p>
                  ) : (
                    <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {userPosts.slice(0, 10).map(p => (
                        <div key={p._id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', background: 'var(--gray-50)', borderRadius: 6, fontSize: '0.8125rem' }}>
                          {p.platform === 'Instagram' ? <Instagram size={12} style={{ color: '#e1306c' }} /> : <Facebook size={12} style={{ color: '#1877f2' }} />}
                          <span className={`badge ${p.status === 'Posted' ? 'badge-success' : p.status === 'Scheduled' ? 'badge-info' : 'badge-gray'}`} style={{ fontSize: '0.6875rem' }}>
                            {p.status}
                          </span>
                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.content}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <p style={{ color: 'var(--gray-500)' }}>No social profile configured for this user yet. You can set one up below.</p>
              )}

              <div className="modal-actions">
                <button onClick={() => setShowModal(false)} className="btn btn-secondary">Close</button>
                <button onClick={updateUserProfile} className="btn btn-primary"><Edit size={14} /> Save Profile</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSocial;
