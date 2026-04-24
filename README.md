# My Recipe App — Deployment Guide

## What you're deploying
A personal recipe scanner app. Take a photo of any recipe → Claude reads it → saves it to your collection, searchable by category.

---

## Step 1 — Create a GitHub account
1. Go to **github.com**
2. Click Sign Up, follow the steps
3. Verify your email

## Step 2 — Create the repository
1. Once logged in, click the **+** button (top right) → **New repository**
2. Name it: `my-recipe-app`
3. Leave it **Public**
4. Click **Create repository**

## Step 3 — Upload the files
1. On your new repo page, click **uploading an existing file**
2. You need to upload these 3 files in the right folders:
   - `vercel.json` → upload at the root level
   - `api/scan.js` → first create an `api` folder, upload inside it
   - `public/index.html` → first create a `public` folder, upload inside it
3. Click **Commit changes**

> Tip: On iPhone you can do this in Safari — tap the upload area and select files from Files app.

## Step 4 — Create a Vercel account
1. Go to **vercel.com**
2. Click **Sign Up** → choose **Continue with GitHub**
3. Authorise Vercel to access your GitHub

## Step 5 — Deploy to Vercel
1. On Vercel dashboard, click **Add New Project**
2. Select your `my-recipe-app` repository
3. Click **Deploy** (no settings needed to change)
4. Wait ~1 minute — Vercel builds it automatically

## Step 6 — Add your Anthropic API key
1. In Vercel, go to your project → **Settings** → **Environment Variables**
2. Add a new variable:
   - Name: `ANTHROPIC_API_KEY`
   - Value: your key from console.anthropic.com
3. Click **Save**
4. Go to **Deployments** → click the 3 dots on latest → **Redeploy**

## Step 7 — Open on your iPhone
1. Vercel gives you a URL like `my-recipe-app.vercel.app`
2. Open it in **Safari**
3. Tap the **Share** button → **Add to Home Screen**
4. It'll appear as an app icon on your home screen!

---

## Using the app
- Tap **+** to scan a new recipe
- Upload a photo of any recipe (cookbook, card, handwritten)
- Claude extracts the title, ingredients and method
- Tap **Save** → it appears in your collection
- Browse by category or search by name
- Tap any recipe to view the full details
