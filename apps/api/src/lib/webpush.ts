/**
 * RFC 8291 Web Push encryption using the Web Crypto API.
 * No Node.js dependencies — runs natively in Cloudflare Workers.
 */

const enc = new TextEncoder();

function b64u(data: ArrayBuffer | Uint8Array): string {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  let str = '';
  bytes.forEach((b) => { str += String.fromCharCode(b); });
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function db64u(s: string): Uint8Array {
  return Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const len = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(len);
  let i = 0;
  for (const p of parts) { out.set(p, i); i += p.length; }
  return out;
}

async function hkdf(ikm: Uint8Array, salt: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, length * 8);
  return new Uint8Array(bits);
}

/** Create a signed VAPID JWT for the given push endpoint. */
async function vapidJwt(
  endpoint: string,
  vapidPrivateKeyB64u: string,
  vapidPublicKeyB64u: string,
  contact: string,
): Promise<string> {
  const pubBytes = db64u(vapidPublicKeyB64u);
  const privKey = await crypto.subtle.importKey(
    'jwk',
    {
      kty: 'EC', crv: 'P-256',
      d: vapidPrivateKeyB64u,
      x: b64u(pubBytes.slice(1, 33)),
      y: b64u(pubBytes.slice(33, 65)),
      key_ops: ['sign'],
    },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
  const now = Math.floor(Date.now() / 1000);
  const header = b64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const payload = b64u(enc.encode(JSON.stringify({
    aud: new URL(endpoint).origin,
    exp: now + 43200,
    sub: contact,
  })));
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privKey,
    enc.encode(`${header}.${payload}`),
  );
  return `${header}.${payload}.${b64u(sig)}`;
}

/** RFC 8291: encrypt a plaintext string for the given push subscription keys. */
async function encryptPayload(p256dhB64u: string, authB64u: string, plaintext: string): Promise<Uint8Array> {
  const authSecret = db64u(authB64u);
  const uaPubBytes = db64u(p256dhB64u);

  const senderKP = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']) as CryptoKeyPair;
  const asPubBytes = new Uint8Array(await crypto.subtle.exportKey('raw', senderKP.publicKey as CryptoKey) as ArrayBuffer);

  const uaPubKey = await crypto.subtle.importKey('raw', uaPubBytes, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdhSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaPubKey } as any, senderKP.privateKey as CryptoKey, 256));

  const salt = crypto.getRandomValues(new Uint8Array(16));

  const keyInfo = concat(enc.encode('WebPush: info\0'), uaPubBytes, asPubBytes);
  const ikm = await hkdf(ecdhSecret, authSecret, keyInfo, 32);

  const cek = await hkdf(ikm, salt, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(ikm, salt, enc.encode('Content-Encoding: nonce\0'), 12);

  const cekKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
  const padded = concat(enc.encode(plaintext), new Uint8Array([2]));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, cekKey, padded));

  // aes128gcm content encoding: salt(16) | rs(4,BE) | idlen(1) | sender_pub(65) | ciphertext
  const rs = padded.byteLength + 16;
  const header = new Uint8Array(21 + asPubBytes.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, rs, false);
  header[20] = asPubBytes.length;
  header.set(asPubBytes, 21);

  return concat(header, ciphertext);
}

export interface PushSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface PushNotification {
  title: string;
  body: string;
  url?: string;
  icon?: string;
}

/** Send a Web Push notification to a single subscription. Returns true on success. */
export async function sendPush(
  subscription: PushSubscription,
  notification: PushNotification,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidContact: string,
): Promise<boolean> {
  try {
    const encrypted = await encryptPayload(subscription.keys.p256dh, subscription.keys.auth, JSON.stringify(notification));
    const jwt = await vapidJwt(subscription.endpoint, vapidPrivateKey, vapidPublicKey, vapidContact);
    const resp = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        Authorization: `vapid t=${jwt},k=${vapidPublicKey}`,
        'Content-Encoding': 'aes128gcm',
        'Content-Type': 'application/octet-stream',
        TTL: '86400',
      },
      body: encrypted,
    });
    if (resp.status === 410 || resp.status === 404) return false; // subscription expired
    return resp.status >= 200 && resp.status < 300;
  } catch {
    return false;
  }
}
