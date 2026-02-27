import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function getDb() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.VITE_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  }
  return getFirestore();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // CloudMailin sends JSON with envelope, headers, plain, html fields
  const body = req.body;

  // Extract fields from CloudMailin format
  const from = body.envelope?.from || body.from || '';
  const subject = body.headers?.subject || body.headers?.Subject || body.subject || 'New Work Order from Email';
  const text = body.plain || body.text || '';
  const html = body.html || '';
  const emailContent = text || html.replace(/<[^>]+>/g, '') || '';

  const jobId = `WRU-${Math.floor(1000 + Math.random() * 9000)}`;

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

  // Save to Firestore if Firebase Admin is configured
  const hasFirebaseAdmin = process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY;

  if (hasFirebaseAdmin) {
    try {
      const db = getDb();
      const docRef = await db.collection('jobs').add(newJob);
      console.log(`[CloudMailin Webhook] Job saved to Firestore: ${docRef.id}`);
      return res.status(200).json({ success: true, jobId: docRef.id, job: newJob });
    } catch (err: any) {
      console.error('[CloudMailin Webhook] Firestore error:', err.message);
      return res.status(500).json({ error: 'Failed to save job', details: err.message });
    }
  }

  // Firebase Admin not configured - return success but note job wasn't persisted
  console.warn('[CloudMailin Webhook] Firebase Admin not configured - job not persisted to database');
  return res.status(200).json({ success: true, job: newJob, warning: 'Firebase Admin not configured' });
}
