const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('[Email] SMTP credentials not configured — emails will be logged only');
    return null;
  }
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
  return transporter;
}

async function sendEmail({ to, subject, html }) {
  const t = getTransporter();
  const from = `"Penny Wise I.T" <${process.env.SMTP_USER || 'noreply@pennywiseit.com.au'}>`;

  if (!t) {
    console.log(`[Email Mock] To: ${to} | Subject: ${subject}`);
    console.log(`[Email Mock] Body preview: ${html.substring(0, 200)}...`);
    return { mock: true };
  }

  try {
    const info = await t.sendMail({ from, to, subject, html });
    console.log(`[Email] Sent to ${to}: ${subject} (${info.messageId})`);
    return info;
  } catch (err) {
    console.error(`[Email] Failed to send to ${to}:`, err.message);
    throw err;
  }
}

function subscriptionConfirmationEmail({ userName, appName, planName, amount, billingInterval, setupFee, setupFeePaid }) {
  const intervalLabel = billingInterval === 'yearly' ? 'year' : 'month';
  const setupLine = setupFee > 0 && !setupFeePaid
    ? `<tr><td style="padding:8px 0;color:#64748b">One-Time Setup Fee</td><td style="padding:8px 0;text-align:right;font-weight:700">$${setupFee} AUD</td></tr>`
    : '';

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif">
  <div style="max-width:560px;margin:40px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08)">
    <div style="background:linear-gradient(135deg,#0f172a,#1e1b4b);padding:32px 24px;text-align:center">
      <h1 style="color:white;margin:0;font-size:22px">Penny Wise I.T</h1>
      <p style="color:#67e8f9;margin:8px 0 0;font-size:13px">Subscription Confirmed</p>
    </div>
    <div style="padding:32px 24px">
      <p style="color:#1e293b;font-size:15px;line-height:1.6">Hi ${userName},</p>
      <p style="color:#475569;font-size:14px;line-height:1.7">
        Your subscription to <strong>${appName}</strong> has been activated! Here's a summary of your purchase:
      </p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px">
        <tr style="border-bottom:1px solid #e2e8f0">
          <td style="padding:8px 0;color:#64748b">App</td>
          <td style="padding:8px 0;text-align:right;font-weight:700;color:#0f172a">${appName}</td>
        </tr>
        <tr style="border-bottom:1px solid #e2e8f0">
          <td style="padding:8px 0;color:#64748b">Plan</td>
          <td style="padding:8px 0;text-align:right;font-weight:700;color:#0f172a">${planName}</td>
        </tr>
        <tr style="border-bottom:1px solid #e2e8f0">
          <td style="padding:8px 0;color:#64748b">Billing</td>
          <td style="padding:8px 0;text-align:right;font-weight:700;color:#0f172a">$${amount} AUD / ${intervalLabel}</td>
        </tr>
        ${setupLine}
      </table>

      <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:16px;margin:20px 0">
        <p style="margin:0;color:#166534;font-size:13px;font-weight:600">✅ What happens next?</p>
        <ul style="margin:8px 0 0;padding-left:20px;color:#15803d;font-size:13px;line-height:1.8">
          <li>Your app instance is being configured with your branding</li>
          <li>You'll receive admin login credentials within 24 hours</li>
          <li>Our team will reach out to complete your setup</li>
        </ul>
      </div>

      <p style="color:#475569;font-size:13px;line-height:1.7">
        If you have any questions, just reply to this email or visit
        <a href="https://www.pennywiseit.com.au/contact" style="color:#6366f1">our contact page</a>.
      </p>

      <p style="color:#475569;font-size:13px;margin-top:24px">
        Cheers,<br/>
        <strong>The Penny Wise I.T Team</strong>
      </p>
    </div>
    <div style="background:#f8fafc;padding:16px 24px;text-align:center;border-top:1px solid #e2e8f0">
      <p style="color:#94a3b8;font-size:11px;margin:0">Penny Wise I.T — Australian I.T Problem Solvers</p>
      <p style="color:#94a3b8;font-size:11px;margin:4px 0 0">
        <a href="https://www.pennywiseit.com.au" style="color:#6366f1">www.pennywiseit.com.au</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

function adminNotificationEmail({ userName, userEmail, appName, planName, amount, billingInterval, setupFee }) {
  const intervalLabel = billingInterval === 'yearly' ? 'year' : 'month';
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif">
  <div style="max-width:560px;margin:40px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08)">
    <div style="background:linear-gradient(135deg,#16a34a,#15803d);padding:24px;text-align:center">
      <h1 style="color:white;margin:0;font-size:20px">💰 New Subscription!</h1>
    </div>
    <div style="padding:24px">
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr style="border-bottom:1px solid #e2e8f0">
          <td style="padding:8px 0;color:#64748b">Customer</td>
          <td style="padding:8px 0;text-align:right;font-weight:700">${userName}</td>
        </tr>
        <tr style="border-bottom:1px solid #e2e8f0">
          <td style="padding:8px 0;color:#64748b">Email</td>
          <td style="padding:8px 0;text-align:right"><a href="mailto:${userEmail}" style="color:#6366f1">${userEmail}</a></td>
        </tr>
        <tr style="border-bottom:1px solid #e2e8f0">
          <td style="padding:8px 0;color:#64748b">App</td>
          <td style="padding:8px 0;text-align:right;font-weight:700">${appName}</td>
        </tr>
        <tr style="border-bottom:1px solid #e2e8f0">
          <td style="padding:8px 0;color:#64748b">Plan</td>
          <td style="padding:8px 0;text-align:right;font-weight:700">${planName}</td>
        </tr>
        <tr style="border-bottom:1px solid #e2e8f0">
          <td style="padding:8px 0;color:#64748b">Amount</td>
          <td style="padding:8px 0;text-align:right;font-weight:700;color:#16a34a">$${amount} / ${intervalLabel}</td>
        </tr>
        ${setupFee > 0 ? `<tr><td style="padding:8px 0;color:#64748b">Setup Fee</td><td style="padding:8px 0;text-align:right;font-weight:700;color:#f59e0b">$${setupFee}</td></tr>` : ''}
      </table>
      <p style="color:#475569;font-size:13px;margin-top:16px">Action required: Provision app instance and send client admin credentials.</p>
    </div>
  </div>
</body>
</html>`;
}

module.exports = { sendEmail, subscriptionConfirmationEmail, adminNotificationEmail };
