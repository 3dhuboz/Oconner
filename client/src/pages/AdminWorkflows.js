import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Play, Pause, CheckCircle, Trash2, Copy } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';
import './Admin.css';

const AdminWorkflows = () => {
  const [workflows, setWorkflows] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: '', description: '', category: 'custom', customerId: '', isTemplate: false,
    steps: [{ title: '', description: '', order: 1 }]
  });

  useEffect(() => {
    Promise.all([
      api.get('/workflows').catch(() => ({ data: [] })),
      api.get('/customers').catch(() => ({ data: [] }))
    ]).then(([wfRes, custRes]) => {
      setWorkflows(wfRes.data);
      setCustomers(custRes.data);
      setLoading(false);
    });
  }, []);

  const loadWorkflows = () => {
    api.get('/workflows').then(res => setWorkflows(res.data)).catch(() => {});
  };

  const openCreate = () => {
    setForm({ name: '', description: '', category: 'custom', customerId: '', isTemplate: false, steps: [{ title: '', description: '', order: 1 }] });
    setShowModal(true);
  };

  const addStep = () => {
    setForm({ ...form, steps: [...form.steps, { title: '', description: '', order: form.steps.length + 1 }] });
  };

  const updateStep = (idx, field, value) => {
    const steps = [...form.steps];
    steps[idx] = { ...steps[idx], [field]: value };
    setForm({ ...form, steps });
  };

  const removeStep = (idx) => {
    if (form.steps.length <= 1) return;
    const steps = form.steps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i + 1 }));
    setForm({ ...form, steps });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { ...form, customer: form.customerId || undefined, status: form.isTemplate ? 'draft' : 'active' };
      await api.post('/workflows', data);
      toast.success('Workflow created');
      setShowModal(false);
      loadWorkflows();
    } catch (err) {
      toast.error('Failed to create workflow');
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/workflows/${id}`, { status });
      toast.success(`Workflow ${status}`);
      loadWorkflows();
    } catch (err) {
      toast.error('Failed to update');
    }
  };

  const deleteWorkflow = async (id) => {
    if (!window.confirm('Delete this workflow?')) return;
    try {
      await api.delete(`/workflows/${id}`);
      toast.success('Workflow deleted');
      loadWorkflows();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const createFromTemplate = async (templateId) => {
    const name = window.prompt('Name for the new workflow:');
    if (!name) return;
    try {
      await api.post(`/workflows/from-template/${templateId}`, { name });
      toast.success('Workflow created from template');
      loadWorkflows();
    } catch (err) {
      toast.error('Failed to create from template');
    }
  };

  const statusColor = (s) => ({ 'draft': 'badge-gray', 'active': 'badge-success', 'paused': 'badge-warning', 'completed': 'badge-info', 'archived': 'badge-gray' }[s] || 'badge-gray');

  if (loading) return <div className="page-loading">Loading workflows...</div>;

  const templates = workflows.filter(w => w.isTemplate);
  const active = workflows.filter(w => !w.isTemplate);

  return (
    <div className="admin-page">
      <div className="container" style={{ padding: '2rem 1.5rem' }}>
        <Link to="/admin" className="back-link"><ArrowLeft size={16} /> Back to Admin</Link>
        <div className="admin-header">
          <h1>Workflow Management</h1>
          <button onClick={openCreate} className="btn btn-primary"><Plus size={16} /> Create Workflow</button>
        </div>

        {templates.length > 0 && (
          <div className="admin-section">
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Templates</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {templates.map(t => (
                <div key={t._id} className="card" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <h3 style={{ fontSize: '0.9375rem', fontWeight: 600 }}>{t.name}</h3>
                    <span className="badge badge-gray">Template</span>
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginBottom: '0.75rem' }}>{t.description}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>{t.steps?.length || 0} steps</p>
                  <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.75rem' }}>
                    <button onClick={() => createFromTemplate(t._id)} className="btn btn-sm btn-primary"><Copy size={14} /> Use Template</button>
                    <button onClick={() => deleteWorkflow(t._id)} className="btn btn-sm btn-danger"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="admin-section">
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Active Workflows ({active.length})</h2>
          {active.length === 0 ? (
            <div className="empty-state card"><p>No workflows yet. Create one to get started.</p></div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Customer</th>
                    <th>Category</th>
                    <th>Progress</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {active.map(wf => {
                    const completed = wf.steps?.filter(s => s.status === 'completed').length || 0;
                    const total = wf.steps?.length || 0;
                    return (
                      <tr key={wf._id}>
                        <td style={{ fontWeight: 600 }}>{wf.name}</td>
                        <td>{wf.customer ? `${wf.customer.firstName} ${wf.customer.lastName}` : '-'}</td>
                        <td><span className="badge badge-info">{wf.category?.replace(/-/g, ' ')}</span></td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ flex: 1, height: 6, background: 'var(--gray-200)', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${total > 0 ? (completed/total)*100 : 0}%`, background: 'var(--primary)', borderRadius: 3 }}></div>
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{completed}/{total}</span>
                          </div>
                        </td>
                        <td><span className={`badge ${statusColor(wf.status)}`}>{wf.status}</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.375rem' }}>
                            {wf.status === 'active' && <button onClick={() => updateStatus(wf._id, 'paused')} className="btn btn-sm btn-secondary"><Pause size={14} /></button>}
                            {wf.status === 'paused' && <button onClick={() => updateStatus(wf._id, 'active')} className="btn btn-sm btn-primary"><Play size={14} /></button>}
                            {wf.status !== 'completed' && <button onClick={() => updateStatus(wf._id, 'completed')} className="btn btn-sm btn-accent"><CheckCircle size={14} /></button>}
                            <button onClick={() => deleteWorkflow(wf._id)} className="btn btn-sm btn-danger"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
              <h2>Create Workflow</h2>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Name *</label>
                  <input type="text" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Workflow name" />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label>Category</label>
                    <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                      <option value="onboarding">Onboarding</option>
                      <option value="project-delivery">Project Delivery</option>
                      <option value="support">Support</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Customer (optional)</label>
                    <select value={form.customerId} onChange={e => setForm({...form, customerId: e.target.value})}>
                      <option value="">No customer</option>
                      {customers.map(c => <option key={c._id} value={c._id}>{c.firstName} {c.lastName}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input type="checkbox" checked={form.isTemplate} onChange={e => setForm({...form, isTemplate: e.target.checked})} />
                    Save as Template
                  </label>
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <label style={{ fontWeight: 600, fontSize: '0.875rem' }}>Steps</label>
                    <button type="button" onClick={addStep} className="btn btn-sm btn-secondary"><Plus size={14} /> Add Step</button>
                  </div>
                  {form.steps.map((step, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'start' }}>
                      <span style={{ padding: '0.625rem 0', fontSize: '0.8125rem', color: 'var(--gray-400)', minWidth: 20 }}>{idx + 1}.</span>
                      <div style={{ flex: 1 }}>
                        <input type="text" required value={step.title} onChange={e => updateStep(idx, 'title', e.target.value)} placeholder="Step title" style={{ width: '100%', marginBottom: '0.25rem', padding: '0.5rem 0.75rem', border: '1px solid var(--gray-300)', borderRadius: 'var(--radius)', fontSize: '0.875rem' }} />
                        <input type="text" value={step.description || ''} onChange={e => updateStep(idx, 'description', e.target.value)} placeholder="Description (optional)" style={{ width: '100%', padding: '0.375rem 0.75rem', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius)', fontSize: '0.8125rem' }} />
                      </div>
                      {form.steps.length > 1 && (
                        <button type="button" onClick={() => removeStep(idx)} className="btn btn-sm btn-danger" style={{ marginTop: '0.25rem' }}><Trash2 size={14} /></button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="modal-actions">
                  <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
                  <button type="submit" className="btn btn-primary">Create Workflow</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminWorkflows;
