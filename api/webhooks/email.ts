import type { VercelRequest, VercelResponse } from '@vercel/node';

// ─── Firestore REST helpers ────────────────────────────────────
function toFirestoreValue(val: any): any {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'number') return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (Array.isArray(val)) return { arrayValue: { values: val.map(toFirestoreValue) } };
  if (typeof val === 'object') {
    const fields: any = {};
    for (const [k, v] of Object.entries(val)) { fields[k] = toFirestoreValue(v); }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

// ─── Regex extraction ──────────────────────────────────────────
function extractWithRegex(text: string, senderEmail: string) {
  // Australian phone numbers: 04xx, (0x) xxxx, +61, landline patterns
  const phonePatterns = [
    /(?:\+?61|0)[2-478](?:[\s-]?\d){8}/g,              // AU mobile & landline
    /(?:\+?61|0)4\d{2}[\s-]?\d{3}[\s-]?\d{3}/g,         // 04xx xxx xxx
    /\(0[2-9]\)\s?\d{4}\s?\d{4}/g,                       // (0x) xxxx xxxx
    /\b\d{4}[\s-]\d{3}[\s-]\d{3}\b/g,                    // xxxx xxx xxx
    /\b1[38]00[\s-]?\d{3}[\s-]?\d{3}\b/g,                // 1300/1800
  ];

  // Email addresses (exclude the sender)
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

  // Australian street addresses
  const addressPatterns = [
    /\d{1,5}[\/\-]?\d{0,5}\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:St|Street|Rd|Road|Ave|Avenue|Dr|Drive|Ct|Court|Pl|Place|Cres|Crescent|Blvd|Boulevard|Way|Lane|Ln|Tce|Terrace|Pde|Parade|Cir|Circuit|Close|Cl)\b[,.\s]*(?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)?[,.\s]*(?:NSW|VIC|QLD|SA|WA|TAS|NT|ACT)?[,.\s]*\d{4}/gi,
    /(?:Unit|Apt|Lot|Suite)\s*\d+[,\/\s]+\d+\s+[A-Za-z\s]+(?:St|Street|Rd|Road|Ave|Avenue|Dr|Drive)\b[^,\n]*\d{4}/gi,
  ];

  // Labelled field patterns (NAME: xxx, PHONE: xxx, etc.)
  const labelledName = text.match(/(?:tenant|name|resident|occupant|contact)\s*[:=]\s*([^\n,]{2,40})/i);
  const labelledPhone = text.match(/(?:phone|mobile|cell|tel|contact\s*(?:number|no|#))\s*[:=]\s*([^\n,]{6,20})/i);
  const labelledAddress = text.match(/(?:address|property|location|site|unit)\s*[:=]\s*([^\n]{5,80})/i);
  const labelledEmail = text.match(/(?:email|e-mail)\s*[:=]\s*([^\n\s]{5,60})/i);

  // Extract phones
  let phones: string[] = [];
  for (const p of phonePatterns) {
    const matches = text.match(p);
    if (matches) phones.push(...matches);
  }
  phones = [...new Set(phones.map(p => p.replace(/[\s-]/g, '')))];

  // Extract emails (not the sender)
  const emails = [...new Set(
    (text.match(emailPattern) || []).filter(e => e.toLowerCase() !== senderEmail.toLowerCase())
  )];

  // Extract addresses
  let addresses: string[] = [];
  for (const p of addressPatterns) {
    const matches = text.match(p);
    if (matches) addresses.push(...matches);
  }
  addresses = [...new Set(addresses.map(a => a.trim()))];

  return {
    tenantName: labelledName?.[1]?.trim() || '',
    tenantPhone: labelledPhone?.[1]?.trim() || phones[0] || '',
    tenantEmail: labelledEmail?.[1]?.trim() || emails[0] || '',
    propertyAddress: labelledAddress?.[1]?.trim() || addresses[0] || '',
    allPhones: phones,
    allEmails: emails,
    allAddresses: addresses,
  };
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

// ─── AI extraction via OpenAI ──────────────────────────────────
async function extractWithAI(emailBody: string, subject: string, from: string): Promise<{
  tenantName: string;
  tenantPhone: string;
  tenantEmail: string;
  propertyAddress: string;
  issueDescription: string;
  jobType: string;
  urgency: string;
} | null> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    console.log('[CloudMailin] No OPENAI_API_KEY — skipping AI extraction');
    return null;
  }

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0,
        max_tokens: 500,
        messages: [
          {
            role: 'system',
            content: `You are a data extraction assistant for an Australian electrical company called Wirez R Us. Extract structured job information from inbound emails. Return ONLY valid JSON with these exact fields:
{
  "tenantName": "the tenant/resident/contact person name or empty string",
  "tenantPhone": "phone number in Australian format or empty string",
  "tenantEmail": "tenant email address or empty string",
  "propertyAddress": "the full property/site address or empty string",
  "issueDescription": "a brief 1-2 sentence summary of the electrical issue",
  "jobType": "one of: SMOKE_ALARM, SAFETY_SWITCH, LIGHTING, POWER_POINT, HOT_WATER, FAN, APPLIANCE, EMERGENCY, SWITCHBOARD, GENERAL_REPAIR",
  "urgency": "one of: URGENT, HIGH, NORMAL, LOW"
}
Do not include any text outside the JSON. If a field cannot be determined, use an empty string.`
          },
          {
            role: 'user',
            content: `From: ${from}\nSubject: ${subject}\n\n${emailBody}`
          }
        ],
      }),
    });

    if (!res.ok) {
      console.error('[CloudMailin] OpenAI API error:', res.status);
      return null;
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return null;

    // Parse JSON — handle markdown code fences
    const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (err: any) {
    console.error('[CloudMailin] AI extraction error:', err.message);
    return null;
  }
}

