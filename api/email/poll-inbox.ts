import type { AppRequest, AppResponse } from '../_handler';
import { getDb, newId } from '../_db';

// ─── OpenRouter AI enrichment ─────────────────────────────────────────────────
async function aiEnrichEmail(subject: string, body: string): Promise<{
  tenantName?: string; tenantPhone?: string; tenantEmail?: string;
  propertyAddress?: string; issueDescription?: string;
  jobType?: string; urgency?: string; preferredDate?: string;
}> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return {};

  try {
    const prompt = `You are an assistant that extracts job details from real estate work order emails.
Extract the following fields from the email below. Return ONLY valid JSON, no other text.
Fields: tenantName, tenantPhone, tenantEmail, propertyAddress (full address with suburb+state), issueDescription (brief), jobType (one of: SMOKE_ALARM, ELECTRICAL, MAINTENANCE, INSPECTION, EMERGENCY), urgency (one of: Routine, Urgent, Emergency), preferredDate.
If a field is not found, omit it from the JSON.

Subject: ${subject}

${body.substring(0, 3000)}`;

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://wireznrus.com.au',
        'X-Title': 'Wirez R Us Job Parser',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
        max_tokens: 500,
      }),
    });

    if (!res.ok) { console.error('[OpenRouter] HTTP', res.status); return {}; }
    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content || '{}';
    const cleaned = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e: any) {
    console.error('[OpenRouter] Parse error:', e.message);
    return {};
  }
}

/**
 * Gmail IMAP Polling Endpoint
 * 
 * Uses Gmail API (OAuth2 service account or app password) to poll an inbox
 * for new work order emails from real estate agencies.
 * 
 * Works with ANY Gmail/Google Workspace address — e.g. wirezrusjobs@gmail.com
 * Can migrate to jobs@wirezrus.com.au later via Google Workspace.
 *
 * GET  /api/email/poll-inbox         — diagnostic check
 * POST /api/email/poll-inbox         — poll for new emails, parse, create jobs
 * POST /api/email/poll-inbox?test=1  — test with sample email body
 *
 * Required env vars:
 *   GMAIL_ADDRESS          — e.g. wirezrusjobs@gmail.com
 *   GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN
 *   OPENROUTER_API_KEY     — optional, enables AI extraction
 */

// ─── Real Estate Software Detection ─────────────────────────────
interface DetectedSource {
  software: string;
  confidence: number;
  patterns: string[];
}

