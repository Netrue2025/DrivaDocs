# DrivaDocs

Renew vehicle papers, register new vehicles, process licenses, manage permits, and receive completed documents without losing productive hours.

For real live testing, I’d deploy this as a staging/preview app first, not straight to final production. Best path: GitHub + Vercel + Supabase Postgres.

Important Note
Your app currently saves uploads through lib/upload-storage.ts into public/uploads. That works locally, but on serverless hosting like Vercel, uploaded files are not durable long-term. For proper live testing of profile pictures and documents, either:

deploy on a VPS/persistent server, or
switch uploads to Supabase Storage before public testing.
Since you already have Supabase env vars, Supabase Storage is the cleaner next step.

Deployment Steps

Push Code To GitHub
git status
git add .
git commit -m "Prepare DrivaDocs for live testing"
git push origin main
Use A Staging Database
Create/use a Supabase database for live testing. Do not use your local/dev database if you want clean testing.
Set these in your deployed environment:

DATABASE_URL=...
DIRECT_URL=...
Sync Prisma Schema
For live testing only, you can run:
npx prisma db push
For final production later, use proper Prisma migrations. Prisma recommends prisma migrate deploy for production/staging migration deployment.

Create Vercel Project
Go to Vercel.
Import the GitHub repo.
Framework: Next.js.
Build command:
npx prisma generate && next build
Add Environment Variables In Vercel
Add these from your .env:
DATABASE_URL
DIRECT_URL
NEXTAUTH_SECRET
NEXTAUTH_URL
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
PAYSTACK_SECRET_KEY
PAYSTACK_WEBHOOK_SECRET
EMAIL_FROM
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASSWORD
PUBLIC_SUPPORT_PHONE
Set these to your Vercel URL after first deploy:

NEXTAUTH_URL=https://your-live-url.vercel.app
NEXT_PUBLIC_APP_URL=https://your-live-url.vercel.app
Then redeploy.

Paystack Setup
In Paystack dashboard, set webhook URL:
https://your-live-url.vercel.app/api/payments/webhook
Also confirm callback works through:

https://your-live-url.vercel.app/dashboard/requests
Test Checklist
Test these in order:
Signup/login
Contact support quick signup/login modal
Admin reply and client envelope notification
Pricing and new service flow
75% payment flow
Full payment flow
Admin mark paid
Admin upload ready document
Client view/download ready document
Receipt generation
