import type { AppRequest, AppResponse } from '../_handler';
import { getDb, newId, decodeRow } from '../_db';

// ─── Regex extraction ──────────────────────────────────────────
function extractWithRegex(text: string, senderEmail: string) {
  // Australian phone numbers: 04xx, (0x) xxxx, +61, landline patterns
  const phonePatterns = [
    /(?:\+?61|0)[2-478](?:[\s-]?\d){8}/g,
    /(?:\+?61|0)4\d{2}[\s-]?\d{3}[\s-]?\d{3}/g,
    /\(0[2-9]\)\s?\d{4}\s?\d{4}/g,
    /\b\d{4}[\s-]\d{3}[\s-]\d{3}\b/g,
    /\b1[38]00[\s-]?\d{3}[\s-]?\d{3}\b/g,
  ];

  // Email addresses (exclude the sender)
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

  // Australian street addresses
  const addressPatterns = [
    /\d{1,5}[\/\-]?\d{0,5}\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:St|Street|Rd|Road|Ave|Avenue|Dr|Drive|Ct|Court|Pl|Place|Cres|Crescent|Blvd|Boulevard|Way|Lane|Ln|Tce|Terrace|Pde|Parade|Cir|Circuit|Close|Cl)\b[,.\s]*(?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)?[,.\s]*(?:NSW|VIC|QLD|SA|WA|TAS|NT|ACT)?[,.\s]*\d{4}/gi,
    /(?:Unit|Apt|Lot|Suite)\s*\d+[,\/\s]+\d+\s+[A-Za-z\s]+(?:St|Street|Rd|Road|Ave|Avenue|Dr|Drive)\b[^,\n]*\d{4}/gi,
  ];

  // ── Exact-label patterns matching the work order form output ──
  // Form sends lines like: "PROPERTY ADDRESS: 123 Main St"
  const label = (pattern: string) =>
    new RegExp(`^[ \\t]*${pattern}[ \\t]*:[ \\t]*(.+)$`, 'im');

  const labelledAddress   = text.match(label('PROPERTY\\s+ADDRESS'))
                         || text.match(label('PROPERTY'))
                         || text.match(label('ADDRESS'));
  const labelledTenantName = text.match(label('TENANT\\s+(?:FULL\\s+)?NAME'))
                          || text.match(label('TENANT'));
  const labelledTenantPhone = text.match(label('TENANT\\s+PHONE'))
                           || text.match(label('PHONE|MOBILE|TEL'));
  const labelledTenantEmail = text.match(label('TENANT\\s+EMAIL'))
                           || text.match(label('EMAIL|E-MAIL'));
  const labelledPMName    = text.match(label('PROPERTY\\s+MANAGER(?:\\s+NAME)?'));
  const labelledPMEmail   = text.match(label('PROPERTY\\s+MANAGER\\s+EMAIL'));
  const labelledAgency    = text.match(label('AGENCY'));
  const labelledJobType   = text.match(label('JOB\\s+TYPE'));
  const labelledUrgency   = text.match(label('URGENCY'));
  const labelledAccess    = text.match(label('ACCESS\\s+(?:INSTRUCTIONS?|TYPE|CODE|DETAILS?)'));
  const labelledPrefDate  = text.match(label('PREFERRED\\s+DATE(?:\\/TIME)?'));
  const labelledNotAvail  = text.match(label('NOT\\s+AVAILABLE'));

  // Multi-line description: grab everything after "DESCRIPTION OF ISSUE:" until the next ALL-CAPS label or separator
  const descMatch = text.match(/DESCRIPTION\s+OF\s+ISSUE\s*:\s*\n([\s\S]*?)(?=\n[A-Z\s]{4,}:|={4,}|$)/i);

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
    tenantName:    labelledTenantName?.[1]?.trim() || '',
    tenantPhone:   labelledTenantPhone?.[1]?.trim() || phones[0] || '',
    tenantEmail:   labelledTenantEmail?.[1]?.trim() || emails[0] || '',
    propertyAddress: labelledAddress?.[1]?.trim() || addresses[0] || '',
    pmName:        labelledPMName?.[1]?.trim() || '',
    pmEmail:       labelledPMEmail?.[1]?.trim() || '',
    agency:        labelledAgency?.[1]?.trim() || '',
    jobTypeLabel:  labelledJobType?.[1]?.trim() || '',
    urgencyLabel:  labelledUrgency?.[1]?.trim() || '',
    accessInstructions: labelledAccess?.[1]?.trim() || '',
    preferredDate: labelledPrefDate?.[1]?.trim() || '',
    notAvailable:  labelledNotAvail?.[1]?.trim() || '',
    description:   descMatch?.[1]?.trim() || '',
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
export interface AIExtractionResult {
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
  // Confidence scores 0-1 per field
  confidence: {
    tenantName: number;
    tenantPhone: number;
    tenantEmail: number;
    propertyAddress: number;
    issueDescription: number;
    overall: number;
  };
  detectedSoftware: string; // e.g. "PropertyMe", "PropertyTree", "Console Cloud", "unknown"
  needsReview: boolean;     // true if overall confidence < 0.7 or critical fields missing
}

