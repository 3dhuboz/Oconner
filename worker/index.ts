// ============================================================================
// Wirez R Us — Cloudflare Worker API
// Hono router with D1 database and R2 storage
// Migrated from Firebase/Vercel serverless functions
// ============================================================================

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import PostalMime from 'postal-mime';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

// ─── Type definitions ────────────────────────────────────────────────────────

interface Env {
  DB: D1Database;
  STORAGE: R2Bucket;
  ENVIRONMENT: string;
  CLERK_SECRET_KEY: string;
  CLERK_PUBLISHABLE_KEY: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_SETUP_FEE_PRICE_ID: string;
  STRIPE_BASE_SUBSCRIPTION_PRICE_ID: string;
  STRIPE_ADDITIONAL_TECH_PRICE_ID: string;
  TWILIO_ACCOUNT_SID: string;
  TWILIO_AUTH_TOKEN: string;
  TWILIO_PHONE_NUMBER: string;
  XERO_CLIENT_ID: string;
  XERO_CLIENT_SECRET: string;
  OPENROUTER_API_KEY: string;
  RESEND_API_KEY: string;
  RESEND_FROM_EMAIL: string; // e.g. "Wirez R Us <jobs@wirezapp.au>" — must be a verified Resend domain
  GOOGLE_MAPS_API_KEY: string;
}

interface AuthUser {
  userId: string;
  email: string;
  role: string;
  tenantId: string | null;
}

type Variables = {
  user: AuthUser;
};

// ─── camelCase <-> snake_case conversion ─────────────────────────────────────

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/** Boolean fields that D1 stores as 0/1 integers */
const BOOLEAN_FIELDS = new Set([
  'form9_sent', 'compliance_report_generated', 'email_processed',
  'has_follow_up_email', 'ai_needs_review', 'needs_reschedule',
  'finished_job_email_sent', 'running_late_notified',
  'compliance_smoke_alarms_tick', 'compliance_safety_switch_tick',
  'is_active', 'is_included', 'successful', 'tested', 'passed', 'replaced',
  'synced_from_pricing',
]);

/** Fields stored as JSON strings in D1 */
const JSON_FIELDS = new Set(['ai_confidence']);

/**
 * Convert a snake_case D1 row to camelCase for API responses.
 * Handles boolean (0/1 -> true/false) and JSON string fields.
 */
function toCamelCase(obj: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!obj) return null;
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = snakeToCamel(key);
    if (BOOLEAN_FIELDS.has(key)) {
      result[camelKey] = value === 1 || value === true;
    } else if (JSON_FIELDS.has(key) && typeof value === 'string') {
      try { result[camelKey] = JSON.parse(value); } catch { result[camelKey] = value; }
    } else {
      result[camelKey] = value;
    }
  }
  return result;
}

/**
 * Convert a camelCase API input object to snake_case for D1 writes.
 * Handles boolean (true/false -> 1/0) and JSON object fields.
 */
function toSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = camelToSnake(key);
    if (BOOLEAN_FIELDS.has(snakeKey)) {
      result[snakeKey] = value ? 1 : 0;
    } else if (JSON_FIELDS.has(snakeKey) && typeof value === 'object' && value !== null) {
      result[snakeKey] = JSON.stringify(value);
    } else {
      result[snakeKey] = value;
    }
  }
  return result;
}

/** Convert array of D1 rows to camelCase */
function rowsToCamel(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map((r) => toCamelCase(r)!);
}

// ─── ID generation ───────────────────────────────────────────────────────────

function generateId(): string {
  return crypto.randomUUID();
}

// ─── SQL helpers ─────────────────────────────────────────────────────────────

/** Build an INSERT statement from a snake_case object */
function buildInsert(table: string, data: Record<string, unknown>): { sql: string; params: unknown[] } {
  const keys = Object.keys(data);
  const placeholders = keys.map(() => '?').join(', ');
  return {
    sql: `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`,
    params: keys.map((k) => data[k] ?? null),
  };
}

/** Build an UPDATE SET clause from a snake_case object */
function buildUpdate(table: string, data: Record<string, unknown>, idCol: string, idVal: unknown): { sql: string; params: unknown[] } {
  const keys = Object.keys(data).filter((k) => k !== idCol);
  const setClauses = keys.map((k) => `${k} = ?`).join(', ');
  return {
    sql: `UPDATE ${table} SET ${setClauses} WHERE ${idCol} = ?`,
    params: [...keys.map((k) => data[k] ?? null), idVal],
  };
}

// ─── Nested job data helpers ─────────────────────────────────────────────────

/** Fields that belong to child tables, not the main jobs row */
const CHILD_TABLE_FIELDS = ['contactAttempts', 'timeLog', 'materials', 'photos', 'miscCharges', 'smokeAlarms'];

/** Separate child-table arrays from scalar job fields */
function separateJobChildren(body: Record<string, unknown>): {
  scalar: Record<string, unknown>;
  children: Record<string, unknown[]>;
} {
  const scalar: Record<string, unknown> = {};
  const children: Record<string, unknown[]> = {};
  for (const [key, value] of Object.entries(body)) {
    if (CHILD_TABLE_FIELDS.includes(key) && Array.isArray(value)) {
      children[key] = value;
    } else {
      scalar[key] = value;
    }
  }
  return { scalar, children };
}

/** Insert child rows for a job */
async function insertJobChildren(db: D1Database, jobId: string, children: Record<string, unknown[]>) {
  const ops: Promise<D1Result>[] = [];

  if (children.contactAttempts?.length) {
    for (const item of children.contactAttempts) {
      const row = toSnakeCase(item as Record<string, unknown>);
      if (!row.id) row.id = generateId();
      row.job_id = jobId;
      const { sql, params } = buildInsert('job_contact_attempts', row);
      ops.push(db.prepare(sql).bind(...params).run());
    }
  }

  if (children.timeLog?.length) {
    for (const item of children.timeLog) {
      const row = toSnakeCase(item as Record<string, unknown>);
      if (!row.id) row.id = generateId();
      row.job_id = jobId;
      const { sql, params } = buildInsert('job_time_entries', row);
      ops.push(db.prepare(sql).bind(...params).run());
    }
  }

  if (children.materials?.length) {
    for (const item of children.materials) {
      const row = toSnakeCase(item as Record<string, unknown>);
      if (!row.id) row.id = generateId();
      row.job_id = jobId;
      const { sql, params } = buildInsert('job_materials', row);
      ops.push(db.prepare(sql).bind(...params).run());
    }
  }

  if (children.photos?.length) {
    for (const url of children.photos) {
      const row = { id: generateId(), job_id: jobId, url: url as string, created_at: new Date().toISOString() };
      const { sql, params } = buildInsert('job_photos', row);
      ops.push(db.prepare(sql).bind(...params).run());
    }
  }

  if (children.miscCharges?.length) {
    for (const item of children.miscCharges) {
      const row = toSnakeCase(item as Record<string, unknown>);
      if (!row.id) row.id = generateId();
      row.job_id = jobId;
      const { sql, params } = buildInsert('job_misc_charges', row);
      ops.push(db.prepare(sql).bind(...params).run());
    }
  }

  if (children.smokeAlarms?.length) {
    for (const item of children.smokeAlarms) {
      const row = toSnakeCase(item as Record<string, unknown>);
      if (!row.id) row.id = generateId();
      row.job_id = jobId;
      const { sql, params } = buildInsert('job_smoke_alarms', row);
      ops.push(db.prepare(sql).bind(...params).run());
    }
  }

  await Promise.all(ops);
}

/** Replace all child rows for a job (delete + re-insert) */
async function replaceJobChildren(db: D1Database, jobId: string, children: Record<string, unknown[]>) {
  const tables: { key: string; table: string }[] = [
    { key: 'contactAttempts', table: 'job_contact_attempts' },
    { key: 'timeLog', table: 'job_time_entries' },
    { key: 'materials', table: 'job_materials' },
    { key: 'photos', table: 'job_photos' },
    { key: 'miscCharges', table: 'job_misc_charges' },
    { key: 'smokeAlarms', table: 'job_smoke_alarms' },
  ];

  for (const { key, table } of tables) {
    if (key in children) {
      await db.prepare(`DELETE FROM ${table} WHERE job_id = ?`).bind(jobId).run();
    }
  }

  await insertJobChildren(db, jobId, children);
}

/** Fetch all nested data for a job and attach as camelCase arrays */
async function attachJobChildren(db: D1Database, job: Record<string, unknown>): Promise<Record<string, unknown>> {
  const jobId = job.id as string;
  const [contacts, timeEntries, materials, photos, miscCharges, smokeAlarms] = await Promise.all([
    db.prepare('SELECT * FROM job_contact_attempts WHERE job_id = ?').bind(jobId).all(),
    db.prepare('SELECT * FROM job_time_entries WHERE job_id = ?').bind(jobId).all(),
    db.prepare('SELECT * FROM job_materials WHERE job_id = ?').bind(jobId).all(),
    db.prepare('SELECT * FROM job_photos WHERE job_id = ?').bind(jobId).all(),
    db.prepare('SELECT * FROM job_misc_charges WHERE job_id = ?').bind(jobId).all(),
    db.prepare('SELECT * FROM job_smoke_alarms WHERE job_id = ?').bind(jobId).all(),
  ]);

  const result = toCamelCase(job as Record<string, unknown>)!;
  result.contactAttempts = rowsToCamel(contacts.results as Record<string, unknown>[]);
  result.timeLog = rowsToCamel(timeEntries.results as Record<string, unknown>[]);
  result.materials = rowsToCamel(materials.results as Record<string, unknown>[]);
  result.photos = (photos.results as Record<string, unknown>[]).map((p) => p.url as string);
  result.miscCharges = rowsToCamel(miscCharges.results as Record<string, unknown>[]);
  result.smokeAlarms = rowsToCamel(smokeAlarms.results as Record<string, unknown>[]);

  return result;
}

// ─── Email extraction helpers (ported from Vercel) ───────────────────────────

function extractWithRegex(text: string, senderEmail: string) {
  const phonePatterns = [
    /(?:\+?61|0)[2-478](?:[\s-]?\d){8}/g,
    /(?:\+?61|0)4\d{2}[\s-]?\d{3}[\s-]?\d{3}/g,
    /\(0[2-9]\)\s?\d{4}\s?\d{4}/g,
    /\b\d{4}[\s-]\d{3}[\s-]\d{3}\b/g,
    /\b1[38]00[\s-]?\d{3}[\s-]?\d{3}\b/g,
  ];
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const addressPatterns = [
    /\d{1,5}[\/\-]?\d{0,5}\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:St|Street|Rd|Road|Ave|Avenue|Dr|Drive|Ct|Court|Pl|Place|Cres|Crescent|Blvd|Boulevard|Way|Lane|Ln|Tce|Terrace|Pde|Parade|Cir|Circuit|Close|Cl)\b[,.\s]*(?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)?[,.\s]*(?:NSW|VIC|QLD|SA|WA|TAS|NT|ACT)?[,.\s]*\d{4}/gi,
    /(?:Unit|Apt|Lot|Suite)\s*\d+[,\/\s]+\d+\s+[A-Za-z\s]+(?:St|Street|Rd|Road|Ave|Avenue|Dr|Drive)\b[^,\n]*\d{4}/gi,
  ];

  const label = (pattern: string) => new RegExp(`^[ \\t]*${pattern}[ \\t]*:[ \\t]*(.+)$`, 'im');

  const labelledAddress = text.match(label('PROPERTY\\s+ADDRESS')) || text.match(label('PROPERTY')) || text.match(label('ADDRESS'));
  const labelledTenantName = text.match(label('TENANT\\s+(?:FULL\\s+)?NAME')) || text.match(label('TENANT'));
  const labelledTenantPhone = text.match(label('TENANT\\s+PHONE')) || text.match(label('PHONE|MOBILE|TEL'));
  const labelledTenantEmail = text.match(label('TENANT\\s+EMAIL')) || text.match(label('EMAIL|E-MAIL'));
  const labelledPMName = text.match(label('PROPERTY\\s+MANAGER(?:\\s+NAME)?'));
  const labelledPMEmail = text.match(label('PROPERTY\\s+MANAGER\\s+EMAIL'));
  const labelledAgency = text.match(label('AGENCY'));
  const labelledJobType = text.match(label('JOB\\s+TYPE'));
  const labelledUrgency = text.match(label('URGENCY'));
  const labelledAccess = text.match(label('ACCESS\\s+(?:INSTRUCTIONS?|TYPE|CODE|DETAILS?)'));
  const labelledPrefDate = text.match(label('PREFERRED\\s+DATE(?:\\/TIME)?'));
  const labelledNotAvail = text.match(label('NOT\\s+AVAILABLE'));
  const descMatch = text.match(/DESCRIPTION\s+OF\s+ISSUE\s*:\s*\n([\s\S]*?)(?=\n[A-Z\s]{4,}:|={4,}|$)/i);

  let phones: string[] = [];
  for (const p of phonePatterns) { const m = text.match(p); if (m) phones.push(...m); }
  phones = [...new Set(phones.map((p) => p.replace(/[\s-]/g, '')))];

  const emails = [...new Set((text.match(emailPattern) || []).filter((e) => e.toLowerCase() !== senderEmail.toLowerCase()))];

  let addresses: string[] = [];
  for (const p of addressPatterns) { const m = text.match(p); if (m) addresses.push(...m); }
  addresses = [...new Set(addresses.map((a) => a.trim()))];

  return {
    tenantName: labelledTenantName?.[1]?.trim() || '',
    tenantPhone: labelledTenantPhone?.[1]?.trim() || phones[0] || '',
    tenantEmail: labelledTenantEmail?.[1]?.trim() || emails[0] || '',
    propertyAddress: labelledAddress?.[1]?.trim() || addresses[0] || '',
    pmName: labelledPMName?.[1]?.trim() || '',
    pmEmail: labelledPMEmail?.[1]?.trim() || '',
    agency: labelledAgency?.[1]?.trim() || '',
    jobTypeLabel: labelledJobType?.[1]?.trim() || '',
    urgencyLabel: labelledUrgency?.[1]?.trim() || '',
    accessInstructions: labelledAccess?.[1]?.trim() || '',
    preferredDate: labelledPrefDate?.[1]?.trim() || '',
    notAvailable: labelledNotAvail?.[1]?.trim() || '',
    description: descMatch?.[1]?.trim() || '',
    allPhones: phones,
    allEmails: emails,
    allAddresses: addresses,
  };
}

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

