import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // CloudMailin sends JSON with envelope, headers, plain, html fields
    const body = req.body || {};

    // Extract fields - support CloudMailin, SendGrid, and generic formats
    const from = body.envelope?.from || body.from || '';
    const subject = body.headers?.subject || body.headers?.Subject || body.subject || 'New Work Order from Email';
    const text = body.plain || body.text || '';
    const html = body.html || '';
    const emailContent = text || (html ? html.replace(/<[^>]+>/g, '') : '') || '';

    const newJob = {
      title: subject,
      type: subject.toLowerCase().includes('smoke') ? 'SMOKE_ALARM' : 'GENERAL_REPAIR',
      status: 'INTAKE',
      createdAt: new Date().toISOString(),
      tenantName: 'See email body',
      tenantPhone: 'TBD',
      tenantEmail: 'TBD',
      propertyAddress: 'See email body',
      propertyManagerEmail: from,
      contactAttempts: [],
      materials: [],
      photos: [],
      siteNotes: '',
      description: `From: ${from}\nSubject: ${subject}\n\n${emailContent}`,
      source: 'email',
    };

    console.log(`[CloudMailin Webhook] Received email from: ${from} | Subject: ${subject}`);
    console.log(`[CloudMailin Webhook] Raw body keys: ${Object.keys(body).join(', ')}`);

    // Save to Firestore if Firebase Admin is configured
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (projectId && clientEmail && privateKey) {
      try {
        const admin = await import('firebase-admin');
        
        if (!admin.apps.length) {
          admin.initializeApp({
            credential: admin.credential.cert({
              projectId,
              clientEmail,
              privateKey: privateKey.replace(/\\n/g, '\n'),
            }),
          });
        }
        
        const db = admin.firestore();
        const docRef = await db.collection('jobs').add(newJob);
        console.log(`[CloudMailin Webhook] Job saved to Firestore: ${docRef.id}`);
        return res.status(200).json({ success: true, jobId: docRef.id, job: newJob });
      } catch (err: any) {
        console.error('[CloudMailin Webhook] Firestore error:', err.message);
        // Still return 200 so CloudMailin doesn't retry endlessly
        return res.status(200).json({ success: true, job: newJob, warning: 'Firestore save failed: ' + err.message });
      }
    }

    // Firebase Admin not configured - return success but note job wasn't persisted
    console.warn('[CloudMailin Webhook] Firebase Admin not configured - job not persisted');
    console.warn('[CloudMailin Webhook] Missing env vars:', {
      hasProjectId: !!projectId,
      hasClientEmail: !!clientEmail,
      hasPrivateKey: !!privateKey,
    });
    return res.status(200).json({ success: true, job: newJob, warning: 'Firebase Admin not configured - job logged but not saved' });

  } catch (err: any) {
    console.error('[CloudMailin Webhook] Unhandled error:', err.message, err.stack);
    return res.status(200).json({ error: 'Webhook processing error', details: err.message });
  }
}
