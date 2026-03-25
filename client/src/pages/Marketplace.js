import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Store, Sparkles, Zap, CheckCircle, ArrowRight, Crown, Star, Shield,
  Search, Filter, Loader2, ExternalLink, BarChart3, Brain, Wand2,
  Palette, Globe, Workflow, Settings, Code, Layers, Gamepad2
} from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';
import './Marketplace.css';

const ICON_MAP = {
  sparkles: Sparkles, zap: Zap, bolt: Zap, 'bar-chart': BarChart3, brain: Brain,
  wand: Wand2, palette: Palette, globe: Globe, workflow: Workflow,
  settings: Settings, code: Code, layers: Layers, star: Star, 'gamepad-2': Gamepad2
};

const APP_LOGOS = {
  sparkles: () => (
    <svg viewBox="0 0 48 48" className="mp-app-logo">
      <defs><linearGradient id="g-spark" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#f59e0b"/><stop offset="100%" stopColor="#ea580c"/></linearGradient></defs>
      <circle cx="24" cy="24" r="22" fill="none" stroke="url(#g-spark)" strokeWidth="2"/>
      <path d="M24 10l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="url(#g-spark)"/>
    </svg>
  ),
  palette: () => (
    <svg viewBox="0 0 48 48" className="mp-app-logo">
      <defs><linearGradient id="g-pal" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#00d4ff"/><stop offset="100%" stopColor="#06b6d4"/></linearGradient></defs>
      <circle cx="24" cy="24" r="22" fill="none" stroke="url(#g-pal)" strokeWidth="2"/>
      <circle cx="18" cy="18" r="3" fill="#ff006e"/><circle cx="30" cy="18" r="3" fill="#00d4ff"/>
      <circle cx="18" cy="30" r="3" fill="#fbbf24"/><circle cx="30" cy="30" r="3" fill="#00ff88"/>
    </svg>
  ),
  workflow: () => (
    <svg viewBox="0 0 48 48" className="mp-app-logo">
      <defs><linearGradient id="g-wf" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#8b5cf6"/><stop offset="100%" stopColor="#6366f1"/></linearGradient></defs>
      <circle cx="24" cy="24" r="22" fill="none" stroke="url(#g-wf)" strokeWidth="2"/>
      <rect x="12" y="14" width="10" height="6" rx="2" fill="url(#g-wf)"/>
      <rect x="26" y="28" width="10" height="6" rx="2" fill="url(#g-wf)"/>
      <path d="M22 20l4 8" stroke="url(#g-wf)" strokeWidth="2" fill="none"/>
    </svg>
  ),
  zap: () => (
    <svg viewBox="0 0 48 48" className="mp-app-logo">
      <defs><linearGradient id="g-zap" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#00ff88"/><stop offset="100%" stopColor="#10b981"/></linearGradient></defs>
      <circle cx="24" cy="24" r="22" fill="none" stroke="url(#g-zap)" strokeWidth="2"/>
      <path d="M26 10L18 26h6l-2 12 10-16h-6z" fill="url(#g-zap)"/>
    </svg>
  ),
  bolt: () => (
    <svg viewBox="0 0 48 48" className="mp-app-logo">
      <defs><linearGradient id="g-bolt" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#f5a623"/><stop offset="100%" stopColor="#e8930d"/></linearGradient></defs>
      <circle cx="24" cy="24" r="22" fill="none" stroke="url(#g-bolt)" strokeWidth="2"/>
      <path d="M27 8L17 25h7l-3 15 13-18h-7z" fill="url(#g-bolt)"/>
      <circle cx="12" cy="12" r="2" fill="#f5a623" opacity="0.5"/>
      <circle cx="36" cy="36" r="1.5" fill="#f5a623" opacity="0.4"/>
    </svg>
  ),
  globe: () => (
    <svg viewBox="0 0 48 48" className="mp-app-logo">
      <defs><linearGradient id="g-globe" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#10b981"/><stop offset="100%" stopColor="#059669"/></linearGradient></defs>
      <circle cx="24" cy="24" r="22" fill="none" stroke="url(#g-globe)" strokeWidth="2"/>
      <circle cx="24" cy="24" r="14" fill="none" stroke="url(#g-globe)" strokeWidth="1.5"/>
      <ellipse cx="24" cy="24" rx="8" ry="14" fill="none" stroke="url(#g-globe)" strokeWidth="1.5"/>
      <line x1="10" y1="24" x2="38" y2="24" stroke="url(#g-globe)" strokeWidth="1.5"/>
      <line x1="24" y1="10" x2="24" y2="38" stroke="url(#g-globe)" strokeWidth="1.5"/>
    </svg>
  ),
  'gamepad-2': () => (
    <svg viewBox="0 0 48 48" className="mp-app-logo">
      <defs><linearGradient id="g-gp" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#ef4444"/><stop offset="100%" stopColor="#f97316"/></linearGradient></defs>
      <circle cx="24" cy="24" r="22" fill="none" stroke="url(#g-gp)" strokeWidth="2"/>
      <rect x="10" y="18" width="28" height="14" rx="7" fill="none" stroke="url(#g-gp)" strokeWidth="2"/>
      <circle cx="18" cy="25" r="2" fill="url(#g-gp)"/><circle cx="30" cy="25" r="2" fill="url(#g-gp)"/>
      <line x1="14" y1="18" x2="14" y2="14" stroke="url(#g-gp)" strokeWidth="2" strokeLinecap="round"/>
      <line x1="34" y1="18" x2="34" y2="14" stroke="url(#g-gp)" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
};

const SAVINGS_DATA = {
  'social-ai': { alternative: 'Social media manager', altCost: 2000 },
  'social-ai-studio': { alternative: 'Social media manager', altCost: 2000 },
  'autohue': { alternative: 'Manual photo sorting', altCost: 1200 },
  'foodtruc': { alternative: 'Third-party ordering platform fees', altCost: 800 },
  'food-truck': { alternative: 'Third-party ordering platform fees', altCost: 800 },
  'wirez': { alternative: 'Manual job tracking + admin assistant', altCost: 1500 },
  'simple-website': { alternative: 'Custom website development', altCost: 3000 },
  'roblox-forge': { alternative: 'Freelance Roblox developer', altCost: 500 },
};

const APP_PREVIEWS = {
  'social-ai': '/app-previews/socialai-preview.svg',
  'social-ai-studio': '/app-previews/socialai-preview.svg',
  'autohue': '/app-previews/autohue-preview.svg',
  'foodtruc': '/app-previews/foodtruck-preview.svg',
  'food-truck': '/app-previews/foodtruck-preview.svg',
  'wirez': '/app-previews/wirez-preview.svg',
  'simple-website': '/app-previews/simplewebsite-preview.svg',
};

const CATEGORY_LABELS = {
  ai: 'AI', automation: 'Automation', analytics: 'Analytics',
  productivity: 'Productivity', marketing: 'Marketing', 'food-service': 'Food & Hospitality',
  automotive: 'Automotive', trades: 'Trades & Services', ecommerce: 'E-Commerce', utility: 'Utility', other: 'Other'
};

const Marketplace = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [apps, setApps] = useState([]);
  const [mySubs, setMySubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedApp, setSelectedApp] = useState(null);
  const [purchasing, setPurchasing] = useState(false);
  const [billingInterval, setBillingInterval] = useState('monthly');

  useEffect(() => {
    const load = async () => {
      try {
        const [appsRes, subsRes] = await Promise.all([
          api.get('/marketplace/apps'),
          user ? api.get('/marketplace/my-apps').catch(() => ({ data: [] })) : Promise.resolve({ data: [] })
        ]);
        setApps(appsRes.data);
        setMySubs(subsRes.data);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const getSubForApp = (appId) => mySubs.find(s => (s.app?._id || s.app) === appId);

  const handlePurchase = async (appSlug, planKey) => {
    if (!user) { navigate('/login'); return; }
    setPurchasing(true);
    try {
      const res = await api.post('/marketplace/subscribe', { appSlug, planKey, billingInterval });
      toast.success(res.data.message);
      // Refresh subs
      const subsRes = await api.get('/marketplace/my-apps');
      setMySubs(subsRes.data);
      setSelectedApp(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Purchase failed');
    }
    setPurchasing(false);
  };

  const filteredApps = apps.filter(a => {
    if (categoryFilter !== 'all' && a.category !== categoryFilter) return false;
    if (searchTerm && !a.name.toLowerCase().includes(searchTerm.toLowerCase()) && !a.shortDescription.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const categories = ['all', ...new Set(apps.map(a => a.category))];

  if (loading) return <div className="page-loading">Loading Marketplace...</div>;

  return (
    <div className="marketplace-page">
      {/* Hero */}
      <section className="mp-hero">
        <div className="container">
          <div className="mp-hero-content">
            <div className="mp-hero-badge"><Store size={14} /> App Marketplace</div>
            <h1>Smart Apps.<br /><span className="mp-hero-highlight">Your Brand.</span></h1>
            <p>Browse our growing library of apps. Subscribe to any, get your own login, and white-label it as your own. Each app is a fully managed, branded product — powered by Penny Wise I.T under the hood.</p>
          </div>
        </div>
      </section>

      {/* Search & Filter */}
      <section className="mp-browse">
        <div className="container">
          <div className="mp-toolbar">
            <div className="mp-search">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search apps..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="mp-filters">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`mp-filter-btn ${categoryFilter === cat ? 'active' : ''}`}
                >
                  {cat === 'all' ? 'All' : CATEGORY_LABELS[cat] || cat}
                </button>
              ))}
            </div>
          </div>

          {/* App Grid */}
          <div className="mp-grid">
            {filteredApps.map(app => {
              const Icon = ICON_MAP[app.icon] || Sparkles;
              const LogoSvg = APP_LOGOS[app.icon];
              const sub = getSubForApp(app._id);
              const isSubscribed = sub?.isActive;
              const savingsInfo = SAVINGS_DATA[app.slug];
              const lowestPrice = Math.min(...app.plans.map(p => p.price));
              return (
                <div key={app._id} className="mp-card" onClick={() => setSelectedApp(app)}>
                  {(app.heroImage || APP_PREVIEWS[app.slug]) && (
                    <div className="mp-card-preview">
                      <img src={app.heroImage || APP_PREVIEWS[app.slug]} alt={app.name} />
                    </div>
                  )}
                  <div className="mp-card-header">
                    <div className="mp-card-icon">{LogoSvg ? <LogoSvg /> : <Icon size={24} />}</div>
                    <div className="mp-card-meta">
                      <span className="mp-category-tag">{CATEGORY_LABELS[app.category] || app.category}</span>
                      {isSubscribed && (
                        <span className="mp-subscribed-badge"><CheckCircle size={12} /> Subscribed</span>
                      )}
                    </div>
                  </div>
                  <h3>{app.name}</h3>
                  <p>{app.shortDescription}</p>
                  <div className="mp-card-features">
                    {(app.features || []).slice(0, 3).map((f, i) => (
                      <span key={i} className="mp-feature-tag">{f}</span>
                    ))}
                    {app.features?.length > 3 && <span className="mp-feature-more">+{app.features.length - 3} more</span>}
                  </div>
                  <div className="mp-card-footer">
                    <div className="mp-price">
                      <div>From <strong>${lowestPrice}</strong>/mo</div>
                      {savingsInfo && lowestPrice > 0 && (
                        <span className="mp-savings-badge">
                          Save ${(savingsInfo.altCost - lowestPrice).toLocaleString()}/mo vs {savingsInfo.alternative.toLowerCase()}
                        </span>
                      )}
                    </div>
                    <span className="mp-card-cta">
                      {isSubscribed ? 'Manage' : 'View Plans'} <ArrowRight size={14} />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredApps.length === 0 && (
            <div className="mp-empty">
              <Store size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
              <p>No apps found. Check back soon — more are on the way.</p>
            </div>
          )}
        </div>
      </section>

      {/* App Detail Modal */}
      {selectedApp && (
        <div className="mp-modal-overlay" onClick={() => setSelectedApp(null)}>
          <div className="mp-modal" onClick={e => e.stopPropagation()}>
            <button className="mp-modal-close" onClick={() => setSelectedApp(null)}>&times;</button>

            <div className="mp-modal-header">
              {(() => { const Icon = ICON_MAP[selectedApp.icon] || Sparkles; return <Icon size={32} />; })()}
              <div>
                <h2>{selectedApp.name}</h2>
                <span className="mp-category-tag" style={{ marginTop: 4 }}>{CATEGORY_LABELS[selectedApp.category]}</span>
              </div>
            </div>

            <p className="mp-modal-desc">{selectedApp.fullDescription || selectedApp.shortDescription}</p>

            <div className="mp-modal-actions">
              {selectedApp.routePath && (
                <Link to={selectedApp.routePath} className="btn btn-outline" onClick={() => setSelectedApp(null)}>
                  <ArrowRight size={14} /> Learn More
                </Link>
              )}
              {selectedApp.demoUrl && (
                <a href={selectedApp.demoUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                  <ExternalLink size={14} /> Try Demo
                </a>
              )}
            </div>

            {selectedApp.features?.length > 0 && (
              <div className="mp-modal-features">
                <h4>Features</h4>
                <ul>
                  {selectedApp.features.map((f, i) => (
                    <li key={i}><CheckCircle size={14} /> {f}</li>
                  ))}
                </ul>
              </div>
            )}

            {selectedApp.setupFee > 0 && (
              <div className="mp-setup-fee">
                <span>One-Time Setup Fee</span>
                <strong>${selectedApp.setupFee} AUD</strong>
                <small>Includes branding configuration, deployment, and onboarding</small>
              </div>
            )}

            <div className="mp-modal-plans">
              <div className="mp-plans-header">
                <h4>Choose a Plan</h4>
                <div className="mp-billing-toggle">
                  <button className={billingInterval === 'monthly' ? 'active' : ''} onClick={() => setBillingInterval('monthly')}>Monthly</button>
                  <button className={billingInterval === 'yearly' ? 'active' : ''} onClick={() => setBillingInterval('yearly')}>Yearly <span className="mp-save-badge">Save 2 months</span></button>
                </div>
              </div>
              <div className="mp-plans-row">
                {selectedApp.plans.map(plan => {
                  const sub = getSubForApp(selectedApp._id);
                  const isCurrent = sub?.isActive && sub?.planKey === plan.key;
                  const PlanIcon = plan.color === '#a855f7' ? Shield : plan.color === '#f59e0b' ? Crown : Star;
                  const displayPrice = billingInterval === 'yearly' && plan.yearlyPrice ? plan.yearlyPrice : plan.price;
                  const period = billingInterval === 'yearly' ? '/yr' : '/mo';
                  return (
                    <div key={plan.key} className={`mp-plan-card ${plan.popular ? 'mp-plan-popular' : ''} ${isCurrent ? 'mp-plan-current' : ''}`}>
                      {plan.popular && <div className="mp-plan-badge">POPULAR</div>}
                      {isCurrent && <div className="mp-plan-badge mp-plan-badge-current">CURRENT</div>}
                      <PlanIcon size={22} style={{ color: plan.color, marginBottom: '0.5rem' }} />
                      <h5>{plan.name}</h5>
                      <div className="mp-plan-price">
                        <span className="mp-plan-amount">${displayPrice}</span>
                        <span className="mp-plan-period">{period}</span>
                      </div>
                      {billingInterval === 'yearly' && plan.yearlyPrice > 0 && (
                        <div className="mp-plan-savings">Save ${(plan.price * 12) - plan.yearlyPrice}/yr</div>
                      )}
                      {SAVINGS_DATA[selectedApp.slug] && displayPrice > 0 && (
                        <div className="mp-plan-vs-savings">
                          You save <strong>${(SAVINGS_DATA[selectedApp.slug].altCost - displayPrice).toLocaleString()}{period}</strong> vs {SAVINGS_DATA[selectedApp.slug].alternative.toLowerCase()}
                        </div>
                      )}
                      <ul className="mp-plan-features">
                        {plan.features.map((f, i) => (
                          <li key={i}><CheckCircle size={12} style={{ color: plan.color }} /> {f}</li>
                        ))}
                        {plan.whiteLabel && <li><Palette size={12} style={{ color: plan.color }} /> White-Label Branding</li>}
                        {plan.customDomain && <li><Globe size={12} style={{ color: plan.color }} /> Custom Domain</li>}
                      </ul>
                      {isCurrent ? (
                        <button className="btn btn-secondary" style={{ width: '100%' }} disabled>
                          <CheckCircle size={14} /> Current Plan
                        </button>
                      ) : (
                        <button
                          onClick={() => handlePurchase(selectedApp.slug, plan.key)}
                          disabled={purchasing}
                          className="btn btn-primary"
                          style={{ width: '100%', background: plan.color, borderColor: plan.color }}
                        >
                          {purchasing ? <Loader2 size={14} className="spin" /> : <Zap size={14} />}
                          {sub?.isActive ? 'Switch Plan' : 'Subscribe'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {selectedApp.techStack?.length > 0 && (
              <div className="mp-modal-tech">
                <h4>Tech Stack</h4>
                <div className="mp-tech-tags">
                  {selectedApp.techStack.map((t, i) => <span key={i}>{t}</span>)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Marketplace;