// ─── Main handler ──────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const body = req.body || {};

    // Extract raw email fields
    const from = body.envelope?.from || body.from || '';
    const subject = body.headers?.subject || body.headers?.Subject || body.subject || 'New Work Order from Email';
    const text = body.plain || body.text || '';
    const html = body.html || '';
    const emailContent = text || (html ? html.replace(/<[^>]+>/g, '') : '') || '';
    const now = new Date();
    const combined = `${subject}\n${emailContent}`;

    console.log(`[CloudMailin] Email from: ${from} | Subject: ${subject}`);
    console.log(`[CloudMailin] Body keys: ${Object.keys(body).join(', ')}`);

    // ── Step 1: Regex extraction ──
    const regex = extractWithRegex(combined, from);
    console.log('[CloudMailin] Regex extracted:', JSON.stringify(regex, null, 2));

    // ── Step 2: AI extraction (fills gaps) ──
    const ai = await extractWithAI(emailContent, subject, from);
    if (ai) console.log('[CloudMailin] AI extracted:', JSON.stringify(ai, null, 2));

    // ── Step 3: Merge — regex wins for phone/email, AI wins for name/address/issue ──
    const tenantName = regex.tenantName || ai?.tenantName || '';
    const tenantPhone = regex.tenantPhone || ai?.tenantPhone || '';
    const tenantEmail = regex.tenantEmail || ai?.tenantEmail || '';
    const propertyAddress = regex.propertyAddress || ai?.propertyAddress || '';
    const jobType = ai?.jobType || classifyJobType(combined);
    const urgency = ai?.urgency || classifyUrgency(combined);
    const issueDescription = ai?.issueDescription || '';

    const extractionMethod = ai ? 'regex + AI' : 'regex only';

    const newJob = {
      title: subject || 'New Work Order from Email',
      type: jobType,
      status: 'INTAKE',
      urgency: urgency,
      createdAt: now.toISOString(),
      tenantName: tenantName || 'See email body',
      tenantPhone: tenantPhone || 'TBD',
      tenantEmail: tenantEmail || 'TBD',
      propertyAddress: propertyAddress || 'See email body',
      propertyManagerEmail: from,
      contactAttempts: [],
      materials: [],
      photos: [],
      siteNotes: '',
      description: `WORK ORDER — Auto-generated from inbound email\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nDate Created: ${now.toLocaleDateString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\nTime: ${now.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}\n\nFROM: ${from}\nSUBJECT: ${subject}\nTENANT: ${tenantName || 'Not identified'}\nPHONE: ${tenantPhone || 'Not found'}\nEMAIL: ${tenantEmail || 'Not found'}\nPROPERTY: ${propertyAddress || 'Not found'}\nURGENCY: ${urgency}\nTYPE: ${jobType}\n\n${issueDescription ? `ISSUE SUMMARY:\n${issueDescription}\n\n` : ''}ORIGINAL EMAIL:\n${emailContent}\n\nEXTRACTION: ${extractionMethod}\nSOURCE: CloudMailin Inbound Email`,
      source: 'email',
      extractionMethod,
    };

    // ── Step 4: Authenticate with Firebase ──
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
    const apiKey = process.env.VITE_FIREBASE_API_KEY || process.env.VITE_FB_API_KEY;

    if (!projectId || !apiKey) {
      console.error('[CloudMailin] Missing VITE_FIREBASE_PROJECT_ID or VITE_FIREBASE_API_KEY');
      return res.status(200).json({ success: false, warning: 'Firebase not configured on server' });
    }

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
      if (authData.idToken) {
        idToken = authData.idToken;
      } else {
        console.error('[CloudMailin] Auth failed:', authData.error?.message);
      }
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
      if (anonData.idToken) {
        idToken = anonData.idToken;
      } else {
        console.error('[CloudMailin] Anonymous auth failed:', anonData.error?.message);
        return res.status(200).json({ success: false, warning: 'Authentication failed - enable Anonymous auth in Firebase Console', error: anonData.error?.message });
      }
    }

    // ── Step 5: Save to Firestore ──
    const fields: any = {};
    for (const [key, value] of Object.entries(newJob)) {
      fields[key] = toFirestoreValue(value);
    }

    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/jobs?key=${apiKey}`;
    const firestoreRes = await fetch(firestoreUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
      body: JSON.stringify({ fields }),
    });

    if (!firestoreRes.ok) {
      const errText = await firestoreRes.text();
      console.error('[CloudMailin] Firestore REST error:', firestoreRes.status, errText);
      return res.status(200).json({ success: false, warning: 'Firestore write failed', error: errText });
    }

    const result = await firestoreRes.json();
    const docId = result.name?.split('/').pop() || 'unknown';
    console.log(`[CloudMailin] Job saved: ${docId} | Type: ${jobType} | Urgency: ${urgency} | Method: ${extractionMethod}`);

    return res.status(200).json({ success: true, jobId: docId, extraction: extractionMethod });

  } catch (err: any) {
    console.error('[CloudMailin] Unhandled error:', err.message, err.stack);
    return res.status(200).json({ error: 'Webhook error', details: err.message });
  }
}
