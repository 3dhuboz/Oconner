import type { AppRequest, AppResponse } from '../../_handler';

export default async function handler(req: AppRequest, res: AppResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // In a serverless environment, Xero OAuth tokens would be stored in a database.
  // For now, send the success message to close the popup window.
  res.setHeader('Content-Type', 'text/html');
  res.send(`
    <html>
      <body>
        <script>
          if (window.opener) {
            window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
            window.close();
          } else {
            window.location.href = '/integrations';
          }
        </script>
        <p>Xero Authentication successful! This window should close automatically.</p>
      </body>
    </html>
  `);
}