function detectRealEstateSoftware(subject: string, body: string, from: string): DetectedSource {
  const combined = `${subject}\n${body}\n${from}`.toLowerCase();
  
  const detectors: { name: string; signals: RegExp[]; fromDomains?: string[] }[] = [
    {
      name: 'PropertyMe',
      signals: [
        /maintenance\s*request/i,
        /propertyme/i,
        /trade\s*type\s*:/i,
        /property\s*me/i,
        /maintenance.*request.*#?\d+/i,
      ],
      fromDomains: ['propertyme.com', 'propertyme.com.au'],
    },
    {
      name: 'Console Cloud',
      signals: [
        /console\s*cloud/i,
        /console\s*gateway/i,
        /job\s*#\s*\d+/i,
        /description\s*of\s*works?\s*:/i,
        /applicant\s*:/i,
      ],
      fromDomains: ['consolecloud.com.au', 'console.com.au'],
    },
    {
      name: 'PropertyTree',
      signals: [
        /propertytree/i,
        /property\s*tree/i,
        /work\s*order\s*#?\s*\d+/i,
        /tenancy\s*:/i,
        /trade\s*:/i,
      ],
      fromDomains: ['propertytree.com', 'rockend.com.au'],
    },
    {
      name: 'Palace',
      signals: [
        /palace/i,
        /reference\s*:\s*\d+/i,
        /premises\s*:/i,
        /occupant\s*:/i,
      ],
      fromDomains: ['palace.network'],
    },
    {
      name: 'Rex PM',
      signals: [
        /rex\s*(?:pm|software)/i,
        /maintenance\s*job/i,
        /rexsoftware/i,
      ],
      fromDomains: ['rexsoftware.com'],
    },
    {
      name: 'ManagedApp',
      signals: [
        /managedapp/i,
        /managed\s*app/i,
      ],
      fromDomains: ['managedapp.com.au'],
    },
    {
      name: 'Inspection Express',
      signals: [
        /inspection\s*express/i,
        /entry\s*condition/i,
        /exit\s*condition/i,
      ],
    },
    {
      name: 'MRI Software',
      signals: [
        /mri\s*software/i,
        /mri.*property/i,
      ],
      fromDomains: ['mrisoftware.com'],
    },
  ];

  for (const detector of detectors) {
    const matchedSignals: string[] = [];
    
    // Check from domain
    if (detector.fromDomains) {
      for (const domain of detector.fromDomains) {
        if (from.toLowerCase().includes(domain)) {
          matchedSignals.push(`from:${domain}`);
        }
      }
    }
    
    // Check body/subject signals
    for (const signal of detector.signals) {
      if (signal.test(combined)) {
        matchedSignals.push(signal.source);
      }
    }
    
    if (matchedSignals.length >= 2) {
      return { software: detector.name, confidence: Math.min(1, matchedSignals.length * 0.3), patterns: matchedSignals };
    }
  }

  // Check if it looks like a manual/forwarded work order from a real estate agent
  const reSignals = [
    /work\s*order/i, /maintenance/i, /tenant/i, /property\s*manager/i,
    /property\s*address/i, /real\s*estate/i, /agency/i, /landlord/i,
  ];
  const manualMatches = reSignals.filter(s => s.test(combined));
  if (manualMatches.length >= 2) {
    return { software: 'Manual/Direct Email', confidence: 0.5, patterns: manualMatches.map(m => m.source) };
  }

  return { software: 'Unknown', confidence: 0, patterns: [] };
}

// ─── Parse email based on detected software ─────────────────────
interface ParsedWorkOrder {
  tenantName: string;
  tenantPhone: string;
  tenantEmail: string;
  propertyAddress: string;
  issueDescription: string;
  jobType: string;
  urgency: string;
  pmName: string;
  pmEmail: string;
  agency: string;
  accessInstructions: string;
  preferredDate: string;
}

function parseByLabel(text: string, ...labels: string[]): string {
  for (const label of labels) {
    const match = text.match(new RegExp(`${label}\\s*:[ \\t]*(.+)`, 'im'));
    if (match?.[1]?.trim()) return match[1].trim();
  }
  return '';
}

function parsePropertyMe(subject: string, body: string, from: string): Partial<ParsedWorkOrder> {
  return {
    tenantName: parseByLabel(body, 'Tenant', 'Tenant Name', 'Applicant'),
    tenantPhone: parseByLabel(body, 'Tenant Phone', 'Phone', 'Mobile', 'Contact Number'),
    tenantEmail: parseByLabel(body, 'Tenant Email', 'Email'),
    propertyAddress: parseByLabel(body, 'Property', 'Property Address', 'Address'),
    issueDescription: parseByLabel(body, 'Description', 'Issue', 'Details', 'Notes'),
    pmName: parseByLabel(body, 'Property Manager', 'Manager', 'Agent'),
    pmEmail: parseByLabel(body, 'Property Manager Email', 'Manager Email'),
    agency: parseByLabel(body, 'Agency', 'Office', 'Company'),
    accessInstructions: parseByLabel(body, 'Access', 'Access Instructions', 'Key', 'Entry'),
    preferredDate: parseByLabel(body, 'Preferred Date', 'Preferred Time', 'Requested Date'),
    jobType: parseByLabel(body, 'Trade Type', 'Trade', 'Category', 'Job Type'),
    urgency: parseByLabel(body, 'Priority', 'Urgency'),
  };
}

