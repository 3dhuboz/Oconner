import type { AppRequest, AppResponse } from '../_handler';
import twilio from 'twilio';
import { Resend } from 'resend';

// ─── Send email via Resend ──────────────────────────────────────────────────
async function sendEmail(to: string, subject: string, htmlBody: string): Promise<{ sent: boolean; simulated: boolean }> {
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'jobs@wireznrus.com.au';

  if (resendKey) {
    try {
      const resend = new Resend(resendKey);
      const { error } = await resend.emails.send({
        from: `Wirez R Us <${fromEmail}>`,
        to,
        subject,
        html: htmlBody,
      });
      if (!error) {
        console.log(`[Email Sent via Resend] To: ${to} | Subject: ${subject}`);
        return { sent: true, simulated: false };
      }
      console.error(`[Resend Error]`, error);
    } catch (err: any) {
      console.error('[Resend Error]', err.message);
    }
  }

  // Simulation fallback
  console.log(`[Email Simulation] To: ${to} | Subject: ${subject}`);
  return { sent: true, simulated: true };
}

// ─── Send SMS via Twilio ──
async function sendSms(to: string, message: string): Promise<{ sent: boolean; simulated: boolean }> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!sid || !token || !from) {
    console.log(`[SMS Simulation] To: ${to} | Message: ${message}`);
    return { sent: true, simulated: true };
  }

  try {
    const client = twilio(sid, token);
    await client.messages.create({ body: message, from, to });
    console.log(`[SMS Sent] To: ${to}`);
    return { sent: true, simulated: false };
  } catch (err: any) {
    console.error('[SMS Error]', err.message);
    return { sent: false, simulated: false };
  }
}

