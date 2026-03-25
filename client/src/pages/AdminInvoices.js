import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Plus, Search, FileText, Send, CheckCircle, XCircle, Clock,
  DollarSign, Copy, Trash2, Edit, AlertTriangle, Filter, MoreVertical,
  CreditCard, RefreshCw, ChevronDown, X
} from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';
import './Admin.css';

const STATUS_COLORS = {
  draft: { bg: '#f1f5f9', color: '#475569', label: 'Draft' },
  sent: { bg: '#dbeafe', color: '#2563eb', label: 'Sent' },
  paid: { bg: '#dcfce7', color: '#16a34a', label: 'Paid' },
  overdue: { bg: '#fef2f2', color: '#dc2626', label: 'Overdue' },
  cancelled: { bg: '#f1f5f9', color: '#94a3b8', label: 'Cancelled' },
  void: { bg: '#f1f5f9', color: '#94a3b8', label: 'Void' }
};

const TYPE_LABELS = { 'one-off': 'One-Off', 'recurring': 'Recurring', 'setup': 'Setup Fee' };

const AdminInvoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [showFromSub, setShowFromSub] = useState(false);
  const [editInvoice, setEditInvoice] = useState(null);
  const [actionMenuId, setActionMenuId] = useState(null);

  const [form, setForm] = useState({
    customerId: '', type: 'one-off', recurringInterval: 'monthly',
    dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    notes: '', lineItems: [{ description: '', quantity: 1, unitPrice: 0 }]
  });

  const [subForm, setSubForm] = useState({ subscriptionId: '', includeSetupFee: true });

  const loadData = useCallback(async () => {
    try {
      const query = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      const [invRes, statsRes, custRes] = await Promise.all([
        api.get(`/invoices${query}`),
        api.get('/invoices/stats/summary'),
        api.get('/customers')
      ]);
      setInvoices(invRes.data);
      setStats(statsRes.data);
      setCustomers(custRes.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const loadSubscriptions = async (customerId) => {
    if (!customerId) { setSubscriptions([]); return; }
    try {
      const res = await api.get(`/marketplace/admin/subscriptions?userId=${customerId}`);
      setSubscriptions(res.data.filter(s => s.status === 'active'));
    } catch { setSubscriptions([]); }
  };

  const filtered = invoices.filter(inv => {
    if (!search) return true;
    const name = `${inv.customer?.firstName || ''} ${inv.customer?.lastName || ''} ${inv.customer?.email || ''} ${inv.invoiceNumber || ''}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  // ── Form handlers ──
  const resetForm = () => {
    setForm({
      customerId: '', type: 'one-off', recurringInterval: 'monthly',
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      notes: '', lineItems: [{ description: '', quantity: 1, unitPrice: 0 }]
    });
    setEditInvoice(null);
  };

  const openCreate = () => { resetForm(); setShowCreate(true); };

  const openEdit = (inv) => {
    setEditInvoice(inv);
    setForm({
      customerId: inv.customer?._id || '',
      type: inv.type,
      recurringInterval: inv.recurringInterval || 'monthly',
      dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString().split('T')[0] : '',
      notes: inv.notes || '',
      lineItems: inv.lineItems.length > 0 ? inv.lineItems.map(li => ({
        description: li.description, quantity: li.quantity, unitPrice: li.unitPrice
      })) : [{ description: '', quantity: 1, unitPrice: 0 }]
    });
    setShowCreate(true);
  };

  const addLineItem = () => setForm({ ...form, lineItems: [...form.lineItems, { description: '', quantity: 1, unitPrice: 0 }] });
  const removeLineItem = (idx) => setForm({ ...form, lineItems: form.lineItems.filter((_, i) => i !== idx) });
  const updateLineItem = (idx, field, value) => {
    const items = [...form.lineItems];
    items[idx] = { ...items[idx], [field]: value };
    setForm({ ...form, lineItems: items });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editInvoice) {
        await api.put(`/invoices/${editInvoice._id}`, form);
        toast.success('Invoice updated');
      } else {
        await api.post('/invoices', form);
        toast.success('Invoice created');
      }
      setShowCreate(false);
      resetForm();
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleFromSub = async (e) => {
    e.preventDefault();
    try {
      await api.post('/invoices/from-subscription', subForm);
      toast.success('Invoice created from subscription');
      setShowFromSub(false);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  // ── Actions ──
  const sendInvoice = async (id) => {
    try {
      const res = await api.post(`/invoices/${id}/send`);
      toast.success(res.data.message);
      loadData();
    } catch (err) { toast.error(err.response?.data?.message || 'Send failed'); }
    setActionMenuId(null);
  };

  const markPaid = async (id) => {
    try {
      await api.post(`/invoices/${id}/mark-paid`);
      toast.success('Marked as paid');
      loadData();
    } catch (err) { toast.error('Failed'); }
    setActionMenuId(null);
  };

  const markOverdue = async (id) => {
    try {
      await api.post(`/invoices/${id}/mark-overdue`);
      toast.success('Marked as overdue');
      loadData();
    } catch (err) { toast.error('Failed'); }
    setActionMenuId(null);
  };

  const cancelInvoice = async (id) => {
    try {
      await api.post(`/invoices/${id}/cancel`);
      toast.success('Invoice cancelled');
      loadData();
    } catch (err) { toast.error('Failed'); }
    setActionMenuId(null);
  };

  const duplicateInvoice = async (id) => {
    try {
      await api.post(`/invoices/${id}/duplicate`);
      toast.success('Invoice duplicated');
      loadData();
    } catch (err) { toast.error('Failed'); }
    setActionMenuId(null);
  };

  const deleteInvoice = async (id) => {
    if (!window.confirm('Delete this draft invoice?')) return;
    try {
      await api.delete(`/invoices/${id}`);
      toast.success('Invoice deleted');
      loadData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    setActionMenuId(null);
  };

  const calcSubtotal = () => form.lineItems.reduce((s, li) => s + (li.quantity || 1) * (li.unitPrice || 0), 0);

  if (loading) return <div className="page-loading">Loading invoices...</div>;

  return (
    <div className="admin-page">
      <div className="container" style={{ padding: '2rem 1.5rem' }}>
        <Link to="/admin" className="back-link"><ArrowLeft size={16} /> Back to Admin</Link>

        <div className="admin-header">
          <h1><FileText size={28} style={{ marginRight: 8 }} /> Invoicing</h1>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={() => setShowFromSub(true)} className="btn btn-secondary"><RefreshCw size={14} /> From Subscription</button>
            <button onClick={openCreate} className="btn btn-primary"><Plus size={16} /> New Invoice</button>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            {[
              { label: 'Total Revenue', value: `$${stats.totalRevenue.toFixed(0)}`, icon: <DollarSign size={18} />, color: '#16a34a' },
              { label: 'Outstanding', value: `$${stats.outstanding.toFixed(0)}`, icon: <Clock size={18} />, color: '#f59e0b' },
              { label: 'Paid', value: stats.paidCount, icon: <CheckCircle size={18} />, color: '#16a34a' },
              { label: 'Sent', value: stats.sentCount, icon: <Send size={18} />, color: '#2563eb' },
              { label: 'Overdue', value: stats.overdueCount, icon: <AlertTriangle size={18} />, color: '#dc2626' },
              { label: 'Draft', value: stats.draftCount, icon: <FileText size={18} />, color: '#64748b' }
            ].map((s, i) => (
              <div key={i} className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: `${s.color}15`, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.icon}</div>
                <div><div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>{s.value}</div><div style={{ fontSize: '0.7rem', color: '#64748b' }}>{s.label}</div></div>
              </div>
            ))}
          </div>
        )}

        {/* Toolbar */}
        <div className="tickets-toolbar card" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="search-box" style={{ flex: 1, minWidth: 200 }}>
            <Search size={16} />
            <input type="text" placeholder="Search invoices..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            {['all', 'draft', 'sent', 'paid', 'overdue', 'cancelled'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-secondary'}`}
                style={{ textTransform: 'capitalize', fontSize: '0.75rem' }}>
                {s === 'all' ? 'All' : s}
              </button>
            ))}
          </div>
        </div>

        {/* Invoice Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Customer</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Due Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>No invoices found</td></tr>
              )}
              {filtered.map(inv => {
                const st = STATUS_COLORS[inv.status] || STATUS_COLORS.draft;
                return (
                  <tr key={inv._id}>
                    <td style={{ fontWeight: 700, fontSize: '0.8125rem' }}>{inv.invoiceNumber}</td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{inv.customer?.firstName} {inv.customer?.lastName}</div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{inv.customer?.email}</div>
                    </td>
                    <td><span className="badge badge-info" style={{ fontSize: '0.7rem' }}>{TYPE_LABELS[inv.type] || inv.type}</span></td>
                    <td style={{ fontWeight: 700 }}>${inv.total?.toFixed(2)}</td>
                    <td><span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700, background: st.bg, color: st.color }}>{st.label}</span></td>
                    <td style={{ fontSize: '0.8rem', color: '#64748b' }}>{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-AU') : '-'}</td>
                    <td>
                      <div style={{ position: 'relative' }}>
                        <button onClick={() => setActionMenuId(actionMenuId === inv._id ? null : inv._id)} className="btn btn-sm btn-secondary">
                          <MoreVertical size={14} />
                        </button>
                        {actionMenuId === inv._id && (
                          <div style={{
                            position: 'absolute', right: 0, top: '100%', background: 'white', border: '1px solid #e2e8f0',
                            borderRadius: 8, boxShadow: '0 8px 30px rgba(0,0,0,0.12)', zIndex: 50, minWidth: 160, padding: '4px 0'
                          }}>
                            {inv.status === 'draft' && <>
                              <button onClick={() => openEdit(inv)} style={menuBtnStyle}><Edit size={13} /> Edit</button>
                              <button onClick={() => sendInvoice(inv._id)} style={menuBtnStyle}><Send size={13} /> Send</button>
                              <button onClick={() => deleteInvoice(inv._id)} style={{ ...menuBtnStyle, color: '#dc2626' }}><Trash2 size={13} /> Delete</button>
                            </>}
                            {inv.status === 'sent' && <>
                              <button onClick={() => markPaid(inv._id)} style={menuBtnStyle}><CheckCircle size={13} /> Mark Paid</button>
                              <button onClick={() => markOverdue(inv._id)} style={menuBtnStyle}><AlertTriangle size={13} /> Mark Overdue</button>
                              <button onClick={() => cancelInvoice(inv._id)} style={{ ...menuBtnStyle, color: '#dc2626' }}><XCircle size={13} /> Cancel</button>
                            </>}
                            {inv.status === 'overdue' && <>
                              <button onClick={() => markPaid(inv._id)} style={menuBtnStyle}><CheckCircle size={13} /> Mark Paid</button>
                              <button onClick={() => sendInvoice(inv._id)} style={menuBtnStyle}><Send size={13} /> Resend</button>
                              <button onClick={() => cancelInvoice(inv._id)} style={{ ...menuBtnStyle, color: '#dc2626' }}><XCircle size={13} /> Cancel</button>
                            </>}
                            {inv.status === 'paid' && <>
                              <button onClick={() => duplicateInvoice(inv._id)} style={menuBtnStyle}><Copy size={13} /> Duplicate</button>
                            </>}
                            {inv.status === 'cancelled' && <>
                              <button onClick={() => duplicateInvoice(inv._id)} style={menuBtnStyle}><Copy size={13} /> Re-issue</button>
                            </>}
                            {inv.squarePaymentUrl && (
                              <a href={inv.squarePaymentUrl} target="_blank" rel="noopener noreferrer" style={{ ...menuBtnStyle, textDecoration: 'none' }}><CreditCard size={13} /> Square Link</a>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Create/Edit Invoice Modal */}
        {showCreate && (
          <div className="modal-overlay" onClick={() => { setShowCreate(false); resetForm(); }}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 640, maxHeight: '90vh', overflow: 'auto' }}>
              <h2>{editInvoice ? 'Edit Invoice' : 'New Invoice'}</h2>
              <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label>Customer *</label>
                    <select required value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value })} disabled={!!editInvoice}>
                      <option value="">Select customer...</option>
                      {customers.map(c => <option key={c._id} value={c._id}>{c.firstName} {c.lastName} ({c.email})</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Type</label>
                    <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                      <option value="one-off">One-Off</option>
                      <option value="recurring">Recurring</option>
                      <option value="setup">Setup Fee</option>
                    </select>
                  </div>
                </div>

                {form.type === 'recurring' && (
                  <div className="form-group">
                    <label>Recurring Interval</label>
                    <select value={form.recurringInterval} onChange={e => setForm({ ...form, recurringInterval: e.target.value })}>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                )}

                <div className="form-group">
                  <label>Due Date</label>
                  <input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
                </div>

                {/* Line Items */}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ fontWeight: 700, fontSize: '0.8125rem', marginBottom: '0.5rem', display: 'block' }}>Line Items</label>
                  {form.lineItems.map((li, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 0.5fr 1fr auto', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'end' }}>
                      <input type="text" placeholder="Description" value={li.description} onChange={e => updateLineItem(idx, 'description', e.target.value)} required />
                      <input type="number" placeholder="Qty" min="1" value={li.quantity} onChange={e => updateLineItem(idx, 'quantity', parseInt(e.target.value) || 1)} />
                      <input type="number" placeholder="Unit Price" min="0" step="0.01" value={li.unitPrice} onChange={e => updateLineItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)} />
                      {form.lineItems.length > 1 && (
                        <button type="button" onClick={() => removeLineItem(idx)} className="btn btn-sm btn-danger" style={{ height: 38 }}><X size={14} /></button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={addLineItem} className="btn btn-sm btn-secondary"><Plus size={14} /> Add Line</button>
                </div>

                {/* Totals */}
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: 8, marginBottom: '1rem', fontSize: '0.875rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Subtotal</span><strong>${calcSubtotal().toFixed(2)}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}><span>GST (10%)</span><span>${(calcSubtotal() * 0.1).toFixed(2)}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.125rem', borderTop: '2px solid #e2e8f0', paddingTop: 8, marginTop: 8 }}>
                    <span>Total</span><span>${(calcSubtotal() * 1.1).toFixed(2)} AUD</span>
                  </div>
                </div>

                <div className="form-group">
                  <label>Notes (shown on invoice)</label>
                  <textarea rows="2" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Payment terms, thank you message, etc." />
                </div>

                <div className="modal-actions">
                  <button type="button" onClick={() => { setShowCreate(false); resetForm(); }} className="btn btn-secondary">Cancel</button>
                  <button type="submit" className="btn btn-primary">{editInvoice ? 'Update' : 'Create'} Invoice</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Quick Invoice from Subscription */}
        {showFromSub && (
          <div className="modal-overlay" onClick={() => setShowFromSub(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
              <h2>Invoice from Subscription</h2>
              <p style={{ color: '#64748b', fontSize: '0.8125rem', marginBottom: '1rem' }}>Auto-generate an invoice from an active subscription.</p>
              <form onSubmit={handleFromSub}>
                <div className="form-group">
                  <label>Customer</label>
                  <select value={subForm.customerId || ''} onChange={e => { setSubForm({ ...subForm, customerId: e.target.value }); loadSubscriptions(e.target.value); }}>
                    <option value="">Select customer...</option>
                    {customers.map(c => <option key={c._id} value={c._id}>{c.firstName} {c.lastName} ({c.email})</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Subscription</label>
                  <select required value={subForm.subscriptionId} onChange={e => setSubForm({ ...subForm, subscriptionId: e.target.value })}>
                    <option value="">Select subscription...</option>
                    {subscriptions.map(s => (
                      <option key={s._id} value={s._id}>
                        {s.app?.name || 'App'} — {s.planKey} (${s.amount}/{s.billingInterval === 'yearly' ? 'yr' : 'mo'})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="checkbox" checked={subForm.includeSetupFee} onChange={e => setSubForm({ ...subForm, includeSetupFee: e.target.checked })} />
                    Include setup fee (if unpaid)
                  </label>
                </div>
                <div className="modal-actions">
                  <button type="button" onClick={() => setShowFromSub(false)} className="btn btn-secondary">Cancel</button>
                  <button type="submit" className="btn btn-primary">Create Invoice</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const menuBtnStyle = {
  display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 14px',
  border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '0.8125rem',
  color: '#1e293b', textAlign: 'left', transition: 'background 0.1s'
};

export default AdminInvoices;
