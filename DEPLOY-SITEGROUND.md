# Deploy to SiteGround Shared Hosting (GoGeek)

## Prerequisites
- SiteGround GoGeek plan with SSH access enabled
- Domain `pennywiseit.com.au` pointed to SiteGround
- MongoDB Atlas connection string (already configured in `.env`)

---

## Step 1: Enable SSH on SiteGround
1. Log in to SiteGround → **Site Tools**
2. Go to **Devs → SSH Keys Manager**
3. Generate or import an SSH key
4. Note your SSH credentials (shown on the page)

## Step 2: Set Up Node.js App in cPanel
1. Go to **Site Tools → Devs → Node.js**
2. Click **Create Application**
3. Configure:
   - **Node.js Version**: 18.x or 20.x (latest available)
   - **Application Mode**: Production
   - **Application Root**: `pennywiseit.com.au/app` (we'll create this folder)
   - **Application URL**: `pennywiseit.com.au`
   - **Application Startup File**: `app.js`
4. Click **Create**
5. Note the **virtual environment path** shown (e.g., `/home/username/nodevenv/...`)

## Step 3: Upload Files via SSH
Connect via SSH:
```bash
ssh username@pennywiseit.com.au
```

Navigate to your site directory and create the app folder:
```bash
cd ~/public_html
mkdir -p app
cd app
```

Clone the repo (or upload via SFTP):
```bash
git clone https://github.com/3dhuboz/Penny-Wise-IT.git .
```

## Step 4: Configure Environment
Create the `.env` file on the server:
```bash
nano .env
```

Paste your production environment variables:
```
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb+srv://admin:YOUR_PASSWORD@cluster0.l8yvsld.mongodb.net/pennywise-it?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=CHANGE_THIS_TO_A_STRONG_SECRET
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SITEGROUND_API_URL=https://api.siteground.com
SITEGROUND_API_TOKEN=your-token
ADMIN_EMAIL=admin@pennywiseit.com.au
ADMIN_PASSWORD=CHANGE_THIS
GOOGLE_CLIENT_ID=your-google-client-id
```

**Important:** Change `JWT_SECRET` and `ADMIN_PASSWORD` to strong unique values for production!

## Step 5: Install Dependencies & Build
Activate the Node.js virtual environment (use the path from Step 2):
```bash
source /home/USERNAME/nodevenv/pennywiseit.com.au/app/18/bin/activate
```

Install server dependencies:
```bash
npm install --production
```

Install client dependencies and build:
```bash
cd client
npm install
npm run build
cd ..
```

## Step 6: Copy .htaccess to Public Root
The `.htaccess` file needs to be in your `public_html` directory:
```bash
cp .htaccess ~/public_html/.htaccess
```

## Step 7: Restart the Application
Go back to **Site Tools → Devs → Node.js** and click **Restart** on your application.

Or via SSH:
```bash
mkdir -p tmp
touch tmp/restart.txt
```

---

## Updating the App
After pushing new code to GitHub:
```bash
cd ~/public_html/app
git pull origin main
source /home/USERNAME/nodevenv/pennywiseit.com.au/app/18/bin/activate
npm install --production
cd client && npm install && npm run build && cd ..
touch tmp/restart.txt
```

## Troubleshooting
- **500 error**: Check `~/logs/pennywiseit.com.au.error.log`
- **App not starting**: Verify `app.js` is set as startup file in Node.js manager
- **MongoDB connection error**: Ensure your Atlas cluster allows connections from SiteGround's IP (or set to 0.0.0.0/0)
- **Static files not loading**: Ensure `client/build` exists and `NODE_ENV=production` is set
- **Blank page**: Check browser console for API errors; verify `.env` has correct `MONGODB_URI`

## File Structure on Server
```
~/public_html/
├── .htaccess              ← Routes all traffic to Node.js
└── app/                   ← Application root
    ├── app.js             ← Passenger entry point
    ├── .env               ← Production environment variables
    ├── package.json
    ├── server/
    │   ├── index.js       ← Express server
    │   ├── models/
    │   ├── routes/
    │   └── middleware/
    ├── client/
    │   └── build/         ← Production React build
    └── uploads/           ← User uploads
```
