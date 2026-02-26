import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // In serverless, there is no persistent in-memory queue.
  // Jobs are synced via Firebase in real-time on the frontend.
  res.json({ jobs: [] });
}
