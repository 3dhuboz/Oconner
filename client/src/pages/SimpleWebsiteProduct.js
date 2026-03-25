import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Globe, ShoppingCart, CreditCard, Brain, BarChart3, Calendar,
  CheckCircle, ArrowRight, Star, Users, Clock, Shield, Smartphone,
  Mail, Package, Palette, Settings, FileText, Image, Sparkles,
  Lock, Layers, Search, Heart
} from 'lucide-react';
import './SimpleWebsiteProduct.css';

const SimpleWebsiteProduct = () => {
  const { user } = useAuth();

  const features = [
    {
      icon: <ShoppingCart size={28} />,
      color: '#10b981',
      title: 'Full E-Commerce Storefront',
      desc: 'Beautiful product pages, category browsing, image galleries, and a responsive grid layout. Your customers get a premium shopping experience on any device.'
    },
    {
      icon: <CreditCard size={28} />,
      color: '#3b82f6',
      title: 'Square Checkout',
      desc: 'Accept payments securely via Square. Customers add to cart, review their order, and pay — all without leaving your site.'
    },
    {
      icon: <Package size={28} />,
      color: '#f59e0b',
      title: 'Inventory Management',
      desc: 'Add, edit, and organise products with categories, images, prices, and stock levels. Full CRUD from your admin dashboard.'
    },
    {
      icon: <FileText size={28} />,
      color: '#8b5cf6',
      title: 'CMS Content Editor',
      desc: 'Edit every piece of text, image, and branding on your site from the admin panel. Hero sections, about pages, contact info — all configurable.'
    },
    {
      icon: <Users size={28} />,
      color: '#ec4899',
      title: 'Customer Accounts',
      desc: 'Google Sign-In via Firebase Auth. Customers create accounts, view order history, and manage their profile.'
    },
    {
      icon: <Mail size={28} />,
      color: '#ef4444',
      title: 'Email Notifications',
      desc: 'Automated order confirmation emails to customers and admin alerts. Configurable SMTP settings for your own domain.'
    },
    {
      icon: <Settings size={28} />,
      color: '#06b6d4',
      title: 'GST & Tax Config',
      desc: 'Set your tax rate, shipping costs, free shipping thresholds, and business details. Built for Australian businesses but works globally.'
    },
    {
      icon: <Smartphone size={28} />,
      color: '#14b8a6',
      title: 'PWA — Install & Offline',
      desc: 'Works like a native app. Customers install to their home screen. Fast, reliable, and works even with spotty internet.'
    },
    {
      icon: <Image size={28} />,
      color: '#a855f7',
      title: 'Image Management',
      desc: 'Upload product images, hero banners, and logos. All stored via Firebase Storage with automatic optimisation.'
    },
    {
      icon: <Palette size={28} />,
      color: '#f97316',
      title: 'Full White-Label',
      desc: 'Your logo, colours, business name, and contact info — everywhere. From the storefront to emails. No trace of us.'
    },
    {
      icon: <Search size={28} />,
      color: '#0ea5e9',
      title: 'Contact Form & Inbox',
      desc: 'Built-in contact page with form submission. All enquiries land in your admin inbox for easy management.'
    },
    {
      icon: <Layers size={28} />,
      color: '#84cc16',
      title: 'Category System',
      desc: 'Organise products into categories with images and descriptions. Customers can browse and filter with ease.'
    }
  ];

  const socialAIFeatures = [
    { icon: <Sparkles size={20} />, text: 'AI Content Generation — Create platform-optimised posts for Facebook & Instagram' },
    { icon: <Image size={20} />, text: 'AI Image Creation — Generate scroll-stopping marketing visuals with Google Gemini' },
    { icon: <Calendar size={20} />, text: 'Smart Scheduler — Auto-plan a 2-week content calendar with optimal timing' },
    { icon: <BarChart3 size={20} />, text: 'Performance Insights — AI-powered recommendations to grow your reach' },
    { icon: <Brain size={20} />, text: 'Topic Research — AI assistant for trending topics in your industry' },
    { icon: <Globe size={20} />, text: 'Multi-Platform — Optimised for Facebook, Instagram, or both simultaneously' }
  ];

  const plans = [
    {
      name: 'Starter',
      price: 39,
      period: '/mo',
      description: 'A complete e-commerce website ready to customise and sell from. Everything you need to get online.',
      features: [
        'Full E-Commerce Storefront',
        'Shopping Cart & Checkout',
        'Admin Dashboard',
        'CMS Content Editor',
        'Order Management',
        'Customer Accounts',
        'Email Notifications',
        '1 Store'
      ],
      cta: 'Start Free Trial',
      highlight: false
    },
    {
      name: 'Professional',
      price: 79,
      period: '/mo',
      description: 'The full package — your branded store plus AI-powered social media marketing built right in.',
      features: [
        'Everything in Starter',
        'SocialAI Studio Add-On',
        'AI Content Generation',
        'AI Image Creation',
        'Smart Post Scheduler',
        'Engagement Insights',
        'Full White-Label Branding',
        '3 Stores'
      ],
      cta: 'Get Started',
      highlight: true
    },
    {
      name: 'Enterprise',
      price: 159,
      period: '/mo',
      description: 'Multi-store operations with custom domain, priority support, and dedicated account management.',
      features: [
        'Everything in Professional',
        'Custom Domain',
        'Priority Support',
        'API Access',
        'Multi-Store Management',
        'Dedicated Account Manager',
        'SLA-Backed Uptime',
        'Unlimited Stores'
      ],
      cta: 'Contact Sales',
      highlight: false
    }
  ];

  const benefits = [
    { icon: <Clock size={24} />, title: 'Launch Fast', text: 'Go from zero to a fully branded online store in under an hour. No coding required.' },
    { icon: <Shield size={24} />, title: '100% Yours', text: 'Full white-label. Customers see YOUR brand, YOUR domain, YOUR identity. Not ours.' },
    { icon: <Heart size={24} />, title: 'Beautiful Design', text: 'Modern, responsive storefront with hero sections, product grids, and smooth animations.' },
    { icon: <Sparkles size={24} />, title: 'AI Marketing', text: 'Upgrade to Professional and get AI-powered social media content, images, and scheduling.' },
    { icon: <Lock size={24} />, title: 'Secure Payments', text: 'Square-powered checkout keeps payment data safe. PCI compliant out of the box.' },
    { icon: <Globe size={24} />, title: 'Works Everywhere', text: 'PWA runs on any device. No app store needed. Installs to home screen in one tap.' }
  ];

  return (
    <div className="sw-product-page">
      {/* Hero */}
      <section className="sw-hero">
        <div className="container">
          <div className="sw-hero-badge">
            <Globe size={14} /> WHITE-LABEL E-COMMERCE
          </div>
          <h1>SimpleWebsite</h1>
          <p className="sw-hero-sub">
            A complete, white-label e-commerce website with storefront, admin dashboard,
            CMS, and optional AI-powered social media marketing. Your brand. Your store. Your rules.
          </p>
          <div className="sw-hero-actions">
            {user ? (
              <Link to="/marketplace" className="btn btn-primary btn-lg">
                <Globe size={18} /> Subscribe in Marketplace
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
          <div className="sw-hero-stats">
            <div><strong>React 19 + TypeScript</strong><span>Modern Stack</span></div>
            <div><strong>Square Payments</strong><span>Built-In</span></div>
            <div><strong>Firebase</strong><span>Auth & Storage</span></div>
            <div><strong>100% White-Label</strong><span>Your Brand</span></div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="sw-benefits">
        <div className="container">
          <h2 className="section-heading">Why Businesses Choose SimpleWebsite</h2>
          <p className="section-sub">Skip the expensive web developer. Get a professional online store that you control completely.</p>
          <div className="sw-benefits-grid">
            {benefits.map((b, i) => (
              <div key={i} className="sw-benefit-item">
                <div className="sw-benefit-icon">{b.icon}</div>
                <div>
                  <h4>{b.title}</h4>
                  <p>{b.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="sw-features">
        <div className="container">
          <h2 className="section-heading">Everything You Need to Sell Online</h2>
          <p className="section-sub">From product pages to payment processing — it's all built in and ready to go.</p>
          <div className="sw-features-grid">
            {features.map((f, i) => (
              <div key={i} className="sw-feature-card">
                <div className="sw-feature-icon" style={{ background: `${f.color}15`, color: f.color }}>{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SocialAI Add-On */}
      <section className="sw-addon">
        <div className="container">
          <div className="sw-addon-card">
            <div className="sw-addon-badge"><Sparkles size={14} /> PREMIUM ADD-ON</div>
            <h2>SocialAI Studio</h2>
            <p className="sw-addon-desc">
              Upgrade to the Professional plan and unlock a full AI-powered social media command centre.
              Generate weeks of content in minutes — powered by Google Gemini 2.5.
            </p>
            <div className="sw-addon-features">
              {socialAIFeatures.map((f, i) => (
                <div key={i} className="sw-addon-feature">
                  <span className="sw-addon-feature-icon">{f.icon}</span>
                  <span>{f.text}</span>
                </div>
              ))}
            </div>
            <div className="sw-addon-cta">
              <span className="sw-addon-price">Included in Professional ($79/mo) and Enterprise ($159/mo)</span>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="sw-how-it-works">
        <div className="container">
          <h2 className="section-heading">Up and Running in Minutes</h2>
          <div className="sw-steps">
            <div className="sw-step">
              <div className="sw-step-number">1</div>
              <h3>Subscribe & Deploy</h3>
              <p>Choose your plan in our marketplace. We deploy your branded website and hand you the admin credentials.</p>
            </div>
            <div className="sw-step">
              <div className="sw-step-number">2</div>
              <h3>Brand It</h3>
              <p>Open the CMS and set your business name, logo, colours, hero images, about text, and contact details.</p>
            </div>
            <div className="sw-step">
              <div className="sw-step-number">3</div>
              <h3>Add Products</h3>
              <p>Create categories, upload product images, set prices and descriptions. Your storefront updates instantly.</p>
            </div>
            <div className="sw-step">
              <div className="sw-step-number">4</div>
              <h3>Start Selling</h3>
              <p>Share your link or connect a custom domain. Customers browse, add to cart, and pay via Square.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Admin Dashboard Highlight */}
      <section className="sw-admin-highlight">
        <div className="container">
          <h2 className="section-heading">A Powerful Admin Dashboard</h2>
          <p className="section-sub">Everything you need to manage your online store from one place.</p>
          <div className="sw-admin-grid">
            <div className="sw-admin-item"><Package size={20} /> <span>Inventory Management</span></div>
            <div className="sw-admin-item"><ShoppingCart size={20} /> <span>Order Tracking</span></div>
            <div className="sw-admin-item"><FileText size={20} /> <span>CMS Content Editor</span></div>
            <div className="sw-admin-item"><Users size={20} /> <span>Customer Database</span></div>
            <div className="sw-admin-item"><Mail size={20} /> <span>Contact Inbox</span></div>
            <div className="sw-admin-item"><Palette size={20} /> <span>Branding & Theming</span></div>
            <div className="sw-admin-item"><Settings size={20} /> <span>Site Settings</span></div>
            <div className="sw-admin-item"><CreditCard size={20} /> <span>Payment Config</span></div>
            <div className="sw-admin-item"><Image size={20} /> <span>Media Library</span></div>
            <div className="sw-admin-item"><BarChart3 size={20} /> <span>Dashboard Analytics</span></div>
            <div className="sw-admin-item"><Sparkles size={20} /> <span>SocialAI Studio</span></div>
            <div className="sw-admin-item"><Lock size={20} /> <span>Firebase Auth</span></div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="sw-pricing" id="pricing">
        <div className="container">
          <h2 className="section-heading">Simple, Transparent Pricing</h2>
          <p className="section-sub">No hidden fees. Cancel anytime. One-time $199 setup fee includes branding configuration and deployment.</p>

          <div className="sw-pricing-grid">
            {plans.map((plan, idx) => (
              <div key={idx} className={`sw-plan-card ${plan.highlight ? 'featured' : ''}`}>
                {plan.highlight && <div className="sw-plan-badge"><Star size={12} /> MOST POPULAR</div>}
                <h3>{plan.name}</h3>
                <div className="sw-plan-price">
                  <span className="sw-price-amount">${plan.price}</span>
                  <span className="sw-price-period">{plan.period}</span>
                </div>
                <p className="sw-plan-desc">{plan.description}</p>
                <ul className="sw-plan-features">
                  {plan.features.map((f, i) => (
                    <li key={i}><CheckCircle size={16} /> {f}</li>
                  ))}
                </ul>
                <Link
                  to={plan.name === 'Enterprise' ? '/contact' : user ? '/marketplace' : '/register'}
                  className={`btn ${plan.highlight ? 'btn-primary' : 'btn-secondary'} btn-lg sw-plan-cta`}
                >
                  {plan.cta} <ArrowRight size={16} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="sw-social-proof">
        <div className="container">
          <div className="sw-proof-grid">
            <div className="sw-proof-item">
              <ShoppingCart size={32} style={{ color: '#10b981' }} />
              <strong>Sell Online</strong>
              <span>Full storefront with cart & checkout</span>
            </div>
            <div className="sw-proof-item">
              <Sparkles size={32} style={{ color: '#f59e0b' }} />
              <strong>AI Marketing</strong>
              <span>SocialAI generates content for you</span>
            </div>
            <div className="sw-proof-item">
              <Smartphone size={32} style={{ color: '#10b981' }} />
              <strong>Mobile-First</strong>
              <span>PWA installs to any phone</span>
            </div>
            <div className="sw-proof-item">
              <Palette size={32} style={{ color: '#10b981' }} />
              <strong>Your Brand</strong>
              <span>100% white-label — completely yours</span>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="sw-final-cta">
        <div className="container">
          <Globe size={40} style={{ color: '#10b981', marginBottom: '1rem' }} />
          <h2>Ready to Launch Your Online Store?</h2>
          <p>Start your 14-day free trial today. No credit card required.</p>
          <Link to={user ? '/marketplace' : '/register'} className="btn btn-primary btn-lg">
            {user ? 'Subscribe in Marketplace' : 'Start Free Trial'} <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default SimpleWebsiteProduct;
