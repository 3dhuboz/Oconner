import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { subject, text, from, tenantName, tenantPhone, address } = req.body;

  const newJob = {
    id: `WRU-${Math.floor(1000 + Math.random() * 9000)}`,
    title: subject || 'New Work Order from Email',
    type: subject?.toLowerCase().includes('smoke') ? 'SMOKE_ALARM' : 'GENERAL_REPAIR',
    status: 'INTAKE',
    createdAt: new Date().toISOString(),
    tenantName: tenantName || 'Unknown (Parse from email)',
    tenantPhone: tenantPhone || 'TBD',
    tenantEmail: 'TBD',
    propertyAddress: address || 'See email body',
    propertyManagerEmail: from || 'pm@example.com',
    contactAttempts: [],
    materials: [],
    photos: [],
    siteNotes: text || 'No description provided.',
  };

  console.log(`[Email Webhook] Received new job: ${newJob.title}`);
  res.status(200).json({ success: true, job: newJob });
}
