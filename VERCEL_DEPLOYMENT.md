# 🚀 Vercel Deployment Guide - Wires R Us

## Prerequisites
- Vercel account connected to your GitHub repository
- All required API keys and credentials ready

---

## 📋 Step 1: Environment Variables Setup

In your Vercel project dashboard, add these environment variables:

### Required Variables

```bash
# Firebase Configuration (REQUIRED)
VITE_FB_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# App Configuration
APP_URL=https://your-app.vercel.app
NODE_ENV=production
```

### Email-to-Job Pipeline (REQUIRED for inbound work orders)

```bash
# OpenAI — powers AI extraction of work orders from any PM software
OPENAI_API_KEY=sk-...

# Gmail OAuth — polls inbox for inbound work orders
GMAIL_ADDRESS=wirezrusjobs@gmail.com
GMAIL_CLIENT_ID=your_google_oauth_client_id
GMAIL_CLIENT_SECRET=your_google_oauth_client_secret
GMAIL_REFRESH_TOKEN=your_gmail_refresh_token

# Firebase webhook auth (create a dedicated user in Firebase Auth for this)
WEBHOOK_AUTH_EMAIL=webhook@wireznrus.com.au
WEBHOOK_AUTH_PASSWORD=a_strong_random_password
```

> **Gmail polling** runs via Vercel Cron every 5 minutes at `/api/email/poll-inbox`.
>
> **Test it**: Visit `https://YOUR-APP.vercel.app/api/email/poll-inbox` in a browser — you'll see a diagnostic page showing which env vars are configured.

### Optional Integration Variables

```bash
# Xero Integration (Optional - for invoicing)
XERO_CLIENT_ID=your_xero_client_id
XERO_CLIENT_SECRET=your_xero_client_secret

# Twilio SMS (Optional - for electrician dispatch)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Stripe Billing (Optional - for subscriptions)
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Gemini AI (Optional)
GEMINI_API_KEY=your_gemini_api_key
```

---

## 🔧 Step 2: Vercel Project Settings

### Build & Development Settings
- **Framework Preset**: Other
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`
- **Development Command**: `npm run dev`

### Node.js Version
- Set to **18.x** or higher in Project Settings

---

## 🎯 Step 3: Deploy

### Automatic Deployment
1. Push your code to the `main` branch on GitHub
2. Vercel will automatically detect changes and deploy
3. Monitor the deployment logs for any errors

### Manual Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from local
vercel --prod
```

---

## ✅ Step 4: Verify Deployment

After deployment, test these critical features:

### 1. **Authentication**
- [ ] Login with Firebase Auth works
- [ ] User registration works
- [ ] Role-based access (dev/admin/user) works

### 2. **Form 9 PDF Generation** ⚡ CRITICAL
- [ ] Navigate to a job detail page
- [ ] Click "Generate Form 9"
- [ ] Select a proposed entry date
- [ ] PDF downloads successfully with filled fields
- [ ] No CORS errors in console

### 3. **Job Management**
- [ ] Create new job
- [ ] Update job status
- [ ] Assign electrician
- [ ] Real-time updates work

### 4. **Integrations** (if configured)
- [ ] Xero connection works
- [ ] SMS dispatch sends (or simulates)
- [ ] Email-to-job automation works

### 5. **Field Portal**
- [ ] Mobile field portal loads
- [ ] Photo upload works
- [ ] Materials tracking works
- [ ] Job submission works

---

## 🐛 Troubleshooting

### Form 9 PDF Not Generating
**Error**: "Failed to fetch Form 9 PDF from RTA"
- **Cause**: Server can't reach external PDF URL
- **Fix**: Check server logs, verify RTA website is accessible

### API Routes Not Working
**Error**: 404 on `/api/*` routes
- **Cause**: Vercel routing misconfiguration
- **Fix**: Verify `vercel.json` rewrites are correct

### Environment Variables Not Loading
**Error**: "Firebase not initialized" or similar
- **Cause**: Environment variables not set in Vercel
- **Fix**: Double-check all variables in Vercel dashboard

### Build Failures
**Error**: TypeScript compilation errors
- **Cause**: Missing dependencies or type definitions
- **Fix**: Run `npm install` locally and commit `package-lock.json`

---

## 🔐 Security Checklist

- [ ] All API keys are in environment variables (not hardcoded)
- [ ] Firebase security rules are configured
- [ ] Xero OAuth callback URL matches production URL
- [ ] Stripe webhook secret is configured
- [ ] CORS headers are properly set

---

## 📊 Post-Deployment

### Monitor Performance
1. Check Vercel Analytics for traffic
2. Monitor Firebase usage
3. Review server logs for errors

### Update Callback URLs
After first deployment, update these URLs:

1. **Xero Developer Portal**
   - Redirect URI: `https://your-app.vercel.app/api/auth/xero/callback`

2. **Stripe Dashboard**
   - Webhook endpoint: `https://your-app.vercel.app/api/stripe/webhook`

3. **Firebase Console**
   - Authorized domains: Add `your-app.vercel.app`

---

## 🎉 Success!

Your Wires R Us application is now live on Vercel with:
- ✅ Full Form 9 PDF generation and download
- ✅ Real-time job management
- ✅ Mobile field portal
- ✅ Xero integration (if configured)
- ✅ SMS dispatch (if configured)
- ✅ Secure authentication

**Live URL**: https://your-app.vercel.app

---

## 📞 Support

If you encounter issues:
1. Check Vercel deployment logs
2. Review browser console for errors
3. Verify all environment variables are set
4. Test locally with `npm run dev` first
