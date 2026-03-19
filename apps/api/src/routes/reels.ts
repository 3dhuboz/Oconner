import { Hono } from 'hono';
import type { Env } from '../types';

const reels = new Hono<{ Bindings: Env }>();

export interface ReelItem {
  id: string;
  label: string;
  sublabel: string;
  thumbnail: string | null;
  videoUrl: string | null;
  fbUrl: string;
  featured: boolean;
}

const CACHE_TTL = 3600; // 1 hour

reels.get('/', async (c) => {
  const cacheKey = new Request('https://internal/api/reels-cache');

  // Try Cloudflare Cache first
  const cache = caches.default;
  const cached = await cache.match(cacheKey);
  if (cached) {
    return new Response(cached.body, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `public, max-age=${CACHE_TTL}`,
        'X-Cache': 'HIT',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  const apiKey = c.env.ZERNIO_API_KEY;
  if (!apiKey) {
    return c.json({ reels: [], error: 'ZERNIO_API_KEY not configured' }, 200);
  }

  try {
    // Fetch published posts from Zernio (grab more than 3 so we can filter for Facebook reels)
    const res = await fetch(
      'https://zernio.com/api/v1/posts?status=published&limit=50',
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error('Zernio API error:', res.status, err);
      return c.json({ reels: [], error: `Zernio error ${res.status}` }, 200);
    }

    const data = await res.json<{ posts: ZernioPost[] }>();
    const posts: ZernioPost[] = data?.posts ?? [];

    // Filter for Facebook reel posts only
    const facebookReelPosts = posts.filter((post) => {
      const fbPlatform = post.platforms?.find((p) => p.platform === 'facebook');
      if (!fbPlatform?.platformPostUrl) return false;
      const contentType = post.platforms?.find((p) => p.platform === 'facebook')
        ?.platformSpecificData?.contentType;
      // Include reels, videos, and video posts
      return (
        contentType === 'reel' ||
        contentType === 'video' ||
        post.mediaItems?.some((m) => m.type === 'video')
      );
    });

    // Take the latest 3, mark the first (most recent) as featured
    const latest = facebookReelPosts.slice(0, 3);

    const items: ReelItem[] = latest.map((post, i) => {
      const fbPlatform = post.platforms.find((p) => p.platform === 'facebook')!;
      const videoMedia = post.mediaItems?.find((m) => m.type === 'video');
      const imageMedia = post.mediaItems?.find((m) => m.type === 'image');

      const thumbnail = imageMedia?.url ?? videoMedia?.thumbnailUrl ?? null;
      // Use original video URL as hover snippet (direct CDN URL from Zernio upload)
      const videoUrl = videoMedia?.url ?? null;

      // Build a readable label from the post content (first line / first 40 chars)
      const rawContent = (post.content ?? '').trim();
      const firstLine = rawContent.split('\n')[0].replace(/[#*_]/g, '').trim();
      const label = firstLine.length > 45 ? firstLine.slice(0, 42) + '…' : firstLine || 'Latest Reel';

      // Sublabel from publish date
      const date = new Date(post.publishedAt ?? post.scheduledFor ?? post.createdAt);
      const sublabel = date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });

      return {
        id: post._id,
        label,
        sublabel,
        thumbnail,
        videoUrl,
        fbUrl: fbPlatform.platformPostUrl!,
        featured: i === 0,
      };
    });

    const body = JSON.stringify({ reels: items });

    // Store in Cloudflare Cache for 1 hour
    const cacheResponse = new Response(body, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `public, max-age=${CACHE_TTL}`,
      },
    });
    c.executionCtx?.waitUntil(cache.put(cacheKey, cacheResponse.clone()));

    return new Response(body, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `public, max-age=${CACHE_TTL}`,
        'X-Cache': 'MISS',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    console.error('reels fetch error:', err);
    return c.json({ reels: [], error: 'Failed to fetch reels' }, 200);
  }
});

// ── Zernio response types ─────────────────────────────────────────────────────
interface ZernioPost {
  _id: string;
  content: string | null;
  status: string;
  createdAt: string;
  scheduledFor: string | null;
  publishedAt: string | null;
  mediaItems?: Array<{
    type: 'image' | 'video';
    url: string;
    thumbnailUrl?: string;
  }>;
  platforms: Array<{
    platform: string;
    accountId: string;
    platformPostUrl?: string | null;
    platformSpecificData?: {
      contentType?: string;
      [key: string]: unknown;
    };
  }>;
}

export { reels };