// ─── Build notification content based on type ──
function buildContent(type: string, data: any): { smsBody: string; emailSubject: string; emailHtml: string } {
  const { tenantName, propertyAddress, scheduledDate, scheduledTime, jobId, techName, companyPhone } = data;
  const firstName = (tenantName || 'Tenant').split(' ')[0];
  const dateStr = scheduledDate || 'TBD';
  const timeStr = scheduledTime || 'TBD';
  const phone = companyPhone || '1300 WIREZ US';

  switch (type) {
    case 'schedule_confirmation':
      return {
        smsBody: `Hi ${firstName}, your appointment with Wirez R Us has been scheduled for ${dateStr} between ${timeStr}. Please reply Y to confirm or N to reschedule. ${phone}`,
        emailSubject: `Your Wirez R Us Appointment — ${dateStr}`,
        emailHtml: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
            <div style="background:#0f172a;color:white;padding:20px 24px;border-radius:12px 12px 0 0;">
              <h1 style="margin:0;font-size:20px;">⚡ Wirez R Us</h1>
              <p style="margin:4px 0 0;font-size:13px;opacity:0.8;">Licensed Electrical Contractors</p>
            </div>
            <div style="background:#fff;border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 12px 12px;">
              <h2 style="margin:0 0 16px;color:#0f172a;">Appointment Confirmed</h2>
              <p style="color:#475569;">Hi ${firstName},</p>
              <p style="color:#475569;">Your appointment has been scheduled:</p>
              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0;">
                <p style="margin:0;font-weight:bold;color:#0f172a;">📅 ${dateStr}</p>
                <p style="margin:4px 0 0;font-weight:bold;color:#0f172a;">🕐 ${timeStr}</p>
                <p style="margin:8px 0 0;color:#64748b;font-size:13px;">📍 ${propertyAddress || ''}</p>
                ${techName ? `<p style="margin:4px 0 0;color:#64748b;font-size:13px;">👷 Technician: ${techName}</p>` : ''}
              </div>
              <p style="color:#475569;font-size:14px;">Please ensure access is available and any pets are restrained.</p>
              <p style="color:#475569;font-size:14px;">If you need to reschedule, please reply to this email or call ${phone}.</p>
              <p style="color:#94a3b8;font-size:12px;margin-top:24px;">Wirez R Us Electrical Services<br/>${phone}</p>
            </div>
          </div>`,
      };

    case 'reminder_day_before':
      return {
        smsBody: `Reminder: Wirez R Us is attending ${propertyAddress || 'your property'} tomorrow ${dateStr} between ${timeStr}. Please ensure access is available. Reply N to reschedule. ${phone}`,
        emailSubject: `Reminder: Wirez R Us Appointment Tomorrow — ${dateStr}`,
        emailHtml: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
            <div style="background:#0f172a;color:white;padding:20px 24px;border-radius:12px 12px 0 0;">
              <h1 style="margin:0;font-size:20px;">⚡ Wirez R Us — Appointment Reminder</h1>
            </div>
            <div style="background:#fff;border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 12px 12px;">
              <p style="color:#475569;">Hi ${firstName},</p>
              <p style="color:#475569;">Just a reminder that we're attending <strong>${propertyAddress || 'your property'}</strong> tomorrow:</p>
              <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px;margin:16px 0;">
                <p style="margin:0;font-weight:bold;color:#92400e;">📅 ${dateStr} — ${timeStr}</p>
              </div>
              <p style="color:#475569;font-size:14px;"><strong>Please ensure:</strong></p>
              <ul style="color:#475569;font-size:14px;">
                <li>Access to the property is available</li>
                <li>Pets are restrained or secured</li>
                <li>Someone over 18 is present (if required)</li>
              </ul>
              <p style="color:#475569;font-size:14px;">Need to reschedule? Reply to this email or call ${phone}.</p>
              <p style="color:#94a3b8;font-size:12px;margin-top:24px;">Wirez R Us Electrical Services</p>
            </div>
          </div>`,
      };

    case 'reminder_1hr_before':
      return {
        smsBody: `Wirez R Us: We'll be arriving at ${propertyAddress || 'your property'} within the next hour. Please ensure access is available. ${phone}`,
        emailSubject: `Wirez R Us — Arriving Soon`,
        emailHtml: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
            <div style="background:#059669;color:white;padding:20px 24px;border-radius:12px;">
              <h1 style="margin:0;font-size:20px;">⚡ Wirez R Us — Arriving Soon!</h1>
              <p style="margin:8px 0 0;font-size:15px;">Our technician will be at <strong>${propertyAddress || 'your property'}</strong> within the next hour.</p>
              <p style="margin:8px 0 0;font-size:13px;opacity:0.9;">Please ensure access is available and pets are restrained.</p>
            </div>
          </div>`,
      };

    case 'reschedule_key_consent':
      return {
        smsBody: `Wirez R Us: If you're not available to be home, do you give consent for us to collect keys from the Real Estate Agent? Please also ensure no dogs are left unrestrained. Reply Y for consent or N to reschedule. ${phone}`,
        emailSubject: `Wirez R Us — Key Collection Consent`,
        emailHtml: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
            <div style="background:#0f172a;color:white;padding:20px 24px;border-radius:12px 12px 0 0;">
              <h1 style="margin:0;font-size:20px;">⚡ Wirez R Us — Access Request</h1>
            </div>
            <div style="background:#fff;border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 12px 12px;">
              <p style="color:#475569;">Hi ${firstName},</p>
              <p style="color:#475569;">We understand you may not be available during the scheduled appointment time.</p>
              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0;">
                <p style="margin:0;font-weight:bold;color:#0f172a;">Do you give consent for us to:</p>
                <ul style="color:#475569;margin:8px 0 0;padding-left:20px;">
                  <li>Collect keys from the Real Estate Agent</li>
                  <li>Enter the property to complete the work</li>
                </ul>
              </div>
              <p style="color:#dc2626;font-weight:bold;font-size:14px;">⚠️ Important: Please ensure no dogs or animals are left unrestrained during our visit.</p>
              <p style="color:#475569;font-size:14px;">Please reply to this email with <strong>YES</strong> or <strong>NO</strong>, or call us at ${phone}.</p>
              <p style="color:#94a3b8;font-size:12px;margin-top:24px;">Wirez R Us Electrical Services</p>
            </div>
          </div>`,
      };

    case 'running_late':
      const newEta = data.newEta || 'shortly';
      return {
        smsBody: `Wirez R Us: Sorry, we're running a bit behind schedule. We now expect to arrive at ${propertyAddress || 'your property'} ${newEta}. We apologise for any inconvenience. ${phone}`,
        emailSubject: `Wirez R Us — Updated Arrival Time`,
        emailHtml: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
            <div style="background:#d97706;color:white;padding:20px 24px;border-radius:12px;">
              <h1 style="margin:0;font-size:20px;">⚡ Wirez R Us — Running Slightly Behind</h1>
              <p style="margin:8px 0 0;font-size:15px;">We now expect to arrive at <strong>${propertyAddress || 'your property'}</strong> ${newEta}.</p>
              <p style="margin:8px 0 0;font-size:13px;opacity:0.9;">We apologise for any inconvenience and appreciate your patience.</p>
            </div>
          </div>`,
      };

    default:
      return {
        smsBody: `Wirez R Us notification regarding your appointment. Please call ${phone} for details.`,
        emailSubject: `Wirez R Us — Notification`,
        emailHtml: `<p>Wirez R Us notification regarding your appointment at ${propertyAddress || 'your property'}. Please call ${phone} for details.</p>`,
      };
  }
}

// ─── Main handler ──
export default async function handler(req: AppRequest, res: AppResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    type,           // 'schedule_confirmation' | 'reminder_day_before' | 'reminder_1hr_before' | 'reschedule_key_consent' | 'running_late'
    tenantPhone,
    tenantEmail,
    tenantName,
    propertyAddress,
    scheduledDate,
    scheduledTime,
    jobId,
    techName,
    newEta,
    channels = ['sms', 'email'],  // which channels to use
  } = req.body;

  if (!type) {
    return res.status(400).json({ error: 'Missing notification type' });
  }

  const content = buildContent(type, {
    tenantName, propertyAddress, scheduledDate, scheduledTime, jobId, techName,
    companyPhone: process.env.COMPANY_PHONE || '1300 WIREZ US',
    newEta,
  });

  const results: any = { type, jobId };

  // Send SMS
  if (channels.includes('sms') && tenantPhone) {
    results.sms = await sendSms(tenantPhone, content.smsBody);
  }

  // Send Email
  if (channels.includes('email') && tenantEmail) {
    results.email = await sendEmail(tenantEmail, content.emailSubject, content.emailHtml);
  }

  console.log(`[Tenant Notification] Type: ${type} | Job: ${jobId} | SMS: ${results.sms?.sent ? 'sent' : 'skipped'} | Email: ${results.email?.sent ? 'sent' : 'skipped'}`);

  return res.status(200).json({ success: true, ...results });
}
