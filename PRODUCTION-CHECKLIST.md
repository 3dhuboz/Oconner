# Production Readiness Checklist — Penny Wise I.T

## ✅ Done (code changes shipped)

- [x] **Terms of Service** page at `/terms`
- [x] **Privacy Policy** page at `/privacy` (Australian Privacy Act compliant)
- [x] **Footer links** to Terms & Privacy on every page
- [x] **Square invoice creation** wired into subscribe flow — customers get a real invoice
- [x] **Helmet** security headers enabled
- [x] **Rate limiting** on all `/api` routes (100 req / 15 min)
- [x] **CORS** restricted to production domains + Vercel
- [x] **Bcrypt** password hashing (salt rounds = 10)
- [x] **JWT auth** with 7-day token expiry
- [x] **Password not exposed** in API responses (toJSON strips it)
- [x] **Error messages hidden** in production (only shown in dev)
- [x] **.gitignore** excludes `.env`, `node_modules`, `build`
- [x] **Vercel config** (`vercel.json`) + **SiteGround config** (`app.js` + Passenger)
- [x] **FoodTruc → Food Truck** renamed in all seed data

---

## 🔴 YOU MUST DO — Before Going Live

### 1. Square Payments (REQUIRED to collect money)
1. Go to [Square Developer Dashboard](https://developer.squareup.com/apps)
2. Create a production application (or switch existing from sandbox)
3. Get your **Production Access Token** and **Location ID**
4. Update `.env` on your server:
   ```
   SQUARE_ACCESS_TOKEN=your-production-token
   SQUARE_LOCATION_ID=your-production-location-id
   SQUARE_ENVIRONMENT=production
   ```
5. **Test**: Subscribe to an app yourself and verify the Square invoice arrives

### 2. Change Admin Password
```
ADMIN_PASSWORD=use-a-strong-unique-password-here
```
Current password is `admin123` — change this immediately.

### 3. Change JWT Secret
```
JWT_SECRET=generate-a-64-char-random-string
```
You can generate one: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### 4. Set NODE_ENV to Production
```
NODE_ENV=production
```

### 5. Configure Email (SMTP)
Without this, confirmation emails won't send (they'll only be logged to console).
For Gmail:
1. Enable 2FA on your Google account
2. Go to [App Passwords](https://myaccount.google.com/apppasswords)
3. Generate an app password for "Mail"
4. Update `.env`:
   ```
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-16-char-app-password
   ```

### 6. Google OAuth (Optional but recommended)
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create OAuth 2.0 Client ID
3. Add your production domain as authorised origin
4. Update `.env`:
   ```
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   ```
Without this, Google sign-in button will fail. Email/password login still works.

### 7. MongoDB Atlas — Whitelist Production IP
1. Go to [MongoDB Atlas](https://cloud.mongodb.com) → Network Access
2. Add your server's IP address (or `0.0.0.0/0` for all, less secure)
3. Ensure the `MONGODB_URI` in production `.env` is correct

### 8. Update Contact Details in Footer
In `client/src/components/Footer.js`:
- Replace `hello@pennywiseit.com.au` with your real email
- Replace `0400 000 000` with your real phone number

---

## 🟡 RECOMMENDED — Before Launch

### Domain & SSL
- [ ] Point `pennywiseit.com.au` DNS to your hosting (SiteGround or Vercel)
- [ ] Ensure SSL/HTTPS is active (SiteGround provides free Let's Encrypt)
- [ ] Test that `https://www.pennywiseit.com.au` loads correctly

### MongoDB
- [ ] Enable MongoDB Atlas backups (free tier has daily snapshots)
- [ ] Consider upgrading from M0 free tier if expecting traffic

### Square Webhook (for auto payment confirmation)
- [ ] Set up a Square webhook to notify when invoices are paid
- [ ] This allows auto-confirming subscriptions when payment clears

### Rate Limiting
- Current: 100 requests per 15 minutes per IP
- May need increasing if pages make many API calls

### Email Templates
- [ ] Verify subscription confirmation emails look correct
- [ ] Test admin notification emails arrive

### Final Pre-Launch Test
1. [ ] Register a new customer account
2. [ ] Subscribe to an app from marketplace
3. [ ] Verify Square invoice is created & emailed
4. [ ] Verify confirmation email arrives
5. [ ] Verify admin notification email arrives
6. [ ] Test cancel subscription flow
7. [ ] Test white-label branding settings
8. [ ] Check all pages on mobile
9. [ ] Check Terms & Privacy pages render correctly

---

## Production `.env` Template
```env
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb+srv://admin:YOUR_PASSWORD@cluster0.l8yvsld.mongodb.net/pennywise-it?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=GENERATE_A_STRONG_64_CHAR_SECRET
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password
SITEGROUND_API_URL=https://api.siteground.com
SITEGROUND_API_TOKEN=your-token-if-using-siteground
ADMIN_EMAIL=admin@pennywiseit.com.au
ADMIN_PASSWORD=STRONG_PASSWORD_HERE
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
SQUARE_ACCESS_TOKEN=your-production-access-token
SQUARE_LOCATION_ID=your-production-location-id
SQUARE_ENVIRONMENT=production
```
