import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Server, CheckCircle, Globe, Shield, HardDrive, Mail, Zap, ArrowRight,
  Loader2, Star, Crown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import toast from 'react-hot-toast';
import './Marketplace.css';

const Hosting = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    domainName: '',
    domainAction: 'register-new',
    businessName: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    currentHost: '',
    websiteType: 'wordpress',
    additionalNotes: ''
  });

  useEffect(() => {
    api.get('/settings/hosting-plans').then(res => {
      setPlans(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (user) {
      setForm(prev => ({
        ...prev,
        contactName: prev.contactName || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        contactEmail: prev.contactEmail || user.email || '',
        businessName: prev.businessName || user.company || ''
      }));
    }
  }, [user]);

  const submitOrder = async () => {
    if (!user) { navigate('/login'); return; }
    if (!form.domainName) return toast.error('Please enter a domain name');
    if (!form.contactEmail) return toast.error('Please enter a contact email');
    setSubmitting(true);
    try {
      const res = await api.post('/hosting/order', {
        planKey: selectedPlan.key,
        billingCycle,
        ...form
      });
      toast.success(res.data.message);
      setSelectedPlan(null);
      setForm({ domainName: '', domainAction: 'register-new', businessName: '', contactName: '', contactEmail: user?.email || '', contactPhone: '', currentHost: '', websiteType: 'wordpress', additionalNotes: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Order failed');
    }
    setSubmitting(false);
  };

  if (loading) return <div className="page-loading">Loading hosting plans...</div>;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-dark, #0a0a0f)', color: 'var(--text-primary, #e8ecf0)' }}>
      <div className="container" style={{ padding: '3rem 1.5rem' }}>
        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.375rem 1rem', borderRadius: 20, background: 'rgba(37,99,235,0.1)', color: '#3b82f6', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '1rem' }}>
            <Server size={14} /> Managed Web Hosting
          </div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, marginBottom: '0.75rem' }}>
            Fast, Secure Hosting <span style={{ color: '#3b82f6' }}>Powered by GoGeek</span>
          </h1>
          <p style={{ color: '#8a94a6', maxWidth: 600, margin: '0 auto', lineHeight: 1.7 }}>
            SSD-powered hosting managed by Penny Wise I.T. We handle the servers, security, backups, and support — you focus on your business.
          </p>
        </div>

        {/* Billing Toggle */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 3 }}>
            <button
              onClick={() => setBillingCycle('monthly')}
              style={{ padding: '0.5rem 1.25rem', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', background: billingCycle === 'monthly' ? '#3b82f6' : 'transparent', color: billingCycle === 'monthly' ? '#fff' : '#8a94a6' }}
            >Monthly</button>
            <button
              onClick={() => setBillingCycle('yearly')}
              style={{ padding: '0.5rem 1.25rem', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', background: billingCycle === 'yearly' ? '#3b82f6' : 'transparent', color: billingCycle === 'yearly' ? '#fff' : '#8a94a6' }}
            >Yearly <span style={{ fontSize: '0.6875rem', color: '#10b981' }}>Save up to 17%</span></button>
          </div>
        </div>

        {/* Plans Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(plans.length, 3)}, 1fr)`, gap: '1.5rem', maxWidth: 960, margin: '0 auto 3rem' }}>
          {plans.map((plan, idx) => {
            const price = billingCycle === 'yearly' && plan.yearlyPrice ? plan.yearlyPrice : plan.price;
            const isMiddle = plans.length === 3 && idx === 1;
            return (
              <div key={plan.key} style={{
                background: 'rgba(255,255,255,0.03)',
                border: isMiddle ? '2px solid #3b82f6' : '1px solid rgba(255,255,255,0.08)',
                borderRadius: 16,
                padding: '2rem 1.5rem',
                position: 'relative',
                transform: isMiddle ? 'scale(1.02)' : 'none'
              }}>
                {isMiddle && (
                  <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', padding: '0.25rem 1rem', borderRadius: 12, background: '#3b82f6', color: '#fff', fontSize: '0.6875rem', fontWeight: 700 }}>
                    MOST POPULAR
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: plan.color || '#3b82f6' }} />
                  <h3 style={{ fontWeight: 700, fontSize: '1.125rem' }}>{plan.name}</h3>
                </div>
                <div style={{ marginBottom: '1.25rem' }}>
                  <span style={{ fontSize: '2.5rem', fontWeight: 800 }}>${price}</span>
                  <span style={{ color: '#8a94a6', fontSize: '0.875rem' }}>/{billingCycle === 'yearly' ? 'yr' : 'mo'}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginBottom: '1.5rem', fontSize: '0.8125rem' }}>
                  {plan.storage && <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><HardDrive size={14} style={{ color: plan.color }} /> {plan.storage}</div>}
                  {plan.bandwidth && <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Zap size={14} style={{ color: plan.color }} /> {plan.bandwidth}</div>}
                  {plan.emails && <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Mail size={14} style={{ color: plan.color }} /> {plan.emails}</div>}
                  {plan.domains && <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Globe size={14} style={{ color: plan.color }} /> {plan.domains}</div>}
                </div>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem', marginBottom: '1.5rem' }}>
                  {(plan.features || []).map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: '#c0c8d4', marginBottom: '0.375rem' }}>
                      <CheckCircle size={13} style={{ color: '#10b981', flexShrink: 0 }} /> {f}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setSelectedPlan(plan)}
                  style={{
                    width: '100%', padding: '0.75rem', borderRadius: 8, border: 'none', cursor: 'pointer',
                    fontWeight: 700, fontSize: '0.875rem',
                    background: isMiddle ? '#3b82f6' : 'rgba(255,255,255,0.08)',
                    color: isMiddle ? '#fff' : '#e8ecf0'
                  }}
                >
                  Get Started <ArrowRight size={14} style={{ marginLeft: 4 }} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Features */}
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>All Plans Include</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            {[
              { icon: Shield, label: 'Free SSL Certificate', desc: 'HTTPS on all sites' },
              { icon: Server, label: 'Daily Backups', desc: 'Automated daily snapshots' },
              { icon: Globe, label: '99.9% Uptime', desc: 'SLA-backed guarantee' },
              { icon: Zap, label: 'SSD Storage', desc: 'Fast load times' },
              { icon: Mail, label: 'Email Hosting', desc: 'Professional email' },
              { icon: Star, label: 'Managed Support', desc: 'We handle the tech' },
            ].map((f, i) => (
              <div key={i} style={{ padding: '1.25rem', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <f.icon size={20} style={{ color: '#3b82f6', marginBottom: '0.5rem' }} />
                <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.25rem' }}>{f.label}</div>
                <div style={{ fontSize: '0.75rem', color: '#8a94a6' }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Order Modal */}
      {selectedPlan && (
        <div className="modal-overlay" onClick={() => setSelectedPlan(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px', maxHeight: '85vh', overflow: 'auto' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Server size={20} style={{ color: '#3b82f6' }} /> Order: {selectedPlan.name}
            </h2>
            <div style={{ padding: '0.75rem 1rem', borderRadius: 8, background: 'rgba(59,130,246,0.08)', marginBottom: '1rem', fontSize: '0.875rem' }}>
              <strong>${billingCycle === 'yearly' && selectedPlan.yearlyPrice ? selectedPlan.yearlyPrice : selectedPlan.price}</strong>/{billingCycle === 'yearly' ? 'year' : 'month'} — {selectedPlan.storage}, {selectedPlan.domains}
            </div>

            <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '0.75rem' }}>Domain Details</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label>Domain Name *</label>
                <input value={form.domainName} onChange={e => setForm({ ...form, domainName: e.target.value })} placeholder="yourbusiness.com.au" />
              </div>
              <div className="form-group">
                <label>Domain Action</label>
                <select value={form.domainAction} onChange={e => setForm({ ...form, domainAction: e.target.value })}>
                  <option value="register-new">Register New Domain</option>
                  <option value="transfer-existing">Transfer Existing Domain</option>
                  <option value="point-dns">Point DNS (keep registrar)</option>
                </select>
              </div>
            </div>

            {form.domainAction === 'transfer-existing' && (
              <div className="form-group">
                <label>Current Hosting Provider</label>
                <input value={form.currentHost} onChange={e => setForm({ ...form, currentHost: e.target.value })} placeholder="e.g. GoDaddy, Crazy Domains" />
              </div>
            )}

            <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '0.75rem', marginTop: '0.5rem' }}>Your Details</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label>Contact Name *</label>
                <input value={form.contactName} onChange={e => setForm({ ...form, contactName: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Business Name</label>
                <input value={form.businessName} onChange={e => setForm({ ...form, businessName: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input type="email" value={form.contactEmail} onChange={e => setForm({ ...form, contactEmail: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input value={form.contactPhone} onChange={e => setForm({ ...form, contactPhone: e.target.value })} />
              </div>
            </div>

            <div className="form-group">
              <label>Website Type</label>
              <select value={form.websiteType} onChange={e => setForm({ ...form, websiteType: e.target.value })}>
                <option value="wordpress">WordPress</option>
                <option value="static">Static / HTML</option>
                <option value="ecommerce">eCommerce (WooCommerce)</option>
                <option value="custom">Custom Application</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label>Additional Notes</label>
              <textarea rows={3} value={form.additionalNotes} onChange={e => setForm({ ...form, additionalNotes: e.target.value })} placeholder="Any special requirements, migration details, etc." />
            </div>

            <div className="modal-actions">
              <button onClick={() => setSelectedPlan(null)} className="btn btn-secondary">Cancel</button>
              <button onClick={submitOrder} className="btn btn-primary" disabled={submitting}>
                {submitting ? <Loader2 size={14} className="spin" /> : <Zap size={14} />} Submit Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Hosting;
