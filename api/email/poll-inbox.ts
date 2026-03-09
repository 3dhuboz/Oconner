import type { VercelRequest, VercelResponse } from '@vercel/node';
import { toFirestoreValue, classifyJobType, classifyUrgency } from '../_lib/helpers';

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
 *   GMAIL_APP_PASSWORD     — 16-char app password from Google account settings
 *   VITE_FIREBASE_PROJECT_ID
 *   VITE_FIREBASE_API_KEY
 *   OPENAI_API_KEY         — optional, enables AI extraction
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

// classifyJobType, classifyUrgency, toFirestoreValue imported from ../_lib/helpers

// ─── Gmail API helpers ──────────────────────────────────────────
async function fetchGmailMessages(accessToken: string, maxResults = 10): Promise<any[]> {
  // Fetch unread messages from inbox
  const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&q=is:unread+in:inbox`;
  const listRes = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  
  if (!listRes.ok) {
    throw new Error(`Gmail API list failed: ${listRes.status} ${await listRes.text()}`);
  }
  
  const listData = await listRes.json();
  if (!listData.messages?.length) return [];
  
  // Fetch each message's full content
  const messages = [];
  for (const msg of listData.messages.slice(0, maxResults)) {
    const msgUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`;
    const msgRes = await fetch(msgUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (msgRes.ok) {
      messages.push(await msgRes.json());
    }
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
    throw new Error(`OAuth token refresh failed: ${tokenRes.status}`);
  }
  
  throw new Error('Missing GMAIL_REFRESH_TOKEN, GMAIL_CLIENT_ID, or GMAIL_CLIENT_SECRET');
}

// ─── Main handler ───────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // GET = diagnostic
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'Email Polling Endpoint',
      checks: {
        GMAIL_ADDRESS: process.env.GMAIL_ADDRESS ? `✅ ${process.env.GMAIL_ADDRESS}` : '❌ MISSING',
        GMAIL_CLIENT_ID: process.env.GMAIL_CLIENT_ID ? '✅ set' : '❌ MISSING',
        GMAIL_CLIENT_SECRET: process.env.GMAIL_CLIENT_SECRET ? '✅ set' : '❌ MISSING',
        GMAIL_REFRESH_TOKEN: process.env.GMAIL_REFRESH_TOKEN ? '✅ set' : '❌ MISSING',
        OPENAI_API_KEY: process.env.OPENAI_API_KEY ? '✅ set (AI enabled)' : '⚠️ missing (regex-only parsing)',
        VITE_FIREBASE_PROJECT_ID: process.env.VITE_FIREBASE_PROJECT_ID ? '✅ set' : '❌ MISSING',
        VITE_FIREBASE_API_KEY: (process.env.VITE_FIREBASE_API_KEY || process.env.VITE_FB_API_KEY) ? '✅ set' : '❌ MISSING',
      },
      softwareDetection: [
        'PropertyMe', 'Console Cloud', 'PropertyTree', 'Palace', 'Rex PM',
        'ManagedApp', 'Inspection Express', 'MRI Software', 'Manual/Direct Email',
      ],
      usage: 'POST to poll inbox. Set up a Vercel Cron to call this every 2-5 minutes.',
    });
  }

  if (req.method !== 'POST') {
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

    const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
    const apiKey = process.env.VITE_FIREBASE_API_KEY || process.env.VITE_FB_API_KEY;
    
    if (!projectId || !apiKey) {
      return res.status(200).json({ success: false, error: 'Firebase not configured' });
    }

    // Auth with Firebase
    let idToken = '';
    const webhookEmail = process.env.WEBHOOK_AUTH_EMAIL;
    const webhookPassword = process.env.WEBHOOK_AUTH_PASSWORD;
    
    if (webhookEmail && webhookPassword) {
      const authRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: webhookEmail, password: webhookPassword, returnSecureToken: true }),
        }
      );
      const authData = await authRes.json();
      if (authData.idToken) idToken = authData.idToken;
    }
    
    if (!idToken) {
      const anonRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ returnSecureToken: true }),
        }
      );
      const anonData = await anonRes.json();
      if (anonData.idToken) idToken = anonData.idToken;
      else return res.status(200).json({ success: false, error: 'Firebase auth failed' });
    }

    // ── Step 3: Process each email ──
    const results = [];
    
    for (const message of messages) {
      try {
        const { subject, from, body, html } = extractGmailBody(message);
        const combined = `${subject}\n${body}`;
        
        // Detect source software
        const detected = detectRealEstateSoftware(subject, body, from);
        console.log(`[EmailPoll] Processing: "${subject}" from ${from} — detected: ${detected.software}`);
        
        // Parse based on detected software
        const parsed = parseEmail(subject, body, from, detected.software);
        
        // Classify job type and urgency
        const jobType = parsed.jobType
          ? (/smoke/i.test(parsed.jobType) ? 'SMOKE_ALARM' : classifyJobType(parsed.jobType))
          : classifyJobType(combined);
        
        const urgency = parsed.urgency
          ? classifyUrgency(parsed.urgency)
          : classifyUrgency(combined);
        
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
        
        // Save to Firestore
        const fields: any = {};
        for (const [key, value] of Object.entries(newJob)) {
          fields[key] = toFirestoreValue(value);
        }
        
        const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/jobs?key=${apiKey}`;
        const fsRes = await fetch(firestoreUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`,
          },
          body: JSON.stringify({ fields }),
        });
        
        const fsResult = await fsRes.json();
        const docId = fsResult.name?.split('/').pop() || 'unknown';
        
        // Mark email as read
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