async function extractWithAI(emailBody: string, subject: string, from: string): Promise<AIExtractionResult | null> {
  const openaiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    console.log('[Email Webhook] No OPENROUTER_API_KEY — skipping AI extraction');
    return null;
  }

  try {
    const isOpenRouter = !!process.env.OPENROUTER_API_KEY;
    const apiUrl = isOpenRouter
      ? 'https://openrouter.ai/api/v1/chat/completions'
      : 'https://api.openai.com/v1/chat/completions';
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
        ...(isOpenRouter ? { 'HTTP-Referer': 'https://wireznrus.com.au', 'X-Title': 'Wirez R Us Email Webhook' } : {}),
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0,
        max_tokens: 900,
        messages: [
          {
            role: 'system',
            content: `You are an expert data extraction agent for Wirez R Us, an Australian electrical contractor. Your job is to extract structured work order information from emails sent by Australian real estate property managers.

You must handle ANY format — these emails come from many different property management software systems including but not limited to:
- PropertyMe (fields like "Maintenance Request", "Property:", "Tenant:", "Trade Type:")
- PropertyTree / REST Professional (fields like "Work Order #", "Tenancy:", "Property Address:", "Trade:", "Instructions:")
- Console Cloud / Gateway (fields like "Job #", "Applicant:", "Property:", "Description of works:")
- Rex PM (fields like "Maintenance Job", "Property", "Contact", "Description")
- MRI Software / Palace (fields like "Reference:", "Premises:", "Occupant:")
- Inspection Express / Inspection Manager (PDF/email exports with structured tables)
- Buildium, AppFolio (US-style PM software sometimes used in AU)
- Manual emails from property managers typed directly
- Forwarded work orders in any format
- Scanned/OCR'd documents pasted into email body

Key extraction rules:
1. "Property address" is the address of the property needing work (not the agency's address)
2. "Tenant" is the occupant/resident who lives there (also called "applicant", "occupant", "resident", "contact")
3. "Property manager" is the agent/real estate contact (the sender or a CC'd person)
4. Phone numbers: normalise to Australian format (04xx xxx xxx or (0x) xxxx xxxx)
5. Urgency: look for words like urgent/emergency/ASAP/safety hazard/sparking/no power → URGENT; soon/priority → HIGH; routine/when available → LOW; otherwise NORMAL
6. For issueDescription: write a clear 1-3 sentence summary of exactly what the electrical problem is and where in the property

Return ONLY valid JSON with exactly these fields (no text outside the JSON):
{
  "tenantName": "full name of tenant/occupant or empty string",
  "tenantPhone": "tenant phone in Australian format or empty string",
  "tenantEmail": "tenant email or empty string",
  "propertyAddress": "full street address of the property including suburb, state, postcode or empty string",
  "issueDescription": "clear 1-3 sentence description of the electrical issue and location in property",
  "jobType": "one of: SMOKE_ALARM, SAFETY_SWITCH, LIGHTING, POWER_POINT, HOT_WATER, FAN, APPLIANCE, EMERGENCY, SWITCHBOARD, GENERAL_REPAIR",
  "urgency": "one of: URGENT, HIGH, NORMAL, LOW",
  "pmName": "property manager name or empty string",
  "pmEmail": "property manager email or empty string",
  "agency": "real estate agency name or empty string",
  "accessInstructions": "any access codes, key location, entry instructions, or empty string",
  "preferredDate": "any preferred or requested date/time for attendance or empty string",
  "confidence": {
    "tenantName": 0.0,
    "tenantPhone": 0.0,
    "tenantEmail": 0.0,
    "propertyAddress": 0.0,
    "issueDescription": 0.0,
    "overall": 0.0
  },
  "detectedSoftware": "name of PM software detected (PropertyMe/PropertyTree/Console/Rex/MRI/Manual/Unknown)"
}

For confidence scores: 1.0 = field explicitly labelled and unambiguous, 0.7 = reasonably certain, 0.4 = inferred/guessed, 0.0 = not found.
Overall confidence = average of the 5 critical field confidence scores.`
          },
          {
            role: 'user',
            content: `From: ${from}\nSubject: ${subject}\n\n${emailBody.substring(0, 4000)}`
          }
        ],
      }),
    });

    if (!res.ok) {
      console.error('[Email Webhook] OpenAI API error:', res.status, await res.text());
      return null;
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return null;

    // Parse JSON — handle markdown code fences
    const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(jsonStr) as AIExtractionResult;

    // Compute needsReview: flag if overall confidence < 0.7 or critical fields missing
    const overall = parsed.confidence?.overall ?? 0;
    const missingCritical = !parsed.propertyAddress || !parsed.issueDescription;
    parsed.needsReview = overall < 0.7 || missingCritical;

    return parsed;
  } catch (err: any) {
    console.error('[Email Webhook] AI extraction error:', err.message);
    return null;
  }
}

