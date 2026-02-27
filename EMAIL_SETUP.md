# Email-to-Job Setup Guide

## Problem

The catch-all email address `jobs-8f92a@inbound.wirezrus.com` is returning "Unrouteable address" because:
1. The domain `wirezrus.com` needs DNS configuration
2. An email service needs to be set up to receive and forward emails
3. A webhook endpoint needs to receive the forwarded emails

## Solution Options

### Option 1: Use SendGrid Inbound Parse (Recommended)

SendGrid provides free inbound email parsing that can forward emails to your webhook.

#### Step 1: Set Up SendGrid Account

1. Sign up at [SendGrid](https://sendgrid.com/)
2. Verify your account
3. Go to Settings → Inbound Parse

#### Step 2: Configure DNS for Your Domain

You need to own and configure `wirezrus.com` (or use a subdomain like `inbound.wirezrus.com`).

Add these DNS records in your domain registrar (e.g., Namecheap, GoDaddy, Cloudflare):

```
Type: MX
Host: inbound.wirezrus.com (or @wirezrus.com)
Value: mx.sendgrid.net
Priority: 10
```

#### Step 3: Configure Inbound Parse in SendGrid

1. In SendGrid → Settings → Inbound Parse
2. Click "Add Host & URL"
3. Configure:
   - **Subdomain**: `inbound` (or leave blank for root domain)
   - **Domain**: `wirezrus.com`
   - **Destination URL**: `https://your-app-domain.com/api/email/inbound`
   - **Check spam**: Yes (recommended)
   - **Send raw**: No
   - **POST the raw, full MIME message**: No

4. Click "Add"

#### Step 4: Create Webhook Endpoint

The endpoint already exists in your app at `/api/email/inbound` but needs to be deployed.

Check `server.ts` around line 140-180 for the email webhook handler.

#### Step 5: Test

Send an email to: `jobs-8f92a@inbound.wirezrus.com`

The email will:
1. Arrive at SendGrid's servers
2. Get parsed and forwarded to your webhook
3. Create a new job in your Firestore database

---

### Option 2: Use Mailgun Inbound Routing

Similar to SendGrid but with Mailgun.

#### Step 1: Set Up Mailgun

1. Sign up at [Mailgun](https://www.mailgun.com/)
2. Add and verify your domain `wirezrus.com`

#### Step 2: Configure DNS

Add these DNS records:

```
Type: MX
Host: inbound.wirezrus.com
Value: mxa.mailgun.org
Priority: 10

Type: MX
Host: inbound.wirezrus.com
Value: mxb.mailgun.org
Priority: 10
```

Also add TXT records for SPF and DKIM (Mailgun will provide these).

#### Step 3: Create Route

1. In Mailgun → Receiving → Routes
2. Click "Create Route"
3. Configure:
   - **Expression Type**: Match Recipient
   - **Recipient**: `jobs-.*@inbound.wirezrus.com` (regex pattern)
   - **Actions**: Forward to URL
   - **URL**: `https://your-app-domain.com/api/email/inbound`
   - **Priority**: 0

#### Step 4: Update Webhook Handler

You may need to adjust the webhook handler in `server.ts` to parse Mailgun's format (different from SendGrid).

---

### Option 3: Use CloudMailin (Easiest)

CloudMailin specializes in email-to-webhook and is very developer-friendly.

#### Step 1: Sign Up

1. Go to [CloudMailin](https://www.cloudmailin.com/)
2. Create a free account

#### Step 2: Create Email Address

1. CloudMailin will give you a temporary email address like `abc123@cloudmailin.net`
2. Or configure your own domain

#### Step 3: Configure Target

1. Set webhook URL: `https://your-app-domain.com/api/email/inbound`
2. Choose format: JSON (HTTP POST)
3. Set attachment handling: Include as base64

#### Step 4: DNS (For Custom Domain)

If using `inbound.wirezrus.com`:

```
Type: MX
Host: inbound.wirezrus.com
Value: mx.cloudmailin.net
Priority: 10
```

---

## Current Code Status

Your app already has the webhook endpoint at `/api/email/inbound` in `server.ts`.

### What It Does:

1. Receives email via webhook
2. Extracts: from, subject, body
3. Generates job ID
4. Creates comprehensive work order description
5. Saves to Firestore as new job
6. Returns success response

### What You Need:

The code is ready - you just need to:
1. Choose an email service (SendGrid, Mailgun, or CloudMailin)
2. Configure DNS for `wirezrus.com`
3. Set up the inbound email routing
4. Point it to your deployed webhook URL

---

## Quick Start (If You Don't Own wirezrus.com)

### Option A: Use a Different Domain You Own

Change the email format in your app to use a domain you control:
- `jobs-8f92a@inbound.yourdomain.com`

### Option B: Use CloudMailin's Temporary Address

1. Sign up for CloudMailin free tier
2. Use their provided address: `abc123@cloudmailin.net`
3. Configure webhook to your app
4. Update the email address shown in your Integrations page

### Option C: Buy the Domain

1. Purchase `wirezrus.com` from a registrar
2. Follow Option 1 (SendGrid) or Option 2 (Mailgun)

---

## Testing Your Setup

Once configured, test by:

1. Sending an email to `jobs-8f92a@inbound.wirezrus.com`
2. Check your app's server logs for webhook receipt
3. Check Firestore → `jobs` collection for new job
4. Check the Job Board in your app

---

## Troubleshooting

**"Unrouteable address"**
- DNS MX records not configured
- Domain not verified with email service
- MX records not propagated (can take 24-48 hours)

**Email received but no job created**
- Check webhook URL is correct and accessible
- Check server logs for errors
- Verify Firestore credentials are configured

**Email goes to spam**
- Add SPF and DKIM records (provided by email service)
- Verify domain ownership

---

## Recommended Approach

**For Development/Testing:**
- Use CloudMailin free tier with their temporary address
- No DNS configuration needed
- Works immediately

**For Production:**
- Purchase `wirezrus.com` domain
- Use SendGrid Inbound Parse (free tier: 100 emails/day)
- Configure proper DNS records
- Add SPF/DKIM for deliverability

---

## Cost Comparison

| Service | Free Tier | Paid Plans |
|---------|-----------|------------|
| SendGrid | 100 emails/day | $19.95/mo (40k emails) |
| Mailgun | 100 emails/day | $35/mo (50k emails) |
| CloudMailin | 200 emails/mo | $9/mo (10k emails) |

All are sufficient for your use case. SendGrid is recommended as you may already use it for outbound emails.
