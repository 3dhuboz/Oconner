# Firebase Setup Guide - Preventing Database Resets

## Problem
Your database is resetting on every deployment because you don't have Firebase credentials configured. Without proper Firebase configuration, the app cannot connect to a persistent cloud database.

## Solution: Set Up Firebase Project

### Step 1: Create Firebase Project (if you haven't already)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select your existing project
3. Follow the setup wizard

### Step 2: Get Your Firebase Configuration

1. In Firebase Console, click the gear icon ⚙️ next to "Project Overview"
2. Select "Project settings"
3. Scroll down to "Your apps" section
4. Click the web icon `</>` to add a web app (or select existing web app)
5. Copy the `firebaseConfig` object values

### Step 3: Configure Your `.env` File

**IMPORTANT:** You need to fill in the `.env` file with your actual Firebase credentials.

Open `.env` file and replace the placeholder values:

```env
VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890
```

### Step 4: Set Up Firestore Database

1. In Firebase Console, go to "Firestore Database"
2. Click "Create database"
3. Choose **Production mode** (for persistent data)
4. Select a location (choose closest to your users)
5. Click "Enable"

### Step 5: Configure Firestore Security Rules

In Firestore Database → Rules, set up basic security:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read/write
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Step 6: Set Up Authentication

1. In Firebase Console, go to "Authentication"
2. Click "Get started"
3. Enable "Email/Password" sign-in method
4. Click "Save"

### Step 7: Deploy with Environment Variables

**For Local Development:**
- Your `.env` file is automatically loaded by Vite
- Restart your dev server after updating `.env`

**For Vercel Deployment:**
1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add each variable from your `.env` file:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
4. Redeploy your application

## Why This Fixes the Reset Issue

**Before:** 
- No Firebase credentials → No database connection
- App runs but data stored in browser memory only
- Every reload/redeploy = fresh start

**After:**
- Real Firebase credentials → Connected to cloud Firestore
- Data persists in Firebase cloud database
- Survives deployments, reloads, and device changes

## Verify It's Working

1. Check browser console for: `Firebase Initialized. Project ID: your-project-id`
2. Add a job or electrician in the app
3. Refresh the page - data should still be there
4. Check Firebase Console → Firestore Database - you should see your collections (`jobs`, `electricians`, etc.)

## Important Notes

- **Never commit `.env` to Git** - it's already in `.gitignore`
- **Use Vercel environment variables** for production deployments
- **Your data is now persistent** - it will survive all deployments
- **IndexedDB is for offline caching** - Firebase is the source of truth

## Troubleshooting

**"Firebase configuration is missing" warning:**
- Your `.env` file has placeholder values
- Fill in real values from Firebase Console

**Data still resetting:**
- Check Vercel environment variables are set
- Verify Firebase project is in Production mode
- Check browser console for Firebase errors

**Authentication errors:**
- Enable Email/Password in Firebase Authentication
- Check Firestore security rules allow authenticated access
