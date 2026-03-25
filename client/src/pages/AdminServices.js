import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Edit, Trash2, Save } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';
import './Admin.css';

const AdminServices = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editService, setEditService] = useState(null);
  const [form, setForm] = useState({
    title: '', shortDescription: '', fullDescription: '', icon: 'globe',
    category: 'web-hosting', features: '', pricing: { type: 'custom', amount: 0, currency: 'AUD' },
    displayOrder: 0, isActive: true
  });

  useEffect(() => { loadServices(); }, []);

  const loadServices = () => {
    api.get('/services').then(res => { setServices(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  const openCreate = () => {
    setEditService(null);
    setForm({ title: '', shortDescription: '', fullDescription: '', icon: 'globe', category: 'web-hosting', features: '', pricing: { type: 'custom', amount: 0, currency: 'AUD' }, displayOrder: 0, isActive: true });
    setShowModal(true);
  };

  const openEdit = (s) => {
    setEditService(s);
    setForm({ ...s, features: (s.features || []).join(', ') });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = { ...form, features: form.features.split(',').map(f => f.trim()).filter(Boolean) };
    try {
      if (editService) {
        await api.put(`/services/${editService._id}`, data);
        toast.success('Service updated');
      } else {
        await api.post('/services', data);
        toast.success('Service created');
      }
      setShowModal(false);
      loadServices();
    } catch (err) {
      toast.error('Failed to save service');
    }
  };

  const deleteService = async (id) => {
    if (!window.confirm('Delete this service?')) return;
    try {
      await api.delete(`/services/${id}`);
      toast.success('Service deleted');
      loadServices();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const update = (field, value) => setForm({ ...form, [field]: value });

  if (loading) return <div className="page-loading">Loading services...</div>;

  return (
    <div className="admin-page">
      <div className="container" style={{ padding: '2rem 1.5rem' }}>
        <Link to="/admin" className="back-link"><ArrowLeft size={16} /> Back to Admin</Link>
        <div className="admin-header">
          <h1>Service Management</h1>
          <button onClick={openCreate} className="btn btn-primary"><Plus size={16} /> Add Service</button>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Title</th>
                <th>Category</th>
                <th>Pricing</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {services.map(s => (
                <tr key={s._id}>
                  <td>{s.displayOrder}</td>
                  <td style={{ fontWeight: 600 }}>{s.title}</td>
                  <td><span className="badge badge-info">{s.category?.replace(/-/g, ' ')}</span></td>
                  <td>{s.pricing?.type === 'custom' ? 'Custom' : `$${s.pricing?.amount}/${s.pricing?.type === 'monthly' ? 'mo' : 'hr'}`}</td>
                  <td><span className={`badge ${s.isActive ? 'badge-success' : 'badge-gray'}`}>{s.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      <button onClick={() => openEdit(s)} className="btn btn-sm btn-secondary"><Edit size={14} /></button>
                      <button onClick={() => deleteService(s._id)} className="btn btn-sm btn-danger"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '550px' }}>
              <h2>{editService ? 'Edit Service' : 'Add Service'}</h2>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Title *</label>
                  <input type="text" required value={form.title} onChange={e => update('title', e.target.value)} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label>Category</label>
                    <select value={form.category} onChange={e => update('category', e.target.value)}>
                      <option value="web-hosting">Web Hosting</option>
                      <option value="app-development">App Development</option>
                      <option value="workflow-solutions">Workflow Solutions</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="consulting">Consulting</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Icon</label>
                    <select value={form.icon} onChange={e => update('icon', e.target.value)}>
                      <option value="server">Server</option>
                      <option value="code">Code</option>
                      <option value="workflow">Workflow</option>
                      <option value="shield">Shield</option>
                      <option value="lightbulb">Lightbulb</option>
                      <option value="globe">Globe</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Short Description *</label>
                  <input type="text" required value={form.shortDescription} onChange={e => update('shortDescription', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Full Description</label>
                  <textarea value={form.fullDescription || ''} onChange={e => update('fullDescription', e.target.value)} rows={3} />
                </div>
                <div className="form-group">
                  <label>Features (comma separated)</label>
                  <input type="text" value={form.features} onChange={e => update('features', e.target.value)} placeholder="Feature 1, Feature 2, Feature 3" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label>Pricing Type</label>
                    <select value={form.pricing?.type || 'custom'} onChange={e => setForm({...form, pricing: {...form.pricing, type: e.target.value}})}>
                      <option value="custom">Custom</option>
                      <option value="monthly">Monthly</option>
                      <option value="hourly">Hourly</option>
                      <option value="fixed">Fixed</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Amount (AUD)</label>
                    <input type="number" value={form.pricing?.amount || 0} onChange={e => setForm({...form, pricing: {...form.pricing, amount: parseFloat(e.target.value)}})} />
                  </div>
                  <div className="form-group">
                    <label>Display Order</label>
                    <input type="number" value={form.displayOrder} onChange={e => update('displayOrder', parseInt(e.target.value))} />
                  </div>
                </div>
                <div className="modal-actions">
                  <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
                  <button type="submit" className="btn btn-primary"><Save size={14} /> {editService ? 'Update' : 'Create'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminServices;
