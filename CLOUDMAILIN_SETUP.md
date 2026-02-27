# CloudMailin Setup for Development

## Quick Setup Guide

CloudMailin is now configured for your development environment. Follow these steps to get email-to-job working immediately.

## Step 1: Sign Up for CloudMailin

1. Go to [CloudMailin](https://www.cloudmailin.com/)
2. Click "Sign Up" (free tier available)
3. Verify your email address

## Step 2: Get Your Email Address

After signing up, CloudMailin will provide you with a unique email address like:

```
abc123def456@cloudmailin.net
```

This is your **inbound email address** that will receive emails and forward them to your webhook.

## Step 3: Configure Webhook URL

1. In your CloudMailin dashboard, find your email address
2. Click "Edit" or "Configure"
3. Set the **Target URL** to:
   ```
   https://your-app-name.vercel.app/api/webhooks/email
   ```
   Replace `your-app-name` with your actual Vercel deployment URL
   (Find your URL at: vercel.com/dashboard → your project → the URL shown at the top)

4. Set **Format** to: `JSON (HTTP POST)`
5. Set **Attachments** to: `Include as base64` (optional)
6. Click "Save"

## Step 4: Configure Firebase Admin (Required for jobs to save to database)

The webhook needs Firebase Admin credentials to write jobs to Firestore from the server side.

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click ⚙️ → **Project settings**
3. Click **Service accounts** tab
4. Click **Generate new private key** → **Generate key**
5. A JSON file will download — open it
6. Copy these values into your `.env`:

```env
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
```

> **Important:** The private key must keep `\n` literally (not real newlines) when pasting into Vercel environment variables.

Also add `VITE_FIREBASE_PROJECT_ID` which is already in your `.env`.

## Step 5: Add Email to Environment Variables

### Local Development

Open your `.env` file and add:

```env
VITE_CLOUDMAILIN_EMAIL=abc123def456@cloudmailin.net
```

Replace with your actual CloudMailin email address.

### Production (Vercel)

1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add all of these:
   - `VITE_CLOUDMAILIN_EMAIL` = `abc123def456@cloudmailin.net`
   - `FIREBASE_CLIENT_EMAIL` = `firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com`
   - `FIREBASE_PRIVATE_KEY` = `-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n`
   - `VITE_FIREBASE_PROJECT_ID` = `your-project-id` (already set if Firebase is configured)
4. Redeploy your application

## Step 5: Test the Integration

1. Restart your development server (if running locally)
2. Go to the **Integrations** page in your app
3. You should see your CloudMailin email address displayed
4. Click "Simulate Email" to test the webhook locally
5. Or send a real email to your CloudMailin address

### Test Email Format

Send an email with:
- **To**: `abc123def456@cloudmailin.net` (your CloudMailin address)
- **Subject**: "Urgent: Kitchen lights not working"
- **Body**: Any description of the issue

The email will:
1. Arrive at CloudMailin
2. Get forwarded to your webhook at `/api/email/inbound`
3. Create a new job in Firestore
4. Appear in your Job Board

## How It Works

```
Client Email
    ↓
CloudMailin (abc123@cloudmailin.net)
    ↓
Your Webhook (https://your-app.vercel.app/api/email/inbound)
    ↓
Firestore Database (new job created)
    ↓
Job Board (job appears)
```

## Webhook Payload

CloudMailin sends a JSON payload to your webhook:

```json
{
  "envelope": {
    "from": "client@example.com",
    "to": ["abc123@cloudmailin.net"]
  },
  "headers": {
    "Subject": "Kitchen lights not working"
  },
  "plain": "The lights in the kitchen stopped working...",
  "html": "<p>The lights in the kitchen stopped working...</p>"
}
```

Your webhook at `/api/webhooks/email` already handles this format.

## Troubleshooting

### Email address not showing in app
- Check that `VITE_CLOUDMAILIN_EMAIL` is set in `.env`
- Restart your dev server
- Check browser console for errors

### Webhook not receiving emails
- Verify webhook URL in CloudMailin dashboard
- Check that your app is deployed and accessible
- Look at CloudMailin's delivery logs for errors
- Check your app's server logs

### Jobs not being created
- Verify Firebase credentials are configured
- Check Firestore security rules allow writes
- Look at server logs for errors in `/api/email/inbound`

## Upgrading from Free Tier

CloudMailin free tier includes:
- 200 emails per month
- 1 email address
- Basic features

If you need more:
- **Micro Plan**: $9/month (10,000 emails)
- **Small Plan**: $29/month (50,000 emails)

For production, consider using your own domain (see `EMAIL_SETUP.md`).

## Next Steps

Once CloudMailin is working:

1. **Production**: Set up custom domain email (see `EMAIL_SETUP.md`)
2. **Automation**: Configure email forwarding rules in Gmail/Outlook
3. **Notifications**: Add SMS/Email notifications when jobs are created
4. **Parsing**: Enhance email parsing to extract more details

## Support

- CloudMailin Docs: https://docs.cloudmailin.com/
- CloudMailin Support: support@cloudmailin.com
- Your webhook code: `server.ts` line ~140-180
