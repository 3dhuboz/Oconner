import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Palette, Camera, Cpu, Download, Upload, FolderOpen,
  CheckCircle, ArrowRight, Zap, ExternalLink, Car, Eye, Layers, Star, Shield, Monitor
} from 'lucide-react';
import './AutoHue.css';

const AutoHue = () => {
  const { user } = useAuth();

  const colorCategories = [
    { name: 'Red', colors: 'Maroon, Burgundy, Crimson', hex: '#dc2626' },
    { name: 'Blue', colors: 'Navy, Royal, Sky', hex: '#2563eb' },
    { name: 'Green', colors: 'Emerald, Forest, Lime', hex: '#16a34a' },
    { name: 'Yellow', colors: 'Gold, Amber, Mustard', hex: '#eab308' },
    { name: 'Gold', colors: 'Champagne, Bronze', hex: '#d97706' },
    { name: 'Orange', colors: 'Tangerine, Coral', hex: '#ea580c' },
    { name: 'Purple', colors: 'Violet, Indigo, Magenta', hex: '#9333ea' },
    { name: 'Pink', colors: 'Rose, Fuchsia', hex: '#ec4899' },
    { name: 'Brown', colors: 'Tan, Beige, Khaki', hex: '#92400e' },
    { name: 'Black', colors: 'Charcoal, Jet', hex: '#1f2937' },
    { name: 'White', colors: 'Cream, Ivory, Pearl', hex: '#e5e7eb' },
    { name: 'Silver/Grey', colors: 'Chrome, Steel, Slate', hex: '#94a3b8' }
  ];

  const plans = [
    {
      name: 'Hobbyist',
      price: 24,
      period: '/mo',
      description: 'For small dealerships and photographers getting started with automated sorting.',
      features: [
        '300 Images per Day',
        'AI Vehicle Detection',
        '12 Colour Categories',
        'ZIP Export',
        'Quick Reassign',
        'Email Support'
      ],
      cta: 'Get Started',
      highlight: false
    },
    {
      name: 'Pro',
      price: 99,
      period: '/mo',
      description: 'For busy dealerships and photographers who need volume and branding tools.',
      features: [
        '2,000 Images per Day',
        'Everything in Hobbyist',
        'Watermark Editor',
        'Priority AI Processing',
        'Batch Folders & ZIPs'
      ],
      cta: 'Go Pro',
      highlight: true
    },
    {
      name: 'Unlimited',
      price: 249,
      period: '/mo',
      description: 'For auction houses and high-volume operations that need maximum throughput.',
      features: [
        '10,000 Images per Day',
        'Everything in Pro',
        'Commercial Use License',
        'Dedicated Support',
        'Multi-Machine (2 PCs)'
      ],
      cta: 'Go Unlimited',
      highlight: false
    }
  ];

  return (
    <div className="autohue-page">
      {/* Hero */}
      <section className="ah-hero">
        <div className="container">
          <div className="ah-hero-badge">
            <Monitor size={14} /> DESKTOP APP — WINDOWS & MAC
          </div>
          <h1>AutoHue</h1>
          <p className="ah-hero-sub">
            Sort 5,000 car photos in the time it takes to make a coffee. AutoHue's AI vision engine
            detects every vehicle, identifies its colour with 95%+ accuracy, and organises everything
            into colour-coded folders — automatically. No uploading. No cloud. Just results.
          </p>
          <div className="ah-hero-actions">
            <a href="https://github.com/3dhuboz/autohue-desktop/releases/latest" target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-lg">
              <Download size={18} /> Download Free Trial
            </a>
            <a href="#pricing" className="btn btn-outline btn-lg" style={{ borderColor: 'rgba(255,255,255,0.3)', color: 'white' }}>
              View Pricing
            </a>
          </div>
          <div className="ah-hero-stats">
            <div><strong>95%+</strong><span>Accuracy</span></div>
            <div><strong>12 Colours</strong><span>Auto-Sorted</span></div>
            <div><strong>5-10/sec</strong><span>Processing Speed</span></div>
            <div><strong>100% Local</strong><span>Photos Stay Private</span></div>
          </div>
        </div>
      </section>

      {/* Pain point → Solution */}
      <section className="ah-features" style={{ paddingTop: '4rem', paddingBottom: '2rem' }}>
        <div className="container">
          <h2 className="section-heading">You Know the Pain</h2>
          <p className="section-sub" style={{ maxWidth: '700px', margin: '0 auto 2rem' }}>
            You shot 3,000 photos at the lot today. Now you need them sorted by colour for listings.
            That's 6+ hours of dragging files into folders — or 15 minutes with AutoHue.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="ah-features">
        <div className="container">
          <h2 className="section-heading">How It Saves You Hours</h2>
          <p className="section-sub">Drop your photos in. Get sorted folders out. That's it.</p>

          <div className="ah-features-grid">
            <div className="ah-feature-card">
              <div className="ah-feature-icon" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}><Cpu size={28} /></div>
              <h3>AI Vehicle Detection</h3>
              <p>Intelligent scene analysis finds the car in every photo — ignoring backgrounds, reflections, and bystanders.</p>
            </div>
            <div className="ah-feature-card">
              <div className="ah-feature-icon" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}><Palette size={28} /></div>
              <h3>95%+ Colour Accuracy</h3>
              <p>Multi-layered colour classification engine that gets it right the first time. When it doesn't — one click to reassign.</p>
            </div>
            <div className="ah-feature-card">
              <div className="ah-feature-icon" style={{ background: 'rgba(37,99,235,0.1)', color: '#2563eb' }}><Zap size={28} /></div>
              <h3>Lightning Fast</h3>
              <p>Processes 5–10 images per second on your machine. 5,000 photos sorted in under 15 minutes.</p>
            </div>
            <div className="ah-feature-card">
              <div className="ah-feature-icon" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}><FolderOpen size={28} /></div>
              <h3>Drag, Drop, Done</h3>
              <p>Drop entire folders or ZIPs. AutoHue creates perfectly organised colour folders and a downloadable ZIP.</p>
            </div>
            <div className="ah-feature-card">
              <div className="ah-feature-icon" style={{ background: 'rgba(168,85,247,0.1)', color: '#a855f7' }}><Shield size={28} /></div>
              <h3>100% Private</h3>
              <p>Everything runs on your desktop. Your photos never leave your computer. No cloud. No uploads. No risk.</p>
            </div>
            <div className="ah-feature-card">
              <div className="ah-feature-icon" style={{ background: 'rgba(6,182,212,0.1)', color: '#06b6d4' }}><Eye size={28} /></div>
              <h3>Watermark Editor</h3>
              <p>Stamp your studio logo on sorted photos during export. Brand your work before it leaves your machine.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="ah-how-it-works" id="how-it-works">
        <div className="container">
          <h2 className="section-heading">Three Steps. That's It.</h2>
          <p className="section-sub">No accounts to create. No files to upload. No waiting.</p>

          <div className="ah-steps">
            <div className="ah-step">
              <div className="ah-step-number">1</div>
              <h3>Install & Activate</h3>
              <p>Download for Windows or Mac. Paste your license key. You're ready in under a minute.</p>
            </div>
            <div className="ah-step">
              <div className="ah-step-number">2</div>
              <h3>Drop Your Photos</h3>
              <p>Drag a folder or ZIP with thousands of car photos. AutoHue starts processing immediately.</p>
            </div>
            <div className="ah-step">
              <div className="ah-step-number">3</div>
              <h3>Grab Your Sorted Folders</h3>
              <p>12 colour-coded folders, perfectly organised. Download as ZIP or use directly. Done.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Color Categories */}
      <section className="ah-colors">
        <div className="container">
          <h2 className="section-heading">12 Colour Categories</h2>
          <p className="section-sub">AutoHue maps hundreds of shades to these groups with 95%+ accuracy.</p>

          <div className="ah-color-grid">
            {colorCategories.map((cat, i) => (
              <div key={i} className="ah-color-chip">
                <div className="ah-color-swatch" style={{ background: cat.hex }}></div>
                <div>
                  <strong>{cat.name}</strong>
                  <span>{cat.colors}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="ah-use-cases">
        <div className="container">
          <h2 className="section-heading">Built For People Who Sort Cars All Day</h2>
          <div className="ah-use-grid">
            <div className="ah-use-card">
              <Car size={32} />
              <h3>Car Dealerships</h3>
              <p>Got 500 new arrivals to photograph and list? Sort the entire lot's photos by colour in one batch before your coffee gets cold.</p>
            </div>
            <div className="ah-use-card">
              <Camera size={32} />
              <h3>Automotive Photographers</h3>
              <p>Shot 3,000 photos at three different lots today? AutoHue sorts them all while you drive to your next job.</p>
            </div>
            <div className="ah-use-card">
              <Layers size={32} />
              <h3>Auction Houses</h3>
              <p>Catalogue incoming vehicles at scale. Process thousands of photos per auction cycle without hiring extra hands.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="ah-pricing" id="pricing">
        <div className="container">
          <h2 className="section-heading">Plans That Pay For Themselves</h2>
          <p className="section-sub">
            A junior staff member costs $25+/hr to sort photos by hand.
            AutoHue does it faster, more accurately, and for a fraction of the cost.
          </p>

          <div className="ah-pricing-grid">
            {plans.map((plan, i) => {
              const PlanIcon = plan.highlight ? Star : i === 2 ? Shield : Zap;
              return (
                <div key={i} className={`ah-pricing-card ${plan.highlight ? 'ah-pricing-highlight' : ''}`}>
                  {plan.highlight && <div className="ah-pricing-badge">MOST POPULAR</div>}
                  <PlanIcon size={24} style={{ color: plan.highlight ? '#f59e0b' : i === 2 ? '#a855f7' : '#06b6d4', marginBottom: '0.5rem' }} />
                  <h3>{plan.name}</h3>
                  <div className="ah-pricing-price">
                    <span className="ah-pricing-amount">${plan.price}</span>
                    <span className="ah-pricing-period">{plan.period}</span>
                  </div>
                  <p className="ah-pricing-desc">{plan.description}</p>
                  <ul className="ah-pricing-features">
                    {plan.features.map((f, j) => (
                      <li key={j}><CheckCircle size={14} /> {f}</li>
                    ))}
                  </ul>
                  <a href="https://autohue.app/checkout" target="_blank" rel="noopener noreferrer" className={`btn ${plan.highlight ? 'btn-primary' : 'btn-outline'} btn-lg`} style={{ width: '100%' }}>
                    {plan.cta} <ArrowRight size={16} />
                  </a>
                </div>
              );
            })}
          </div>

          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem', marginTop: '1.5rem' }}>
            Free 7-day trial included with every download — no payment required to try it.
          </p>
        </div>
      </section>

      {/* Social Proof / Numbers */}
      <section className="ah-tech">
        <div className="container">
          <div className="ah-tech-card">
            <h2>The Numbers Speak</h2>
            <div className="ah-tech-grid">
              <div className="ah-tech-item">
                <strong>95%+</strong>
                <span>Colour Accuracy</span>
              </div>
              <div className="ah-tech-item">
                <strong>5-10/sec</strong>
                <span>Processing Speed</span>
              </div>
              <div className="ah-tech-item">
                <strong>12</strong>
                <span>Colour Categories</span>
              </div>
              <div className="ah-tech-item">
                <strong>2 PCs</strong>
                <span>Multi-Machine</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="ah-cta">
        <div className="container">
          <Palette size={40} style={{ color: '#ef4444', marginBottom: '1rem' }} />
          <h2>Stop Sorting. Start Selling.</h2>
          <p>Download AutoHue, try it free for 7 days, and see how much time you get back.</p>
          <a href="https://github.com/3dhuboz/autohue-desktop/releases/latest" target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-lg">
            Download Free Trial <ArrowRight size={18} />
          </a>
        </div>
      </section>
    </div>
  );
};

export default AutoHue;
