import React from 'react';
import './Legal.css';

const Privacy = () => (
  <div className="legal-page">
    <section className="page-hero">
      <div className="container">
        <h1>Privacy Policy</h1>
        <p>Last updated: March 2026</p>
      </div>
    </section>
    <section className="container legal-content">
      <h2>1. Overview</h2>
      <p>Penny Wise I.T ("we", "us", "our") is committed to protecting your personal information in accordance with the Australian Privacy Act 1988 and the Australian Privacy Principles (APPs). This policy explains how we collect, use, disclose, and protect your information.</p>

      <h2>2. Information We Collect</h2>
      <p>We may collect the following personal information:</p>
      <ul>
        <li><strong>Account Information:</strong> Name, email address, phone number, company name</li>
        <li><strong>Payment Information:</strong> Processed securely via Square — we do not store credit card details</li>
        <li><strong>Usage Data:</strong> Pages visited, features used, browser type, IP address</li>
        <li><strong>Communications:</strong> Emails, support tickets, and chat messages you send us</li>
        <li><strong>Third-Party Login:</strong> If you sign in with Google, we receive your name, email, and profile picture</li>
      </ul>

      <h2>3. How We Use Your Information</h2>
      <p>We use your information to:</p>
      <ul>
        <li>Provide, maintain, and improve our Services</li>
        <li>Process subscriptions and send invoices</li>
        <li>Send service-related communications (confirmations, updates, support)</li>
        <li>Respond to enquiries and provide customer support</li>
        <li>Detect and prevent fraud or security issues</li>
        <li>Comply with legal obligations</li>
      </ul>

      <h2>4. Information Sharing</h2>
      <p>We do not sell your personal information. We may share it with:</p>
      <ul>
        <li><strong>Square:</strong> For payment processing and invoicing</li>
        <li><strong>Google:</strong> For authentication (if you use Google Sign-In)</li>
        <li><strong>MongoDB Atlas:</strong> Our database provider (data stored securely in the cloud)</li>
        <li><strong>Email Providers:</strong> For sending transactional emails</li>
        <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
      </ul>

      <h2>5. Data Security</h2>
      <p>We implement industry-standard security measures including:</p>
      <ul>
        <li>HTTPS/TLS encryption for all data in transit</li>
        <li>Bcrypt password hashing — we never store plain-text passwords</li>
        <li>JWT-based authentication with token expiry</li>
        <li>Rate limiting to prevent abuse</li>
        <li>Role-based access controls</li>
      </ul>

      <h2>6. Cookies</h2>
      <p>We use essential cookies and local storage to maintain your login session. We do not use tracking cookies or third-party advertising cookies.</p>

      <h2>7. Your Rights</h2>
      <p>Under the Australian Privacy Principles, you have the right to:</p>
      <ul>
        <li>Access your personal information we hold</li>
        <li>Request correction of inaccurate information</li>
        <li>Request deletion of your account and data</li>
        <li>Withdraw consent for optional data processing</li>
        <li>Lodge a complaint with the Office of the Australian Information Commissioner (OAIC)</li>
      </ul>

      <h2>8. Data Retention</h2>
      <p>We retain your data for as long as your account is active or as needed to provide Services. Upon account deletion, we will remove your personal information within 30 days, except where required by law.</p>

      <h2>9. Children's Privacy</h2>
      <p>Our Services are not directed at individuals under 18. We do not knowingly collect personal information from children.</p>

      <h2>10. Changes to This Policy</h2>
      <p>We may update this Privacy Policy from time to time. We will notify you of material changes via email or a prominent notice on our website.</p>

      <h2>11. Contact Us</h2>
      <p>For privacy enquiries or to exercise your rights, contact us at:</p>
      <ul>
        <li><strong>Email:</strong> <a href="mailto:admin@pennywiseit.com.au">admin@pennywiseit.com.au</a></li>
        <li><strong>Website:</strong> <a href="/contact">www.pennywiseit.com.au/contact</a></li>
      </ul>
    </section>
  </div>
);

export default Privacy;