// Real estate software detection (ported from poll-inbox)
function detectRealEstateSoftware(subject: string, body: string, from: string): { software: string; confidence: number } {
  const combined = `${subject}\n${body}\n${from}`.toLowerCase();
  const detectors: { name: string; signals: RegExp[]; fromDomains?: string[] }[] = [
    { name: 'PropertyMe', signals: [/maintenance\s*request/i, /propertyme/i, /trade\s*type\s*:/i, /property\s*me/i], fromDomains: ['propertyme.com', 'propertyme.com.au'] },
    { name: 'Console Cloud', signals: [/console\s*cloud/i, /console\s*gateway/i, /job\s*#\s*\d+/i, /description\s*of\s*works?\s*:/i, /applicant\s*:/i], fromDomains: ['consolecloud.com.au', 'console.com.au'] },
    { name: 'PropertyTree', signals: [/propertytree/i, /property\s*tree/i, /work\s*order\s*#?\s*\d+/i, /tenancy\s*:/i, /trade\s*:/i], fromDomains: ['propertytree.com', 'rockend.com.au'] },
    { name: 'Palace', signals: [/palace/i, /reference\s*:\s*\d+/i, /premises\s*:/i, /occupant\s*:/i], fromDomains: ['palace.network'] },
    { name: 'Rex PM', signals: [/rex\s*(?:pm|software)/i, /maintenance\s*job/i, /rexsoftware/i], fromDomains: ['rexsoftware.com'] },
    { name: 'ManagedApp', signals: [/managedapp/i, /managed\s*app/i], fromDomains: ['managedapp.com.au'] },
    { name: 'MRI Software', signals: [/mri\s*software/i, /mri.*property/i], fromDomains: ['mrisoftware.com'] },
  ];

  for (const detector of detectors) {
    let matchCount = 0;
    if (detector.fromDomains) {
      for (const domain of detector.fromDomains) {
        if (from.toLowerCase().includes(domain)) matchCount++;
      }
    }
    for (const signal of detector.signals) {
      if (signal.test(combined)) matchCount++;
    }
    if (matchCount >= 2) return { software: detector.name, confidence: Math.min(1, matchCount * 0.3) };
  }

  const reSignals = [/work\s*order/i, /maintenance/i, /tenant/i, /property\s*manager/i, /property\s*address/i, /real\s*estate/i, /agency/i, /landlord/i];
  const manualMatches = reSignals.filter((s) => s.test(combined));
  if (manualMatches.length >= 2) return { software: 'Manual/Direct Email', confidence: 0.5 };

  return { software: 'Unknown', confidence: 0 };
}

// AI extraction via OpenRouter (replaces OpenAI)
interface AIExtractionResult {
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
  confidence: { tenantName: number; tenantPhone: number; tenantEmail: number; propertyAddress: number; issueDescription: number; overall: number };
  detectedSoftware: string;
  needsReview: boolean;
}

async function extractWithAI(emailBody: string, subject: string, from: string, apiKey: string): Promise<AIExtractionResult | null> {
  if (!apiKey) return null;

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'anthropic/claude-haiku',
        temperature: 0,
        max_tokens: 900,
        messages: [
          {
            role: 'system',
            content: `You are an expert data extraction agent for Wirez R Us, an Australian electrical contractor. Your job is to extract structured work order information from emails sent by Australian real estate property managers.

You must handle ANY format — these emails come from many different property management software systems including but not limited to:
- PropertyMe, PropertyTree / REST Professional, Console Cloud / Gateway, Rex PM, MRI Software / Palace, ManagedApp
- Manual emails from property managers typed directly
- Forwarded work orders in any format

Key extraction rules:
1. "Property address" is the address of the property needing work (not the agency's address)
2. "Tenant" is the occupant/resident who lives there
3. "Property manager" is the agent/real estate contact (the sender or a CC'd person)
4. Phone numbers: normalise to Australian format (04xx xxx xxx or (0x) xxxx xxxx)
5. Urgency: urgent/emergency/ASAP/safety hazard → URGENT; soon/priority → HIGH; routine/when available → LOW; otherwise NORMAL
6. For issueDescription: write a clear 1-3 sentence summary of the electrical problem

Return ONLY valid JSON with exactly these fields:
{
  "tenantName": "", "tenantPhone": "", "tenantEmail": "", "propertyAddress": "",
  "issueDescription": "", "jobType": "one of: SMOKE_ALARM, SAFETY_SWITCH, LIGHTING, POWER_POINT, HOT_WATER, FAN, APPLIANCE, EMERGENCY, SWITCHBOARD, GENERAL_REPAIR",
  "urgency": "one of: URGENT, HIGH, NORMAL, LOW",
  "pmName": "", "pmEmail": "", "agency": "", "accessInstructions": "", "preferredDate": "",
  "confidence": { "tenantName": 0.0, "tenantPhone": 0.0, "tenantEmail": 0.0, "propertyAddress": 0.0, "issueDescription": 0.0, "overall": 0.0 },
  "detectedSoftware": "name of PM software detected"
}

For confidence scores: 1.0 = explicitly labelled, 0.7 = reasonably certain, 0.4 = inferred, 0.0 = not found.`
          },
          { role: 'user', content: `From: ${from}\nSubject: ${subject}\n\n${emailBody.substring(0, 4000)}` },
        ],
      }),
    });

    if (!res.ok) {
      console.error('[AI Extraction] OpenRouter error:', res.status, await res.text());
      return null;
    }

    const data: any = await res.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return null;

    const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(jsonStr) as AIExtractionResult;
    const overall = parsed.confidence?.overall ?? 0;
    const missingCritical = !parsed.propertyAddress || !parsed.issueDescription;
    parsed.needsReview = overall < 0.7 || missingCritical;
    return parsed;
  } catch (err: any) {
    console.error('[AI Extraction] error:', err.message);
    return null;
  }
}

// ─── Gmail API helpers ───────────────────────────────────────────────────────

async function getGmailAccessToken(env: Env): Promise<string> {
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GMAIL_CLIENT_ID,
      client_secret: env.GMAIL_CLIENT_SECRET,
      refresh_token: env.GMAIL_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  if (!tokenRes.ok) {
    const errBody = await tokenRes.text();
    throw new Error(`OAuth token refresh failed: ${tokenRes.status} — ${errBody}`);
  }
  const data: any = await tokenRes.json();
  return data.access_token;
}

async function fetchGmailMessages(accessToken: string, maxResults = 10): Promise<any[]> {
  const queries = ['is:unread', 'is:unread+in:spam'];
  const seen = new Set<string>();
  const allMessages: any[] = [];

  for (const q of queries) {
    const listRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&q=${q}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!listRes.ok) throw new Error(`Gmail list failed: ${listRes.status} ${await listRes.text()}`);
    const listData: any = await listRes.json();
    for (const msg of listData.messages || []) {
      if (!seen.has(msg.id)) { seen.add(msg.id); allMessages.push(msg); }
    }
  }

  if (!allMessages.length) return [];

  const messages = [];
  for (const msg of allMessages.slice(0, maxResults)) {
    const msgRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (msgRes.ok) messages.push(await msgRes.json());
  }
  return messages;
}

async function markAsRead(accessToken: string, messageId: string) {
  await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ removeLabelIds: ['UNREAD'] }),
  });
}

function base64UrlDecode(data: string): string {
  // Workers don't have Buffer, use atob with base64url → base64 conversion
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  return atob(padded);
}

