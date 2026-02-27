import type { VercelRequest, VercelResponse } from '@vercel/node';

// Convert a JS value to Firestore REST API format
function toFirestoreValue(val: any): any {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'number') return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (Array.isArray(val)) return { arrayValue: { values: val.map(toFirestoreValue) } };
  if (typeof val === 'object') {
    const fields: any = {};
    for (const [k, v] of Object.entries(val)) {
      fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const body = req.body || {};

    // Extract fields - support CloudMailin, SendGrid, and generic formats
    const from = body.envelope?.from || body.from || '';
    const subject = body.headers?.subject || body.headers?.Subject || body.subject || 'New Work Order from Email';
    const text = body.plain || body.text || '';
    const html = body.html || '';
    const emailContent = text || (html ? html.replace(/<[^>]+>/g, '') : '') || '';
    const now = new Date();

    const newJob = {
      title: subject || 'New Work Order from Email',
      type: subject.toLowerCase().includes('smoke') ? 'SMOKE_ALARM' : 'GENERAL_REPAIR',
      status: 'INTAKE',
      createdAt: now.toISOString(),
      tenantName: 'See email body',
      tenantPhone: 'TBD',
      tenantEmail: 'TBD',
      propertyAddress: 'See email body',
      propertyManagerEmail: from,
      contactAttempts: [],
      materials: [],
      photos: [],
      siteNotes: '',
      description: `WORK ORDER — Auto-generated from inbound email\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nDate Created: ${now.toLocaleDateString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\nTime: ${now.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}\n\nFROM: ${from}\nSUBJECT: ${subject}\n\nEMAIL BODY:\n${emailContent}\n\nSOURCE: CloudMailin Inbound Email`,
      source: 'email',
    };

    console.log(`[CloudMailin] Email from: ${from} | Subject: ${subject}`);
    console.log(`[CloudMailin] Body keys: ${Object.keys(body).join(', ')}`);

    // Use Firestore REST API with Firebase Auth
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
    const apiKey = process.env.VITE_FIREBASE_API_KEY || process.env.VITE_FB_API_KEY;

    if (!projectId || !apiKey) {
      console.error('[CloudMailin] Missing VITE_FIREBASE_PROJECT_ID or VITE_FIREBASE_API_KEY');
      return res.status(200).json({ success: false, warning: 'Firebase not configured on server' });
    }

    // Step 1: Sign in with email/password or anonymously to get an auth token
    // Try service account email first, fall back to anonymous auth
    let idToken = '';
    
    const webhookEmail = process.env.WEBHOOK_AUTH_EMAIL;
    const webhookPassword = process.env.WEBHOOK_AUTH_PASSWORD;

    if (webhookEmail && webhookPassword) {
      // Sign in with dedicated webhook service account
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
        console.log('[CloudMailin] Authenticated as webhook service account');
      } else {
        console.error('[CloudMailin] Auth failed:', authData.error?.message);
      }
    }
    
    if (!idToken) {
      // Fall back to anonymous sign-in
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
        console.log('[CloudMailin] Authenticated anonymously');
      } else {
        console.error('[CloudMailin] Anonymous auth failed:', anonData.error?.message);
        return res.status(200).json({ success: false, warning: 'Authentication failed - enable Anonymous auth in Firebase Console', error: anonData.error?.message });
      }
    }

    // Step 2: Build Firestore document fields
    const fields: any = {};
    for (const [key, value] of Object.entries(newJob)) {
      fields[key] = toFirestoreValue(value);
    }

    // Step 3: POST to Firestore REST API with auth token
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
    console.log(`[CloudMailin] Job saved to Firestore: ${docId}`);

    return res.status(200).json({ success: true, jobId: docId });

  } catch (err: any) {
    console.error('[CloudMailin] Unhandled error:', err.message, err.stack);
    return res.status(200).json({ error: 'Webhook error', details: err.message });
  }
}
