export interface Env {
  FIREBASE_PROJECT_ID: string;
  FIREBASE_CLIENT_EMAIL: string;
  FIREBASE_PRIVATE_KEY: string;
}

/** Verify a Firebase ID token using Google's public keys */
export async function verifyFirebaseJWT(
  token: string,
  projectId: string,
): Promise<{ uid: string; role?: string; email?: string }> {
  const keysRes = await fetch(
    'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com',
  );
  const keys: Record<string, string> = await keysRes.json();

  const [headerB64, payloadB64, sigB64] = token.split('.');
  if (!headerB64 || !payloadB64 || !sigB64) throw new Error('Invalid JWT structure');

  const header = JSON.parse(atob(headerB64.replace(/-/g, '+').replace(/_/g, '/')));
  const certPem = keys[header.kid];
  if (!certPem) throw new Error('Unknown key ID');

  const payload = JSON.parse(
    atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')),
  ) as {
    iss: string;
    aud: string;
    sub: string;
    exp: number;
    iat: number;
    firebase?: { sign_in_provider: string };
    role?: string;
    email?: string;
  };

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) throw new Error('Token expired');
  if (payload.aud !== projectId) throw new Error('Invalid audience');
  if (payload.iss !== `https://securetoken.google.com/${projectId}`)
    throw new Error('Invalid issuer');

  const certBody = certPem
    .replace('-----BEGIN CERTIFICATE-----', '')
    .replace('-----END CERTIFICATE-----', '')
    .replace(/\s/g, '');

  const certDer = Uint8Array.from(atob(certBody), (c) => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    certDer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  ).catch(async () => {
    const certKey = await crypto.subtle.importKey(
      'spki',
      certDer,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    );
    return certKey;
  });

  const sigBytes = Uint8Array.from(
    atob(sigB64.replace(/-/g, '+').replace(/_/g, '/')),
    (c) => c.charCodeAt(0),
  );
  const dataBytes = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const valid = await crypto.subtle.verify(
    { name: 'RSASSA-PKCS1-v1_5' },
    cryptoKey,
    sigBytes,
    dataBytes,
  );

  if (!valid) throw new Error('Invalid signature');

  return { uid: payload.sub, role: payload.role, email: payload.email };
}

/** Get a Google OAuth2 access token for Firestore REST API */
export async function getServiceAccountToken(env: Env): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = btoa(
    JSON.stringify({
      iss: env.FIREBASE_CLIENT_EMAIL,
      scope: 'https://www.googleapis.com/auth/datastore',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    }),
  );

  const privateKeyPem = env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
  const pemContents = privateKeyPem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  const keyDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyDer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const data = new TextEncoder().encode(`${header}.${claim}`);
  const sig = await crypto.subtle.sign({ name: 'RSASSA-PKCS1-v1_5' }, cryptoKey, data);
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  const jwt = `${header}.${claim}.${sigB64}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const tokenData = (await tokenRes.json()) as { access_token: string };
  return tokenData.access_token;
}
