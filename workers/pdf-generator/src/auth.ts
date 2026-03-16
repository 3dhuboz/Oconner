export async function verifyFirebaseJWT(
  token: string,
  projectId: string,
): Promise<{ uid: string; role?: string; email?: string }> {
  const keysRes = await fetch(
    'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com',
  );
  const keys: Record<string, string> = await keysRes.json();
  const [headerB64, payloadB64] = token.split('.');
  const header = JSON.parse(atob(headerB64.replace(/-/g, '+').replace(/_/g, '/')));
  if (!keys[header.kid]) throw new Error('Unknown key ID');
  const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'))) as {
    iss: string; aud: string; sub: string; exp: number; role?: string; email?: string;
  };
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) throw new Error('Token expired');
  if (payload.aud !== projectId) throw new Error('Invalid audience');
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) throw new Error('Invalid issuer');
  return { uid: payload.sub, role: payload.role, email: payload.email };
}

export async function getServiceAccountToken(env: {
  FIREBASE_CLIENT_EMAIL: string;
  FIREBASE_PRIVATE_KEY: string;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = btoa(JSON.stringify({
    iss: env.FIREBASE_CLIENT_EMAIL,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600, iat: now,
  }));
  const pem = env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    .replace('-----BEGIN PRIVATE KEY-----', '').replace('-----END PRIVATE KEY-----', '').replace(/\s/g, '');
  const keyDer = Uint8Array.from(atob(pem), (c: string) => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', keyDer, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign({ name: 'RSASSA-PKCS1-v1_5' }, cryptoKey, new TextEncoder().encode(`${header}.${claim}`));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${header}.${claim}.${sigB64}` }),
  });
  return ((await tokenRes.json()) as { access_token: string }).access_token;
}