// ─── Main handler ──────────────────────────────────────────────
export default async function handler(req: AppRequest, res: AppResponse) {
  // GET = diagnostic check
  if (req.method === 'GET') {
    const checks = {
      endpoint: '✅ /api/webhooks/email is reachable',
      database: req.env?.DB ? '✅ D1 binding present' : '⚠️ No DB binding (jobs will not be saved)',
      OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY ? '✅ set (AI extraction enabled)' : '⚠️ missing (regex-only extraction)',
    };
    return res.status(200).json({ status: 'Email webhook diagnostic', checks });
  }

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
    let emailContent = text || (html ? html.replace(/<[^>]+>/g, '') : '') || '';

    // Normalise: replace literal \n (two chars: backslash + n) → real newline
    // and \r\n → \n so multiline regex anchors work correctly
    emailContent = emailContent
      .replace(/\\r\\n/g, '\n')
      .replace(/\\n/g, '\n')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');

    const now = new Date();
    const combined = `${subject}\n${emailContent}`;

    console.log(`[Email Webhook] Email from: ${from} | Subject: ${subject}`);
    console.log(`[Email Webhook] Body keys: ${Object.keys(body).join(', ')}`);

    // ── Step 1: Regex extraction ──
    const regex = extractWithRegex(combined, from);
    console.log('[Email Webhook] Regex extracted:', JSON.stringify(regex, null, 2));

    // ── Step 2: AI extraction (fills gaps) ──
    const ai = await extractWithAI(emailContent, subject, from);
    if (ai) console.log('[Email Webhook] AI extracted:', JSON.stringify(ai, null, 2));

    // ── Step 3: Merge — regex label wins first, then AI fills gaps ──
    const tenantName      = regex.tenantName      || ai?.tenantName      || '';
    const tenantPhone     = regex.tenantPhone     || ai?.tenantPhone     || '';
    const tenantEmail     = regex.tenantEmail     || ai?.tenantEmail     || '';
    const propertyAddress = regex.propertyAddress || ai?.propertyAddress || '';
    const pmEmail         = regex.pmEmail         || ai?.pmEmail         || '';
    const pmName          = regex.pmName          || ai?.pmName          || '';
    const agency          = regex.agency          || ai?.agency          || '';
    const accessInstructions = regex.accessInstructions || ai?.accessInstructions || '';
    const preferredDate   = regex.preferredDate   || ai?.preferredDate   || '';
    const notAvailable    = regex.notAvailable    || '';

    // Urgency: labelled field wins, then AI, then keyword-classify
    const urgencyRaw = regex.urgencyLabel || ai?.urgency || classifyUrgency(combined);
    const urgency = /emergency/i.test(urgencyRaw) ? 'URGENT'
                  : /urgent/i.test(urgencyRaw)    ? 'URGENT'
                  : /high/i.test(urgencyRaw)      ? 'HIGH'
                  : /low|routine/i.test(urgencyRaw) ? 'LOW'
                  : 'NORMAL';

    // Job type: labelled field wins, then AI, then keyword-classify
    const jobTypeRaw = regex.jobTypeLabel || ai?.jobType || '';
    const jobType = jobTypeRaw
      ? (/smoke/i.test(jobTypeRaw) ? 'SMOKE_ALARM'
       : /install/i.test(jobTypeRaw) ? 'INSTALLATION'
       : 'GENERAL_REPAIR')
      : classifyJobType(combined);

    // Description: labelled field wins, then AI summary, then fallback
    const issueDescription = regex.description || ai?.issueDescription || '';

    const extractionMethod = ai ? `regex + AI (${ai.detectedSoftware || 'Unknown'})` : 'regex only';
    const aiConfidence = ai?.confidence ?? null;
    const aiNeedsReview = ai ? ai.needsReview : true; // if no AI, always flag for review
    const detectedSoftware = ai?.detectedSoftware || '';

    // Build a useful title: prefer "Job Type — Address" over raw subject
    const titleAddress = propertyAddress ? propertyAddress.split(',')[0] : '';
    const titleType = jobTypeRaw
      ? jobTypeRaw.replace(/Electrical Fault \/ Repair/i, 'Electrical Fault')
      : jobType.replace(/_/g, ' ');
    const jobTitle = titleAddress
      ? `${titleType} — ${titleAddress}`
      : subject || 'New Work Order from Email';

    const newJob: Record<string, any> = {
      title: jobTitle,
      type: jobType,
      status: 'INTAKE',
      urgency,
      createdAt: now.toISOString(),
      tenantName:           tenantName    || '',
      tenantPhone:          tenantPhone   || '',
      tenantEmail:          tenantEmail   || '',
      propertyAddress:      propertyAddress || '',
      propertyManagerEmail: pmEmail || from,
      propertyManagerName:  pmName || '',
      agency:               agency || '',
      accessCodes:          accessInstructions || '',
      contactAttempts: [],
      materials: [],
      photos: [],
      siteNotes: preferredDate
        ? `Preferred attendance: ${preferredDate}${notAvailable ? `\nNot available: ${notAvailable}` : ''}`
        : '',
      description: issueDescription || '',
      source: 'email',
      extractionMethod,
      detectedSoftware,
      aiNeedsReview,
      rawEmailFrom:    from,
      rawEmailSubject: subject,
      rawEmailBody:    emailContent,
      rawEmailHtml:    html || '',
    };

    // Save confidence scores if AI ran
    if (aiConfidence) {
      newJob.aiConfidence = aiConfidence;
    }

    // ── Step 4: Duplicate detection via D1 ──
    let duplicateJobId: string | null = null;
    let duplicateAction: 'created_new' | 'appended_to_existing' | 'flagged_duplicate' = 'created_new';

    if (propertyAddress && req.env?.DB) {
      try {
        const db = getDb(req.env);
        const rows = await db.prepare(
          `SELECT id, data FROM jobs WHERE status != 'CLOSED' AND json_extract(data, '$.propertyAddress') = ? AND json_extract(data, '$.source') = 'email' LIMIT 5`
        ).bind(propertyAddress).all<{ id: string; data: string }>();

        const activeJobs = rows.results || [];
        if (activeJobs.length > 0) {
          const existingJob = decodeRow(activeJobs[0]);
          const existingId = existingJob.id;
          console.log(`[Email Webhook] Duplicate detected: active job ${existingId} at ${propertyAddress}`);

          const existingNotes = existingJob.siteNotes || '';
          const followUpNote = `\n\n━━━ Follow-up email (${now.toISOString()}) ━━━\nFrom: ${from}\nSubject: ${subject}\n${issueDescription || emailContent.substring(0, 500)}`;
          const updatedJob = { ...existingJob, siteNotes: existingNotes + followUpNote, hasFollowUpEmail: true, lastFollowUpAt: now.toISOString() };

          await db.prepare(`UPDATE jobs SET data = ?, updated_at = ? WHERE id = ?`)
            .bind(JSON.stringify(updatedJob), now.toISOString(), existingId).run();

          duplicateJobId = existingId;
          duplicateAction = 'appended_to_existing';
          console.log(`[Email Webhook] Follow-up appended to existing job ${existingId}`);
        }
      } catch (dupErr: any) {
        console.warn('[Email Webhook] Duplicate check failed (non-fatal):', dupErr.message);
      }
    }

    if (duplicateJobId && duplicateAction === 'appended_to_existing') {
      return res.status(200).json({
        success: true, action: 'appended_to_existing', existingJobId: duplicateJobId,
        message: `Follow-up email appended to existing active job ${duplicateJobId} at ${propertyAddress}`,
        extraction: extractionMethod,
      });
    }

    // ── Step 5: Save new job to D1 ──
    newJob.emailProcessed = true;
    newJob.emailProcessedAt = now.toISOString();

    const docId = newId();
    const jobToSave: any = { ...newJob, id: docId };

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
      console.warn('[Email Webhook] No DB binding — job not persisted');
    }

    console.log(`[Email Webhook] Job saved: ${docId} | Type: ${jobType} | Urgency: ${urgency} | Method: ${extractionMethod}`);
    return res.status(200).json({ success: true, jobId: docId, action: 'created_new', extraction: extractionMethod });

  } catch (err: any) {
    console.error('[Email Webhook] Unhandled error:', err.message, err.stack);
    return res.status(200).json({ error: 'Webhook error', details: err.message });
  }
}
