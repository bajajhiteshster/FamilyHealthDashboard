# 🩸 BloodTrack AI — Family Health Dashboard

A Next.js app for tracking blood report trends. Each family member has their own account. PDF reports are parsed automatically by Claude AI.

---

## Stack
- **Next.js 14** (App Router)
- **Supabase** — Auth + Postgres database
- **Vercel** — Hosting (free tier works great)
- **Anthropic Claude** — PDF extraction

---

## 🚀 Deploy in 4 Steps

### Step 1 — Supabase Setup
1. Go to [supabase.com](https://supabase.com) → New Project
2. Open **SQL Editor** and paste the entire contents of `supabase-schema.sql` → Run
3. Go to **Settings → API** and copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Go to **Authentication → Providers** → make sure Email is enabled
5. Go to **Authentication → URL Configuration** → set Site URL to your Vercel URL (set after step 3)

### Step 2 — Get Anthropic API Key
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create API key → copy it as `ANTHROPIC_API_KEY`

### Step 3 — Deploy to Vercel
```bash
# Push to GitHub first
git init && git add . && git commit -m "init"
gh repo create bloodtrack --public --push  # or push manually

# Then on vercel.com:
# 1. New Project → Import your GitHub repo
# 2. Add Environment Variables:
#    NEXT_PUBLIC_SUPABASE_URL=...
#    NEXT_PUBLIC_SUPABASE_ANON_KEY=...
#    ANTHROPIC_API_KEY=...
# 3. Deploy!
```

Or deploy via CLI:
```bash
npm i -g vercel
vercel --prod
# Follow prompts, add env vars when asked
```

### Step 4 — Share with Family
- Send them your Vercel URL (e.g. `https://bloodtrack-yourname.vercel.app`)
- Each person clicks **Create Account** and signs up with their email
- Their data is completely isolated — they only see their own reports

---

## 💻 Local Development
```bash
cp .env.local.example .env.local
# Fill in your keys in .env.local

npm install
npm run dev
# Open http://localhost:3000
```

---

## 📄 How PDF Upload Works
1. User uploads a blood report PDF
2. It's sent to `/api/extract` (server-side route)
3. Claude reads the PDF and extracts all parameter values as JSON
4. Values are saved to Supabase under the user's account
5. Charts update immediately

---

## Parameters Tracked
HbA1c · Fasting Glucose · Triglycerides · HDL · LDL · Total Cholesterol · Hemoglobin · Creatinine · TSH · Vitamin D · WBC · Platelets · Uric Acid · ALT · AST

---

## Project Structure
```
bloodtrack/
├── app/
│   ├── page.tsx              # Redirects to /auth or /dashboard
│   ├── auth/page.tsx         # Login + Signup page
│   ├── dashboard/page.tsx    # Server component (auth check + data fetch)
│   └── api/extract/route.ts  # PDF → Claude → Supabase
├── components/
│   ├── DashboardClient.tsx   # Main dashboard UI
│   ├── TrendChart.tsx        # Recharts line chart
│   └── StatCard.tsx          # Parameter stat card
├── lib/
│   ├── params.ts             # Parameter definitions & helpers
│   ├── supabase/client.ts    # Browser Supabase client
│   └── supabase/server.ts    # Server Supabase client
└── supabase-schema.sql       # Run this in Supabase SQL editor
```
