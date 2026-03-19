import type { AppRequest, AppResponse } from '../_handler';

export default async function handler(req: AppRequest, res: AppResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Jobs are fetched directly via /api/data/jobs with polling on the frontend.
  res.json({ jobs: [] });
}
