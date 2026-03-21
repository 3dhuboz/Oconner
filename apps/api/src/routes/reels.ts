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

const FB_PAGE_ID = '61574996320860';
const GRAPH_API = 'https://graph.facebook.com/v21.0';
const CACHE_TTL = 3600; // 1 hour

reels.get('/', async (c) => {
  const cacheKey = new Request('https://internal/api/reels-cache');
  const cache = caches.default;

  // Try cache first
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

  let items: ReelItem[] = [];

  // ── Try Facebook Graph API first ──
  const fbToken = c.env.FB_PAGE_ACCESS_TOKEN;
  if (fbToken) {
    try {
      items = await fetchFromFacebook(fbToken);
    } catch (err) {
      console.error('Facebook Graph API error:', err);
    }
  }

  // ── Fallback to Zernio ──
  if (items.length === 0) {
    const zernioKey = c.env.ZERNIO_API_KEY;
    if (zernioKey) {
      try {
        items = await fetchFromZernio(zernioKey);
      } catch (err) {
        console.error('Zernio API error:', err);
      }
    }
  }

  const body = JSON.stringify({ reels: items });

  // Cache for 1 hour
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
});

// ── Facebook Graph API ──────────────────────────────────────────────────────

async function fetchFromFacebook(accessToken: string): Promise<ReelItem[]> {
  const fields = 'id,title,description,source,picture,permalink_url,created_time,length';
  const url = `${GRAPH_API}/${FB_PAGE_ID}/videos?fields=${fields}&limit=6&access_token=${accessToken}`;

  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.text();
    console.error('FB Graph error:', res.status, err);
    return [];
  }

  const data = await res.json<{ data: FBVideo[] }>();
  const videos = data?.data ?? [];

  if (videos.length === 0) return [];

  // Take latest 3 videos, mark first as featured
  const latest = videos.slice(0, 3);

  return latest.map((video, i) => {
    const rawDesc = (video.description ?? video.title ?? '').trim();
    const firstLine = rawDesc.split('\n')[0].replace(/[#*_]/g, '').trim();
    const label = firstLine.length > 45 ? firstLine.slice(0, 42) + '…' : firstLine || 'Latest Reel';

    const date = new Date(video.created_time);
    const sublabel = date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });

    // Build the Facebook watch URL
    const fbUrl = video.permalink_url
      ? `https://www.facebook.com${video.permalink_url}`
      : `https://www.facebook.com/${FB_PAGE_ID}/videos/${video.id}`;

    return {
      id: video.id,
      label,
      sublabel,
      thumbnail: video.picture ?? null,
      videoUrl: video.source ?? null,
      fbUrl,
      featured: i === 0,
    };
  });
}

interface FBVideo {
  id: string;
  title?: string;
  description?: string;
  source?: string;
  picture?: string;
  permalink_url?: string;
  created_time: string;
  length?: number;
}

// ── Zernio fallback ─────────────────────────────────────────────────────────

async function fetchFromZernio(apiKey: string): Promise<ReelItem[]> {
  const res = await fetch(
    'https://zernio.com/api/v1/posts?status=published&limit=50',
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!res.ok) return [];

  const data = await res.json<{ posts: ZernioPost[] }>();
  const posts: ZernioPost[] = data?.posts ?? [];

  const facebookReelPosts = posts.filter((post) => {
    const fbPlatform = post.platforms?.find((p) => p.platform === 'facebook');
    if (!fbPlatform?.platformPostUrl) return false;
    const contentType = fbPlatform.platformSpecificData?.contentType;
    return (
      contentType === 'reel' ||
      contentType === 'video' ||
      post.mediaItems?.some((m) => m.type === 'video')
    );
  });

  const latest = facebookReelPosts.slice(0, 3);

  return latest.map((post, i) => {
    const fbPlatform = post.platforms.find((p) => p.platform === 'facebook')!;
    const videoMedia = post.mediaItems?.find((m) => m.type === 'video');
    const imageMedia = post.mediaItems?.find((m) => m.type === 'image');

    const thumbnail = imageMedia?.url ?? videoMedia?.thumbnailUrl ?? null;
    const videoUrl = videoMedia?.url ?? null;

    const rawContent = (post.content ?? '').trim();
    const firstLine = rawContent.split('\n')[0].replace(/[#*_]/g, '').trim();
    const label = firstLine.length > 45 ? firstLine.slice(0, 42) + '…' : firstLine || 'Latest Reel';

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
}

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
