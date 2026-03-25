import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import './Contact.css';

const Contact = () => {
  const [form, setForm] = useState({ name: '', email: '', phone: '', service: '', message: '' });
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    // In production, this would send to the backend
    setTimeout(() => {
      toast.success('Message sent! We\'ll get back to you within 24 hours.');
      setForm({ name: '', email: '', phone: '', service: '', message: '' });
      setSending(false);
    }, 1000);
  };

  return (
    <div className="contact-page">
      <section className="page-hero">
        <div className="container">
          <h1>Get in Touch</h1>
          <p>Have a project in mind? Let's talk about how we can help your business.</p>
        </div>
      </section>

      <section className="container contact-content">
        <div className="contact-grid">
          <div className="contact-info">
            <h2>Let's Work Together</h2>
            <p>Whether you need hosting, a custom app, or workflow automation — we're here to help. Get in touch and we'll respond within 24 hours.</p>

            <div className="contact-details">
              <div className="contact-item">
                <div className="ci-icon"><Mail size={20} /></div>
                <div>
                  <strong>Email</strong>
                  <a href="mailto:hello@pennywiseit.com.au">hello@pennywiseit.com.au</a>
                </div>
              </div>
              <div className="contact-item">
                <div className="ci-icon"><Phone size={20} /></div>
                <div>
                  <strong>Phone</strong>
                  <a href="tel:+61400000000">0400 000 000</a>
                </div>
              </div>
              <div className="contact-item">
                <div className="ci-icon"><MapPin size={20} /></div>
                <div>
                  <strong>Location</strong>
                  <span>Australia</span>
                </div>
              </div>
            </div>

            <div className="business-hours">
              <h3>Business Hours</h3>
              <p>Monday - Friday: 9am - 5pm AEST</p>
              <p>Emergency support available 24/7 for hosting clients</p>
            </div>
          </div>

          <form className="contact-form card" onSubmit={handleSubmit}>
            <h3>Send Us a Message</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Full Name *</label>
                <input type="text" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Your name" />
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="your@email.com" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Phone</label>
                <input type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="0400 000 000" />
              </div>
              <div className="form-group">
                <label>Service Interested In</label>
                <select value={form.service} onChange={e => setForm({...form, service: e.target.value})}>
                  <option value="">Select a service</option>
                  <option value="web-hosting">Web Hosting</option>
                  <option value="app-development">Custom App Development</option>
                  <option value="workflow-solutions">Workflow Solutions</option>
                  <option value="maintenance">Website Maintenance</option>
                  <option value="consulting">IT Consulting</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Message *</label>
              <textarea required value={form.message} onChange={e => setForm({...form, message: e.target.value})} placeholder="Tell us about your project or what you need help with..." rows={5} />
            </div>
            <button type="submit" className="btn btn-primary btn-lg" disabled={sending} style={{ width: '100%', justifyContent: 'center' }}>
              {sending ? 'Sending...' : <><Send size={18} /> Send Message</>}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
};

export default Contact;
