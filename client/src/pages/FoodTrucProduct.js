import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Zap, ShoppingCart, CreditCard, Brain, BarChart3, Calendar,
  CheckCircle, ArrowRight, Star, Users, Clock, Shield, Smartphone,
  Gift, Mail, MessageSquare, Camera, MapPin, Utensils, Truck,
  ChefHat, Flame, Heart, Globe, Palette
} from 'lucide-react';
import './FoodTrucProduct.css';

const FoodTrucProduct = () => {
  const { user } = useAuth();

  const features = [
    {
      icon: <ShoppingCart size={28} />,
      color: '#10b981',
      title: 'Online Ordering',
      desc: 'Accept takeaway and catering orders 24/7. Customers browse your menu, customise items, pick a date and pay — all from their phone.'
    },
    {
      icon: <Utensils size={28} />,
      color: '#f59e0b',
      title: 'DIY Catering Builder',
      desc: 'Customers build their own catering packs — pick proteins, sides, and extras for their event. You set the packages and prices.'
    },
    {
      icon: <CreditCard size={28} />,
      color: '#3b82f6',
      title: 'Square Payments',
      desc: 'Accept payments instantly via Square checkout links. Webhooks auto-confirm payments and update order status in real-time.'
    },
    {
      icon: <Brain size={28} />,
      color: '#8b5cf6',
      title: 'AI Assistant',
      desc: 'Built-in AI chat powered by Google Gemini and Claude. Generates social posts, marketing images, and answers customer queries.'
    },
    {
      icon: <Gift size={28} />,
      color: '#ec4899',
      title: 'Loyalty Rewards',
      desc: 'Configurable stamp-based loyalty program. Customers earn stamps per order and redeem prizes — fully branded to your business.'
    },
    {
      icon: <Calendar size={28} />,
      color: '#06b6d4',
      title: 'Cook-Day Planner',
      desc: 'Manage your cook schedule, block dates, set pop-up locations, and let customers order for specific cook days.'
    },
    {
      icon: <Mail size={28} />,
      color: '#ef4444',
      title: 'Email & SMS',
      desc: 'Send order confirmations, invoices, and blast promotions via email (SMTP/SendGrid) and SMS (Twilio/MessageBird).'
    },
    {
      icon: <Smartphone size={28} />,
      color: '#14b8a6',
      title: 'PWA — Install & Offline',
      desc: 'Works like a native app. Customers install it to their home screen. Offline support means it loads even with spotty signal.'
    },
    {
      icon: <Camera size={28} />,
      color: '#a855f7',
      title: 'Customer Gallery',
      desc: 'Let customers upload food photos. Moderate submissions from your dashboard. Build community and social proof automatically.'
    },
    {
      icon: <Palette size={28} />,
      color: '#f97316',
      title: 'Full White-Label',
      desc: 'Your logo, your colours, your name — everywhere. From the customer-facing app to invoices and emails. No trace of us.'
    },
    {
      icon: <MapPin size={28} />,
      color: '#0ea5e9',
      title: 'Events & Locations',
      desc: 'Publish upcoming events, pop-up locations, and special cook days. Customers see where to find you next.'
    },
    {
      icon: <Truck size={28} />,
      color: '#84cc16',
      title: 'Delivery Tracking',
      desc: 'Track delivery orders with courier details and tracking numbers. Customers get real-time status updates.'
    }
  ];

  const plans = [
    {
      name: 'Starter',
      price: 79,
      period: '/mo',
      description: 'Everything you need to take your food truck online and start accepting orders.',
      features: [
        'Full Online Menu & Ordering',
        'Square Payment Integration',
        'Order Management Dashboard',
        'Cook-Day Planner',
        'Email Notifications',
        'Events Calendar',
        'Customer Database',
        '1 Location'
      ],
      cta: 'Start Free Trial',
      highlight: false
    },
    {
      name: 'Professional',
      price: 149,
      period: '/mo',
      description: 'For growing food businesses that want the full platform with branding and AI.',
      features: [
        'Everything in Starter',
        'DIY Catering Builder',
        'Loyalty Rewards Program',
        'SMS Notifications (Twilio)',
        'AI Chat Assistant',
        'Customer Gallery',
        'Social Content Generator',
        'Full White-Label Branding',
        '3 Locations'
      ],
      cta: 'Get Started',
      highlight: true
    },
    {
      name: 'Enterprise',
      price: 299,
      period: '/mo',
      description: 'Multi-location operations with dedicated support and advanced features.',
      features: [
        'Everything in Professional',
        'Custom Domain',
        'Multi-Location Management',
        'Priority Support',
        'Advanced Analytics Dashboard',
        'API Access',
        'Dedicated Account Manager',
        'Unlimited Locations'
      ],
      cta: 'Contact Sales',
      highlight: false
    }
  ];

  const benefits = [
    { icon: <Clock size={24} />, title: 'Open 24/7', text: 'Take orders while you sleep. Customers order anytime — you fulfil on your schedule.' },
    { icon: <Users size={24} />, title: 'Build Your Database', text: 'Every order captures customer data. Send targeted promos and bring them back.' },
    { icon: <Shield size={24} />, title: '100% Yours', text: 'Full white-label. Customers see YOUR brand, YOUR domain, YOUR identity. Not ours.' },
    { icon: <Flame size={24} />, title: 'Sell More Catering', text: 'The DIY catering builder turns browsers into big-ticket orders effortlessly.' },
    { icon: <Heart size={24} />, title: 'Loyalty That Works', text: 'Stamp cards keep customers coming back. Configurable rewards they actually want.' },
    { icon: <Globe size={24} />, title: 'Works Everywhere', text: 'PWA runs on any device. No app store needed. Installs to home screen in one tap.' }
  ];

  return (
    <div className="ft-product-page">
      {/* Hero */}
      <section className="ft-hero">
        <div className="container">
          <div className="ft-hero-badge">
            <Zap size={14} /> WHITE-LABEL PLATFORM
          </div>
          <h1>Food Truck</h1>
          <p className="ft-hero-sub">
            The all-in-one ordering, payments, and management platform for food trucks,
            caterers, and pop-up kitchens. Your brand. Your business. Your app.
          </p>
          <div className="ft-hero-actions">
            {user ? (
              <Link to="/marketplace" className="btn btn-primary btn-lg">
                <Zap size={18} /> Subscribe in Marketplace
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
          <div className="ft-hero-stats">
            <div><strong>Mobile-First PWA</strong><span>Installable</span></div>
            <div><strong>Square Payments</strong><span>Built-In</span></div>
            <div><strong>AI Powered</strong><span>Gemini + Claude</span></div>
            <div><strong>100% White-Label</strong><span>Your Brand</span></div>
          </div>
        </div>
      </section>

      {/* Why FoodTruc */}
      <section className="ft-benefits">
        <div className="container">
          <h2 className="section-heading">Why Food Businesses Choose Food Truck</h2>
          <p className="section-sub">Stop losing sales to pen-and-paper. Go digital with a platform built specifically for mobile food vendors.</p>
          <div className="ft-benefits-grid">
            {benefits.map((b, i) => (
              <div key={i} className="ft-benefit-item">
                <div className="ft-benefit-icon">{b.icon}</div>
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
      <section className="ft-features">
        <div className="container">
          <h2 className="section-heading">Everything You Need to Run Your Food Business</h2>
          <p className="section-sub">From taking orders to AI-generated marketing — it's all built in.</p>
          <div className="ft-features-grid">
            {features.map((f, i) => (
              <div key={i} className="ft-feature-card">
                <div className="ft-feature-icon" style={{ background: `${f.color}15`, color: f.color }}>{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="ft-how-it-works">
        <div className="container">
          <h2 className="section-heading">Up and Running in Minutes</h2>
          <div className="ft-steps">
            <div className="ft-step">
              <div className="ft-step-number">1</div>
              <h3>Subscribe & Configure</h3>
              <p>Choose your plan in our marketplace. Set your business name, logo, colours, and menu items from the admin dashboard.</p>
            </div>
            <div className="ft-step">
              <div className="ft-step-number">2</div>
              <h3>Add Your Menu</h3>
              <p>Create menu categories, items with photos, pricing, preparation options, and availability. Set up catering packages too.</p>
            </div>
            <div className="ft-step">
              <div className="ft-step-number">3</div>
              <h3>Connect Payments</h3>
              <p>Link your Square account. Customers get a checkout link, you get instant payment notifications via webhook.</p>
            </div>
            <div className="ft-step">
              <div className="ft-step-number">4</div>
              <h3>Start Selling</h3>
              <p>Share your branded app link. Customers order, pay, and track. You manage everything from one dashboard.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Admin Dashboard Highlight */}
      <section className="ft-admin-highlight">
        <div className="container">
          <h2 className="section-heading">A Powerful Admin Dashboard</h2>
          <p className="section-sub">Everything you need to manage your business from one place.</p>
          <div className="ft-admin-grid">
            <div className="ft-admin-item"><ChefHat size={20} /> <span>Orders & Status Tracking</span></div>
            <div className="ft-admin-item"><Calendar size={20} /> <span>Cook-Day Planner</span></div>
            <div className="ft-admin-item"><Utensils size={20} /> <span>Menu Management</span></div>
            <div className="ft-admin-item"><Users size={20} /> <span>Customer Database</span></div>
            <div className="ft-admin-item"><Brain size={20} /> <span>AI Chat & Social Content</span></div>
            <div className="ft-admin-item"><Gift size={20} /> <span>Rewards Configuration</span></div>
            <div className="ft-admin-item"><Camera size={20} /> <span>Gallery Moderation</span></div>
            <div className="ft-admin-item"><Mail size={20} /> <span>Email & SMS Blasts</span></div>
            <div className="ft-admin-item"><Palette size={20} /> <span>White-Label Settings</span></div>
            <div className="ft-admin-item"><CreditCard size={20} /> <span>Payment Gateway Setup</span></div>
            <div className="ft-admin-item"><MapPin size={20} /> <span>Events & Locations</span></div>
            <div className="ft-admin-item"><BarChart3 size={20} /> <span>Analytics & Reports</span></div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="ft-pricing" id="pricing">
        <div className="container">
          <h2 className="section-heading">Simple, Transparent Pricing</h2>
          <p className="section-sub">No hidden fees. Cancel anytime. All plans include a 14-day free trial.</p>

          <div className="ft-pricing-grid">
            {plans.map((plan, idx) => (
              <div key={idx} className={`ft-plan-card ${plan.highlight ? 'featured' : ''}`}>
                {plan.highlight && <div className="ft-plan-badge"><Star size={12} /> MOST POPULAR</div>}
                <h3>{plan.name}</h3>
                <div className="ft-plan-price">
                  <span className="ft-price-amount">${plan.price}</span>
                  <span className="ft-price-period">{plan.period}</span>
                </div>
                <p className="ft-plan-desc">{plan.description}</p>
                <ul className="ft-plan-features">
                  {plan.features.map((f, i) => (
                    <li key={i}><CheckCircle size={16} /> {f}</li>
                  ))}
                </ul>
                <Link
                  to={plan.name === 'Enterprise' ? '/contact' : user ? '/marketplace' : '/register'}
                  className={`btn ${plan.highlight ? 'btn-primary' : 'btn-secondary'} btn-lg ft-plan-cta`}
                >
                  {plan.cta} <ArrowRight size={16} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="ft-social-proof">
        <div className="container">
          <div className="ft-proof-grid">
            <div className="ft-proof-item">
              <ShoppingCart size={32} style={{ color: '#10b981' }} />
              <strong>More Orders</strong>
              <span>24/7 online ordering means no missed sales</span>
            </div>
            <div className="ft-proof-item">
              <Utensils size={32} style={{ color: '#10b981' }} />
              <strong>Built for Food</strong>
              <span>purpose-built for trucks, caterers & pop-ups</span>
            </div>
            <div className="ft-proof-item">
              <Smartphone size={32} style={{ color: '#10b981' }} />
              <strong>Mobile-First</strong>
              <span>PWA installs to any phone in seconds</span>
            </div>
            <div className="ft-proof-item">
              <Palette size={32} style={{ color: '#10b981' }} />
              <strong>Your Brand</strong>
              <span>100% white-label — completely yours</span>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="ft-final-cta">
        <div className="container">
          <Zap size={40} style={{ color: '#10b981', marginBottom: '1rem' }} />
          <h2>Ready to Take Your Food Business Online?</h2>
          <p>Start your 14-day free trial today. No credit card required.</p>
          <Link to={user ? '/marketplace' : '/register'} className="btn btn-primary btn-lg">
            {user ? 'Subscribe in Marketplace' : 'Start Free Trial'} <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default FoodTrucProduct;
