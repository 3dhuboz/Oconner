import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Sparkles, Wand2, Brain, Image as ImageIcon,
  CheckCircle, ArrowRight, Zap, Star, Clock,
  TrendingUp, Target, Search, Palette, Video
} from 'lucide-react';
import './SocialAIProduct.css';

const SocialAIProduct = () => {
  const { user } = useAuth();

  const plans = [
    {
      name: 'Starter',
      price: 49,
      period: '/mo',
      description: 'Perfect for solo businesses getting started with AI social media.',
      features: [
        'AI Content Generation',
        'Facebook & Instagram Optimised',
        'Content Calendar & Scheduling',
        'Brand Profile & Voice Setup',
        'AI-Powered Insights & Analytics',
        'Best Practices Knowledge Hub',
        'Email Support'
      ],
      cta: 'Start Free Trial',
      highlight: false
    },
    {
      name: 'Professional',
      price: 99,
      period: '/mo',
      description: 'Data-driven AI that learns from your real engagement to maximise results.',
      features: [
        'Everything in Starter',
        'Research-Driven Smart Scheduler',
        'AI Analyses Your Past Post Performance',
        'Data-Backed Best Days & Times',
        'Schedule Directly from Insights',
        'AI Marketing Image Generation',
        'AI Promotional Video Creation',
        'Full White-Label Branding',
        'Priority Support'
      ],
      cta: 'Get Started',
      highlight: true
    },
    {
      name: 'Enterprise',
      price: 199,
      period: '/mo',
      description: 'Full white-glove service with dedicated account management and custom domain.',
      features: [
        'Everything in Professional',
        'Custom Domain Branding',
        'Dedicated Account Manager',
        'Multi-Brand Management',
        'Advanced Analytics Dashboard',
        'API Access for Integrations',
        'Monthly Strategy Review Call',
        'SLA-Backed Support'
      ],
      cta: 'Contact Sales',
      highlight: false
    }
  ];

  return (
    <div className="sai-product-page">
      {/* Hero */}
      <section className="sai-hero">
        <div className="container">
          <div className="sai-hero-badge">
            <Brain size={14} /> RESEARCH-DRIVEN AI
          </div>
          <h1>SocialAI Studio</h1>
          <p className="sai-hero-sub">
            The only AI social media manager that analyses your real engagement data to build smarter strategies.
            It studies what works for YOUR audience, then creates and schedules content that replicates your top-performing posts.
          </p>
          <div className="sai-hero-actions">
            {user ? (
              <Link to="/social" className="btn btn-primary btn-lg">
                <Sparkles size={18} /> Open SocialAI Studio
              </Link>
            ) : (
              <>
                <Link to="/register" className="btn btn-primary btn-lg">
                  Start Free Trial <ArrowRight size={18} />
                </Link>
                <a href="#pricing" className="btn btn-outline btn-lg" style={{ borderColor: 'rgba(255,255,255,0.3)', color: 'white' }}>
                  View Pricing
                </a>
              </>
            )}
          </div>
          <div className="sai-hero-stats">
            <div><strong>Google Gemini 2.5</strong><span>AI Engine</span></div>
            <div><strong>Facebook & Instagram</strong><span>Real Data Analysis</span></div>
            <div><strong>Research-Driven</strong><span>Smart Scheduling</span></div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="sai-features">
        <div className="container">
          <h2 className="section-heading">AI That Actually Learns From Your Results</h2>
          <p className="section-sub">Not generic advice — real data from your Facebook and Instagram, analysed by Google Gemini 2.5 AI.</p>

          <div className="sai-features-grid">
            <div className="sai-feature-card">
              <div className="sai-feature-icon" style={{ background: 'rgba(168,85,247,0.1)', color: '#a855f7' }}><Brain size={28} /></div>
              <h3>Research-Driven Scheduling</h3>
              <p>AI analyses your past posts, identifies your top-performing days, times, and content styles, then builds a 2-week calendar that replicates what actually works for your audience.</p>
            </div>
            <div className="sai-feature-card">
              <div className="sai-feature-icon" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}><Search size={28} /></div>
              <h3>Performance Intelligence</h3>
              <p>Get deep AI analysis of your engagement patterns. See which posts resonated, what fell flat, and let AI turn those insights directly into a new content schedule with one click.</p>
            </div>
            <div className="sai-feature-card">
              <div className="sai-feature-icon" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}><Wand2 size={28} /></div>
              <h3>AI Content Generator</h3>
              <p>Generate platform-optimised posts that mirror your best-performing content. AI studies your winning hooks, style, and tone — then creates new posts that follow the same patterns.</p>
            </div>
            <div className="sai-feature-card">
              <div className="sai-feature-icon" style={{ background: 'rgba(79,70,229,0.1)', color: '#4f46e5' }}><ImageIcon size={28} /></div>
              <h3>AI Image Generation</h3>
              <p>Create stunning marketing visuals from text prompts using Google Gemini. No design skills needed — AI generates professional images tailored to each post.</p>
            </div>
            <div className="sai-feature-card">
              <div className="sai-feature-icon" style={{ background: 'rgba(37,99,235,0.1)', color: '#2563eb' }}><Target size={28} /></div>
              <h3>Insights-to-Schedule</h3>
              <p>Analyse your performance, then generate a full content schedule directly from the insights — all in one flow. The AI fills gaps in your calendar based on real data patterns.</p>
            </div>
            <div className="sai-feature-card">
              <div className="sai-feature-icon" style={{ background: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }}><Video size={28} /></div>
              <h3>AI Video Generation</h3>
              <p>Transform any post into a short promotional video clip using Runway ML. Create Reels-ready content in seconds — video posts get 3-5x more engagement than static images.</p>
            </div>
            <div className="sai-feature-card">
              <div className="sai-feature-icon" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}><Palette size={28} /></div>
              <h3>White-Label Ready</h3>
              <p>Full branding control — custom logo, colours, fonts, and tagline. Your customers see your brand, not ours. Perfect for agencies and resellers.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="sai-how-it-works">
        <div className="container">
          <h2 className="section-heading">How It Works</h2>
          <div className="sai-steps">
            <div className="sai-step">
              <div className="sai-step-number">1</div>
              <h3>Connect Your Accounts</h3>
              <p>Set up your brand profile, connect Facebook & Instagram, and add your free Google Gemini API key. The AI starts learning immediately.</p>
            </div>
            <div className="sai-step">
              <div className="sai-step-number">2</div>
              <h3>AI Researches Your Data</h3>
              <p>The engine analyses your past posts, engagement patterns, best days, top hashtags, and what content your audience responds to most.</p>
            </div>
            <div className="sai-step">
              <div className="sai-step-number">3</div>
              <h3>Generate Data-Driven Content</h3>
              <p>One click generates a full 2-week schedule based on real performance data — optimised timing, proven content pillars, and your brand voice.</p>
            </div>
            <div className="sai-step">
              <div className="sai-step-number">4</div>
              <h3>Iterate & Grow</h3>
              <p>Use AI Insights to continuously refine your strategy. Each analysis makes the next schedule smarter. Watch engagement compound over time.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="sai-pricing" id="pricing">
        <div className="container">
          <h2 className="section-heading">Simple, Transparent Pricing</h2>
          <p className="section-sub">No hidden fees. Cancel anytime. All plans include a 14-day free trial.</p>

          <div className="sai-pricing-grid">
            {plans.map((plan, idx) => (
              <div key={idx} className={`sai-plan-card ${plan.highlight ? 'featured' : ''}`}>
                {plan.highlight && <div className="sai-plan-badge"><Star size={12} /> MOST POPULAR</div>}
                <h3>{plan.name}</h3>
                <div className="sai-plan-price">
                  <span className="sai-price-amount">${plan.price}</span>
                  <span className="sai-price-period">{plan.period}</span>
                </div>
                <p className="sai-plan-desc">{plan.description}</p>
                <ul className="sai-plan-features">
                  {plan.features.map((f, i) => (
                    <li key={i}><CheckCircle size={16} /> {f}</li>
                  ))}
                </ul>
                <Link
                  to={plan.name === 'Enterprise' ? '/contact' : user ? '/social' : '/register'}
                  className={`btn ${plan.highlight ? 'btn-primary' : 'btn-secondary'} btn-lg sai-plan-cta`}
                >
                  {plan.cta} <ArrowRight size={16} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="sai-social-proof">
        <div className="container">
          <div className="sai-proof-grid">
            <div className="sai-proof-item">
              <Brain size={32} style={{ color: '#f59e0b' }} />
              <strong>Data-Driven</strong>
              <span>AI learns from your real engagement</span>
            </div>
            <div className="sai-proof-item">
              <TrendingUp size={32} style={{ color: '#f59e0b' }} />
              <strong>Smarter Each Time</strong>
              <span>strategies improve with every analysis</span>
            </div>
            <div className="sai-proof-item">
              <Zap size={32} style={{ color: '#f59e0b' }} />
              <strong>10x Faster</strong>
              <span>than manual content creation</span>
            </div>
            <div className="sai-proof-item">
              <Clock size={32} style={{ color: '#f59e0b' }} />
              <strong>Hours Saved</strong>
              <span>every single week</span>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="sai-final-cta">
        <div className="container">
          <Sparkles size={40} style={{ color: '#f59e0b', marginBottom: '1rem' }} />
          <h2>Your AI Social Media Strategist Awaits</h2>
          <p>Stop guessing. Start posting content backed by real engagement data. 14-day free trial, no credit card required.</p>
          <Link to={user ? '/social' : '/register'} className="btn btn-primary btn-lg">
            {user ? 'Open SocialAI Studio' : 'Start Free Trial'} <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default SocialAIProduct;