function parseConsoleCloud(subject: string, body: string, from: string): Partial<ParsedWorkOrder> {
  return {
    tenantName: parseByLabel(body, 'Applicant', 'Tenant', 'Contact'),
    tenantPhone: parseByLabel(body, 'Phone', 'Mobile', 'Contact Number'),
    tenantEmail: parseByLabel(body, 'Email'),
    propertyAddress: parseByLabel(body, 'Property', 'Property Address', 'Address'),
    issueDescription: parseByLabel(body, 'Description of works', 'Description', 'Works Required', 'Details'),
    pmName: parseByLabel(body, 'Property Manager', 'Manager'),
    pmEmail: parseByLabel(body, 'Manager Email'),
    agency: parseByLabel(body, 'Agency', 'Company', 'Office'),
    accessInstructions: parseByLabel(body, 'Access', 'Entry', 'Key Instructions'),
    preferredDate: parseByLabel(body, 'Required by', 'Date Required'),
    jobType: parseByLabel(body, 'Job Type', 'Trade', 'Category'),
    urgency: parseByLabel(body, 'Priority', 'Urgency'),
  };
}

function parsePropertyTree(subject: string, body: string, from: string): Partial<ParsedWorkOrder> {
  return {
    tenantName: parseByLabel(body, 'Tenancy', 'Tenant', 'Tenant Name'),
    tenantPhone: parseByLabel(body, 'Contact Phone', 'Phone', 'Mobile'),
    tenantEmail: parseByLabel(body, 'Contact Email', 'Email'),
    propertyAddress: parseByLabel(body, 'Property Address', 'Property', 'Address'),
    issueDescription: parseByLabel(body, 'Instructions', 'Description', 'Details', 'Fault Description'),
    pmName: parseByLabel(body, 'Property Manager', 'Assigned To'),
    pmEmail: parseByLabel(body, 'Manager Email'),
    agency: parseByLabel(body, 'Agency', 'Company'),
    accessInstructions: parseByLabel(body, 'Access', 'Key', 'Entry Instructions'),
    preferredDate: parseByLabel(body, 'Date Required', 'Required Date'),
    jobType: parseByLabel(body, 'Trade', 'Category'),
    urgency: parseByLabel(body, 'Priority', 'Urgency'),
  };
}

function parseGeneric(subject: string, body: string, from: string): Partial<ParsedWorkOrder> {
  return {
    tenantName: parseByLabel(body, 'Tenant', 'Tenant Name', 'Applicant', 'Occupant', 'Resident', 'Contact Name', 'Contact'),
    tenantPhone: parseByLabel(body, 'Tenant Phone', 'Phone', 'Mobile', 'Tel', 'Contact Number', 'Contact Phone'),
    tenantEmail: parseByLabel(body, 'Tenant Email', 'Email', 'E-mail', 'Contact Email'),
    propertyAddress: parseByLabel(body, 'Property Address', 'Property', 'Address', 'Premises', 'Location', 'Site Address'),
    issueDescription: parseByLabel(body, 'Description', 'Description of Issue', 'Issue', 'Details', 'Fault', 'Problem', 'Works Required', 'Instructions', 'Notes'),
    pmName: parseByLabel(body, 'Property Manager', 'Property Manager Name', 'Manager', 'Agent'),
    pmEmail: parseByLabel(body, 'Property Manager Email', 'Manager Email', 'Agent Email'),
    agency: parseByLabel(body, 'Agency', 'Agency Name', 'Office', 'Company', 'Real Estate'),
    accessInstructions: parseByLabel(body, 'Access', 'Access Instructions', 'Access Details', 'Access Type', 'Access Code', 'Key', 'Entry'),
    preferredDate: parseByLabel(body, 'Preferred Date', 'Preferred Time', 'Date', 'Requested Date', 'Required by', 'Not Available'),
    jobType: parseByLabel(body, 'Job Type', 'Trade Type', 'Trade', 'Category', 'Type'),
    urgency: parseByLabel(body, 'Urgency', 'Priority', 'Urgent'),
  };
}

function parseEmail(subject: string, body: string, from: string, software: string): Partial<ParsedWorkOrder> {
  switch (software) {
    case 'PropertyMe': return parsePropertyMe(subject, body, from);
    case 'Console Cloud': return parseConsoleCloud(subject, body, from);
    case 'PropertyTree': return parsePropertyTree(subject, body, from);
    default: return parseGeneric(subject, body, from);
  }
}

