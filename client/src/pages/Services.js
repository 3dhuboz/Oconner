import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Server, Code, Workflow, Shield, Lightbulb, Globe, CheckCircle, ArrowRight, Sparkles,
  Star, Palette, ExternalLink, DollarSign, Clock, Database, Settings, Layers, TrendingUp,
  AlertTriangle, Search, Target, Wrench, Users, Zap
} from 'lucide-react';
import api from '../api';
import './Services.css';

const iconMap = { server: Server, code: Code, workflow: Workflow, shield: Shield, lightbulb: Lightbulb, globe: Globe, sparkles: Sparkles, palette: Palette };

const SAVINGS_MAP = {
  'social-ai': { saved: '$1,951', vs: 'vs hiring a social media manager', period: '/mo' },
  'free-tool': { saved: '$1,200+', vs: 'in manual sorting labour', period: '/mo' },
  'hosting': { saved: '$50–200', vs: 'vs premium managed hosting', period: '/mo' },
  'maintenance': { saved: '$500+', vs: 'vs agency retainers', period: '/mo' },
};

const Services = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/services').then(res => { setServices(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-loading">Loading services...</div>;

  return (
    <div className="services-page">
      <section className="page-hero">
        <div className="container">
          <h1>Why Penny Wise I.T?</h1>
          <p>We don't just build apps — we build tools that save you real time and money. Here's how.</p>
        </div>
      </section>

      {/* Advantages / Why Us */}
      <section className="advantages-section">
        <div className="container">
          <div className="section-header">
            <h2>The Penny Wise <span className="section-highlight">Advantage</span></h2>
            <p>Every dollar you spend with us is designed to save you multiples in return</p>
          </div>
          <div className="advantages-grid">
            <div className="advantage-card">
              <DollarSign size={24} className="advantage-icon" style={{ color: '#00ff88' }} />
              <h3>ROI-Focused</h3>
              <p>Every app we build is designed to save you more than it costs. If it doesn't pay for itself, we don't build it.</p>
            </div>
            <div className="advantage-card">
              <Code size={24} className="advantage-icon" style={{ color: '#00d4ff' }} />
              <h3>Built From Scratch</h3>
              <p>No cookie-cutter templates. Every app is purpose-built for your specific problem and workflow.</p>
            </div>
            <div className="advantage-card">
              <Zap size={24} className="advantage-icon" style={{ color: '#fbbf24' }} />
              <h3>AI-Powered Smarts</h3>
              <p>We integrate machine learning and automation where it genuinely saves time — not just because it sounds cool.</p>
            </div>
            <div className="advantage-card">
              <Users size={24} className="advantage-icon" style={{ color: '#8b5cf6' }} />
              <h3>Long-Term Partner</h3>
              <p>We stick around, keep things running, and evolve the solution as your business grows. No vendor lock-in.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Problems We Solve */}
      <section className="problems-section">
        <div className="container">
          <div className="section-header">
            <h2>Problems We <span className="section-highlight">Eliminate</span></h2>
            <p>If it's costing you time, money, or sanity — we've probably built a fix for it</p>
          </div>
          <div className="problems-grid">
            <div className="problem-card card fade-in">
              <div className="problem-icon" style={{ background: 'rgba(255,71,87,0.1)', color: '#ff4757' }}><AlertTriangle size={24} /></div>
              <h3>Broken Workflows</h3>
              <p>Manual processes, spreadsheet chaos, things falling through the cracks. We replace the mess with systems that actually work.</p>
            </div>
            <div className="problem-card card fade-in">
              <div className="problem-icon" style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24' }}><Clock size={24} /></div>
              <h3>Wasted Hours</h3>
              <p>Your team is doing the same tasks over and over. Our apps automate the repetitive stuff and give you those hours back.</p>
            </div>
            <div className="problem-card card fade-in">
              <div className="problem-icon" style={{ background: 'rgba(0,212,255,0.1)', color: '#00d4ff' }}><Database size={24} /></div>
              <h3>Data Everywhere</h3>
              <p>Customer data in five places, no single source of truth. We build dashboards that unify everything in one place.</p>
            </div>
            <div className="problem-card card fade-in">
              <div className="problem-icon" style={{ background: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }}><Settings size={24} /></div>
              <h3>Generic Tools Don't Fit</h3>
              <p>Off-the-shelf software can't do what you need. We build custom apps from scratch, tailored to your exact workflow.</p>
            </div>
            <div className="problem-card card fade-in">
              <div className="problem-icon" style={{ background: 'rgba(0,255,136,0.1)', color: '#00ff88' }}><Layers size={24} /></div>
              <h3>Too Many Subscriptions</h3>
              <p>Paying for 10 different tools that half-work? We consolidate everything into one purpose-built app that does it all.</p>
            </div>
            <div className="problem-card card fade-in">
              <div className="problem-icon" style={{ background: 'rgba(255,0,110,0.1)', color: '#ff006e' }}><TrendingUp size={24} /></div>
              <h3>Can't Scale</h3>
              <p>What worked for 10 customers breaks at 100. We build systems that grow with you — without growing your costs.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How We Work */}
      <section className="approach-section">
        <div className="container">
          <div className="section-header">
            <h2>How We Work</h2>
            <p>No fluff, no buzzwords — just a clear process that gets results</p>
          </div>
          <div className="approach-steps">
            <div className="approach-step">
              <div className="approach-number">1</div>
              <div className="approach-content">
                <h3><Search size={20} /> Listen & Diagnose</h3>
                <p>You tell us what's costing you time and money. We dig in and figure out the smartest fix — not the most expensive one.</p>
              </div>
            </div>
            <div className="approach-step">
              <div className="approach-number">2</div>
              <div className="approach-content">
                <h3><Target size={20} /> Design the Solution</h3>
                <p>We map out exactly what to build, how it saves you money, and when you'll see the ROI. No surprises.</p>
              </div>
            </div>
            <div className="approach-step">
              <div className="approach-number">3</div>
              <div className="approach-content">
                <h3><Wrench size={20} /> Build & Deploy</h3>
                <p>We build it from scratch, test it in the real world, and deploy it to production. You start saving immediately.</p>
              </div>
            </div>
            <div className="approach-step">
              <div className="approach-number">4</div>
              <div className="approach-content">
                <h3><Shield size={20} /> Support & Evolve</h3>
                <p>We don't disappear. We monitor, maintain, and improve. As your business grows, your tools grow with it.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services List with Cost Savings */}
      <section className="services-list-section">
        <div className="container">
          <div className="section-header">
            <h2>Our Services & <span className="section-highlight">Your Savings</span></h2>
            <p>Every service is built to deliver measurable ROI</p>
          </div>
          <div className="services-detail-grid">
            {services.map((service, idx) => {
              const Icon = iconMap[service.icon] || Globe;
              const isSocialAI = service.category === 'social-ai';
              const isFreeTool = service.category === 'free-tool';
              const savings = SAVINGS_MAP[service.category];
              return (
                <div key={idx} className={`service-detail-card card fade-in${isSocialAI ? ' sdc-featured' : ''}${isFreeTool ? ' sdc-free' : ''}`}>
                  {isSocialAI && <div className="sdc-featured-badge"><Star size={12} /> FEATURED PRODUCT</div>}
                  {isFreeTool && <div className="sdc-free-badge"><Palette size={12} /> FREE TOOL</div>}
                  <div className="sdc-header">
                    <div className="sdc-icon" style={isSocialAI ? { background: 'rgba(245,158,11,0.1)', color: '#f59e0b' } : isFreeTool ? { background: 'rgba(6,182,212,0.1)', color: '#06b6d4' } : {}}><Icon size={28} /></div>
                    <div>
                      <h2>{service.title}</h2>
                      <span className="badge badge-info">{service.category?.replace(/-/g, ' ')}</span>
                    </div>
                  </div>
                  <p className="sdc-description">{service.fullDescription || service.shortDescription}</p>
                  {service.features && service.features.length > 0 && (
                    <ul className="sdc-features">
                      {service.features.map((f, i) => (
                        <li key={i}><CheckCircle size={16} /> {f}</li>
                      ))}
                    </ul>
                  )}
                  {service.pricing && (
                    <div className="sdc-pricing">
                      {service.pricing.type === 'custom' ? (
                        <span className="price-label">Custom Quote</span>
                      ) : isFreeTool ? (
                        <span className="price-free">Free</span>
                      ) : (
                        <span className="price-amount">
                          ${service.pricing.amount} <small>{service.pricing.currency}/{service.pricing.type === 'monthly' ? 'mo' : service.pricing.type === 'hourly' ? 'hr' : ''}</small>
                        </span>
                      )}
                      {savings && (
                        <div className="sdc-savings">
                          <DollarSign size={14} /> Save {savings.saved}{savings.period} {savings.vs}
                        </div>
                      )}
                    </div>
                  )}
                  {isSocialAI ? (
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <Link to="/social-ai" className="btn btn-primary">
                        View Plans & Pricing <ArrowRight size={16} />
                      </Link>
                      <Link to="/contact" className="btn btn-secondary">
                        Contact Sales
                      </Link>
                    </div>
                  ) : isFreeTool ? (
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <Link to="/autohue" className="btn btn-primary">
                        Learn More <ArrowRight size={16} />
                      </Link>
                      <a href="https://autohue.app" target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                        Launch App <ExternalLink size={16} />
                      </a>
                    </div>
                  ) : (
                    <Link to="/contact" className="btn btn-primary">
                      Get Started <ArrowRight size={16} />
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="services-cta">
        <div className="container">
          <div className="cta-card">
            <h2>Need Something Custom?</h2>
            <p>Every business is unique. Tell us what's costing you time and money — we'll show you the ROI before we build a thing.</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/contact" className="btn btn-primary btn-lg">Get a Free Quote <ArrowRight size={18} /></Link>
              <Link to="/marketplace" className="btn btn-outline btn-lg" style={{ borderColor: 'rgba(255,255,255,0.3)', color: 'white' }}>Browse Apps</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Services;
