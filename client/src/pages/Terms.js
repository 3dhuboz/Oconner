import React from 'react';
import './Legal.css';

const Terms = () => (
  <div className="legal-page">
    <section className="page-hero">
      <div className="container">
        <h1>Terms of Service</h1>
        <p>Last updated: March 2026</p>
      </div>
    </section>
    <section className="container legal-content">
      <h2>1. Agreement to Terms</h2>
      <p>By accessing or using the Penny Wise I.T website and services ("Services"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Services.</p>

      <h2>2. Services</h2>
      <p>Penny Wise I.T provides web hosting, custom application development, workflow automation, and white-label software-as-a-service (SaaS) products to businesses in Australia. Our marketplace apps include SocialAI Studio, Food Truck, AutoHue, and custom-built solutions.</p>

      <h2>3. Account Registration</h2>
      <p>To access certain features, you must create an account. You are responsible for maintaining the confidentiality of your login credentials and for all activity under your account. You must provide accurate, current, and complete information.</p>

      <h2>4. Subscriptions & Payments</h2>
      <p>Marketplace app subscriptions are billed monthly or annually as selected at checkout. All prices are in Australian Dollars (AUD) and include GST where applicable.</p>
      <ul>
        <li><strong>Setup Fees:</strong> One-time setup fees are charged on first subscription and are non-refundable.</li>
        <li><strong>Recurring Billing:</strong> Subscriptions renew automatically. You will receive an invoice via Square for each billing period.</li>
        <li><strong>Cancellation:</strong> You may cancel at any time from your dashboard. Access continues until the end of the current billing period.</li>
        <li><strong>Refunds:</strong> Monthly subscription fees are non-refundable. Yearly plans may be refunded on a pro-rata basis within the first 30 days.</li>
      </ul>

      <h2>5. Acceptable Use</h2>
      <p>You agree not to use the Services to:</p>
      <ul>
        <li>Violate any applicable law or regulation</li>
        <li>Infringe on intellectual property rights</li>
        <li>Transmit malicious code or interfere with the Services</li>
        <li>Attempt to gain unauthorised access to other accounts or systems</li>
        <li>Use the Services for any unlawful or fraudulent purpose</li>
      </ul>

      <h2>6. White-Label Products</h2>
      <p>White-label products are licensed for use under your brand. You may not resell, sublicense, or redistribute the underlying software. Penny Wise I.T retains all intellectual property rights to the platform, codebase, and technology.</p>

      <h2>7. Intellectual Property</h2>
      <p>All content, trademarks, and technology on this website are owned by Penny Wise I.T or its licensors. Custom development work is owned by the client upon full payment, unless otherwise agreed in writing.</p>

      <h2>8. Limitation of Liability</h2>
      <p>To the maximum extent permitted by Australian Consumer Law, Penny Wise I.T's liability for any claim arising from the Services is limited to the amount you paid in the 12 months preceding the claim. We are not liable for indirect, incidental, or consequential damages.</p>

      <h2>9. Service Availability</h2>
      <p>We aim for 99.9% uptime but do not guarantee uninterrupted service. Scheduled maintenance will be communicated in advance where possible.</p>

      <h2>10. Termination</h2>
      <p>We may suspend or terminate your account if you breach these Terms. Upon termination, your right to use the Services ceases immediately.</p>

      <h2>11. Governing Law</h2>
      <p>These Terms are governed by the laws of Queensland, Australia. Any disputes will be resolved in the courts of Queensland.</p>

      <h2>12. Changes to Terms</h2>
      <p>We may update these Terms from time to time. Continued use of the Services after changes constitutes acceptance of the updated Terms.</p>

      <h2>13. Contact</h2>
      <p>For questions about these Terms, contact us at <a href="mailto:admin@pennywiseit.com.au">admin@pennywiseit.com.au</a> or visit our <a href="/contact">Contact page</a>.</p>
    </section>
  </div>
);

export default Terms;