// ─── Job type classification ───────────────────────────────────
function classifyJobType(text: string): string {
  const lower = text.toLowerCase();
  if (/smoke\s*(?:alarm|detector)/i.test(lower)) return 'SMOKE_ALARM';
  if (/safety\s*switch|rcd|rcbo/i.test(lower)) return 'SAFETY_SWITCH';
  if (/light|lighting|lamp|bulb|globe|downlight/i.test(lower)) return 'LIGHTING';
  if (/power\s*(?:point|outlet|socket)|gpo/i.test(lower)) return 'POWER_POINT';
  if (/hot\s*water|hwu|hws/i.test(lower)) return 'HOT_WATER';
  if (/fan|exhaust|ventilation/i.test(lower)) return 'FAN';
  if (/stove|oven|cooktop|range\s*hood/i.test(lower)) return 'APPLIANCE';
  if (/spark|burn|shock|trip|surge|emergency|urgent/i.test(lower)) return 'EMERGENCY';
  if (/rewir|switchboard|meter|circuit\s*breaker|fuse/i.test(lower)) return 'SWITCHBOARD';
  return 'GENERAL_REPAIR';
}

function classifyUrgency(text: string): string {
  const lower = text.toLowerCase();
  if (/urgent|emergency|asap|immediately|spark|fire|shock|burning|dangerous|hazard/i.test(lower)) return 'URGENT';
  if (/soon|priority|important|quick/i.test(lower)) return 'HIGH';
  if (/when\s*(?:you\s*)?can|no\s*rush|convenient|routine/i.test(lower)) return 'LOW';
  return 'NORMAL';
}

