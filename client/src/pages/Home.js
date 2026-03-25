import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Zap, Sparkles, Palette, Workflow, ExternalLink,
  DollarSign, Timer, Rocket, Globe
} from 'lucide-react';
import './Home.css';

const Home = () => {
  return (
    <div className="home">
      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-content fade-in">
            <img src="/logo.png" alt="Penny Wise I.T" className="hero-logo" />
            <div className="hero-badge">
              <Zap size={14} /> Apps That Save You Time & Money
            </div>
            <h1>Stop Wasting Hours.<br /><span className="hero-highlight">Start Automating.</span></h1>
            <p className="hero-subtitle">
              We build smart apps that replace manual work, cut costs, and give you
              back your time. Real tools for real Australian businesses.
            </p>
            <div className="hero-actions">
              <Link to="/marketplace" className="btn btn-primary btn-lg">
                Browse Our Apps <ArrowRight size={18} />
              </Link>
              <Link to="/services" className="btn btn-outline btn-lg">
                See How We Save You Money
              </Link>
            </div>
            <div className="hero-stats">
              <div className="stat">
                <strong>10x</strong>
                <span>Faster</span>
              </div>
              <div className="stat">
                <strong>50%</strong>
                <span>Cost Saved</span>
              </div>
              <div className="stat">
                <strong>100%</strong>
                <span>Australian</span>
              </div>
            </div>
          </div>
          <div className="hero-visual fade-in">
            <div className="hero-card">
              <div className="hero-card-header">
                <div className="dot red"></div>
                <div className="dot yellow"></div>
                <div className="dot green"></div>
              </div>
              <div className="hero-card-body">
                <div className="code-line"><span className="code-keyword">const</span> <span className="code-var">savings</span> = <span className="code-func">automate</span>({`{`}</div>
                <div className="code-line indent"><span className="code-prop">manual_hours</span>: <span className="code-string">'eliminated'</span>,</div>
                <div className="code-line indent"><span className="code-prop">costs</span>: <span className="code-string">'halved'</span>,</div>
                <div className="code-line indent"><span className="code-prop">errors</span>: <span className="code-string">'gone'</span>,</div>
                <div className="code-line indent"><span className="code-prop">growth</span>: <span className="code-string">'unlocked'</span></div>
                <div className="code-line">{`}`});</div>
                <div className="code-line"><span className="code-comment">// Your business, supercharged.</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value Props - Save Time & Money */}
      <section className="value-section">
        <div className="container">
          <div className="section-header">
            <h2>Apps That Actually <span className="section-highlight">Pay For Themselves</span></h2>
            <p>Every tool we build saves you more than it costs — usually within the first month</p>
          </div>
          <div className="value-grid">
            <div className="value-card">
              <div className="value-icon" style={{ background: 'rgba(0,212,255,0.1)', color: '#00d4ff' }}><Timer size={28} /></div>
              <span className="value-number">10x</span>
              <h3>Faster Than Manual</h3>
              <p>Hours of work done in minutes. Automate the grind and focus on growth.</p>
            </div>
            <div className="value-card">
              <div className="value-icon" style={{ background: 'rgba(0,255,136,0.1)', color: '#00ff88' }}><DollarSign size={28} /></div>
              <span className="value-number">50%</span>
              <h3>Average Cost Reduction</h3>
              <p>Replace expensive processes and overpriced tools. One app, massive savings.</p>
            </div>
            <div className="value-card">
              <div className="value-icon" style={{ background: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }}><Rocket size={28} /></div>
              <span className="value-number">24/7</span>
              <h3>Works While You Sleep</h3>
              <p>Automated workflows and smart systems running around the clock. No days off.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Real Examples - The Hook */}
      <section className="examples-section">
        <div className="container">
          <div className="section-header">
            <h2>Real Businesses, <span className="section-highlight">Real Savings</span></h2>
            <p>Here's what our apps are doing for businesses right now</p>
          </div>
          <div className="examples-grid">
            <div className="example-card">
              <div className="example-header">
                <Palette size={20} style={{ color: '#00d4ff' }} />
                <span className="example-label">AutoHue</span>
              </div>
              <h3>8 Hours of Photo Sorting → 5 Minutes</h3>
              <div className="example-savings">
                <span className="savings-tag"><DollarSign size={14} /> Saves ~$1,200/mo in labour</span>
              </div>
              <p>Car dealerships manually sorting thousands of photos by colour. Our AI does it in minutes — 40+ hours saved per month.</p>
              <div className="example-actions">
                <Link to="/autohue" className="service-link">See How It Works <ArrowRight size={14} /></Link>
                <Link to="/autohue" className="service-link">Try It Free <ArrowRight size={14} /></Link>
              </div>
            </div>
            <div className="example-card">
              <div className="example-header">
                <Sparkles size={20} style={{ color: '#fbbf24' }} />
                <span className="example-label">SocialAI Studio</span>
              </div>
              <h3>$2,000/mo Agency → $49/mo App</h3>
              <div className="example-savings">
                <span className="savings-tag"><DollarSign size={14} /> Saves $1,951/mo vs agencies</span>
              </div>
              <p>AI generates on-brand content, images, and a full posting schedule in minutes. A fraction of the cost of hiring.</p>
              <div className="example-actions">
                <Link to="/social-ai" className="service-link">See Plans <ArrowRight size={14} /></Link>
              </div>
            </div>
            <div className="example-card">
              <div className="example-header">
                <Globe size={20} style={{ color: '#10b981' }} />
                <span className="example-label">SimpleWebsite</span>
              </div>
              <h3>$3,000 Custom Site → $39/mo App</h3>
              <div className="example-savings">
                <span className="savings-tag"><DollarSign size={14} /> Saves ~$2,961/mo vs custom dev</span>
              </div>
              <p>Full e-commerce storefront with admin dashboard, CMS, and optional AI-powered social media marketing. White-label and deploy in minutes.</p>
              <div className="example-actions">
                <Link to="/simple-website" className="service-link">See Plans <ArrowRight size={14} /></Link>
              </div>
            </div>
            <div className="example-card">
              <div className="example-header">
                <Workflow size={20} style={{ color: '#8b5cf6' }} />
                <span className="example-label">Custom Builds</span>
              </div>
              <h3>5 Spreadsheets → 1 Smart Dashboard</h3>
              <div className="example-savings">
                <span className="savings-tag"><DollarSign size={14} /> Saves 20+ hrs/week in admin</span>
              </div>
              <p>Replace your tangle of spreadsheets and email chains with a custom workflow engine — automated and real-time.</p>
              <div className="example-actions">
                <Link to="/contact" className="service-link">Tell Us Your Problem <ArrowRight size={14} /></Link>
              </div>
            </div>
          </div>
          <div className="examples-cta">
            <Link to="/services" className="btn btn-outline btn-lg">
              See All Advantages & How We Save You Money <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-card">
            <h2>Ready to Save Time & Money?</h2>
            <p>Tell us what's eating your hours and budget. We'll show you exactly how an app can fix it — and what it'll save you.</p>
            <div className="cta-actions">
              <Link to="/contact" className="btn btn-primary btn-lg">Let's Talk ROI <ArrowRight size={18} /></Link>
              <Link to="/marketplace" className="btn btn-outline btn-lg" style={{ borderColor: 'rgba(255,255,255,0.3)', color: 'white' }}>
                Browse Apps
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
