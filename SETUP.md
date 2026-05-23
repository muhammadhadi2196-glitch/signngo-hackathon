# signNGO — One-Time Setup

## 1. Create a Supabase project
1. Go to https://supabase.com → New Project.
2. Name: `signngo`. Pick a strong DB password and save it.
3. Region: closest to your users.
4. Wait for provisioning (~2 min).

## 2. Get your keys
In the Supabase dashboard:
- **Settings → API** → copy:
  - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
  - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `service_role` `secret` key → `SUPABASE_SERVICE_ROLE_KEY` (server only)
- **Settings → Database → Connection string**:
  - "Transaction" pooler URI → `DATABASE_URL`
  - "Session" / "Direct" URI → `DIRECT_URL`
  Replace `[YOUR-PASSWORD]` with the DB password you set.

## 3. Create storage buckets
Supabase dashboard → **Storage**:
- Create bucket `logos` (Public)
- Create bucket `documents` (Private)
- Create bucket `signed` (Private)

## 4. Enable Google OAuth
Supabase dashboard → **Authentication → Providers → Google**:
1. Toggle on.
2. In a separate tab, go to https://console.cloud.google.com → APIs & Services → Credentials → Create OAuth Client ID (Web).
   - Authorized JavaScript origin: `http://localhost:3000` (and later your prod URL)
   - Authorized redirect URI: copy the one Supabase shows you (looks like `https://xxxx.supabase.co/auth/v1/callback`)
3. Paste the Google Client ID + Secret back into Supabase.
4. Save.

## 5. Set up Resend
1. Sign up at https://resend.com (free tier: 3,000/mo).
2. Add and verify your domain (or use the onboarding test domain initially).
3. Create an API key → `RESEND_API_KEY`.
4. Set `EMAIL_FROM` to e.g. `signNGO <noreply@yourdomain.com>`.

## 6. Configure your `.env.local`
Copy `.env.example` to `.env.local` and fill in every value.

```bash
cp .env.example .env.local
# Now edit .env.local with your real values
```

## 7. Run migrations
```bash
npx prisma migrate dev --name init
npx prisma generate
```

## 8. Start the dev server
```bash
npm run dev
```
Open http://localhost:3000.
