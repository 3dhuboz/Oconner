import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin } from 'lucide-react';
import { useClientConfig } from '../context/ClientConfigContext';
import './Footer.css';

const Footer = () => {
  const { clientMode, brandName } = useClientConfig();

  // Client mode: minimal branded footer
  if (clientMode) {
    return (
      <footer className="footer">
        <div className="container">
          <div className="footer-bottom">
            <p>&copy; {new Date().getFullYear()} {brandName || 'App'} — Powered by <a href="https://pennywiseit.com.au" target="_blank" rel="noopener noreferrer" style={{ color: '#7c3aed' }}>Penny Wise I.T</a></p>
            <div className="footer-legal">
              <Link to="/terms">Terms</Link>
              <span className="footer-divider">|</span>
              <Link to="/privacy">Privacy</Link>
            </div>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="footer-logo">
              <img src="/logo.png" alt="Penny Wise I.T" className="footer-logo-img" />
              <div className="brand-sub">Smart Solutions, Wise Investment</div>
            </div>
            <p>Professional web hosting, custom app development, and workflow automation solutions for businesses of all sizes.</p>
          </div>

          <div className="footer-section">
            <h4>Services</h4>
            <Link to="/services">Web Hosting</Link>
            <Link to="/services">App Development</Link>
            <Link to="/services">Workflow Solutions</Link>
            <Link to="/services">Website Maintenance</Link>
            <Link to="/services">IT Consulting</Link>
          </div>

          <div className="footer-section">
            <h4>Quick Links</h4>
            <Link to="/portfolio">Portfolio</Link>
            <Link to="/marketplace">Marketplace</Link>
            <Link to="/contact">Contact Us</Link>
            <Link to="/login">Client Login</Link>
            <Link to="/register">Get Started</Link>
          </div>

          <div className="footer-section">
            <h4>Contact</h4>
            <a href="mailto:hello@pennywiseit.com.au"><Mail size={14} /> hello@pennywiseit.com.au</a>
            <a href="tel:+61400000000"><Phone size={14} /> 0400 000 000</a>
            <span><MapPin size={14} /> Australia</span>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Penny Wise I.T. All rights reserved.</p>
          <div className="footer-legal">
            <Link to="/terms">Terms of Service</Link>
            <span className="footer-divider">|</span>
            <Link to="/privacy">Privacy Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
