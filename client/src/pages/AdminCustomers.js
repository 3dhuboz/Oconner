import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Plus, Search, Edit, UserCheck, UserX, Key, ShieldCheck,
  XCircle, ChevronDown, ChevronUp, Store, FileText, Zap
} from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';
import './Admin.css';

const AdminCustomers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', company: '', phone: '', hostingPlan: 'none', sitegroundSiteId: '' });
  // License management
  const [expandedCustomer, setExpandedCustomer] = useState(null);
  const [customerSubs, setCustomerSubs] = useState([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [licenseCustomer, setLicenseCustomer] = useState(null);
  const [apps, setApps] = useState([]);
  const [licenseForm, setLicenseForm] = useState({ appSlug: '', planKey: '' });

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = () => {
    api.get('/customers').then(res => { setCustomers(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  const filtered = customers.filter(c =>
    `${c.firstName} ${c.lastName} ${c.email} ${c.company}`.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditCustomer(null);
    setForm({ firstName: '', lastName: '', email: '', password: 'TempPass123!', company: '', phone: '', hostingPlan: 'none', sitegroundSiteId: '' });
    setShowModal(true);
  };

  const openEdit = (c) => {
    setEditCustomer(c);
    setForm({ firstName: c.firstName, lastName: c.lastName, email: c.email, password: '', company: c.company || '', phone: c.phone || '', hostingPlan: c.hostingPlan || 'none', sitegroundSiteId: c.sitegroundSiteId || '' });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editCustomer) {
        await api.put(`/customers/${editCustomer._id}`, form);
        toast.success('Customer updated');
      } else {
        await api.post('/customers', form);
        toast.success('Customer created');
      }
      setShowModal(false);
      loadCustomers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save customer');
    }
  };

  const toggleActive = async (c) => {
    try {
      await api.put(`/customers/${c._id}`, { ...c, isActive: !c.isActive });
      toast.success(`Customer ${c.isActive ? 'deactivated' : 'activated'}`);
      loadCustomers();
    } catch (err) {
      toast.error('Failed to update customer');
    }
  };

  const update = (field, value) => setForm({ ...form, [field]: value });

  // License management functions
  const toggleExpand = async (customerId) => {
    if (expandedCustomer === customerId) {
      setExpandedCustomer(null);
      return;
    }
    setExpandedCustomer(customerId);
    setLoadingSubs(true);
    try {
      const res = await api.get(`/marketplace/admin/subscriptions?userId=${customerId}`);
      setCustomerSubs(res.data);
    } catch { setCustomerSubs([]); }
    setLoadingSubs(false);
  };

  const openIssueLicense = async (customer) => {
    setLicenseCustomer(customer);
    setLicenseForm({ appSlug: '', planKey: '' });
    if (apps.length === 0) {
      try {
        const res = await api.get('/marketplace/admin/apps');
        setApps(res.data);
      } catch { setApps([]); }
    }
    setShowLicenseModal(true);
  };

  const handleIssueLicense = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/marketplace/admin/subscribe', {
        userId: licenseCustomer._id,
        appSlug: licenseForm.appSlug,
        planKey: licenseForm.planKey
      });
      toast.success(res.data.message);
      setShowLicenseModal(false);
      // Refresh expanded subs
      if (expandedCustomer === licenseCustomer._id) {
        const subsRes = await api.get(`/marketplace/admin/subscriptions?userId=${licenseCustomer._id}`);
        setCustomerSubs(subsRes.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to issue license');
    }
  };

  const revokeLicense = async (subId) => {
    if (!window.confirm('Revoke this license? The customer will lose access.')) return;
    try {
      await api.post('/marketplace/admin/cancel', { subscriptionId: subId });
      toast.success('License revoked');
      if (expandedCustomer) {
        const subsRes = await api.get(`/marketplace/admin/subscriptions?userId=${expandedCustomer}`);
        setCustomerSubs(subsRes.data);
      }
    } catch (err) {
      toast.error('Failed to revoke license');
    }
  };

  const selectedApp = apps.find(a => a.slug === licenseForm.appSlug);

  if (loading) return <div className="page-loading">Loading customers...</div>;

  return (
    <div className="admin-page">
      <div className="container" style={{ padding: '2rem 1.5rem' }}>
        <Link to="/admin" className="back-link"><ArrowLeft size={16} /> Back to Admin</Link>
        <div className="admin-header">
          <h1>Customer Management</h1>
          <button onClick={openCreate} className="btn btn-primary"><Plus size={16} /> Add Customer</button>
        </div>

        <div className="tickets-toolbar card" style={{ marginBottom: '1.5rem' }}>
          <div className="search-box">
            <Search size={16} />
            <input type="text" placeholder="Search customers..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <span style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>{filtered.length} customers</span>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th></th>
                <th>Name</th>
                <th>Email</th>
                <th>Company</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <React.Fragment key={c._id}>
                  <tr>
                    <td style={{ width: 30, cursor: 'pointer' }} onClick={() => toggleExpand(c._id)}>
                      {expandedCustomer === c._id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </td>
                    <td style={{ fontWeight: 600 }}>{c.firstName} {c.lastName}</td>
                    <td>{c.email}</td>
                    <td>{c.company || '-'}</td>
                    <td>
                      <span className={`badge ${c.isActive ? 'badge-success' : 'badge-danger'}`}>
                        {c.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.375rem' }}>
                        <button onClick={() => openEdit(c)} className="btn btn-sm btn-secondary" title="Edit"><Edit size={14} /></button>
                        <button onClick={() => openIssueLicense(c)} className="btn btn-sm btn-primary" title="Issue License"><Key size={14} /></button>
                        <button onClick={() => toggleActive(c)} className={`btn btn-sm ${c.isActive ? 'btn-danger' : 'btn-primary'}`} title={c.isActive ? 'Deactivate' : 'Activate'}>
                          {c.isActive ? <UserX size={14} /> : <UserCheck size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {/* Expanded license row */}
                  {expandedCustomer === c._id && (
                    <tr>
                      <td colSpan="7" style={{ padding: '1rem 1.5rem', background: '#f8fafc', borderTop: 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                          <Store size={16} style={{ color: '#6366f1' }} />
                          <strong style={{ fontSize: '0.875rem' }}>App Licenses</strong>
                          <button onClick={() => openIssueLicense(c)} className="btn btn-sm btn-primary" style={{ marginLeft: 'auto' }}>
                            <Plus size={12} /> Issue License
                          </button>
                        </div>
                        {loadingSubs ? (
                          <p style={{ color: '#94a3b8', fontSize: '0.8125rem' }}>Loading...</p>
                        ) : customerSubs.length === 0 ? (
                          <p style={{ color: '#94a3b8', fontSize: '0.8125rem' }}>No active licenses</p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {customerSubs.map(sub => (
                              <div key={sub._id} style={{
                                display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem',
                                background: 'white', borderRadius: 8, border: '1px solid #e2e8f0'
                              }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: 700, fontSize: '0.8125rem' }}>{sub.app?.name || 'Unknown App'}</div>
                                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                    {sub.planKey} plan · ${sub.amount}/{sub.billingInterval === 'yearly' ? 'yr' : 'mo'}
                                  </div>
                                </div>
                                <span style={{
                                  padding: '3px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700,
                                  background: sub.status === 'active' ? '#dcfce7' : '#fef2f2',
                                  color: sub.status === 'active' ? '#16a34a' : '#dc2626'
                                }}>
                                  {sub.status}
                                </span>
                                <Link to="/admin/invoices" className="btn btn-sm btn-secondary" title="Invoice">
                                  <FileText size={13} />
                                </Link>
                                {sub.status === 'active' && (
                                  <button onClick={() => revokeLicense(sub._id)} className="btn btn-sm btn-danger" title="Revoke">
                                    <XCircle size={13} />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Create/Edit Customer Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <h2>{editCustomer ? 'Edit Customer' : 'Add Customer'}</h2>
              <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label>First Name *</label>
                    <input type="text" required value={form.firstName} onChange={e => update('firstName', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Last Name *</label>
                    <input type="text" required value={form.lastName} onChange={e => update('lastName', e.target.value)} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <input type="email" required value={form.email} onChange={e => update('email', e.target.value)} disabled={!!editCustomer} />
                </div>
                {!editCustomer && (
                  <div className="form-group">
                    <label>Temporary Password</label>
                    <input type="text" value={form.password} onChange={e => update('password', e.target.value)} />
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label>Company</label>
                    <input type="text" value={form.company} onChange={e => update('company', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input type="tel" value={form.phone} onChange={e => update('phone', e.target.value)} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label>Hosting Plan</label>
                    <select value={form.hostingPlan} onChange={e => update('hostingPlan', e.target.value)}>
                      <option value="none">None</option>
                      <option value="basic">Basic</option>
                      <option value="standard">Standard</option>
                      <option value="premium">Premium</option>
                      <option value="gogeek">GoGeek</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>SiteGround Site ID</label>
                    <input type="text" value={form.sitegroundSiteId} onChange={e => update('sitegroundSiteId', e.target.value)} placeholder="Optional" />
                  </div>
                </div>
                <div className="modal-actions">
                  <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
                  <button type="submit" className="btn btn-primary">{editCustomer ? 'Update' : 'Create'} Customer</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Issue License Modal */}
        {showLicenseModal && licenseCustomer && (
          <div className="modal-overlay" onClick={() => setShowLicenseModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
              <h2><Key size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Issue License</h2>
              <p style={{ color: '#64748b', fontSize: '0.8125rem', marginBottom: '1rem' }}>
                Issue an app license to <strong>{licenseCustomer.firstName} {licenseCustomer.lastName}</strong> ({licenseCustomer.email})
              </p>
              <form onSubmit={handleIssueLicense}>
                <div className="form-group">
                  <label>App *</label>
                  <select required value={licenseForm.appSlug} onChange={e => setLicenseForm({ ...licenseForm, appSlug: e.target.value, planKey: '' })}>
                    <option value="">Select an app...</option>
                    {apps.filter(a => a.isActive).map(a => (
                      <option key={a.slug} value={a.slug}>{a.name}</option>
                    ))}
                  </select>
                </div>
                {selectedApp && (
                  <div className="form-group">
                    <label>Plan *</label>
                    <select required value={licenseForm.planKey} onChange={e => setLicenseForm({ ...licenseForm, planKey: e.target.value })}>
                      <option value="">Select a plan...</option>
                      {selectedApp.plans.map(p => (
                        <option key={p.key} value={p.key}>{p.name} — ${p.price}/mo{p.yearlyPrice ? ` ($${p.yearlyPrice}/yr)` : ''}</option>
                      ))}
                    </select>
                  </div>
                )}
                {selectedApp && licenseForm.planKey && (
                  <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.8125rem', color: '#166534' }}>
                    <ShieldCheck size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                    <strong>{selectedApp.name}</strong> — {licenseForm.planKey} plan will be activated immediately for this customer.
                    {selectedApp.setupFee > 0 && <span> Setup fee: ${selectedApp.setupFee}.</span>}
                  </div>
                )}
                <div className="modal-actions">
                  <button type="button" onClick={() => setShowLicenseModal(false)} className="btn btn-secondary">Cancel</button>
                  <button type="submit" className="btn btn-primary"><Zap size={14} /> Activate License</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCustomers;
