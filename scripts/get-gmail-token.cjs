/**
 * Gmail OAuth Token Generator for Wirez R Us
 * 
 * Usage:
 *   1. First, add http://localhost:3333 as an Authorized Redirect URI in Google Cloud Console
 *   2. Run: node scripts/get-gmail-token.js
 *   3. Open the URL shown in your browser
 *   4. Authorize, and the token will be printed
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

const CLIENT_ID = '890226529725-unpc04tn7trche64s1bmk5u9i6ajt5hl.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const REDIRECT_URI = 'http://localhost:3333';
const SCOPE = 'https://www.googleapis.com/auth/gmail.modify';

// Build authorization URL
const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(SCOPE)}&access_type=offline&prompt=consent`;

console.log('\n========================================');
console.log('  Gmail OAuth Token Generator');
console.log('========================================\n');
console.log('IMPORTANT: Make sure you have added this as an');
console.log('Authorized Redirect URI in Google Cloud Console:');
console.log('  http://localhost:3333\n');
console.log('Open this URL in your browser:\n');
console.log(authUrl);
console.log('\nWaiting for authorization callback...\n');

// Start local server to capture the callback
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:3333`);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`<h2 style="color:red">Error: ${error}</h2><p>Check Google Cloud Console settings.</p>`);
    console.error('Authorization error:', error);
    server.close();
    process.exit(1);
  }

  if (!code) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<p>Waiting for authorization...</p>');
    return;
  }

  // Exchange code for tokens
  const tokenData = new URLSearchParams({
    code,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
    grant_type: 'authorization_code',
  }).toString();

  const tokenReq = https.request('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(tokenData),
    },
  }, (tokenRes) => {
    let body = '';
    tokenRes.on('data', chunk => body += chunk);
    tokenRes.on('end', () => {
      try {
        const data = JSON.parse(body);
        if (data.refresh_token) {
          console.log('========================================');
          console.log('  SUCCESS! Your refresh token:');
          console.log('========================================\n');
          console.log(data.refresh_token);
          console.log('\nSet this as GMAIL_REFRESH_TOKEN in Vercel.\n');

          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <div style="font-family:sans-serif;max-width:500px;margin:40px auto;text-align:center;">
              <h2 style="color:#16a34a;">Success!</h2>
              <p>Your refresh token has been printed in the terminal.</p>
              <p>You can close this tab.</p>
            </div>
          `);
        } else {
          console.error('Token exchange failed:', body);
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`<h2 style="color:red">Token exchange failed</h2><pre>${body}</pre>`);
        }
      } catch (e) {
        console.error('Parse error:', e.message);
        res.writeHead(500);
        res.end('Parse error');
      }
      server.close();
      setTimeout(() => process.exit(0), 1000);
    });
  });

  tokenReq.on('error', (e) => {
    console.error('Request error:', e.message);
    res.writeHead(500);
    res.end('Request error');
    server.close();
  });

  tokenReq.write(tokenData);
  tokenReq.end();
});

server.listen(3333, () => {
  // Try to auto-open the browser
  const { exec } = require('child_process');
  exec(`start "" "${authUrl}"`);
});
