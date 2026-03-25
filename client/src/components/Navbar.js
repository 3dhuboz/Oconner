import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Menu, X, ChevronDown, LogOut, User, LayoutDashboard, Ticket, Settings,
  Sparkles, Store, Layers, Download, Zap, BarChart3, Brain, Wand2,
  Palette, Globe, Workflow, Code, Star
} from 'lucide-react';
import api from '../api';
import { useClientConfig } from '../context/ClientConfigContext';
import './Navbar.css';

const APP_ICON_MAP = {
  sparkles: Sparkles, zap: Zap, 'bar-chart': BarChart3, brain: Brain,
  wand: Wand2, palette: Palette, globe: Globe, workflow: Workflow,
  settings: Settings, code: Code, layers: Layers, star: Star
};

const Navbar = () => {
  const { user, logout } = useAuth();
  const { clientMode, brandName, primaryColor, enabledApps } = useClientConfig();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [myApps, setMyApps] = useState([]);
  const [installPrompt, setInstallPrompt] = useState(null);

  const handleLogout = () => {
    logout();
    navigate('/');
    setDropdownOpen(false);
  };

  const isActive = (path) => location.pathname === path;

  // Load user's active subscriptions for the app launcher
  const loadMyApps = useCallback(async () => {
    if (!user) { setMyApps([]); return; }
    try {
      const res = await api.get('/marketplace/my-apps');
      setMyApps((res.data || []).filter(s => s.isActive));
    } catch (e) {
      setMyApps([]);
    }
  }, [user]);

  useEffect(() => { loadMyApps(); }, [loadMyApps]);

  // PWA install prompt
  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  return (
    <nav className="navbar">
      <div className="container navbar-inner">
        <Link to={clientMode ? '/dashboard' : '/'} className="navbar-brand">
          {clientMode && brandName ? (
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: primaryColor || '#7c3aed' }}>{brandName}</span>
          ) : (
            <img src="/logo.png" alt="Penny Wise I.T" className="navbar-logo" />
          )}
        </Link>

        <div className={`navbar-links ${mobileOpen ? 'open' : ''}`}>
          {/* Site Links — hidden in client mode */}
          {!clientMode && (
            <div className="nav-group nav-site-links">
              <Link to="/" className={isActive('/') ? 'active' : ''} onClick={() => setMobileOpen(false)}>Home</Link>
              <Link to="/services" className={isActive('/services') ? 'active' : ''} onClick={() => setMobileOpen(false)}>Services</Link>
              <Link to="/marketplace" className={isActive('/marketplace') ? 'active' : ''} onClick={() => setMobileOpen(false)}>Marketplace</Link>
              <Link to="/hosting" className={isActive('/hosting') ? 'active' : ''} onClick={() => setMobileOpen(false)}>Hosting</Link>
              <Link to="/contact" className={isActive('/contact') ? 'active' : ''} onClick={() => setMobileOpen(false)}>Contact</Link>
            </div>
          )}

          {/* Logged-in user: compact links */}
          {user && (
            <div className="nav-group nav-user-links">
              {!clientMode && <span className="nav-hub-divider" />}
              <Link to="/dashboard" className={isActive('/dashboard') ? 'active' : ''} onClick={() => setMobileOpen(false)}>Dashboard</Link>
              {/* Client mode: direct app links based on ENABLED_APPS */}
              {clientMode && enabledApps.includes('foodtruck') && (
                <Link to="/foodtruck-app" className={isActive('/foodtruck-app') ? 'active' : ''} onClick={() => setMobileOpen(false)}>Food Truck</Link>
              )}
              {clientMode && enabledApps.includes('simplewebsite') && (
                <Link to="/simplewebsite-app" className={isActive('/simplewebsite-app') ? 'active' : ''} onClick={() => setMobileOpen(false)}>SimpleWebsite</Link>
              )}
              {clientMode && enabledApps.includes('socialai') && !enabledApps.includes('foodtruck') && !enabledApps.includes('simplewebsite') && (
                <Link to="/social" className={isActive('/social') ? 'active' : ''} onClick={() => setMobileOpen(false)}>SocialAI</Link>
              )}
              {clientMode && enabledApps.includes('wirez') && (
                <Link to="/wirez" className={isActive('/wirez') ? 'active' : ''} onClick={() => setMobileOpen(false)}>Wirez</Link>
              )}
              {!clientMode && myApps.length > 0 && (
                <Link to="/my-apps" className={`${isActive('/my-apps') ? 'active' : ''}`} onClick={() => setMobileOpen(false)}>
                  My Apps
                </Link>
              )}
              {user.role === 'admin' && (
                <Link to="/admin" className={location.pathname.startsWith('/admin') ? 'active' : ''} onClick={() => setMobileOpen(false)}>Admin</Link>
              )}
            </div>
          )}
        </div>

        <div className="navbar-actions">
          {installPrompt && (
            <button onClick={handleInstall} className="nav-install-btn" title="Install App Hub to desktop">
              <Download size={16} />
              <span className="nav-install-label">Install</span>
            </button>
          )}
          {user ? (
            <div className="user-dropdown">
              <button className="user-dropdown-trigger" onClick={() => setDropdownOpen(!dropdownOpen)}>
                <div className="user-avatar">{user.firstName?.[0]}{user.lastName?.[0]}</div>
                <span className="user-name">{user.firstName}</span>
                <ChevronDown size={16} />
              </button>
              {dropdownOpen && (
                <div className="user-dropdown-menu" onClick={() => setDropdownOpen(false)}>
                  <div className="dropdown-header">
                    <strong>{user.firstName} {user.lastName}</strong>
                    <span>{user.email}</span>
                  </div>
                  <Link to="/dashboard"><LayoutDashboard size={16} /> Dashboard</Link>
                  <Link to="/tickets"><Ticket size={16} /> My Tickets</Link>
                  <Link to="/my-apps"><Layers size={16} /> My Apps</Link>
                  <Link to="/profile"><User size={16} /> Profile</Link>
                  {user.role === 'admin' && <Link to="/admin"><Settings size={16} /> Admin Panel</Link>}
                  {myApps.length > 0 && (
                    <>
                      <div className="dropdown-app-divider">
                        <span>My Apps</span>
                      </div>
                      {myApps.map(sub => {
                        const app = sub.app || {};
                        const Icon = APP_ICON_MAP[app.icon] || Sparkles;
                        const wl = sub.whiteLabel || {};
                        return (
                          <Link key={sub._id} to={app.routePath || '/my-apps'}>
                            <Icon size={16} /> {wl.brandName || app.name}
                          </Link>
                        );
                      })}
                    </>
                  )}
                  <button onClick={handleLogout} className="dropdown-logout"><LogOut size={16} /> Sign Out</button>
                </div>
              )}
            </div>
          ) : (
            <div className="auth-buttons">
              <Link to="/login" className="btn btn-outline btn-sm">Sign In</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Get Started</Link>
            </div>
          )}
          <button className="mobile-toggle" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