function extractGmailBody(message: any): { subject: string; from: string; body: string; html: string } {
  const headers = message.payload?.headers || [];
  const subject = headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || '';
  const from = headers.find((h: any) => h.name.toLowerCase() === 'from')?.value || '';

  let textBody = '';
  let htmlBody = '';

  function walkParts(part: any) {
    if (part.mimeType === 'text/plain' && part.body?.data) {
      textBody += base64UrlDecode(part.body.data);
    }
    if (part.mimeType === 'text/html' && part.body?.data) {
      htmlBody += base64UrlDecode(part.body.data);
    }
    if (part.parts) part.parts.forEach(walkParts);
  }

  walkParts(message.payload || {});
  if (!textBody && htmlBody) {
    textBody = htmlBody.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  return { subject, from, body: textBody, html: htmlBody };
}

// Skip patterns for non-work-order emails
const SKIP_SENDER_PATTERNS = [
  /noreply|no-reply|no\.reply|donotreply|mailer-daemon/i,
  /google\.com|firebase|onesignal|usercentrics|courier\.com/i,
  /mailchimp|sendgrid|twilio|base44|hubspot|intercom/i,
  /zendesk|freshdesk|slack|github|gitlab|bitbucket/i,
  /team@|news@|info@|hello@|support@|digest@|updates@/i,
  /stripe\.com|paypal\.com|xero\.com|quickbooks|invoiced\.com/i,
  /no-?reply@.*microsoft|no-?reply@.*apple\.com|@amazon\.com/i,
];
const SKIP_SUBJECT_PATTERNS = [
  /verify your email|confirm your|welcome to|get started/i,
  /your .* account|password reset|security alert|sign-in|login/i,
  /indexed on site|google presence|search console/i,
  /unlock .* features|expires soon|quick wins|level up|off your|discount/i,
  /missed this|don.t miss|act now|limited time|free trial/i,
  /payment .* unsuccessful|payment failed|your receipt from|billing statement/i,
  /^outlook test message$|^microsoft outlook test/i,
  /\$[0-9]+\.?[0-9]* payment|subscription renewal|auto-renew/i,
];

// ─── Notification content builder (ported from send-tenant) ──────────────────

function buildNotificationContent(
  type: string,
  data: any,
  opts?: { hasForm9?: boolean },
): { smsBody: string; emailSubject: string; emailHtml: string } {
  const { tenantName, propertyAddress, scheduledDate, scheduledTime, jobId, techName, companyPhone, newEta } = data;
  const firstName = (tenantName || 'Tenant').split(' ')[0];
  const dateStr = scheduledDate || 'TBD';
  const timeStr = scheduledTime || 'TBD';
  const phone = companyPhone || '1300 WIREZ US';

  // ── Branded HTML email wrapper ────────────────────────────────────────────
  const emailWrap = (accentColor: string, headerTitle: string, headerSubtitle: string, bodyHtml: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Wirez R Us</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);">

  <!-- Amber accent top bar -->
  <tr><td style="background:#F5A623;height:4px;font-size:0;">&nbsp;</td></tr>

  <!-- Header -->
  <tr><td style="background:#1a1a2e;padding:28px 32px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td valign="middle">
          <div style="font-size:22px;font-weight:bold;color:#ffffff;letter-spacing:-0.5px;line-height:1;">Wirez R Us</div>
          <div style="font-size:11px;color:#F5A623;margin-top:4px;letter-spacing:0.5px;text-transform:uppercase;">Licensed Electrical Contractors</div>
        </td>
        <td align="right" valign="middle">
          <div style="font-size:11px;color:rgba(255,255,255,0.45);">${phone}</div>
          <div style="font-size:10px;color:rgba(255,255,255,0.3);margin-top:2px;">wirezapp.au</div>
        </td>
      </tr>
      <tr><td colspan="2" style="padding-top:20px;border-top:1px solid rgba(255,255,255,0.08);margin-top:20px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <div style="display:inline-block;background:${accentColor};width:32px;height:3px;border-radius:2px;margin-bottom:10px;"></div>
              <div style="font-size:20px;font-weight:bold;color:#ffffff;line-height:1.2;">${headerTitle}</div>
              <div style="font-size:13px;color:rgba(255,255,255,0.6);margin-top:6px;">${headerSubtitle}</div>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </td></tr>

  <!-- Body -->
  <tr><td style="background:#ffffff;padding:32px;">
    ${bodyHtml}
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#0f172a;padding:20px 32px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td>
          <div style="font-size:13px;color:#F5A623;font-weight:bold;">Wirez R Us</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:3px;">Licensed Electrical Contractors</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:2px;">${phone} &nbsp;·&nbsp; wirezapp.au</div>
        </td>
        <td align="right" valign="bottom">
          <div style="font-size:10px;color:rgba(255,255,255,0.2);">This email was sent by Wirez R Us scheduling system.<br>Please do not reply directly to automated notifications.</div>
        </td>
      </tr>
    </table>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  // ── Info card component ───────────────────────────────────────────────────
  const infoCard = (label: string, value: string, icon = '') =>
    `<table width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0;">
      <tr>
        <td style="background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #F5A623;border-radius:0 8px 8px 0;padding:14px 16px;">
          <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px;">${icon} ${label}</div>
          <div style="font-size:15px;font-weight:bold;color:#1a1a2e;">${value}</div>
        </td>
      </tr>
    </table>`;

  // ── Alert box ─────────────────────────────────────────────────────────────
  const alertBox = (bg: string, border: string, textColor: string, content: string) =>
    `<table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
      <tr>
        <td style="background:${bg};border:1px solid ${border};border-radius:8px;padding:14px 16px;color:${textColor};font-size:13px;">
          ${content}
        </td>
      </tr>
    </table>`;

  switch (type) {
    case 'schedule_confirmation':
      return {
        smsBody: `Hi ${firstName}, your appointment with Wirez R Us has been scheduled for ${dateStr} between ${timeStr}. Please reply Y to confirm or N to reschedule. ${phone}`,
        emailSubject: `Appointment Confirmed — ${dateStr} | Wirez R Us`,
        emailHtml: emailWrap(
          '#F5A623',
          'Appointment Confirmed',
          `${dateStr} &nbsp;·&nbsp; ${timeStr}`,
          `<p style="color:#475569;font-size:15px;margin:0 0 20px;">Hi <strong>${firstName}</strong>,</p>
          <p style="color:#475569;font-size:14px;margin:0 0 20px;">Your electrical appointment with Wirez R Us has been confirmed. Please keep this email for your records.</p>
          ${infoCard('Date & Time', `${dateStr} &nbsp;&nbsp; ${timeStr}`, '&#128197;')}
          ${infoCard('Property', propertyAddress || 'As advised', '&#127968;')}
          ${techName ? infoCard('Your Technician', techName, '&#128296;') : ''}
          ${alertBox('#fffbeb', '#fde68a', '#78350f',
            `<strong style="color:#92400e;">&#128203; Please prepare for your appointment:</strong>
            <ul style="margin:8px 0 0;padding-left:20px;line-height:1.9;">
              <li>Ensure clear access to the property at the scheduled time</li>
              <li>Restrain or remove all pets (dogs especially)</li>
              <li>An adult (18+) must be present unless key consent has been given</li>
              <li>Ensure the electricity switchboard is accessible</li>
            </ul>`
          )}
          ${opts?.hasForm9 ? alertBox('#f0fdf4', '#bbf7d0', '#166534',
            `<strong>&#128206; Form 9 Entry Notice Attached</strong><br>
            <span style="font-size:12px;margin-top:4px;display:block;">A Form 9 Entry Notice is attached to this email as required under the Residential Tenancies Act. Please review it and keep a copy for your records.</span>`
          ) : ''}
          <p style="color:#94a3b8;font-size:12px;margin:24px 0 0;border-top:1px solid #f1f5f9;padding-top:16px;">
            Need to reschedule? Call <strong style="color:#475569;">${phone}</strong> or reply to this email at least 24 hours before your appointment.
          </p>`,
        ),
      };

    case 'reminder_day_before':
      return {
        smsBody: `Reminder: Wirez R Us is attending ${propertyAddress || 'your property'} tomorrow ${dateStr} between ${timeStr}. Please ensure access is available. Reply N to reschedule. ${phone}`,
        emailSubject: `Reminder: Your Appointment Tomorrow — ${dateStr} | Wirez R Us`,
        emailHtml: emailWrap(
          '#F5A623',
          'Appointment Reminder',
          'Your appointment is tomorrow',
          `<p style="color:#475569;font-size:15px;margin:0 0 20px;">Hi <strong>${firstName}</strong>,</p>
          <p style="color:#475569;font-size:14px;margin:0 0 20px;">Just a friendly reminder — we'll be attending your property <strong>tomorrow</strong>.</p>
          ${infoCard('Date & Time', `${dateStr} &nbsp;&nbsp; ${timeStr}`, '&#128197;')}
          ${infoCard('Property', propertyAddress || 'As advised', '&#127968;')}
          ${techName ? infoCard('Your Technician', techName, '&#128296;') : ''}
          ${alertBox('#fef3c7', '#fde68a', '#78350f',
            `<strong style="color:#92400e;">&#9888; Before we arrive, please ensure:</strong>
            <ul style="margin:8px 0 0;padding-left:20px;line-height:1.9;">
              <li>Access to the property is available at the scheduled time</li>
              <li>All pets are restrained or removed from the property</li>
              <li>An adult (18+) is present, or key consent has been arranged</li>
            </ul>`
          )}
          <p style="color:#94a3b8;font-size:12px;margin:24px 0 0;border-top:1px solid #f1f5f9;padding-top:16px;">
            Need to reschedule? Please call <strong style="color:#475569;">${phone}</strong> as soon as possible.
          </p>`,
        ),
      };

    case 'reminder_1hr_before':
      return {
        smsBody: `Wirez R Us: We'll be arriving at ${propertyAddress || 'your property'} within the next hour. Please ensure access is available. ${phone}`,
        emailSubject: `We're On Our Way — Arriving Soon | Wirez R Us`,
        emailHtml: emailWrap(
          '#10b981',
          "We're On Our Way!",
          'Arriving within the next hour',
          `<p style="color:#475569;font-size:15px;margin:0 0 20px;">Hi <strong>${firstName}</strong>,</p>
          <p style="color:#475569;font-size:14px;margin:0 0 20px;">Our technician is on the way and will arrive at your property within the <strong>next hour</strong>.</p>
          ${infoCard('Property', propertyAddress || 'As advised', '&#127968;')}
          ${techName ? infoCard('Your Technician', techName, '&#128296;') : ''}
          ${alertBox('#f0fdf4', '#bbf7d0', '#166534',
            `<strong>&#9989; Last-minute checklist:</strong>
            <ul style="margin:8px 0 0;padding-left:20px;line-height:1.9;">
              <li>Ensure access to the property is available now</li>
              <li>Secure or remove any pets</li>
              <li>Have someone available to let our technician in</li>
            </ul>`
          )}
          <p style="color:#94a3b8;font-size:12px;margin:24px 0 0;border-top:1px solid #f1f5f9;padding-top:16px;">
            Any issues? Call us immediately on <strong style="color:#475569;">${phone}</strong>.
          </p>`,
        ),
      };

    case 'reschedule_key_consent':
      return {
        smsBody: `Wirez R Us: If you're not available to be home, do you give consent for us to collect keys from the Real Estate Agent? Please also ensure no dogs are left unrestrained. Reply Y for consent or N to reschedule. ${phone}`,
        emailSubject: `Action Required: Key Collection Consent | Wirez R Us`,
        emailHtml: emailWrap(
          '#6366f1',
          'Action Required',
          'Key collection consent needed',
          `<p style="color:#475569;font-size:15px;margin:0 0 20px;">Hi <strong>${firstName}</strong>,</p>
          <p style="color:#475569;font-size:14px;margin:0 0 20px;">We understand you may not be available at the property during your scheduled appointment. We'd like to confirm whether you're comfortable with us collecting keys from your Real Estate Agent.</p>
          ${infoCard('Date & Time', `${dateStr} &nbsp;&nbsp; ${timeStr}`, '&#128197;')}
          ${infoCard('Property', propertyAddress || 'As advised', '&#127968;')}
          ${alertBox('#fef2f2', '#fecaca', '#991b1b',
            `<strong style="color:#dc2626;">&#128016; Important — Pets:</strong><br>
            <span style="font-size:13px;">Please ensure <strong>no dogs or animals are left unrestrained</strong> in the property during our visit for the safety of all parties.</span>`
          )}
          ${alertBox('#eff6ff', '#bfdbfe', '#1e40af',
            `<strong>Do you give consent for Wirez R Us to:</strong>
            <ul style="margin:8px 0 0;padding-left:20px;line-height:1.9;">
              <li>Collect keys from your Real Estate Agent</li>
              <li>Access the property to complete the electrical work</li>
            </ul>`
          )}
          <p style="color:#475569;font-size:14px;margin:20px 0;">
            Please reply to this email with <strong>YES</strong> or <strong>NO</strong>, or call us at <strong>${phone}</strong>.
          </p>`,
        ),
      };

    case 'running_late': {
      const eta = newEta || 'shortly';
      return {
        smsBody: `Wirez R Us: Sorry, we're running a bit behind schedule. We now expect to arrive at ${propertyAddress || 'your property'} ${eta}. We apologise for any inconvenience. ${phone}`,
        emailSubject: `Updated Arrival Time | Wirez R Us`,
        emailHtml: emailWrap(
          '#f59e0b',
          'Running Slightly Behind',
          'Updated arrival time for your appointment',
          `<p style="color:#475569;font-size:15px;margin:0 0 20px;">Hi <strong>${firstName}</strong>,</p>
          <p style="color:#475569;font-size:14px;margin:0 0 20px;">We sincerely apologise — our technician is running a little behind schedule today.</p>
          ${infoCard('Property', propertyAddress || 'As advised', '&#127968;')}
          ${infoCard('Updated ETA', eta, '&#128336;')}
          ${alertBox('#fffbeb', '#fde68a', '#78350f',
            `We appreciate your patience and understanding. Our technician is still on the way and will be with you as soon as possible.`
          )}
          <p style="color:#94a3b8;font-size:12px;margin:24px 0 0;border-top:1px solid #f1f5f9;padding-top:16px;">
            Questions? Call us on <strong style="color:#475569;">${phone}</strong>.
          </p>`,
        ),
      };
    }

    default:
      return {
        smsBody: `Wirez R Us notification regarding your appointment. Please call ${phone} for details.`,
        emailSubject: `Wirez R Us — Notification`,
        emailHtml: emailWrap(
          '#F5A623',
          'Notification',
          'Regarding your appointment',
          `<p style="color:#475569;">Hi ${firstName},</p>
          <p style="color:#475569;">We have an update regarding your appointment at <strong>${propertyAddress || 'your property'}</strong>. Please call us at <strong>${phone}</strong> for details.</p>`,
        ),
      };
  }
}

// ─── Stripe HMAC-SHA256 signature verification ──────────────────────────────

async function verifyStripeSignature(rawBody: string, sigHeader: string, secret: string): Promise<any> {
  const parts = sigHeader.split(',');
  let timestamp = '';
  let signatures: string[] = [];

  for (const part of parts) {
    const [key, value] = part.split('=');
    if (key === 't') timestamp = value;
    if (key === 'v1') signatures.push(value);
  }

  if (!timestamp || signatures.length === 0) {
    throw new Error('Invalid Stripe signature header');
  }

  // Check timestamp tolerance (5 minutes)
  const ts = parseInt(timestamp, 10);
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > 300) {
    throw new Error('Stripe webhook timestamp too old');
  }

  const payload = `${timestamp}.${rawBody}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const hex = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');

  if (!signatures.includes(hex)) {
    throw new Error('Stripe webhook signature verification failed');
  }

  return JSON.parse(rawBody);
}

// ─── Stripe API helper ──────────────────────────────────────────────────────

async function stripeRequest(method: string, path: string, apiKey: string, body?: Record<string, string>): Promise<any> {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${apiKey}`,
  };
  const opts: RequestInit = { method, headers };

  if (body) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    opts.body = new URLSearchParams(body).toString();
  }

  const res = await fetch(`https://api.stripe.com/v1${path}`, opts);
  const data = await res.json();
  if (!res.ok) throw new Error((data as any).error?.message || `Stripe API error: ${res.status}`);
  return data;
}

// ============================================================================
// APP SETUP
// ============================================================================

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// ─── CORS ────────────────────────────────────────────────────────────────────

const ALLOWED_ORIGINS = [
  'https://wirezapp.au',
  'https://www.wirezapp.au',
  'https://api.wirezapp.au',
  'https://wires-r-us.pages.dev',
];

function isAllowedOrigin(origin: string): boolean {
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (/^https:\/\/[\w-]+\.wires-r-us\.pages\.dev$/.test(origin)) return true;
  if (/^http:\/\/localhost(:\d+)?$/.test(origin)) return true;
  return false;
}

app.use('*', cors({
  origin: (origin) => {
    if (origin && isAllowedOrigin(origin)) return origin;
    return '';
  },
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length'],
  maxAge: 86400,
}));

// ─── Auth middleware ─────────────────────────────────────────────────────────
// Skip auth for specific routes

const PUBLIC_PATHS = [
  '/api/health',
  '/api/stripe/webhook',
  '/api/webhooks/email',
  '/api/email/poll-inbox',
  '/api/sms/status',
  '/api/stripe/status',
];

app.use('/api/*', async (c, next) => {
  const path = new URL(c.req.url).pathname;

  // Skip auth for public endpoints
  if (PUBLIC_PATHS.some((p) => path === p)) {
    return next();
  }

  // Skip auth for upload PUT and GET — PUT uses raw fetch (no token), GET is for <img> tags
  if ((c.req.method === 'GET' || c.req.method === 'PUT') && path.startsWith('/api/uploads/')) {
    return next();
  }

  // Also skip OPTIONS (CORS preflight)
  if (c.req.method === 'OPTIONS') {
    return next();
  }

  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing authorization token' }, 401);
  }

  const token = authHeader.slice(7);

  try {
    // Clerk session tokens are JWTs — decode and verify via JWKS
    const parts = token.split('.');
    if (parts.length !== 3) {
      return c.json({ error: 'Invalid token format' }, 401);
    }

    // Decode header and payload
    const headerStr = base64UrlDecode(parts[0]);
    const header = JSON.parse(headerStr);
    const payloadStr = base64UrlDecode(parts[1]);
    const payload = JSON.parse(payloadStr);

    // Check token expiry
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return c.json({ error: 'Token expired' }, 401);
    }

    // Check not-before
    if (payload.nbf && payload.nbf > Math.floor(Date.now() / 1000) + 60) {
      return c.json({ error: 'Token not yet valid' }, 401);
    }

    const userId = payload.sub;
    if (!userId) {
      return c.json({ error: 'Invalid token: no subject' }, 401);
    }

    // Verify signature via Clerk JWKS
    const issuer = payload.iss; // e.g. https://sensible-mastiff-39.clerk.accounts.dev
    if (issuer) {
      try {
        const jwksUrl = `${issuer}/.well-known/jwks.json`;
        const jwksRes = await fetch(jwksUrl);
        if (jwksRes.ok) {
          const jwks: any = await jwksRes.json();
          const key = jwks.keys?.find((k: any) => k.kid === header.kid) || jwks.keys?.[0];
          if (key) {
            const cryptoKey = await crypto.subtle.importKey(
              'jwk', key, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']
            );
            // Properly decode base64url signature with padding
            const sigBase64 = parts[2].replace(/-/g, '+').replace(/_/g, '/');
            const sigPadded = sigBase64 + '='.repeat((4 - (sigBase64.length % 4)) % 4);
            const sigBinary = atob(sigPadded);
            const signatureBytes = new Uint8Array(sigBinary.length);
            for (let i = 0; i < sigBinary.length; i++) signatureBytes[i] = sigBinary.charCodeAt(i);
            const dataBytes = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
            const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', cryptoKey, signatureBytes, dataBytes);
            if (!valid) {
              console.error('[Auth] JWKS signature verification failed');
              return c.json({ error: 'Invalid token signature' }, 401);
            }
          }
        }
      } catch (jwksErr: any) {
        // JWKS verification failed — log but don't block (token payload already validated)
        console.warn('[Auth] JWKS verification error (proceeding with payload):', jwksErr.message);
      }
    }

    // Look up user profile in D1
    const profile = await c.env.DB.prepare('SELECT * FROM user_profiles WHERE uid = ?').bind(userId).first();
    c.set('user', {
      userId,
      email: payload.email || payload.email_address || (profile as any)?.email || '',
      role: (profile as any)?.role || 'tech',
      tenantId: (profile as any)?.tenant_id || null,
    });
    return next();
  } catch (err: any) {
    console.error('[Auth] Token verification error:', err.message);
    return c.json({ error: 'Authentication failed' }, 401);
  }
});

// ============================================================================
// JOBS CRUD
// ============================================================================

// GET /api/jobs — list all jobs with nested arrays
app.get('/api/jobs', async (c) => {
  try {
    const { results: jobs } = await c.env.DB.prepare('SELECT * FROM jobs ORDER BY created_at DESC').all();

    // Batch-fetch all child data
    const jobIds = jobs.map((j: any) => j.id as string);
    if (jobIds.length === 0) return c.json([]);

    // For efficiency, fetch all child rows and group by job_id
    const [allContacts, allTime, allMaterials, allPhotos, allMisc, allAlarms] = await Promise.all([
      c.env.DB.prepare('SELECT * FROM job_contact_attempts').all(),
      c.env.DB.prepare('SELECT * FROM job_time_entries').all(),
      c.env.DB.prepare('SELECT * FROM job_materials').all(),
      c.env.DB.prepare('SELECT * FROM job_photos').all(),
      c.env.DB.prepare('SELECT * FROM job_misc_charges').all(),
      c.env.DB.prepare('SELECT * FROM job_smoke_alarms').all(),
    ]);

    const group = (rows: any[]) => {
      const map: Record<string, any[]> = {};
      for (const r of rows) { (map[r.job_id] ||= []).push(r); }
      return map;
    };

    const contactMap = group(allContacts.results as any[]);
    const timeMap = group(allTime.results as any[]);
    const materialMap = group(allMaterials.results as any[]);
    const photoMap = group(allPhotos.results as any[]);
    const miscMap = group(allMisc.results as any[]);
    const alarmMap = group(allAlarms.results as any[]);

    const result = jobs.map((job: any) => {
      const j = toCamelCase(job)!;
      j.contactAttempts = rowsToCamel(contactMap[job.id] || []);
      j.timeLog = rowsToCamel(timeMap[job.id] || []);
      j.materials = rowsToCamel(materialMap[job.id] || []);
      j.photos = (photoMap[job.id] || []).map((p: any) => p.url);
      j.miscCharges = rowsToCamel(miscMap[job.id] || []);
      j.smokeAlarms = rowsToCamel(alarmMap[job.id] || []);
      return j;
    });

    return c.json(result);
  } catch (err: any) {
    console.error('[GET /api/jobs]', err.message);
    return c.json({ error: err.message }, 500);
  }
});

