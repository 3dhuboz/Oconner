---
description: How to onboard a new white-label client with their own deployment
---

# Onboard a New White-Label Client

This workflow walks through adding a new client (e.g. a friend who wants a white-labelled Food Truck app + SocialAI) with their own deployment, admin account, and branding — all tracked from pennywiseit.com.au.

## Prerequisites
- Access to pennywiseit.com.au admin panel
- Access to Render dashboard (https://dashboard.render.com)
- Access to MongoDB Atlas (https://cloud.mongodb.com)
- GitHub repo access (https://github.com/3dhuboz/Penny-Wise-IT)

---

## Step 1: Create the Customer Account

1. Login to **pennywiseit.com.au** as admin
2. Go to **Admin → Customers → Add Customer**
3. Fill in: First Name, Last Name, Email, Temp Password, Company, Phone
4. Click **Create Customer**

## Step 2: Issue App Licenses

1. Go to **Admin → Customers**
2. Find the new customer → click **Key icon** (Issue License)
3. Select the app (e.g. "FoodTruc" or "SocialAI Studio")
4. Select the plan (e.g. "Professional" or "Enterprise" for white-label)
5. Click **Activate License**
6. Repeat for each app the client needs

## Step 3: Create a Client Project

1. Go to **Admin → Client Projects → New Client Project**
2. Select the customer from the dropdown
3. Name the project (e.g. "Dave's Food Truck + SocialAI")
4. Select the apps included
5. Add any notes
6. Click **Create Project** — a setup checklist is auto-generated

## Step 4: Create a Separate MongoDB Database

1. Go to **MongoDB Atlas** → your cluster
2. Create a new database (e.g. `client-daves-foodtruck`)
3. Or create a new cluster if you want full isolation
4. Copy the connection string — you'll need it for the Render env vars

## Step 5: Deploy on Render

1. Go to **Render Dashboard → New → Web Service**
2. Connect to the **same GitHub repo** (`3dhuboz/Penny-Wise-IT`)
3. Set the following:
   - **Name**: `client-daves-foodtruck` (or similar)
   - **Branch**: `main` (same codebase)
   - **Build Command**: `cd client && npm install && npm run build && cd ../server && npm install`
   - **Start Command**: `node server/index.js`
   - **Environment**: Node

4. Set **Environment Variables**:

| Variable | Value | Notes |
|----------|-------|-------|
| `NODE_ENV` | `production` | Required |
| `MONGODB_URI` | `mongodb+srv://...client-daves-foodtruck...` | Client's own database |
| `JWT_SECRET` | `unique-random-string-for-this-client` | Generate a unique one |
| `ADMIN_EMAIL` | `dave@hisbusiness.com.au` | Client's admin email |
| `ADMIN_PASSWORD` | `SecurePassword123!` | Client's admin password |
| `GEMINI_API_KEY` | `your-gemini-key` | Admin-managed AI key |
| `RUNWAY_API_KEY` | `your-runway-key` | If video features needed |
| `GOOGLE_CLIENT_ID` | `your-google-client-id` | If Google login needed |
| `SQUARE_ACCESS_TOKEN` | `client-specific-token` | If payments needed |
| `SQUARE_LOCATION_ID` | `client-specific-location` | If payments needed |
| `SQUARE_ENVIRONMENT` | `production` | Or `sandbox` for testing |

5. Click **Create Web Service**
6. Wait for the first deploy to complete (~5-10 min)

## Step 6: Set Custom Domain (Optional)

1. In Render → your client's service → **Settings → Custom Domains**
2. Add the client's domain (e.g. `app.davesfoodtruck.com.au`)
3. Follow Render's DNS instructions:
   - Add a CNAME record pointing to the Render URL
   - SSL is auto-provisioned by Render

## Step 7: Configure White-Label Branding

1. Login to the **client's deployment** as their admin
2. Update branding through the app settings (logo, colors, name)
3. OR update the `whiteLabel` config in the subscription via your admin panel

## Step 8: Test Everything

1. Visit the client's Render URL or custom domain
2. Login with the ADMIN_EMAIL/ADMIN_PASSWORD you set
3. Test all features: SocialAI, content generation, calendar, etc.
4. Use the force-reset endpoint if login doesn't work:
   `https://CLIENT-URL/api/auth/force-reset?pw=THE_PASSWORD`

## Step 9: Hand Off to Client

1. Send the client their login credentials (email + password)
2. Walk them through the key features
3. Create their first invoice via **Admin → Invoicing**

## Step 10: Track in Client Projects

1. Back on **pennywiseit.com.au → Admin → Client Projects**
2. Open the project → fill in deployment info (Render URL, domain, status)
3. Check off each setup step as completed
4. The project auto-moves to "Active" when all steps are done

---

## Quick Reference: Ongoing Management

- **Code updates**: Push to `main` → ALL client deploys auto-rebuild from the same repo
- **Client-specific config**: Managed via Render env vars per service
- **Billing**: Track via Admin → Invoicing → create monthly invoices per client
- **Support**: Clients can submit tickets via their own deployment
- **Monitoring**: Check Render dashboard for service health per client

## Future Scale (10+ clients)

When you hit 10+ clients, consider migrating to **multi-tenant architecture**:
- Single Render service serves all clients
- Tenant detected by domain/subdomain
- All data isolated by `tenantId` field
- One deploy, one database, shared infrastructure
- Cascade can help you build this when you're ready
