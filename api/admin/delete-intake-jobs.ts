import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
  const apiKey = process.env.VITE_FIREBASE_API_KEY || process.env.VITE_FB_API_KEY;
  const webhookEmail = process.env.WEBHOOK_AUTH_EMAIL;
  const webhookPassword = process.env.WEBHOOK_AUTH_PASSWORD;

  if (!projectId || !apiKey) return res.status(500).json({ error: 'Firebase not configured' });

  // Auth
  let idToken = '';
  if (webhookEmail && webhookPassword) {
    const authRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: webhookEmail, password: webhookPassword, returnSecureToken: true }),
    });
    const authData = await authRes.json();
    if (authData.idToken) idToken = authData.idToken;
  }
  if (!idToken) return res.status(500).json({ error: 'Firebase auth failed' });

  // Query all INTAKE jobs
  const queryUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery?key=${apiKey}`;
  const queryRes = await fetch(queryUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'jobs' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'status' },
            op: 'EQUAL',
            value: { stringValue: 'INTAKE' },
          },
        },
        limit: 200,
      },
    }),
  });

  const queryData = await queryRes.json();
  const docs = (queryData || []).filter((d: any) => d.document?.name);

  let deleted = 0;
  const errors: string[] = [];

  for (const doc of docs) {
    const docName = doc.document.name;
    const deleteUrl = `https://firestore.googleapis.com/v1/${docName}?key=${apiKey}`;
    const delRes = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${idToken}` },
    });
    if (delRes.ok) {
      deleted++;
    } else {
      errors.push(docName.split('/').pop());
    }
  }

  return res.status(200).json({ success: true, deleted, errors, total: docs.length });
}