// GET /api/jobs/:id — single job with all nested data
app.get('/api/jobs/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const job = await c.env.DB.prepare('SELECT * FROM jobs WHERE id = ?').bind(id).first();
    if (!job) return c.json({ error: 'Job not found' }, 404);
    const result = await attachJobChildren(c.env.DB, job as Record<string, unknown>);
    return c.json(result);
  } catch (err: any) {
    console.error('[GET /api/jobs/:id]', err.message);
    return c.json({ error: err.message }, 500);
  }
});

// POST /api/jobs — create job
app.post('/api/jobs', async (c) => {
  try {
    const body = await c.req.json();
    const { scalar, children } = separateJobChildren(body);
    const snakeData = toSnakeCase(scalar);
    if (!snakeData.id) snakeData.id = generateId();
    if (!snakeData.created_at) snakeData.created_at = new Date().toISOString();
    if (!snakeData.status) snakeData.status = 'INTAKE';

    // Sanitize FK fields: empty strings → null to avoid FK constraint violations
    if (snakeData.assigned_electrician_id === '') snakeData.assigned_electrician_id = null;

    const { sql, params } = buildInsert('jobs', snakeData);
    await c.env.DB.prepare(sql).bind(...params).run();

    await insertJobChildren(c.env.DB, snakeData.id as string, children);

    const job = await c.env.DB.prepare('SELECT * FROM jobs WHERE id = ?').bind(snakeData.id).first();
    const result = await attachJobChildren(c.env.DB, job as Record<string, unknown>);
    return c.json(result, 201);
  } catch (err: any) {
    console.error('[POST /api/jobs]', err.message, err.stack);
    return c.json({ error: err.message || 'Unknown server error' }, 500);
  }
});

// PATCH /api/jobs/:id — update job fields
app.patch('/api/jobs/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { scalar, children } = separateJobChildren(body);

    if (Object.keys(scalar).length > 0) {
      const snakeData = toSnakeCase(scalar);
      // Sanitize FK fields: empty strings → null
      if (snakeData.assigned_electrician_id === '') snakeData.assigned_electrician_id = null;
      const { sql, params } = buildUpdate('jobs', snakeData, 'id', id);
      await c.env.DB.prepare(sql).bind(...params).run();
    }

    if (Object.keys(children).length > 0) {
      await replaceJobChildren(c.env.DB, id, children);
    }

    const job = await c.env.DB.prepare('SELECT * FROM jobs WHERE id = ?').bind(id).first();
    if (!job) return c.json({ error: 'Job not found' }, 404);
    const result = await attachJobChildren(c.env.DB, job as Record<string, unknown>);
    return c.json(result);
  } catch (err: any) {
    console.error('[PATCH /api/jobs/:id]', err.message);
    return c.json({ error: err.message }, 500);
  }
});

// DELETE /api/jobs/:id — delete job and all child rows
app.delete('/api/jobs/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await Promise.all([
      c.env.DB.prepare('DELETE FROM job_contact_attempts WHERE job_id = ?').bind(id).run(),
      c.env.DB.prepare('DELETE FROM job_time_entries WHERE job_id = ?').bind(id).run(),
      c.env.DB.prepare('DELETE FROM job_materials WHERE job_id = ?').bind(id).run(),
      c.env.DB.prepare('DELETE FROM job_photos WHERE job_id = ?').bind(id).run(),
      c.env.DB.prepare('DELETE FROM job_misc_charges WHERE job_id = ?').bind(id).run(),
      c.env.DB.prepare('DELETE FROM job_smoke_alarms WHERE job_id = ?').bind(id).run(),
    ]);
    await c.env.DB.prepare('DELETE FROM jobs WHERE id = ?').bind(id).run();
    return c.json({ success: true });
  } catch (err: any) {
    console.error('[DELETE /api/jobs/:id]', err.message);
    return c.json({ error: err.message }, 500);
  }
});

// ============================================================================
// ELECTRICIANS CRUD
// ============================================================================

