import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

const NewTicket = () => {
  const [form, setForm] = useState({ subject: '', description: '', category: 'general', priority: 'medium' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/tickets', form);
      toast.success(`Ticket ${res.data.ticketNumber} created!`);
      navigate(`/tickets/${res.data._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create ticket');
    }
    setLoading(false);
  };

  const update = (field, value) => setForm({ ...form, [field]: value });

  return (
    <div style={{ background: 'var(--gray-50)', minHeight: 'calc(100vh - 64px)' }}>
      <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: '700px' }}>
        <Link to="/tickets" className="back-link"><ArrowLeft size={16} /> Back to Tickets</Link>
        <div className="card" style={{ padding: '2rem' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Create New Ticket</h1>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Subject *</label>
              <input type="text" required value={form.subject} onChange={e => update('subject', e.target.value)} placeholder="Brief summary of your issue" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Category</label>
                <select value={form.category} onChange={e => update('category', e.target.value)}>
                  <option value="general">General</option>
                  <option value="hosting">Hosting</option>
                  <option value="app-development">App Development</option>
                  <option value="workflow">Workflow</option>
                  <option value="billing">Billing</option>
                  <option value="bug-report">Bug Report</option>
                  <option value="feature-request">Feature Request</option>
                </select>
              </div>
              <div className="form-group">
                <label>Priority</label>
                <select value={form.priority} onChange={e => update('priority', e.target.value)}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Description *</label>
              <textarea required value={form.description} onChange={e => update('description', e.target.value)} placeholder="Describe your issue in detail. Include any relevant URLs, error messages, or steps to reproduce..." rows={6} />
            </div>
            <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
              {loading ? 'Creating...' : <><Send size={18} /> Submit Ticket</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default NewTicket;