// ─── Gmail API helpers ──────────────────────────────────────────
async function fetchGmailMessages(accessToken: string, maxResults = 10): Promise<any[]> {
  const queries = ['is:unread', 'is:unread+in:spam'];
  const seen = new Set<string>();
  const allMessages: any[] = [];

  for (const q of queries) {
    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&q=${q}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!listRes.ok) throw new Error(`Gmail API list failed: ${listRes.status} ${await listRes.text()}`);
    const listData = await listRes.json();
    for (const msg of (listData.messages || [])) {
      if (!seen.has(msg.id)) { seen.add(msg.id); allMessages.push(msg); }
    }
  }

  if (!allMessages.length) return [];

  const messages = [];
  for (const msg of allMessages.slice(0, maxResults)) {
    const msgUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`;
    const msgRes = await fetch(msgUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (msgRes.ok) messages.push(await msgRes.json());
  }

  return messages;
}

async function markAsRead(accessToken: string, messageId: string) {
  await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ removeLabelIds: ['UNREAD'] }),
  });
}

function extractGmailBody(message: any): { subject: string; from: string; body: string; html: string } {
  const headers = message.payload?.headers || [];
  const subject = headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || '';
  const from = headers.find((h: any) => h.name.toLowerCase() === 'from')?.value || '';
  
  let textBody = '';
  let htmlBody = '';
  
  function walkParts(part: any) {
    if (part.mimeType === 'text/plain' && part.body?.data) {
      textBody += Buffer.from(part.body.data, 'base64url').toString('utf8');
    }
    if (part.mimeType === 'text/html' && part.body?.data) {
      htmlBody += Buffer.from(part.body.data, 'base64url').toString('utf8');
    }
    if (part.parts) {
      part.parts.forEach(walkParts);
    }
  }
  
  walkParts(message.payload || {});
  
  // If no text part, strip HTML
  if (!textBody && htmlBody) {
    textBody = htmlBody.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  
  return { subject, from, body: textBody, html: htmlBody };
}

// ─── Get Gmail OAuth token using refresh token ──────────────────
async function getGmailAccessToken(): Promise<string> {
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  
  if (refreshToken && clientId && clientSecret) {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    
    if (tokenRes.ok) {
      const data = await tokenRes.json();
      return data.access_token;
    }
    const errBody = await tokenRes.text();
    console.error('[Poll Inbox] OAuth refresh error:', errBody);
    throw new Error(`OAuth token refresh failed: ${tokenRes.status} — ${errBody}`);
  }
  
  throw new Error('Missing GMAIL_REFRESH_TOKEN, GMAIL_CLIENT_ID, or GMAIL_CLIENT_SECRET');
}

// ─── Main handler ───────────────────────────────────────────────
export default async function handler(req: AppRequest, res: AppResponse) {
  // Cron jobs call GET — detect them so we run polling, not diagnostics
  const getHeader = (name: string) =>
    typeof req.headers.get === 'function' ? req.headers.get(name) : (req.headers as any)[name];
  const isCronRequest =
    getHeader('x-cloudflare-cron') === '1' ||
    (!!process.env.CRON_SECRET && getHeader('authorization') === `Bearer ${process.env.CRON_SECRET}`);

  // GET = diagnostic (with live Gmail test), UNLESS called by cron trigger
  if (req.method === 'GET' && !isCronRequest) {
    const checks: any = {
      GMAIL_ADDRESS: process.env.GMAIL_ADDRESS ? `✅ ${process.env.GMAIL_ADDRESS}` : '❌ MISSING',
      GMAIL_CLIENT_ID: process.env.GMAIL_CLIENT_ID ? '✅ set' : '❌ MISSING',
      GMAIL_CLIENT_SECRET: process.env.GMAIL_CLIENT_SECRET ? '✅ set' : '❌ MISSING',
      GMAIL_REFRESH_TOKEN: process.env.GMAIL_REFRESH_TOKEN ? '✅ set' : '❌ MISSING',
      OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY ? '✅ set (AI enrichment enabled)' : '⚠️ missing (regex-only parsing)',
      database: req.env?.DB ? '✅ D1 binding present' : '⚠️ No DB binding (jobs will not be saved)',
      CRON_SECRET: process.env.CRON_SECRET ? '✅ set' : '⚠️ missing (endpoint not secured against unauthorised triggers)',
    };
    let gmailLiveTest: any = null;
    try {
      const accessToken = await getGmailAccessToken();
      // Verify which account this token belongs to
      const profileRes = await fetch(
        'https://gmail.googleapis.com/gmail/v1/users/me/profile',
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const profileData = profileRes.ok ? await profileRes.json() : {};
      // Count ALL unread messages
      const unreadRes = await fetch(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=20&q=is:unread',
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const unreadData = await unreadRes.json();
      // Count unread in inbox specifically
      const inboxRes = await fetch(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=5&q=is:unread+in:inbox',
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const inboxData = await inboxRes.json();
      // Count unread in spam
      const spamRes = await fetch(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=5&q=is:unread+in:spam',
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const spamData = await spamRes.json();
      // Check all mail from last hour (read or unread)
      const recentRes = await fetch(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10&q=newer_than:1h',
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const recentData = await recentRes.json();
      // Get subjects of recent messages for debugging
      const recentSubjects: string[] = [];
      for (const msg of (recentData.messages || []).slice(0, 5)) {
        const mRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (mRes.ok) {
          const mData = await mRes.json();
          const subj = mData.payload?.headers?.find((h: any) => h.name === 'Subject')?.value || '(no subject)';
          const from = mData.payload?.headers?.find((h: any) => h.name === 'From')?.value || '';
          recentSubjects.push(`${subj} | from: ${from}`);
        }
      }
      gmailLiveTest = {
        tokenOk: true,
        authenticatedAs: profileData.emailAddress ?? 'unknown',
        totalMessages: profileData.messagesTotal ?? 0,
        unreadTotal: unreadData.messages?.length ?? 0,
        unreadInbox: inboxData.messages?.length ?? 0,
        unreadSpam: spamData.messages?.length ?? 0,
        recentLast1h: recentData.messages?.length ?? 0,
        recentSubjects,
      };
    } catch (e: any) {
      gmailLiveTest = { tokenOk: false, error: e.message };
    }
    return res.status(200).json({
      status: 'Email Polling Endpoint',
      checks,
      gmailLiveTest,
      usage: 'Cron (cron-job.org) POSTs every 5 min to trigger polling. GET (no cron header) returns this diagnostic.',
    });
  }

  if (req.method !== 'POST' && !isCronRequest) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── Test mode: process a supplied email body ──
  if (req.query.test === '1' && req.body?.subject) {
    const { subject, body, from } = req.body;
    const detected = detectRealEstateSoftware(subject || '', body || '', from || '');
    const parsed = parseEmail(subject || '', body || '', from || '', detected.software);
    
    return res.status(200).json({
      mode: 'test',
      detected,
      parsed,
      classifiedType: classifyJobType(`${subject} ${body} ${parsed.jobType || ''}`),
      classifiedUrgency: classifyUrgency(`${subject} ${body} ${parsed.urgency || ''}`),
    });
  }

  try {
    // ── Step 1: Get Gmail access token ──
    const accessToken = await getGmailAccessToken();
    
    // ── Step 2: Fetch unread messages ──
    const messages = await fetchGmailMessages(accessToken, 10);
    
    if (messages.length === 0) {
      return res.status(200).json({ success: true, processed: 0, message: 'No new emails' });
    }

    // ── Step 3: Process each email ──
    const results = [];
    
    for (const message of messages) {
      try {
        const { subject, from, body, html } = extractGmailBody(message);
        const combined = `${subject}\n${body}`;
        
        // ── Skip non-work-order emails ──
        const fromLower = from.toLowerCase();
        const subjectLower = subject.toLowerCase();
        const skipSenderPatterns = [
          /noreply|no-reply|no\.reply|donotreply|mailer-daemon/i,
          /google\.com|firebase|onesignal|usercentrics|courier\.com/i,
          /mailchimp|sendgrid|twilio|base44|hubspot|intercom/i,
          /zendesk|freshdesk|slack|github|gitlab|bitbucket/i,
          /team@|news@|digest@|updates@/i,
          /stripe\.com|paypal\.com|xero\.com|quickbooks|invoiced\.com/i,
          /failed-payments|invoice\+|billing@|accounts@|payments@/i,
          /no-?reply@.*microsoft|no-?reply@.*apple\.com|@amazon\.com/i,
        ];
        const skipSubjectPatterns = [
          /verify your email|confirm your|welcome to|get started|getting started/i,
          /your .* account|password reset|security alert|sign-in|login/i,
          /indexed on site|google presence|search console/i,
          /unlock .* features|expires soon|quick wins|level up|off your|discount/i,
          /missed this|don.t miss|act now|limited time|free trial/i,
          /payment .* unsuccessful|payment failed|your receipt from|billing statement/i,
          /^outlook test message$|^microsoft outlook test/i,
          /\$[0-9]+\.?[0-9]* payment|subscription renewal|auto-renew/i,
        ];
        const isSkippable = skipSenderPatterns.some(p => p.test(fromLower)) ||
          skipSubjectPatterns.some(p => p.test(subjectLower));
        
        if (isSkippable) {
          // Mark as read so we don't re-check it
          await markAsRead(accessToken, message.id);
          console.log(`[EmailPoll] Skipped non-WO email: "${subject}" from ${from}`);
          continue;
        }
        
        // Detect source software
        const detected = detectRealEstateSoftware(subject, body, from);
        console.log(`[EmailPoll] Processing: "${subject}" from ${from} — detected: ${detected.software}`);
        
        // Parse based on detected software
        const parsed = parseEmail(subject, body, from, detected.software);

        // OpenRouter AI enrichment — fills any missing fields
        const aiFields = await aiEnrichEmail(subject, body);
        if (aiFields.tenantName && !parsed.tenantName) parsed.tenantName = aiFields.tenantName;
        if (aiFields.tenantPhone && !parsed.tenantPhone) parsed.tenantPhone = aiFields.tenantPhone;
        if (aiFields.tenantEmail && !parsed.tenantEmail) parsed.tenantEmail = aiFields.tenantEmail;
        if (aiFields.propertyAddress && !parsed.propertyAddress) parsed.propertyAddress = aiFields.propertyAddress;
        if (aiFields.issueDescription && !parsed.issueDescription) parsed.issueDescription = aiFields.issueDescription;
        if (aiFields.preferredDate && !parsed.preferredDate) parsed.preferredDate = aiFields.preferredDate;

        // Classify job type and urgency
        const jobType = (aiFields.jobType as any) || (parsed.jobType
          ? (/smoke/i.test(parsed.jobType) ? 'SMOKE_ALARM' : classifyJobType(parsed.jobType))
          : classifyJobType(combined));

        const urgency = (aiFields.urgency as any) || (parsed.urgency
          ? classifyUrgency(parsed.urgency)
          : classifyUrgency(combined));
        
        // Build title
        const titleAddr = parsed.propertyAddress ? parsed.propertyAddress.split(',')[0] : '';
        const titleType = jobType.replace(/_/g, ' ');
        const jobTitle = titleAddr ? `${titleType} — ${titleAddr}` : subject || 'New Work Order';
        
        const now = new Date();
        const newJob: Record<string, any> = {
          title: jobTitle,
          type: jobType,
          status: 'INTAKE',
          urgency,
          createdAt: now.toISOString(),
          tenantName: parsed.tenantName || '',
          tenantPhone: parsed.tenantPhone || '',
          tenantEmail: parsed.tenantEmail || '',
          propertyAddress: parsed.propertyAddress || '',
          propertyManagerEmail: parsed.pmEmail || from,
          propertyManagerName: parsed.pmName || '',
          agency: parsed.agency || '',
          accessCodes: parsed.accessInstructions || '',
          description: parsed.issueDescription || '',
          contactAttempts: [],
          materials: [],
          photos: [],
          siteNotes: parsed.preferredDate ? `Preferred: ${parsed.preferredDate}` : '',
          source: 'email',
          extractionMethod: `gmail-poll (${detected.software})`,
          detectedSoftware: detected.software,
          detectedConfidence: detected.confidence,
          aiNeedsReview: detected.confidence < 0.5 || !parsed.propertyAddress,
          emailProcessed: true,
          emailProcessedAt: now.toISOString(),
          rawEmailFrom: from,
          rawEmailSubject: subject,
          rawEmailBody: body.substring(0, 5000),
          gmailMessageId: message.id,
        };
        
        // Save to D1
        const docId = newId();
        const jobToSave: any = { ...newJob, id: docId };
        try {
          if (req.env?.DB) {
            const db = getDb(req.env);
            await db.prepare(
              `INSERT INTO jobs (id, data, status, type, urgency, property_address, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
            ).bind(
              docId, JSON.stringify(jobToSave),
              jobToSave.status || 'INTAKE', jobToSave.type || '',
              jobToSave.urgency || 'NORMAL', jobToSave.propertyAddress || '',
              now.toISOString(), now.toISOString()
            ).run();
          } else {
            console.warn('[EmailPoll] No DB binding — job not persisted');
          }
        } catch (dbErr: any) {
          console.error(`[EmailPoll] D1 save failed for "${subject}":`, dbErr.message);
          results.push({ gmailId: message.id, error: `D1 save failed: ${dbErr.message}` });
          // Do NOT mark as read — will retry on next poll
          continue;
        }

        // Mark email as read ONLY after successful D1 save
        await markAsRead(accessToken, message.id);
        
        results.push({
          gmailId: message.id,
          jobId: docId,
          subject,
          from,
          software: detected.software,
          address: parsed.propertyAddress,
          type: jobType,
        });
        
        console.log(`[EmailPoll] Job created: ${docId} | ${detected.software} | ${jobType}`);
      } catch (msgErr: any) {
        console.error(`[EmailPoll] Failed to process message ${message.id}:`, msgErr.message);
        results.push({ gmailId: message.id, error: msgErr.message });
      }
    }
    
    return res.status(200).json({
      success: true,
      processed: results.filter(r => !r.error).length,
      errors: results.filter(r => r.error).length,
      results,
    });
    
  } catch (err: any) {
    console.error('[EmailPoll] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