app.get('/api/electricians', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM electricians').all();
    return c.json(rowsToCamel(results as Record<string, unknown>[]));
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/electricians', async (c) => {
  try {
    const body = await c.req.json();
    const data = toSnakeCase(body);
    if (!data.id) data.id = generateId();
    const { sql, params } = buildInsert('electricians', data);
    await c.env.DB.prepare(sql).bind(...params).run();
    const row = await c.env.DB.prepare('SELECT * FROM electricians WHERE id = ?').bind(data.id).first();
    return c.json(toCamelCase(row as Record<string, unknown>), 201);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.patch('/api/electricians/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const data = toSnakeCase(body);
    const { sql, params } = buildUpdate('electricians', data, 'id', id);
    await c.env.DB.prepare(sql).bind(...params).run();
    const row = await c.env.DB.prepare('SELECT * FROM electricians WHERE id = ?').bind(id).first();
    return c.json(toCamelCase(row as Record<string, unknown>));
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.delete('/api/electricians/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM electricians WHERE id = ?').bind(id).run();
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ============================================================================
// PARTS CATALOG CRUD
// ============================================================================

app.get('/api/parts-catalog', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM parts_catalog').all();
    return c.json(rowsToCamel(results as Record<string, unknown>[]));
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/parts-catalog', async (c) => {
  try {
    const body = await c.req.json();
    const data = toSnakeCase(body);
    if (!data.id) data.id = generateId();
    // Upsert by id
    const existing = await c.env.DB.prepare('SELECT id FROM parts_catalog WHERE id = ?').bind(data.id).first();
    if (existing) {
      const { sql, params } = buildUpdate('parts_catalog', data, 'id', data.id);
      await c.env.DB.prepare(sql).bind(...params).run();
    } else {
      const { sql, params } = buildInsert('parts_catalog', data);
      await c.env.DB.prepare(sql).bind(...params).run();
    }
    const row = await c.env.DB.prepare('SELECT * FROM parts_catalog WHERE id = ?').bind(data.id).first();
    return c.json(toCamelCase(row as Record<string, unknown>), 201);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.delete('/api/parts-catalog/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM parts_catalog WHERE id = ?').bind(id).run();
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ============================================================================
// TECH STOCK CRUD
// ============================================================================

app.get('/api/tech-stock', async (c) => {
  try {
    const techId = c.req.query('technicianId');
    let query = 'SELECT * FROM tech_stock';
    const binds: string[] = [];
    if (techId) {
      query += ' WHERE technician_id = ?';
      binds.push(techId);
    }
    const stmt = binds.length ? c.env.DB.prepare(query).bind(...binds) : c.env.DB.prepare(query);
    const { results } = await stmt.all();
    return c.json(rowsToCamel(results as Record<string, unknown>[]));
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/tech-stock', async (c) => {
  try {
    const body = await c.req.json();
    const data = toSnakeCase(body);
    if (!data.id) data.id = generateId();
    data.last_updated = new Date().toISOString();
    // Upsert
    const existing = await c.env.DB.prepare('SELECT id FROM tech_stock WHERE id = ?').bind(data.id).first();
    if (existing) {
      const { sql, params } = buildUpdate('tech_stock', data, 'id', data.id);
      await c.env.DB.prepare(sql).bind(...params).run();
    } else {
      const { sql, params } = buildInsert('tech_stock', data);
      await c.env.DB.prepare(sql).bind(...params).run();
    }
    const row = await c.env.DB.prepare('SELECT * FROM tech_stock WHERE id = ?').bind(data.id).first();
    return c.json(toCamelCase(row as Record<string, unknown>), 201);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.patch('/api/tech-stock/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const data = toSnakeCase(body);
    data.last_updated = new Date().toISOString();
    const { sql, params } = buildUpdate('tech_stock', data, 'id', id);
    await c.env.DB.prepare(sql).bind(...params).run();
    const row = await c.env.DB.prepare('SELECT * FROM tech_stock WHERE id = ?').bind(id).first();
    return c.json(toCamelCase(row as Record<string, unknown>));
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.delete('/api/tech-stock/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM tech_stock WHERE id = ?').bind(id).run();
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ============================================================================
// STOCK MOVEMENTS
// ============================================================================

app.post('/api/stock-movements', async (c) => {
  try {
    const body = await c.req.json();
    const data = toSnakeCase(body);
    if (!data.id) data.id = generateId();
    if (!data.timestamp) data.timestamp = new Date().toISOString();
    const { sql, params } = buildInsert('stock_movements', data);
    await c.env.DB.prepare(sql).bind(...params).run();
    const row = await c.env.DB.prepare('SELECT * FROM stock_movements WHERE id = ?').bind(data.id).first();
    return c.json(toCamelCase(row as Record<string, unknown>), 201);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ============================================================================
// TECH LOCATIONS
// ============================================================================

app.get('/api/tech-locations', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM tech_locations').all();
    return c.json(rowsToCamel(results as Record<string, unknown>[]));
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/tech-locations', async (c) => {
  try {
    const body = await c.req.json();
    const data = toSnakeCase(body);
    if (!data.updated_at) data.updated_at = new Date().toISOString();
    // Upsert by uid
    const existing = await c.env.DB.prepare('SELECT uid FROM tech_locations WHERE uid = ?').bind(data.uid).first();
    if (existing) {
      const { sql, params } = buildUpdate('tech_locations', data, 'uid', data.uid);
      await c.env.DB.prepare(sql).bind(...params).run();
    } else {
      const { sql, params } = buildInsert('tech_locations', data);
      await c.env.DB.prepare(sql).bind(...params).run();
    }
    const row = await c.env.DB.prepare('SELECT * FROM tech_locations WHERE uid = ?').bind(data.uid).first();
    return c.json(toCamelCase(row as Record<string, unknown>));
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ============================================================================
// SETTINGS
// ============================================================================

app.get('/api/settings/:key', async (c) => {
  try {
    const key = c.req.param('key');
    const row = await c.env.DB.prepare('SELECT * FROM settings WHERE key = ?').bind(key).first();
    if (!row) return c.json({ key, value: null });
    return c.json({ key: (row as any).key, value: (row as any).value });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/settings/:key', async (c) => {
  try {
    const key = c.req.param('key');
    const body = await c.req.json();
    const value = typeof body.value === 'string' ? body.value : JSON.stringify(body.value);
    const existing = await c.env.DB.prepare('SELECT key FROM settings WHERE key = ?').bind(key).first();
    if (existing) {
      await c.env.DB.prepare('UPDATE settings SET value = ? WHERE key = ?').bind(value, key).run();
    } else {
      await c.env.DB.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').bind(key, value).run();
    }
    return c.json({ key, value });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ============================================================================
// TENANTS CRUD
// ============================================================================

app.get('/api/tenants', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM tenants').all();
    return c.json(rowsToCamel(results as Record<string, unknown>[]));
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/tenants', async (c) => {
  try {
    const body = await c.req.json();
    const data = toSnakeCase(body);
    if (!data.id) data.id = generateId();
    if (!data.created_at) data.created_at = new Date().toISOString();
    const { sql, params } = buildInsert('tenants', data);
    await c.env.DB.prepare(sql).bind(...params).run();
    const row = await c.env.DB.prepare('SELECT * FROM tenants WHERE id = ?').bind(data.id).first();
    return c.json(toCamelCase(row as Record<string, unknown>), 201);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.patch('/api/tenants/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const data = toSnakeCase(body);
    const { sql, params } = buildUpdate('tenants', data, 'id', id);
    await c.env.DB.prepare(sql).bind(...params).run();
    const row = await c.env.DB.prepare('SELECT * FROM tenants WHERE id = ?').bind(id).first();
    return c.json(toCamelCase(row as Record<string, unknown>));
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.delete('/api/tenants/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM tenants WHERE id = ?').bind(id).run();
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ============================================================================
// USER PROFILES CRUD
// ============================================================================

app.get('/api/user-profiles', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM user_profiles').all();
    return c.json(rowsToCamel(results as Record<string, unknown>[]));
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.get('/api/user-profiles/:uid', async (c) => {
  try {
    const uid = c.req.param('uid');
    const row = await c.env.DB.prepare('SELECT * FROM user_profiles WHERE uid = ?').bind(uid).first();
    if (!row) return c.json({ error: 'User profile not found' }, 404);
    return c.json(toCamelCase(row as Record<string, unknown>));
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/user-profiles', async (c) => {
  try {
    const body = await c.req.json();
    const data = toSnakeCase(body);
    if (!data.created_at) data.created_at = new Date().toISOString();
    // Upsert by uid
    const existing = await c.env.DB.prepare('SELECT uid FROM user_profiles WHERE uid = ?').bind(data.uid).first();
    if (existing) {
      const { sql, params } = buildUpdate('user_profiles', data, 'uid', data.uid);
      await c.env.DB.prepare(sql).bind(...params).run();
    } else {
      const { sql, params } = buildInsert('user_profiles', data);
      await c.env.DB.prepare(sql).bind(...params).run();
    }
    const row = await c.env.DB.prepare('SELECT * FROM user_profiles WHERE uid = ?').bind(data.uid).first();
    return c.json(toCamelCase(row as Record<string, unknown>), 201);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.patch('/api/user-profiles/:uid', async (c) => {
  try {
    const uid = c.req.param('uid');
    const body = await c.req.json();
    const data = toSnakeCase(body);
    const { sql, params } = buildUpdate('user_profiles', data, 'uid', uid);
    await c.env.DB.prepare(sql).bind(...params).run();
    const row = await c.env.DB.prepare('SELECT * FROM user_profiles WHERE uid = ?').bind(uid).first();
    return c.json(toCamelCase(row as Record<string, unknown>));
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.delete('/api/user-profiles/:uid', async (c) => {
  try {
    const uid = c.req.param('uid');
    await c.env.DB.prepare('DELETE FROM user_profiles WHERE uid = ?').bind(uid).run();
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ============================================================================
// LICENSES CRUD
// ============================================================================

app.get('/api/licenses', async (c) => {
  try {
    const tenantId = c.req.query('tenantId');
    let query = 'SELECT * FROM licenses';
    const binds: string[] = [];
    if (tenantId) {
      query += ' WHERE tenant_id = ?';
      binds.push(tenantId);
    }
    const stmt = binds.length ? c.env.DB.prepare(query).bind(...binds) : c.env.DB.prepare(query);
    const { results } = await stmt.all();
    return c.json(rowsToCamel(results as Record<string, unknown>[]));
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/licenses', async (c) => {
  try {
    const body = await c.req.json();
    const data = toSnakeCase(body);
    if (!data.id) data.id = generateId();
    if (!data.created_at) data.created_at = new Date().toISOString();
    const { sql, params } = buildInsert('licenses', data);
    await c.env.DB.prepare(sql).bind(...params).run();
    const row = await c.env.DB.prepare('SELECT * FROM licenses WHERE id = ?').bind(data.id).first();
    return c.json(toCamelCase(row as Record<string, unknown>), 201);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.patch('/api/licenses/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const data = toSnakeCase(body);
    const { sql, params } = buildUpdate('licenses', data, 'id', id);
    await c.env.DB.prepare(sql).bind(...params).run();
    const row = await c.env.DB.prepare('SELECT * FROM licenses WHERE id = ?').bind(id).first();
    return c.json(toCamelCase(row as Record<string, unknown>));
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.delete('/api/licenses/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM licenses WHERE id = ?').bind(id).run();
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ============================================================================
// SMS (Twilio via fetch)
// ============================================================================

// ── Phone normaliser: 04xx → +614xx, handles spaces/dashes ──
function normaliseAuPhone(raw: string): string {
  let p = raw.replace(/[\s\-().]/g, '');
  if (p.startsWith('0')) p = '+61' + p.slice(1);
  if (!p.startsWith('+')) p = '+' + p;
  return p;
}

app.post('/api/sms/send', async (c) => {
  try {
    const { to, message } = await c.req.json();
    if (!to || !message) return c.json({ error: 'Missing "to" or "message"' }, 400);

    const sid = c.env.TWILIO_ACCOUNT_SID;
    const token = c.env.TWILIO_AUTH_TOKEN;
    const from = c.env.TWILIO_PHONE_NUMBER;

    if (!sid || !token || !from) {
      console.log(`[SMS Simulation] To: ${to} | ${message}`);
      return c.json({ success: true, simulated: true });
    }

    const toNorm = normaliseAuPhone(to);
    console.log(`[SMS] Sending to ${toNorm} from ${from}`);

    const twilioRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${sid}:${token}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: toNorm, From: from, Body: message }),
    });

    const resultData: any = await twilioRes.json();

    if (!twilioRes.ok) {
      const twilioMsg = resultData?.message || resultData?.error_message || `Twilio error ${twilioRes.status}`;
      console.error(`[SMS] Twilio error ${twilioRes.status}: ${twilioMsg}`);
      // Return 200 with error detail so frontend can show a helpful message
      return c.json({ success: false, error: twilioMsg, twilioCode: resultData?.code });
    }

    console.log(`[SMS Sent] To: ${toNorm} | SID: ${resultData.sid}`);
    return c.json({ success: true, simulated: false, sid: resultData.sid, to: toNorm });
  } catch (err: any) {
    console.error('[SMS] Error:', err.message);
    return c.json({ success: false, error: err.message }, 500);
  }
});

// GET /api/sms/status — check Twilio config
app.get('/api/sms/status', async (c) => {
  const configured = !!(c.env.TWILIO_ACCOUNT_SID && c.env.TWILIO_AUTH_TOKEN && c.env.TWILIO_PHONE_NUMBER);
  if (!configured) return c.json({ configured: false });
  // Quick account lookup to validate credentials
  try {
    const sid = c.env.TWILIO_ACCOUNT_SID;
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}.json`, {
      headers: { 'Authorization': 'Basic ' + btoa(`${sid}:${c.env.TWILIO_AUTH_TOKEN}`) }
    });
    const data: any = await res.json();
    return c.json({
      configured: true,
      valid: res.ok,
      friendlyName: data.friendly_name,
      type: data.type, // 'Trial' or 'Full'
      fromNumber: c.env.TWILIO_PHONE_NUMBER,
      error: res.ok ? undefined : (data.message || 'Auth failed'),
    });
  } catch (err: any) {
    return c.json({ configured: true, valid: false, error: err.message });
  }
});

app.post('/api/sms/test', async (c) => {
  try {
    const body = await c.req.json();
    const { to, accountSid, authToken, phoneNumber, fromNumber } = body;

    if (!to) return c.json({ error: 'Missing "to" phone number' }, 400);

    const sid = accountSid || c.env.TWILIO_ACCOUNT_SID;
    const token = authToken || c.env.TWILIO_AUTH_TOKEN;
    const from = fromNumber || phoneNumber || c.env.TWILIO_PHONE_NUMBER;

    if (!sid || !token || !from) {
      console.log(`[SMS Test Simulation] To: ${to}`);
      return c.json({ success: true, simulated: true, message: `Test SMS simulated to ${to} (no Twilio credentials configured)` });
    }

    const twilioRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${sid}:${token}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: to,
        From: from,
        Body: 'Wirez R Us — SMS gateway test. If you received this, your SMS integration is working correctly.',
      }),
    });

    if (!twilioRes.ok) {
      const errData: any = await twilioRes.json();
      throw new Error(errData.message || `Twilio error: ${twilioRes.status}`);
    }

    const result: any = await twilioRes.json();
    console.log(`[SMS Test] Sent to: ${to} | SID: ${result.sid}`);
    return c.json({ success: true, simulated: false, sid: result.sid });
  } catch (err: any) {
    console.error('[SMS Test] Error:', err.message);
    return c.json({ error: err.message }, 500);
  }
});

// ============================================================================
// STRIPE
// ============================================================================

// GET /api/stripe/status — check if Stripe key is configured and valid
app.get('/api/stripe/status', async (c) => {
  const key = c.env.STRIPE_SECRET_KEY;
  if (!key) return c.json({ configured: false, valid: false, mode: 'unknown' });
  const mode = key.startsWith('sk_live_') ? 'live' : 'test';
  try {
    await stripeRequest('GET', '/account', key);
    return c.json({ configured: true, valid: true, mode });
  } catch (err: any) {
    return c.json({ configured: true, valid: false, mode, error: err.message });
  }
});

// GET /api/stripe/plans — list Stripe prices
app.get('/api/stripe/plans', async (c) => {
  try {
    if (!c.env.STRIPE_SECRET_KEY) {
      return c.json({ plans: [], simulated: true });
    }
    const data = await stripeRequest('GET', '/prices?active=true&expand[]=data.product', c.env.STRIPE_SECRET_KEY);
    return c.json({ plans: data.data });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// POST /api/stripe/create-checkout-session
app.post('/api/stripe/create-checkout-session', async (c) => {
  try {
    if (!c.env.STRIPE_SECRET_KEY) return c.json({ error: 'Stripe is not configured.' }, 400);
    const { priceId } = await c.req.json();
    const appUrl = 'https://app.wirezapp.au';

    const data = await stripeRequest('POST', '/checkout/sessions', c.env.STRIPE_SECRET_KEY, {
      'payment_method_types[0]': 'card',
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      'mode': 'subscription',
      'success_url': `${appUrl}/billing?success=true`,
      'cancel_url': `${appUrl}/billing?canceled=true`,
    });
    return c.json({ sessionId: data.id });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// POST /api/stripe/create-payment-link
app.post('/api/stripe/create-payment-link', async (c) => {
  try {
    if (!c.env.STRIPE_SECRET_KEY) return c.json({ error: 'Stripe not configured' }, 500);
    const { jobId, amount, description, customerEmail } = await c.req.json();

    if (!jobId || !amount) return c.json({ error: 'jobId and amount are required' }, 400);

    const amountCents = Math.round(amount * 100).toString();

    // Create a product + price inline via payment link
    const params: Record<string, string> = {
      'line_items[0][price_data][currency]': 'aud',
      'line_items[0][price_data][product_data][name]': description || `Electrical Service - Job ${jobId}`,
      'line_items[0][price_data][product_data][description]': `Payment for job ${jobId}`,
      'line_items[0][price_data][unit_amount]': amountCents,
      'line_items[0][quantity]': '1',
      'metadata[jobId]': jobId,
      'metadata[source]': 'field_payment',
      'after_completion[type]': 'hosted_confirmation',
      'after_completion[hosted_confirmation][custom_message]': 'Thank you for your payment! Your receipt has been sent to your email.',
    };

    if (customerEmail) {
      params['customer_creation'] = 'always';
      params['invoice_creation[enabled]'] = 'true';
      params['invoice_creation[invoice_data][description]'] = `Electrical Service - Job ${jobId}`;
      params['invoice_creation[invoice_data][metadata][jobId]'] = jobId;
    }

    const data = await stripeRequest('POST', '/payment_links', c.env.STRIPE_SECRET_KEY, params);
    console.log(`[Stripe] Payment link created for job ${jobId}: ${data.url}`);
    return c.json({ success: true, paymentLinkUrl: data.url, paymentLinkId: data.id });
  } catch (err: any) {
    console.error('[Stripe] Payment link creation failed:', err.message);
    return c.json({ error: 'Failed to create payment link', details: err.message }, 500);
  }
});

// POST /api/jobs/:id/send-invoice — email PDF invoice + optional payment link to tenant
app.post('/api/jobs/:id/send-invoice', async (c) => {
  try {
    const id = c.req.param('id');
    const { pdfBase64, invoiceNumber, totalAmount, paymentLinkUrl, recipientEmail } = await c.req.json();

    const row = await c.env.DB.prepare('SELECT * FROM jobs WHERE id = ?').bind(id).first();
    if (!row) return c.json({ error: 'Job not found' }, 404);
    const job = toCamelCase(row as Record<string, unknown>) as any;

    const to = recipientEmail || job.tenantEmail;
    if (!to) return c.json({ error: 'No recipient email provided' }, 400);
    if (!c.env.RESEND_API_KEY) return c.json({ error: 'Email not configured' }, 500);

    const payBtn = paymentLinkUrl
      ? `<p style="text-align:center;margin:24px 0">
           <a href="${paymentLinkUrl}" style="background:#d97706;color:#fff;padding:14px 32px;border-radius:8px;font-weight:bold;text-decoration:none;font-size:16px">
             💳 Pay Now
           </a>
         </p>`
      : '';

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#1a1a2e;padding:24px;border-radius:8px 8px 0 0">
          <h1 style="color:#F5A623;margin:0;font-size:22px">WIREZ R US</h1>
          <p style="color:#94a3b8;margin:4px 0 0">Licensed Electrical Contractor</p>
        </div>
        <div style="background:#fff;padding:24px;border:1px solid #e2e8f0;border-top:none">
          <h2 style="color:#1e293b">Tax Invoice ${invoiceNumber}</h2>
          <p style="color:#475569">Hi ${job.tenantName || 'there'},</p>
          <p style="color:#475569">Please find your invoice attached for electrical work completed at:</p>
          <p style="color:#1e293b;font-weight:bold">${job.propertyAddress}</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr style="background:#f8fafc">
              <td style="padding:10px;border:1px solid #e2e8f0;font-weight:bold">Invoice No</td>
              <td style="padding:10px;border:1px solid #e2e8f0">${invoiceNumber}</td>
            </tr>
            <tr>
              <td style="padding:10px;border:1px solid #e2e8f0;font-weight:bold">Total Due</td>
              <td style="padding:10px;border:1px solid #e2e8f0;font-weight:bold;color:#d97706">$${Number(totalAmount).toFixed(2)}</td>
            </tr>
          </table>
          ${payBtn}
          <p style="color:#64748b;font-size:13px">The full invoice is attached as a PDF. Payment is due on completion.</p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0"/>
          <p style="color:#94a3b8;font-size:12px;text-align:center">
            Wirez R Us — Licensed Electrical Contractor<br/>
            Questions? Contact us at admin@wirezapp.au
          </p>
        </div>
      </div>`;

    const fromAddress = c.env.RESEND_FROM_EMAIL || 'Wirez R Us <onboarding@resend.dev>';
    const emailPayload: any = {
      from: fromAddress,
      to: [to],
      subject: `Tax Invoice ${invoiceNumber} — $${Number(totalAmount).toFixed(2)} due`,
      html,
    };
    if (pdfBase64) {
      emailPayload.attachments = [{
        filename: `${invoiceNumber}.pdf`,
        content: pdfBase64,
      }];
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${c.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(emailPayload),
    });
    if (!res.ok) {
      const err = await res.json() as any;
      const msg = err.message || err.name || 'Resend error';
      // Surface domain verification errors clearly
      if (msg.toLowerCase().includes('domain') || msg.toLowerCase().includes('verif')) {
        return c.json({ error: `Sending domain not verified with Resend. Go to resend.com/domains and verify your sending domain, then set RESEND_FROM_EMAIL as a worker secret. (${msg})` }, 500);
      }
      return c.json({ error: msg }, 500);
    }

    await c.env.DB.prepare(`UPDATE jobs SET finished_job_email_sent=1, finished_job_email_sent_at=?, finished_job_email_to=? WHERE id=?`)
      .bind(new Date().toISOString(), to, id).run();

    return c.json({ success: true, sentTo: to });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// POST /api/stripe/webhook — raw body, verify signature
app.post('/api/stripe/webhook', async (c) => {
  try {
    if (!c.env.STRIPE_SECRET_KEY || !c.env.STRIPE_WEBHOOK_SECRET) {
      return c.json({ error: 'Stripe is not configured.' }, 400);
    }

    const sig = c.req.header('stripe-signature');
    if (!sig) return c.json({ error: 'Missing Stripe signature' }, 400);

    const rawBody = await c.req.text();
    const event = await verifyStripeSignature(rawBody, sig, c.env.STRIPE_WEBHOOK_SECRET);

    const updateJobPayment = async (jobId: string, fields: Record<string, unknown>) => {
      const snakeFields = toSnakeCase(fields);
      const keys = Object.keys(snakeFields);
      const setClauses = keys.map((k) => `${k} = ?`).join(', ');
      await c.env.DB.prepare(`UPDATE jobs SET ${setClauses} WHERE id = ?`)
        .bind(...keys.map((k) => snakeFields[k] ?? null), jobId)
        .run();
    };

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        console.log('[Stripe Webhook] Payment successful for session:', session.id);
        const jobId = session.metadata?.jobId;
        if (jobId) {
          await updateJobPayment(jobId, {
            paymentStatus: 'paid',
            paidAt: new Date().toISOString(),
            paymentIntentId: session.payment_intent || '',
          });
          console.log(`[Stripe Webhook] Job ${jobId} marked as paid`);
        }
        break;
      }
      case 'charge.refunded': {
        const charge = event.data.object;
        console.log('[Stripe Webhook] Charge refunded:', charge.id);
        const jobId = charge.metadata?.jobId;
        if (jobId) {
          await updateJobPayment(jobId, { paymentStatus: 'refunded' });
          console.log(`[Stripe Webhook] Job ${jobId} marked as refunded`);
        }
        break;
      }
      case 'payment_intent.payment_failed': {
        const pi = event.data.object;
        console.log('[Stripe Webhook] Payment failed:', pi.id);
        const jobId = pi.metadata?.jobId;
        if (jobId) {
          await updateJobPayment(jobId, { paymentStatus: 'failed' });
          console.log(`[Stripe Webhook] Job ${jobId} marked as failed`);
        }
        break;
      }
      default:
        console.log(`[Stripe Webhook] Unhandled event type ${event.type}`);
    }

    return c.json({ received: true });
  } catch (err: any) {
    console.error('[Stripe Webhook] Error:', err.message);
    return c.json({ error: err.message }, 400);
  }
});

// ============================================================================
// XERO (Stub)
// ============================================================================

app.post('/api/xero/invoice', async (c) => {
  try {
    if (!c.env.XERO_CLIENT_ID || !c.env.XERO_CLIENT_SECRET) {
      return c.json({ error: 'Not connected to Xero. Please configure Xero credentials.' }, 401);
    }

    const { job } = await c.req.json();

    const lineItems = (job.materials || []).map((m: any) => ({
      description: m.name,
      quantity: m.quantity,
      unitAmount: m.cost,
      accountCode: '200',
    }));

    if (job.laborHours) {
      lineItems.push({
        description: 'Electrical Labor',
        quantity: job.laborHours,
        unitAmount: 85.0,
        accountCode: '200',
      });
    }

    // Stub: Xero needs OAuth state management, return simulated for now
    return c.json({
      success: true,
      invoiceId: `SIM-${Date.now()}`,
      invoiceNumber: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
      simulated: true,
    });
  } catch (err: any) {
    console.error('[Xero] Invoice error:', err.message);
    return c.json({ error: err.message || 'Failed to create invoice in Xero' }, 500);
  }
});

app.get('/api/xero/status', async (c) => {
  const connected = !!(c.env.XERO_CLIENT_ID && c.env.XERO_CLIENT_SECRET);
  return c.json({ connected });
});

// ============================================================================
// FORM 9 PDF Generation
// ============================================================================

app.post('/api/form9/generate', async (c) => {
  try {
    const body = await c.req.json();
    const { tenantName, propertyAddress, proposedEntryDate, jobId } = body;

    if (!proposedEntryDate) return c.json({ error: 'Proposed entry date is required' }, 400);

    // In Workers we can't use pdf-lib's file system access, so we generate a simpler approach.
    // Try to fetch the template from R2 if stored, otherwise return form data for client-side generation.
    const templateKey = 'templates/Form9-template.pdf';
    const templateObj = await c.env.STORAGE.get(templateKey);

    if (templateObj) {
      // If the template exists in R2, return it with a note to fill client-side
      // (pdf-lib works in Workers but the template needs to be in R2)
      // PDFDocument imported at top level
      const templateBytes = await templateObj.arrayBuffer();
      const pdfDoc = await PDFDocument.load(templateBytes);
      const form = pdfDoc.getForm();

      const today = new Date();
      const entryDate = new Date(proposedEntryDate);
      const formatDate = (d: Date) => `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
      const dayName = (d: Date) => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()];
      const formatTime = (d: Date) => {
        const h = d.getHours() % 12 || 12;
        const m = d.getMinutes().toString().padStart(2, '0');
        const ampm = d.getHours() < 12 ? 'AM' : 'PM';
        return `${h}:${m} ${ampm}`;
      };

      try {
        form.getTextField('Name/s of tenant/s').setText(tenantName || '');
        form.getTextField('Address1').setText(propertyAddress || '');
        form.getTextField('Address of rental property 4').setText(propertyAddress || '');
        form.getCheckBox('Other authorised person (secondary agent)').check();
        form.getTextField('Full name or trading name 1').setText('Wirez R Us (Contractor)');
        form.getTextField('Full name or trading name 2').setText('Wirez R Us Technician');
        form.getTextField('Day 1').setText(dayName(today));
        form.getTextField('Date (dd/mm/yyyy)1').setText(formatDate(today));
        form.getTextField('Method of issue 1').setText('Email');
        form.getTextField('Day 2').setText(dayName(entryDate));
        form.getTextField('Date (dd/mm/yyyy) 2').setText(formatDate(entryDate));
        const timeFrom = formatTime(entryDate);
        const timeTo = formatTime(new Date(entryDate.getTime() + 2 * 3600 * 1000));
        form.getTextField('Time of entry').setText(timeFrom);
        form.getTextField('Two hour period from').setText(timeFrom);
        form.getTextField('Two hour period to').setText(timeTo);
        form.getCheckBox('Checkbox3').check();
        form.getTextField('Print name').setText('Wirez R Us');
        form.getTextField('Date of signature (dd/mm/yyyy)').setText(formatDate(today));
      } catch (formErr: any) {
        console.error('[Form9] Template fill error:', formErr.message);
      }

      const pdfBytes = await pdfDoc.save();
      return new Response(pdfBytes, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="Form9_${jobId || 'download'}.pdf"`,
        },
      });
    }

    // Fallback: generate a basic PDF using pdf-lib
    // PDFDocument, rgb, StandardFonts imported at top level
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const page = pdfDoc.addPage([595, 842]);
    const { width, height } = page.getSize();

    const today = new Date();
    const entryDate = new Date(proposedEntryDate);
    const formatDate = (d: Date) => `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
    const dayName = (d: Date) => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()];
    const formatTime = (d: Date) => {
      const h = d.getHours() % 12 || 12;
      const m = d.getMinutes().toString().padStart(2, '0');
      const ampm = d.getHours() < 12 ? 'AM' : 'PM';
      return `${h}:${m} ${ampm}`;
    };

    let y = height - 50;
    const left = 50;
    const lineH = 18;

    page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: rgb(0.08, 0.15, 0.33) });
    page.drawText('FORM 9 — Entry Notice', { x: left, y: height - 35, size: 22, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText('Residential Tenancies and Rooming Accommodation Act 2008 (s 192)', { x: left, y: height - 55, size: 9, font, color: rgb(0.8, 0.8, 0.8) });

    y = height - 110;
    const drawField = (label: string, value: string) => {
      page.drawText(label, { x: left, y, size: 9, font, color: rgb(0.4, 0.4, 0.4) });
      y -= 14;
      page.drawText(value || '—', { x: left, y, size: 11, font: fontBold, color: rgb(0, 0, 0) });
      y -= lineH + 4;
    };

    drawField('Tenant Name(s)', tenantName || 'N/A');
    drawField('Rental Property Address', propertyAddress || 'N/A');
    drawField('Notice Issued By', 'Wirez R Us (Contractor)');
    drawField('Date of Issue', `${dayName(today)}, ${formatDate(today)}`);
    drawField('Method of Issue', 'Email');

    y -= 8;
    page.drawLine({ start: { x: left, y }, end: { x: width - left, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
    y -= 20;

    page.drawText('ENTRY DETAILS', { x: left, y, size: 13, font: fontBold, color: rgb(0.08, 0.15, 0.33) });
    y -= lineH + 6;

    const timeFrom = formatTime(entryDate);
    const timeTo = formatTime(new Date(entryDate.getTime() + 2 * 3600 * 1000));

    drawField('Day of Entry', dayName(entryDate));
    drawField('Date of Entry', formatDate(entryDate));
    drawField('Entry Time Window', `${timeFrom} — ${timeTo} (2-hour period)`);
    drawField('Reason for Entry', 'Carry out routine repairs or maintenance (electrical)');

    y -= 8;
    page.drawLine({ start: { x: left, y }, end: { x: width - left, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
    y -= 20;

    page.drawText('AUTHORISED PERSON', { x: left, y, size: 13, font: fontBold, color: rgb(0.08, 0.15, 0.33) });
    y -= lineH + 6;
    drawField('Name', 'Wirez R Us Technician');
    drawField('Organisation', 'Wirez R Us Electrical Services');

    y -= 8;
    page.drawLine({ start: { x: left, y }, end: { x: width - left, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
    y -= 20;

    page.drawText('SIGNATURE', { x: left, y, size: 13, font: fontBold, color: rgb(0.08, 0.15, 0.33) });
    y -= lineH + 6;
    drawField('Signed by', 'Wirez R Us');
    drawField('Date of Signature', formatDate(today));

    page.drawText(`Job Reference: ${jobId || 'N/A'}`, { x: left, y: 40, size: 8, font, color: rgb(0.6, 0.6, 0.6) });
    page.drawText('This notice is issued under the Residential Tenancies and Rooming Accommodation Act 2008 (Qld)', { x: left, y: 28, size: 7, font, color: rgb(0.6, 0.6, 0.6) });

    const pdfBytes = await pdfDoc.save();
    return new Response(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Form9_${jobId || 'download'}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error('[Form9] Error:', err.message);
    return c.json({ error: err.message || 'Failed to generate Form 9 PDF' }, 500);
  }
});

// ============================================================================
// EMAIL WEBHOOK (inbound email from CloudMailin or CF Email Worker)
// ============================================================================

app.post('/api/webhooks/email', async (c) => {
  try {
    const body = await c.req.json();

    const from = body.envelope?.from || body.from || '';
    const subject = body.headers?.subject || body.headers?.Subject || body.subject || 'New Work Order from Email';
    const text = body.plain || body.text || '';
    const html = body.html || '';
    let emailContent = text || (html ? html.replace(/<[^>]+>/g, '') : '') || '';

    emailContent = emailContent
      .replace(/\\r\\n/g, '\n')
      .replace(/\\n/g, '\n')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');

    const now = new Date();
    const combined = `${subject}\n${emailContent}`;

    console.log(`[Email Webhook] Email from: ${from} | Subject: ${subject}`);

    // Step 1: Regex extraction
    const regex = extractWithRegex(combined, from);

    // Step 2: AI extraction
    const ai = await extractWithAI(emailContent, subject, from, c.env.OPENROUTER_API_KEY);

    // Step 3: Merge — regex wins, then AI fills gaps
    const tenantName = regex.tenantName || ai?.tenantName || '';
    const tenantPhone = regex.tenantPhone || ai?.tenantPhone || '';
    const tenantEmail = regex.tenantEmail || ai?.tenantEmail || '';
    const propertyAddress = regex.propertyAddress || ai?.propertyAddress || '';
    const pmEmail = regex.pmEmail || ai?.pmEmail || '';
    const pmName = regex.pmName || ai?.pmName || '';
    const agency = regex.agency || ai?.agency || '';
    const accessInstructions = regex.accessInstructions || ai?.accessInstructions || '';
    const preferredDate = regex.preferredDate || ai?.preferredDate || '';
    const notAvailable = regex.notAvailable || '';

    const urgencyRaw = regex.urgencyLabel || ai?.urgency || classifyUrgency(combined);
    const urgency = /emergency|urgent/i.test(urgencyRaw) ? 'URGENT'
      : /high/i.test(urgencyRaw) ? 'HIGH'
      : /low|routine/i.test(urgencyRaw) ? 'LOW'
      : 'NORMAL';

    const jobTypeRaw = regex.jobTypeLabel || ai?.jobType || '';
    const jobType = jobTypeRaw
      ? (/smoke/i.test(jobTypeRaw) ? 'SMOKE_ALARM' : /install/i.test(jobTypeRaw) ? 'INSTALLATION' : 'GENERAL_REPAIR')
      : classifyJobType(combined);

    const issueDescription = regex.description || ai?.issueDescription || '';
    const extractionMethod = ai ? `regex + AI (${ai.detectedSoftware || 'Unknown'})` : 'regex only';
    const aiConfidence = ai?.confidence ?? null;
    const aiNeedsReview = ai ? ai.needsReview : true;
    const detectedSoftware = ai?.detectedSoftware || '';

    const titleAddress = propertyAddress ? propertyAddress.split(',')[0] : '';
    const titleType = jobTypeRaw ? jobTypeRaw.replace(/Electrical Fault \/ Repair/i, 'Electrical Fault') : jobType.replace(/_/g, ' ');
    const jobTitle = titleAddress ? `${titleType} — ${titleAddress}` : subject || 'New Work Order from Email';

    // Step 4: Duplicate detection
    let duplicateJobId: string | null = null;
    if (propertyAddress) {
      const existing = await c.env.DB.prepare(
        "SELECT id, site_notes FROM jobs WHERE property_address = ? AND source = 'email' AND status != 'CLOSED' LIMIT 1"
      ).bind(propertyAddress).first();

      if (existing) {
        const existingId = (existing as any).id;
        const existingNotes = (existing as any).site_notes || '';
        const followUpNote = `\n\n--- Follow-up email (${now.toISOString()}) ---\nFrom: ${from}\nSubject: ${subject}\n${issueDescription || emailContent.substring(0, 500)}`;
        await c.env.DB.prepare(
          'UPDATE jobs SET site_notes = ?, has_follow_up_email = 1, last_follow_up_at = ? WHERE id = ?'
        ).bind(existingNotes + followUpNote, now.toISOString(), existingId).run();

        duplicateJobId = existingId;
        console.log(`[Email Webhook] Follow-up appended to existing job ${existingId}`);
        return c.json({
          success: true,
          action: 'appended_to_existing',
          existingJobId: duplicateJobId,
          message: `Follow-up email appended to existing active job ${duplicateJobId} at ${propertyAddress}`,
          extraction: extractionMethod,
        });
      }
    }

    // Step 5: Create new job in D1
    const jobId = generateId();
    const jobData: Record<string, unknown> = {
      id: jobId,
      title: jobTitle,
      type: jobType,
      status: 'INTAKE',
      urgency,
      created_at: now.toISOString(),
      tenant_name: tenantName,
      tenant_phone: tenantPhone,
      tenant_email: tenantEmail,
      property_address: propertyAddress,
      property_manager_email: pmEmail || from,
      property_manager_name: pmName,
      agency,
      access_codes: accessInstructions,
      description: issueDescription,
      site_notes: preferredDate ? `Preferred attendance: ${preferredDate}${notAvailable ? `\nNot available: ${notAvailable}` : ''}` : '',
      source: 'email',
      extraction_method: extractionMethod,
      detected_software: detectedSoftware,
      ai_needs_review: 0,
      ai_confidence: aiConfidence ? JSON.stringify(aiConfidence) : null,
      raw_email_from: from,
      raw_email_subject: subject,
      raw_email_body: emailContent,
      raw_email_html: html || '',
      email_processed: 1,
      email_processed_at: now.toISOString(),
    };

    const { sql, params } = buildInsert('jobs', jobData);
    await c.env.DB.prepare(sql).bind(...params).run();

    console.log(`[Email Webhook] Job saved: ${jobId} | Type: ${jobType} | Urgency: ${urgency} | Method: ${extractionMethod}`);
    return c.json({ success: true, jobId, action: 'created_new', extraction: extractionMethod });
  } catch (err: any) {
    console.error('[Email Webhook] Error:', err.message);
    return c.json({ error: 'Webhook error', details: err.message }, 200);
  }
});

// ============================================================================
// GMAIL POLLING
// ============================================================================

async function pollGmailInbox(env: Env): Promise<{ processed: number; errors: number; results: any[] }> {
  const accessToken = await getGmailAccessToken(env);
  const messages = await fetchGmailMessages(accessToken, 10);

  if (messages.length === 0) return { processed: 0, errors: 0, results: [] };

  const results: any[] = [];

  for (const message of messages) {
    try {
      const { subject, from, body, html } = extractGmailBody(message);
      const fromLower = from.toLowerCase();
      const subjectLower = subject.toLowerCase();

      const isSkippable = SKIP_SENDER_PATTERNS.some((p) => p.test(fromLower)) ||
        SKIP_SUBJECT_PATTERNS.some((p) => p.test(subjectLower));

      if (isSkippable) {
        await markAsRead(accessToken, message.id);
        console.log(`[EmailPoll] Skipped: "${subject}" from ${from}`);
        continue;
      }

      const detected = detectRealEstateSoftware(subject, body, from);
      const combined = `${subject}\n${body}`;

      // Use regex extraction (same as webhook)
      const regex = extractWithRegex(combined, from);
      const jobType = regex.jobTypeLabel
        ? (/smoke/i.test(regex.jobTypeLabel) ? 'SMOKE_ALARM' : classifyJobType(regex.jobTypeLabel))
        : classifyJobType(combined);
      const urgency = regex.urgencyLabel ? classifyUrgency(regex.urgencyLabel) : classifyUrgency(combined);

      const titleAddr = regex.propertyAddress ? regex.propertyAddress.split(',')[0] : '';
      const titleType = jobType.replace(/_/g, ' ');
      const jobTitle = titleAddr ? `${titleType} — ${titleAddr}` : subject || 'New Work Order';

      const now = new Date();
      const jobId = generateId();

      const jobData: Record<string, unknown> = {
        id: jobId,
        title: jobTitle,
        type: jobType,
        status: 'INTAKE',
        urgency,
        created_at: now.toISOString(),
        tenant_name: regex.tenantName,
        tenant_phone: regex.tenantPhone,
        tenant_email: regex.tenantEmail,
        property_address: regex.propertyAddress,
        property_manager_email: regex.pmEmail || from,
        property_manager_name: regex.pmName,
        agency: regex.agency,
        access_codes: regex.accessInstructions,
        description: regex.description,
        site_notes: regex.preferredDate ? `Preferred: ${regex.preferredDate}` : '',
        source: 'email',
        extraction_method: `gmail-poll (${detected.software})`,
        detected_software: detected.software,
        ai_needs_review: 0,
        email_processed: 1,
        email_processed_at: now.toISOString(),
        raw_email_from: from,
        raw_email_subject: subject,
        raw_email_body: body.substring(0, 5000),
        gmail_message_id: message.id,
      };

      const { sql, params } = buildInsert('jobs', jobData);
      await env.DB.prepare(sql).bind(...params).run();

      await markAsRead(accessToken, message.id);

      results.push({
        gmailId: message.id,
        jobId,
        subject,
        from,
        software: detected.software,
        address: regex.propertyAddress,
        type: jobType,
      });

      console.log(`[EmailPoll] Job created: ${jobId} | ${detected.software} | ${jobType}`);
    } catch (msgErr: any) {
      console.error(`[EmailPoll] Failed to process message ${message.id}:`, msgErr.message);
      results.push({ gmailId: message.id, error: msgErr.message });
    }
  }

  return {
    processed: results.filter((r) => !r.error).length,
    errors: results.filter((r) => r.error).length,
    results,
  };
}

// GET /api/email/poll-inbox — diagnostic
app.get('/api/email/poll-inbox', async (c) => {
  try {
    const checks: Record<string, string> = {
      GMAIL_ADDRESS: c.env.GMAIL_ADDRESS ? `set: ${c.env.GMAIL_ADDRESS}` : 'MISSING',
      GMAIL_CLIENT_ID: c.env.GMAIL_CLIENT_ID ? 'set' : 'MISSING',
      GMAIL_CLIENT_SECRET: c.env.GMAIL_CLIENT_SECRET ? 'set' : 'MISSING',
      GMAIL_REFRESH_TOKEN: c.env.GMAIL_REFRESH_TOKEN ? 'set' : 'MISSING',
      OPENROUTER_API_KEY: c.env.OPENROUTER_API_KEY ? 'set (AI enabled)' : 'missing (regex-only parsing)',
    };

    let gmailLiveTest: any = null;
    try {
      const accessToken = await getGmailAccessToken(c.env);
      const profileRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const profileData: any = profileRes.ok ? await profileRes.json() : {};
      const unreadRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=20&q=is:unread', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const unreadData: any = await unreadRes.json();
      gmailLiveTest = {
        tokenOk: true,
        authenticatedAs: profileData.emailAddress ?? 'unknown',
        totalMessages: profileData.messagesTotal ?? 0,
        unreadTotal: unreadData.messages?.length ?? 0,
      };
    } catch (e: any) {
      gmailLiveTest = { tokenOk: false, error: e.message };
    }

    return c.json({
      status: 'Email Polling Endpoint',
      checks,
      gmailLiveTest,
      usage: 'POST to poll inbox, or wait for cron trigger.',
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// POST /api/email/poll-inbox — manual poll trigger
app.post('/api/email/poll-inbox', async (c) => {
  try {
    const result = await pollGmailInbox(c.env);
    return c.json({ success: true, ...result });
  } catch (err: any) {
    console.error('[EmailPoll] Error:', err.message);
    return c.json({ error: err.message }, 500);
  }
});

// ============================================================================
// TENANT NOTIFICATIONS (via Resend + Twilio)
// ============================================================================

app.post('/api/notifications/send-tenant', async (c) => {
  try {
    const body = await c.req.json();
    const {
      type, tenantPhone, tenantEmail, tenantName,
      propertyAddress, scheduledDate, scheduledTime,
      jobId, techName, newEta,
      channels = ['sms', 'email'],
    } = body;

    if (!type) return c.json({ error: 'Missing notification type' }, 400);

    // ── For schedule_confirmation: generate Form 9 PDF to attach ──────────
    let form9Base64: string | null = null;
    if (type === 'schedule_confirmation' && channels.includes('email') && tenantEmail) {
      try {
        const templateObj = await c.env.STORAGE.get('templates/Form9-template.pdf');
        if (templateObj) {
          const now = new Date();
          // Parse scheduled date or default to 3 business days from now
          let entryDate: Date;
          if (scheduledDate) {
            // Try to parse dd/mm/yyyy or similar
            const parts = scheduledDate.split(/[\/-]/);
            if (parts.length === 3) {
              // Detect dd/mm/yyyy vs mm/dd/yyyy
              const d = parseInt(parts[0], 10);
              const m = parseInt(parts[1], 10);
              const y = parseInt(parts[2].length === 2 ? '20' + parts[2] : parts[2], 10);
              entryDate = new Date(y, m - 1, d);
            } else {
              entryDate = new Date(scheduledDate);
            }
            if (isNaN(entryDate.getTime())) entryDate = new Date(now);
          } else {
            entryDate = new Date(now);
            let daysAdded = 0;
            while (daysAdded < 3) {
              entryDate.setDate(entryDate.getDate() + 1);
              const dow = entryDate.getDay();
              if (dow !== 0 && dow !== 6) daysAdded++;
            }
          }
          entryDate.setHours(9, 0, 0, 0);

          const fmt = (d: Date) => `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}`;
          const dayN = (d: Date) => ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][d.getDay()];
          const entryTimeStr = scheduledTime || '9:00 AM';
          // Parse end time (add ~2hrs or use window)
          const entryTimeTo = (() => {
            const m = entryTimeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
            if (!m) return '11:00 AM';
            let h = parseInt(m[1], 10);
            const min = m[2];
            const meridiem = m[3]?.toUpperCase() || (h < 7 ? 'PM' : 'AM');
            h = (h + 2) % 24;
            const newMeridiem = h < 12 ? 'AM' : 'PM';
            const displayH = h % 12 || 12;
            return `${displayH}:${min} ${newMeridiem}`;
          })();

          const templateBytes = await templateObj.arrayBuffer();
          const pdfDoc = await PDFDocument.load(templateBytes);
          const form = pdfDoc.getForm();
          try {
            form.getTextField('Name/s of tenant/s').setText(tenantName || '');
            form.getTextField('Address1').setText(propertyAddress || '');
            form.getTextField('Address of rental property 4').setText(propertyAddress || '');
            form.getCheckBox('Other authorised person (secondary agent)').check();
            form.getTextField('Full name or trading name 1').setText('Wirez R Us (Contractor)');
            form.getTextField('Full name or trading name 2').setText('Wirez R Us Technician');
            form.getTextField('Day 1').setText(dayN(now));
            form.getTextField('Date (dd/mm/yyyy)1').setText(fmt(now));
            form.getTextField('Method of issue 1').setText('Email');
            form.getTextField('Day 2').setText(dayN(entryDate));
            form.getTextField('Date (dd/mm/yyyy) 2').setText(fmt(entryDate));
            form.getTextField('Time of entry').setText(entryTimeStr);
            form.getTextField('Two hour period from').setText(entryTimeStr);
            form.getTextField('Two hour period to').setText(entryTimeTo);
            form.getCheckBox('Checkbox3').check();
            form.getTextField('Print name').setText('Wirez R Us');
          } catch { /* some fields may not exist in this template version */ }
          form.flatten();
          const pdfBytes = await pdfDoc.save();
          form9Base64 = btoa(String.fromCharCode(...new Uint8Array(pdfBytes)));
        }
      } catch (pdfErr: any) {
        console.error('[Notification Form9] PDF generation error:', pdfErr.message);
      }
    }

    const content = buildNotificationContent(type, {
      tenantName, propertyAddress, scheduledDate, scheduledTime, jobId, techName,
      companyPhone: '1300 WIREZ US',
      newEta,
    }, { hasForm9: !!form9Base64 });

    const results: any = { type, jobId };

    // ── Send SMS via Twilio ────────────────────────────────────────────────
    if (channels.includes('sms') && tenantPhone) {
      const sid = c.env.TWILIO_ACCOUNT_SID;
      const token = c.env.TWILIO_AUTH_TOKEN;
      const from = c.env.TWILIO_PHONE_NUMBER;

      if (sid && token && from) {
        try {
          const toPhone = normaliseAuPhone(tenantPhone);
          const twilioRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
            method: 'POST',
            headers: {
              'Authorization': 'Basic ' + btoa(`${sid}:${token}`),
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({ To: toPhone, From: from, Body: content.smsBody }),
          });
          if (twilioRes.ok) {
            results.sms = { sent: true, simulated: false };
          } else {
            const errText = await twilioRes.text();
            let twilioMessage = `HTTP ${twilioRes.status}`;
            try {
              const errJson = JSON.parse(errText);
              twilioMessage = errJson.message || errJson.code || twilioMessage;
            } catch {}
            console.error('[Notification SMS] Twilio error:', twilioRes.status, errText);
            results.sms = { sent: false, simulated: false, error: twilioMessage };
          }
        } catch (smsErr: any) {
          console.error('[Notification SMS] Error:', smsErr.message);
          results.sms = { sent: false, simulated: false, error: smsErr.message };
        }
      } else {
        console.log(`[SMS Simulation] To: ${tenantPhone} | ${content.smsBody}`);
        results.sms = { sent: true, simulated: true };
      }
    }

    // ── Send Email via Resend ──────────────────────────────────────────────
    if (channels.includes('email') && tenantEmail) {
      if (c.env.RESEND_API_KEY) {
        try {
          const emailPayload: any = {
            from: c.env.RESEND_FROM_EMAIL || 'Wirez R Us <onboarding@resend.dev>',
            to: tenantEmail,
            subject: content.emailSubject,
            html: content.emailHtml,
          };
          if (form9Base64) {
            emailPayload.attachments = [{
              filename: `Form9-Entry-Notice${jobId ? '-' + jobId : ''}.pdf`,
              content: form9Base64,
            }];
          }
          const emailRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${c.env.RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(emailPayload),
          });
          if (emailRes.ok) {
            results.email = { sent: true, simulated: false, form9Attached: !!form9Base64 };
          } else {
            const errText = await emailRes.text();
            console.error('[Notification Email] Resend error:', emailRes.status, errText);
            results.email = { sent: false, simulated: false, error: errText };
          }
        } catch (emailErr: any) {
          console.error('[Notification Email] Error:', emailErr.message);
          results.email = { sent: false, simulated: false, error: emailErr.message };
        }
      } else {
        console.log(`[Email Simulation] To: ${tenantEmail} | Subject: ${content.emailSubject}`);
        results.email = { sent: true, simulated: true, form9Attached: !!form9Base64 };
      }
    }

    console.log(`[Tenant Notification] Type: ${type} | Job: ${jobId} | SMS: ${results.sms?.sent ? 'sent' : 'skipped'} | Email: ${results.email?.sent ? 'sent' : 'skipped'} | Form9: ${!!form9Base64}`);
    return c.json({ success: true, ...results });
  } catch (err: any) {
    console.error('[Notification] Error:', err.message);
    return c.json({ error: err.message }, 500);
  }
});

// ============================================================================
// R2 FILE UPLOADS
// ============================================================================

// POST /api/uploads/presign — generate presigned URL for direct upload
app.post('/api/uploads/presign', async (c) => {
  try {
    const { filename, contentType } = await c.req.json();
    if (!filename) return c.json({ error: 'filename is required' }, 400);

    // Generate a unique key (no leading path — avoids double-prefix in URL)
    const ext = (filename.split('.').pop() || 'bin').toLowerCase();
    const key = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

    // Return the key and upload URL for direct PUT upload via the Worker
    return c.json({
      key,
      url: `/api/uploads/${key}`,
      uploadUrl: `/api/uploads/${key}`,
      method: 'PUT',
      headers: { 'Content-Type': contentType || 'application/octet-stream' },
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// PUT /api/uploads/:key+ — upload file to R2
app.put('/api/uploads/:key{.+}', async (c) => {
  try {
    const key = c.req.param('key');
    const contentType = c.req.header('Content-Type') || 'application/octet-stream';
    const body = await c.req.arrayBuffer();

    await c.env.STORAGE.put(key, body, {
      httpMetadata: { contentType },
    });

    return c.json({ success: true, key, url: `/api/uploads/${key}` });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// GET /api/uploads/:key+ — serve file from R2
app.get('/api/uploads/:key{.+}', async (c) => {
  try {
    const key = c.req.param('key');
    const object = await c.env.STORAGE.get(key);

    if (!object) return c.json({ error: 'File not found' }, 404);

    const headers = new Headers();
    headers.set('Content-Type', object.httpMetadata?.contentType || 'application/octet-stream');
    headers.set('Cache-Control', 'public, max-age=31536000');
    if (object.size) headers.set('Content-Length', object.size.toString());

    return new Response(object.body, { headers });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get('/api/health', async (c) => {
  try {
    // Quick D1 check
    const dbCheck = await c.env.DB.prepare("SELECT 1 as ok").first();
    return c.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: dbCheck ? 'connected' : 'error',
      environment: c.env.ENVIRONMENT,
    });
  } catch (err: any) {
    return c.json({ status: 'error', error: err.message }, 500);
  }
});

// ============================================================================
// AUTO FORM 9 + SEND TO TENANT (called after email-created jobs)
// ============================================================================

async function autoSendForm9AndNotify(env: Env, job: Record<string, unknown>) {
  const tenantEmail = job.tenant_email as string;
  const tenantName = job.tenant_name as string;
  const propertyAddress = job.property_address as string;
  const jobId = job.id as string;

  if (!tenantEmail || !propertyAddress) {
    console.log(`[AutoForm9] Skipping — missing tenant email or address for job ${jobId}`);
    return;
  }

  // Propose entry date: 3 business days from now
  const now = new Date();
  let entryDate = new Date(now);
  let daysAdded = 0;
  while (daysAdded < 3) {
    entryDate.setDate(entryDate.getDate() + 1);
    const dow = entryDate.getDay();
    if (dow !== 0 && dow !== 6) daysAdded++;
  }
  entryDate.setHours(9, 0, 0, 0); // 9 AM

  const formatDate = (d: Date) => `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  const dayName = (d: Date) => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()];

  // Try to generate Form 9 PDF if template exists in R2
  let pdfBase64: string | null = null;
  try {
    const templateObj = await env.STORAGE.get('templates/Form9-template.pdf');
    if (templateObj) {
      // PDFDocument imported at top level
      const templateBytes = await templateObj.arrayBuffer();
      const pdfDoc = await PDFDocument.load(templateBytes);
      const form = pdfDoc.getForm();
      const dayName = (d: Date) => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()];

      try {
        form.getTextField('Name/s of tenant/s').setText(tenantName || '');
        form.getTextField('Address1').setText(propertyAddress || '');
        form.getTextField('Address of rental property 4').setText(propertyAddress || '');
        form.getCheckBox('Other authorised person (secondary agent)').check();
        form.getTextField('Full name or trading name 1').setText('Wirez R Us (Contractor)');
        form.getTextField('Full name or trading name 2').setText('Wirez R Us Technician');
        form.getTextField('Day 1').setText(dayName(now));
        form.getTextField('Date (dd/mm/yyyy)1').setText(formatDate(now));
        form.getTextField('Method of issue 1').setText('Email');
        form.getTextField('Day 2').setText(dayName(entryDate));
        form.getTextField('Date (dd/mm/yyyy) 2').setText(formatDate(entryDate));
        form.getTextField('Time of entry').setText('9:00 AM');
        form.getTextField('Two hour period from').setText('9:00 AM');
        form.getTextField('Two hour period to').setText('11:00 AM');
        form.getCheckBox('Checkbox3').check();
        form.getTextField('Print name').setText('Wirez R Us');
      } catch { /* some fields may not exist in template */ }

      form.flatten();
      const pdfBytes = await pdfDoc.save();
      pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBytes)));
    }
  } catch (err: any) {
    console.error('[AutoForm9] PDF generation error:', err.message);
  }

  // Send email via Resend
  if (env.RESEND_API_KEY) {
    try {
      const autoForm9Html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);">
  <tr><td style="background:#F5A623;height:4px;font-size:0;">&nbsp;</td></tr>
  <tr><td style="background:#1a1a2e;padding:28px 32px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td><div style="font-size:22px;font-weight:bold;color:#ffffff;letter-spacing:-0.5px;">Wirez R Us</div>
        <div style="font-size:11px;color:#F5A623;margin-top:4px;letter-spacing:0.5px;text-transform:uppercase;">Licensed Electrical Contractors</div></td>
        <td align="right"><div style="font-size:11px;color:rgba(255,255,255,0.45);">1300 WIREZ US</div></td>
      </tr>
      <tr><td colspan="2" style="padding-top:20px;border-top:1px solid rgba(255,255,255,0.08);">
        <div style="background:#F5A623;width:32px;height:3px;border-radius:2px;margin-bottom:10px;"></div>
        <div style="font-size:20px;font-weight:bold;color:#ffffff;">Entry Notice — Electrical Work</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.6);margin-top:6px;">Form 9 — Residential Tenancies Act</div>
      </td></tr>
    </table>
  </td></tr>
  <tr><td style="background:#ffffff;padding:32px;">
    <p style="color:#475569;font-size:15px;margin:0 0 20px;">Dear <strong>${tenantName || 'Tenant'}</strong>,</p>
    <p style="color:#475569;font-size:14px;margin:0 0 20px;">We have been engaged to attend your property to complete electrical work. You are required to be given a minimum of 24 hours notice under the Residential Tenancies Act.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0;">
      <tr><td style="background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #F5A623;border-radius:0 8px 8px 0;padding:14px 16px;">
        <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px;">&#127968; Property</div>
        <div style="font-size:15px;font-weight:bold;color:#1a1a2e;">${propertyAddress}</div>
      </td></tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0;">
      <tr><td style="background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #F5A623;border-radius:0 8px 8px 0;padding:14px 16px;">
        <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px;">&#128197; Proposed Entry Date</div>
        <div style="font-size:15px;font-weight:bold;color:#1a1a2e;">${dayName(entryDate)}, ${formatDate(entryDate)}</div>
        <div style="font-size:13px;color:#64748b;margin-top:4px;">Entry Window: 9:00 AM — 11:00 AM</div>
      </td></tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
      <tr><td style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px 16px;color:#166534;font-size:13px;">
        ${pdfBase64 ? '<strong>&#128206; Form 9 Entry Notice is attached</strong> to this email as required by law. Please keep a copy for your records.' : '<strong>&#128203; Entry Notice Details</strong> are provided above as required by law.'}
      </td></tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
      <tr><td style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:14px 16px;color:#78350f;font-size:13px;">
        <strong style="color:#92400e;">&#9888; Before our visit, please ensure:</strong>
        <ul style="margin:8px 0 0;padding-left:20px;line-height:1.9;">
          <li>Clear access to the property and electrical switchboard</li>
          <li>All pets are restrained or removed</li>
          <li>An adult (18+) is present, or contact us to arrange key access</li>
        </ul>
      </td></tr>
    </table>
    <p style="color:#94a3b8;font-size:12px;margin:24px 0 0;border-top:1px solid #f1f5f9;padding-top:16px;">
      If the proposed time is not suitable, please contact us at <strong style="color:#475569;">1300 WIREZ US</strong> to reschedule.
    </p>
  </td></tr>
  <tr><td style="background:#0f172a;padding:20px 32px;border-radius:0 0 12px 12px;">
    <div style="font-size:13px;color:#F5A623;font-weight:bold;">Wirez R Us</div>
    <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:3px;">Licensed Electrical Contractors &nbsp;·&nbsp; 1300 WIREZ US &nbsp;·&nbsp; wirezapp.au</div>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

      const emailBody: any = {
        from: c.env.RESEND_FROM_EMAIL || 'Wirez R Us <onboarding@resend.dev>',
        to: tenantEmail,
        subject: `Entry Notice (Form 9) — ${propertyAddress}`,
        html: autoForm9Html,
      };

      if (pdfBase64) {
        emailBody.attachments = [{
          filename: `Form9-${jobId}.pdf`,
          content: pdfBase64,
        }];
      }

      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailBody),
      });

      if (resendRes.ok) {
        console.log(`[AutoForm9] Form 9 sent to ${tenantEmail} for job ${jobId}`);
        // Update job to mark form9 as sent
        await env.DB.prepare('UPDATE jobs SET form9_sent = 1, form9_sent_at = ? WHERE id = ?')
          .bind(new Date().toISOString(), jobId).run();
      } else {
        console.error('[AutoForm9] Resend error:', resendRes.status, await resendRes.text());
      }
    } catch (err: any) {
      console.error('[AutoForm9] Email send error:', err.message);
    }
  } else {
    console.log(`[AutoForm9] Resend not configured — Form 9 NOT sent for job ${jobId}`);
  }
}

// ============================================================================
// CLOUDFLARE EMAIL WORKER HANDLER
// ============================================================================

async function handleIncomingEmail(message: ForwardableEmailMessage, env: Env, ctx: ExecutionContext) {
  console.log(`[Email] Received from: ${message.from}, to: ${message.to}, subject: ${message.headers.get('subject') || '(no subject)'}`);

  try {
    // Parse the raw email with postal-mime
    const parser = new PostalMime();
    const rawEmail = new Response(message.raw);
    const parsed = await parser.parse(await rawEmail.arrayBuffer());

    const from = message.from;
    const subject = parsed.subject || message.headers.get('subject') || '';
    const body = parsed.text || '';
    const html = parsed.html || '';
    const fromLower = from.toLowerCase();
    const subjectLower = subject.toLowerCase();

    // Skip junk / automated emails
    const isSkippable = SKIP_SENDER_PATTERNS.some((p) => p.test(fromLower)) ||
      SKIP_SUBJECT_PATTERNS.some((p) => p.test(subjectLower));

    if (isSkippable) {
      console.log(`[Email] Skipped: "${subject}" from ${from}`);
      return;
    }

    // Detect property management software
    const detected = detectRealEstateSoftware(subject, body, from);
    const combined = `${subject}\n${body}`;

    // Extract job details with regex
    const regex = extractWithRegex(combined, from);

    // If OpenRouter key is set, enhance with AI extraction
    let aiResult: AIExtractionResult | null = null;
    if (env.OPENROUTER_API_KEY && detected.confidence >= 0.3) {
      aiResult = await extractWithAI(body || html, subject, from, env.OPENROUTER_API_KEY);
    }

    // Merge: prefer AI results if available, fall back to regex
    const tenantName = aiResult?.tenantName || regex.tenantName || '';
    const tenantPhone = aiResult?.tenantPhone || regex.tenantPhone || '';
    const tenantEmail = aiResult?.tenantEmail || regex.tenantEmail || '';
    const propertyAddress = aiResult?.propertyAddress || regex.propertyAddress || '';
    const description = aiResult?.issueDescription || regex.description || subject;
    const pmName = aiResult?.pmName || regex.pmName || '';
    const pmEmail = aiResult?.pmEmail || regex.pmEmail || from;
    const agency = aiResult?.agency || regex.agency || '';
    const accessInstructions = aiResult?.accessInstructions || regex.accessInstructions || '';
    const preferredDate = aiResult?.preferredDate || regex.preferredDate || '';

    const jobType = aiResult?.jobType || (regex.jobTypeLabel
      ? (/smoke/i.test(regex.jobTypeLabel) ? 'SMOKE_ALARM' : classifyJobType(regex.jobTypeLabel))
      : classifyJobType(combined));
    const urgency = aiResult?.urgency || (regex.urgencyLabel ? classifyUrgency(regex.urgencyLabel) : classifyUrgency(combined));

    const titleAddr = propertyAddress ? propertyAddress.split(',')[0] : '';
    const titleType = jobType.replace(/_/g, ' ');
    const jobTitle = titleAddr ? `${titleType} — ${titleAddr}` : subject || 'New Work Order';

    const now = new Date();
    const jobId = generateId();

    // Check for duplicate (same subject + from within 24h)
    const duplicate = await env.DB.prepare(
      'SELECT id FROM jobs WHERE raw_email_subject = ? AND raw_email_from = ? AND created_at > ?'
    ).bind(subject, from, new Date(now.getTime() - 24 * 3600 * 1000).toISOString()).first();

    if (duplicate) {
      console.log(`[Email] Duplicate detected — skipping "${subject}" from ${from}`);
      return;
    }

    const jobData: Record<string, unknown> = {
      id: jobId,
      title: jobTitle,
      type: jobType,
      status: 'INTAKE',
      urgency,
      created_at: now.toISOString(),
      tenant_name: tenantName,
      tenant_phone: tenantPhone,
      tenant_email: tenantEmail,
      property_address: propertyAddress,
      property_manager_email: pmEmail,
      property_manager_name: pmName,
      agency,
      access_codes: accessInstructions,
      description,
      site_notes: preferredDate ? `Preferred: ${preferredDate}` : '',
      source: 'email',
      extraction_method: `cf-email (${detected.software})${aiResult ? ' + AI' : ''}`,
      detected_software: detected.software,
      ai_needs_review: 0,
      email_processed: 1,
      email_processed_at: now.toISOString(),
      raw_email_from: from,
      raw_email_subject: subject,
      raw_email_body: body.substring(0, 5000),
    };

    const { sql, params } = buildInsert('jobs', jobData);
    await env.DB.prepare(sql).bind(...params).run();

    console.log(`[Email] Job created: ${jobId} | ${detected.software} | ${jobType} | ${propertyAddress}`);

    // Auto-send Form 9 to tenant and notify
    ctx.waitUntil(autoSendForm9AndNotify(env, jobData));

  } catch (err: any) {
    console.error('[Email] Processing error:', err.message, err.stack);
  }
}

// ============================================================================
// EXPORTS (Worker entry points)
// ============================================================================

export default {
  fetch: app.fetch,

  // Cloudflare Email Routing handler — receives emails instantly
  async email(message: ForwardableEmailMessage, env: Env, ctx: ExecutionContext) {
    await handleIncomingEmail(message, env, ctx);
  },

  // Keep cron for periodic cleanup / diagnostics (no longer Gmail polling)
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    console.log('[Cron] Scheduled task triggered at', new Date().toISOString());
  },
};
