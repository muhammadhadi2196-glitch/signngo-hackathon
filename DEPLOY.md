# Deploying signNGO to Vercel

## 1. Push to GitHub

Create a new **private** repo on github.com (do not add a README — your project already has files), then:

```bash
git add .
git commit -m "Part 4 complete — document signing, landing page, full feature build"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/signngo.git
git push -u origin main
```

## 2. Import to Vercel

1. Go to https://vercel.com → **New Project**
2. Import your `signngo` repo
3. Framework preset: **Next.js** (auto-detected)
4. Build command: `prisma generate && next build`
5. Root directory: leave as is (`.`)

## 3. Add environment variables

In Vercel project **Settings → Environment Variables**, add all of the following (copy values from your local `.env.local`):

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_APP_URL` | Your Vercel URL e.g. `https://signngo.vercel.app` — update after first deploy |
| `NEXT_PUBLIC_SUPABASE_URL` | From Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | From Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | From Supabase → Project Settings → API |
| `DATABASE_URL` | Supabase transaction pooler URL (`?pgbouncer=true&connection_limit=1`) |
| `DIRECT_URL` | Supabase session pooler or direct DB URL |
| `SUPABASE_BUCKET_LOGOS` | `logos` |
| `SUPABASE_BUCKET_DOCUMENTS` | `documents` |
| `SUPABASE_BUCKET_SIGNED` | `signed` |
| `RESEND_API_KEY` | Your Resend API key |
| `EMAIL_FROM` | e.g. `signNGO <noreply@yourdomain.com>` |

## 4. Deploy

Click **Deploy**. Wait ~2–3 minutes for the build to complete.

## 5. Update Supabase auth settings

In **Supabase → Authentication → URL Configuration**:
- **Site URL**: `https://signngo.vercel.app` (or your custom domain)
- **Redirect URLs**: add `https://signngo.vercel.app/auth/callback`

## 6. Update `NEXT_PUBLIC_APP_URL`

After the first deploy, go back to Vercel env vars and set `NEXT_PUBLIC_APP_URL` to your actual Vercel URL. Then redeploy: **Deployments → ⋯ → Redeploy**.

## 7. Test the live app

1. Visit your Vercel URL, sign up with a new account
2. Fill in your business profile (Settings → Business)
3. Create and send an invoice — check the PDF renders and email arrives
4. Go to **Documents → New Document** — upload a PDF, add a recipient, click Prepare
5. In the builder, drag a Signature field onto the PDF, click Save, click Send
6. Open the signing link from your email in **incognito** (logged-out browser)
7. Fill the fields, draw a signature, click Submit
8. Confirm the success screen shows + "Download now" works
9. Back in your account — the document shows COMPLETED status

## 8. (Optional) Custom domain

In Vercel project → **Settings → Domains** → Add your domain. Update your DNS as instructed. Update `NEXT_PUBLIC_APP_URL` and Supabase redirect URLs to match.

## Supabase Storage buckets (if not already created)

Make sure these three Storage buckets exist in Supabase (Storage → New bucket):
- `logos` — **public** bucket (for business logos in emails)
- `documents` — **private** bucket
- `signed` — **private** bucket
