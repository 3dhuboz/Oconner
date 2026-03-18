import type { AppRequest, AppResponse } from '../_handler';
import { newId } from '../_db';

export default async function handler(req: AppRequest, res: AppResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const r2: any = req.env?.R2;

  const { fileName, contentType, base64 } = req.body || {};
  if (!fileName || !base64) return res.status(400).json({ error: 'fileName and base64 required' });

  const key = `uploads/${newId()}-${fileName}`;

  try {
    if (r2) {
      // Production: Cloudflare R2
      const binary = Buffer.from(base64, 'base64');
      await r2.put(key, binary, { httpMetadata: { contentType: contentType || 'application/octet-stream' } });
      const publicUrl = `${process.env.R2_PUBLIC_URL || ''}/${key}`;
      return res.json({ url: publicUrl, key });
    }

    // Dev fallback: serve from /tmp and return a data-URL placeholder
    console.log(`[Storage Dev] Would upload ${key} (R2 not configured in dev)`);
    const dataUrl = `data:${contentType || 'image/jpeg'};base64,${base64}`;
    return res.json({ url: dataUrl, key, simulated: true });
  } catch (err: any) {
    console.error('[storage/upload]', err.message);
    res.status(500).json({ error: err.message });
  }
}
