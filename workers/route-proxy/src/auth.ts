/** Simplified Clerk JWT verification for workers */

function b64url(s: string): Uint8Array {
  return Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
}

const jwksCache = new Map<string, { keys: ({ kid: string } & JsonWebKey)[]; ts: number }>();

export async function verifyClerkJWT(
  authHeader: string | null,
): Promise<{ clerkId: string; email: string } | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const header = JSON.parse(new TextDecoder().decode(b64url(parts[0]))) as { kid: string };
    const payload = JSON.parse(new TextDecoder().decode(b64url(parts[1]))) as {
      sub: string; iss: string; exp: number; nbf?: number; email?: string;
    };

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) return null;
    if (payload.nbf && payload.nbf > now + 5) return null;

    const iss = payload.iss ?? '';
    if (!iss.includes('clerk')) return null;

    const cached = jwksCache.get(iss);
    let keys = cached && (Date.now() - cached.ts < 300_000) ? cached.keys : null;
    if (!keys) {
      const res = await fetch(`${iss}/.well-known/jwks.json`);
      if (!res.ok) return null;
      const jwks = await res.json() as { keys: ({ kid: string } & JsonWebKey)[] };
      keys = jwks.keys;
      jwksCache.set(iss, { keys, ts: Date.now() });
    }

    const jwk = keys.find((k) => k.kid === header.kid);
    if (!jwk) return null;

    const cryptoKey = await crypto.subtle.importKey(
      'jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify'],
    );
    const sig = b64url(parts[2]);
    const data = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
    const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', cryptoKey, sig, data);

    if (!valid) return null;
    return { clerkId: payload.sub, email: payload.email ?? '' };
  } catch {
    return null;
  }
}
