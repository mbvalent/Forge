---
title: "Phase 0 — Foundation: App Shell, Auth, Schema, Seed, PWA, Deploy"
type: feat
status: active
date: 2026-06-06
origin: docs/brainstorms/2026-06-06-forge-initial-brainstorm.md
---

# Phase 0 — Foundation

## Overview

Stand up the entire technical foundation for Forge in a single phase: Next.js 15 project initialized with the shadcn preset, full Postgres schema migrated, password gate live, app shell with 5-tab nav, PWA installable from Safari, seed data in the database, and deployed to Vercel.

**Done when:** The app installs on iPhone via Safari. The password gate works. Behind it: an empty 5-tab navigation shell. Diet and workout seed data is in the database, ready for Phase 1.

---

## Problem Statement / Motivation

Every subsequent phase (diet logging, workout logging, AI chat) depends on this foundation existing. Deferring any piece creates a dependency debt: no seed data means Phase 1 can't test food search; no PWA means gym use can't be validated from day one; no schema means no server actions. Phase 0 must be complete and deployed before a single feature is built.

---

## Implementation Phases

### Sub-task 1: Project Initialization

**Order:** First. Everything else depends on this.

#### 1a. Next.js 15 scaffold

Run in the existing project directory (which already has `spec.md`, `CLAUDE.md`, `docs/`):

```bash
# From /Users/mbvalent/Workspace/mbvalent-dev/Forge
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --no-src-dir \
  --import-alias "@/*"
```

When prompted about existing files, keep them (spec.md, CLAUDE.md, docs/ are not Next.js files).

#### 1b. shadcn/ui with preset

```bash
npx shadcn@latest init --preset b5BbmAxeeg --base base --template next --pointer
```

This applies: luma style, mauve base color, yellow accent, cyan chart color, Noto Serif headings, Oxanium body font, Hugeicons icons, large border radius. Generates `components.json` and `app/globals.css` with CSS variables.

#### 1c. Install dependencies

```bash
npm install @supabase/supabase-js jose date-fns zod
npm install ai @ai-sdk/google          # for seed scripts + Phase 3 stub
npm install hugeicons react-hugeicons  # icon library from preset
```

#### 1d. TypeScript strict mode

Ensure `tsconfig.json` has:
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true
  }
}
```

#### 1e. Configure `.env.local`

Add the three missing vars (two already exist):
```
# Already present:
GOOGLE_GENERATIVE_AI_API_KEY=...
APP_PASSWORD=...

# Add these:
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SECRET_KEY=...
SESSION_SECRET=<random 32-char string>   # openssl rand -base64 32
```

**Acceptance criteria:**
- [ ] `npm run dev` starts without errors
- [ ] `npm run build` passes TypeScript with `strict: true`
- [ ] shadcn preset CSS variables present in `globals.css`
- [ ] All 5 env vars in `.env.local`

---

### Sub-task 2: Supabase Schema

**Order:** Second. Auth and seed scripts both depend on knowing the schema exists.

#### 2a. Create Supabase project

From the Supabase dashboard, create a new project. Copy the project URL and service role key into `.env.local`.

#### 2b. Full migration SQL

Create `supabase/migrations/001_initial_schema.sql`:

```sql
-- Workout tracking
CREATE TABLE exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  muscle_group text,
  default_rep_min int,
  default_rep_max int,
  default_rest_sec int DEFAULT 90,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE workout_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_number int NOT NULL UNIQUE,
  label text NOT NULL
);

CREATE TABLE workout_day_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_day_id uuid NOT NULL REFERENCES workout_days(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  position int NOT NULL,
  target_sets int NOT NULL,
  target_rir text
);

CREATE TABLE workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  workout_day_id uuid REFERENCES workout_days(id),
  notes text,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE workout_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id uuid NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES exercises(id),
  set_number int NOT NULL,
  weight_kg numeric NOT NULL,
  reps int NOT NULL,
  rir int,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Diet tracking
CREATE TABLE foods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  calories_100g numeric NOT NULL,
  protein_100g numeric NOT NULL,
  carbs_100g numeric NOT NULL,
  fat_100g numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  meal_type text NOT NULL, -- breakfast | lunch | snack | dinner | prebed
  logged_at timestamptz DEFAULT now(),
  UNIQUE(date, meal_type)
);

CREATE TABLE meal_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id uuid NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  food_id uuid NOT NULL REFERENCES foods(id),
  quantity_g numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Lifestyle tracking (all with unique date constraints — always upsert)
CREATE TABLE weight_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  weight_kg numeric NOT NULL,
  waist_cm numeric,
  bf_pct numeric
);

CREATE TABLE sleep_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  hours numeric NOT NULL,
  quality int CHECK (quality BETWEEN 1 AND 5)
);

CREATE TABLE smoking_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  count int NOT NULL
);

CREATE TABLE mood_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  mood int NOT NULL CHECK (mood BETWEEN 1 AND 5),
  stress int NOT NULL CHECK (stress BETWEEN 1 AND 5),
  notes text
);

CREATE TABLE progress_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  type text NOT NULL CHECK (type IN ('front', 'side', 'back')),
  storage_path text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- AI
CREATE TABLE ai_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES ai_threads(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE ai_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  type text NOT NULL CHECK (type IN ('daily', 'weekly')),
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(date, type)
);
```

Apply via Supabase SQL editor (paste and run) or:
```bash
npx supabase db push   # if supabase CLI is initialized
```

#### 2c. Supabase server-only client

`lib/supabase.ts`:
```typescript
import 'server-only'
import { createClient } from '@supabase/supabase-js'

export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  )
}
```

**Acceptance criteria:**
- [ ] All 16 tables created in Supabase dashboard
- [ ] `lib/supabase.ts` imports `server-only` — importing it in a client component causes a build error (this is intentional protection)
- [ ] `createServiceClient()` can execute a test query from a server action without error

---

### Sub-task 3: Password Gate + Auth

**Order:** Third. Needs the project structure from Sub-task 1.

#### 3a. Session utilities

`lib/session.ts`:
```typescript
import 'server-only'
import { SignJWT, jwtVerify } from 'jose'

const encodedKey = new TextEncoder().encode(process.env.SESSION_SECRET)

export async function encrypt(payload: { expiresAt: Date }): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(encodedKey)
}

export async function decrypt(session: string | undefined = '') {
  try {
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ['HS256'],
    })
    return payload
  } catch {
    return null
  }
}
```

#### 3b. Zod schema for login

`lib/schemas/auth.ts`:
```typescript
import { z } from 'zod'

export const loginSchema = z.object({
  password: z.string().min(1, 'Password required'),
})
```

#### 3c. Login API route

`app/api/login/route.ts`:
```typescript
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { encrypt } from '@/lib/session'
import { loginSchema } from '@/lib/schemas/auth'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const result = loginSchema.safeParse({ password: formData.get('password') })

  if (!result.success || result.data.password !== process.env.APP_PASSWORD) {
    return NextResponse.redirect(new URL('/login?error=1', request.url))
  }

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const session = await encrypt({ expiresAt })

  const cookieStore = await cookies()
  cookieStore.set('session', session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  })

  return NextResponse.redirect(new URL('/', request.url))
}
```

#### 3d. Login page

`app/(auth)/login/page.tsx` — server component, simple form that native-POSTs to `/api/login`:
```typescript
// Uses shadcn Card, Input, Button components
// Shows error message if ?error=1 in searchParams
// Native HTML <form action="/api/login" method="POST"> — no JS dependency
```

No `'use client'` needed — the form uses native POST, not a fetch.

#### 3e. Middleware

`middleware.ts` (at project root):
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { decrypt } from '@/lib/session'

export default async function middleware(req: NextRequest) {
  const cookie = req.cookies.get('session')?.value
  const session = await decrypt(cookie)

  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
}

export const config = {
  // Protect everything except: login page, login API, Next.js internals, static files
  matcher: ['/((?!login|api/login|_next/static|_next/image|.*\\..*).*)'],
}
```

**Acceptance criteria:**
- [ ] Visiting `/` without a cookie → redirects to `/login`
- [ ] Submitting wrong password → redirects back to `/login?error=1` with error message shown
- [ ] Submitting correct password → sets cookie, redirects to `/`
- [ ] Visiting `/` with valid cookie → loads page (even if it's just a stub)
- [ ] Cookie expires after 7 days

---

### Sub-task 4: App Shell + Navigation

**Order:** Fourth. Depends on auth routing being set up (Sub-task 3).

#### 4a. Root layout

`app/layout.tsx` — sets dark theme, Oxanium font, Noto Serif for headings, theme-color meta:
```typescript
import type { Metadata } from 'next'
import { Oxanium, Noto_Serif } from 'next/font/google'
import './globals.css'

const oxanium = Oxanium({ subsets: ['latin'], variable: '--font-sans' })
const notoSerif = Noto_Serif({ subsets: ['latin'], variable: '--font-heading' })

export const metadata: Metadata = {
  title: 'Forge',
  description: 'Personal fitness tracker',
  themeColor: '#09090b',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${oxanium.variable} ${notoSerif.variable} font-sans bg-background text-foreground`}>
        {children}
      </body>
    </html>
  )
}
```

#### 4b. Authenticated layout with 5-tab nav

`app/(app)/layout.tsx`:
```typescript
import { BottomNav } from '@/components/nav/bottom-nav'
import { Sidebar } from '@/components/nav/sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh">
      <Sidebar className="hidden md:flex" />       {/* desktop */}
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
        {children}
      </main>
      <BottomNav className="md:hidden" />          {/* mobile */}
    </div>
  )
}
```

#### 4c. Bottom navigation component

`components/nav/bottom-nav.tsx` — client component (needs `usePathname`):
```typescript
'use client'
// 5 tabs: Today (Home01Icon), Diet (Apple01Icon), Workout (Dumbbell01Icon),
//         Chat (Message01Icon), More (GridIcon or Menu01Icon)
// Active tab: highlighted with accent color
// Each tab: min-h-[44px] touch target, icon + label
// Uses Next.js <Link> for navigation
```

#### 4d. Sidebar component

`components/nav/sidebar.tsx` — same 5 links as bottom nav, displayed vertically. App name "FORGE" at top.

#### 4e. Page stubs

Each page is a minimal server component with a placeholder heading:

| File | URL | Content |
|---|---|---|
| `app/(app)/page.tsx` | `/` | `<h1>Today</h1>` |
| `app/(app)/diet/page.tsx` | `/diet` | `<h1>Diet</h1>` |
| `app/(app)/workout/page.tsx` | `/workout` | `<h1>Workout</h1>` |
| `app/(app)/chat/page.tsx` | `/chat` | `<h1>Chat</h1>` |
| `app/(app)/more/page.tsx` | `/more` | `<h1>More</h1>` |

Also create the Phase 3 chat route stub now so the edge runtime constraint is documented:

`app/api/chat/route.ts`:
```typescript
export const runtime = 'edge'
// Full implementation in Phase 3
export async function POST() {
  return new Response('Not implemented', { status: 501 })
}
```

**Acceptance criteria:**
- [ ] All 5 nav tabs are visible on mobile, link to correct routes
- [ ] Active tab is visually distinct
- [ ] Sidebar visible on desktop, hidden on mobile
- [ ] All 5 page stubs render without errors
- [ ] Bottom nav is fixed at bottom, content scrolls above it
- [ ] Touch targets ≥44px on all nav items

---

### Sub-task 5: PWA Setup

**Order:** Can run parallel with Sub-task 4. Depends only on the Next.js project existing.

#### 5a. Web app manifest

`app/manifest.ts`:
```typescript
import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Forge',
    short_name: 'Forge',
    description: 'Personal fitness tracker',
    start_url: '/',
    display: 'standalone',
    background_color: '#09090b',
    theme_color: '#09090b',
    orientation: 'portrait',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
```

Next.js auto-serves this at `/manifest.webmanifest` and injects `<link rel="manifest">`. No manual link tag needed.

#### 5b. Icons

Place in `public/`:
- `public/icon-192.png` — 192×192 app icon
- `public/icon-512.png` — 512×512 maskable icon

Place in `app/`:
- `app/apple-icon.png` — 180×180 PNG (Next.js auto-injects `<link rel="apple-touch-icon">`)

> For MVP, create a simple dark-background icon with the text "F" or a flame symbol. Exact design is not Phase 0 scope — any valid PNG unblocks the PWA install.

#### 5c. Theme color meta

Already handled in `app/layout.tsx` via the `metadata.themeColor` field — Next.js injects `<meta name="theme-color">` automatically.

**Acceptance criteria:**
- [ ] `/manifest.webmanifest` returns valid JSON (check in browser devtools → Application → Manifest)
- [ ] `<link rel="apple-touch-icon">` present in page source
- [ ] `<meta name="theme-color" content="#09090b">` present in page source
- [ ] Safari on iPhone shows "Add to Home Screen" option and installs the app
- [ ] Installed app opens in standalone mode (no Safari browser chrome)

---

### Sub-task 6: Seed Scripts

**Order:** Sixth. Depends on schema (Sub-task 2) and env vars (Sub-task 1).

These are one-time Node.js scripts run locally before Phase 1. They call Gemini to generate structured data from the plan docs and insert into Supabase.

#### Critical: env loading

Both scripts must load `.env.local` before any Supabase or Gemini calls:
```typescript
// MUST be the first two lines of each script
import { loadEnvConfig } from '@next/env'
loadEnvConfig(process.cwd())
```

`@next/env` is already in `node_modules` as a Next.js dependency.

#### 6a. Food seed script

`scripts/seed-foods.ts`:

**What it does:**
1. Reads `docs/diet-plan.md` as a string
2. Calls Gemini with a structured prompt asking for JSON array of foods
3. Validates the response JSON
4. Upserts each food into the `foods` table (ON CONFLICT DO NOTHING on name)

**Gemini prompt strategy:**
```
Extract all food items mentioned in this diet plan. For each food item, provide:
- name (string, normalized e.g. "Chicken Breast" not "150g chicken breast")
- calories_100g (number, kcal per 100g from nutritional knowledge)
- protein_100g (number, grams per 100g)
- carbs_100g (number, grams per 100g)
- fat_100g (number, grams per 100g)

Also add these common Indian staples not explicitly mentioned: [list of additional items]

Return ONLY a valid JSON array. No markdown, no explanation.
Example: [{"name":"Chicken Breast","calories_100g":165,"protein_100g":31,"carbs_100g":0,"fat_100g":3.6}]
```

**Target foods to extract** (Gemini should handle these from the doc, list is a validation baseline):
- Proteins: Chicken Breast, Egg (whole), Egg White, Paneer, Curd, Toned Milk, Whey Protein, Basa Fish, Rohu Fish
- Carbs: Rolled Oats, Whole Wheat Roti, Brown Rice, White Rice, Banana, Apple, Orange
- Fats: Almonds, Walnuts, Ghee
- Dals: Moong Dal, Toor Dal, Masoor Dal, Chana Dal, Urad Dal
- Vegetables: Bhindi, Lauki, Palak, Gobhi, Tinda, Torai, Cucumber, Tomato, Onion, Bell Pepper, Broccoli, Cauliflower, French Beans, Karela
- Other: Black Coffee, Green Tea, Lemon

**Run:** `npx tsx scripts/seed-foods.ts`

#### 6b. Workout plan seed script

`scripts/seed-workout-plan.ts`:

**What it does:**
1. Reads `docs/hypertrophy-plan.md` as a string
2. Calls Gemini to extract the structured workout plan as JSON
3. Deduplicates exercises by name (e.g., "Lat Pulldown" appears on Day 1 and Day 5 — same `exercise_id` in both days)
4. Inserts `exercises` first, then `workout_days`, then `workout_day_exercises`

**Gemini prompt strategy:**
```
Extract the complete 5-day workout plan from this document. Return a JSON object with:
{
  "days": [
    {
      "day_number": 1,
      "label": "Back + Biceps + Rear Delts",
      "exercises": [
        {
          "name": "Lat Pulldown (Neutral Grip)",
          "muscle_group": "Back",
          "position": 1,
          "target_sets": 3,
          "default_rep_min": 8,
          "default_rep_max": 12,
          "default_rest_sec": 120,
          "target_rir": "1-2"
        }
      ]
    }
  ]
}
Return ONLY valid JSON. For rest times: "2 min" → 120, "90 sec" → 90, "60-90 sec" → 90, "2-3 min" → 150.
Normalize exercise names (remove parenthetical intent like "(squeeze focus, lighter)" — same exercise is same name).
```

**Deduplication logic** (in script, not Gemini):
```typescript
// Build exercises map first, dedup by normalized name
const exerciseMap = new Map<string, string>() // name → uuid

for (const day of plan.days) {
  for (const ex of day.exercises) {
    const key = ex.name.toLowerCase().trim()
    if (!exerciseMap.has(key)) {
      // insert exercise, store id
      exerciseMap.set(key, insertedId)
    }
  }
}

// Then insert workout_day_exercises using the deduped ids
```

**Day → weekday mapping** embedded in seed data:
- Day 1 → Monday (implied by split structure)
- Day 2 → Tuesday
- Day 3 → Wednesday
- Day 4 → Friday
- Day 5 → Saturday

**Run:** `npx tsx scripts/seed-workout-plan.ts`

#### 6c. Verify seed results

After both scripts run, add counts to `package.json` as a quick verify:
```json
"seed:verify": "npx tsx -e \"import { loadEnvConfig } from '@next/env'; loadEnvConfig(process.cwd()); const { createServiceClient } = require('./lib/supabase'); const sb = createServiceClient(); Promise.all([sb.from('foods').select('id', {count: 'exact', head: true}), sb.from('exercises').select('id', {count: 'exact', head: true}), sb.from('workout_days').select('id', {count: 'exact', head: true})]).then(([f, e, d]) => console.log('Foods:', f.count, 'Exercises:', e.count, 'Days:', d.count))\""
```

Or just check counts in the Supabase dashboard table viewer.

**Acceptance criteria:**
- [ ] `npx tsx scripts/seed-foods.ts` completes without error
- [ ] `foods` table has ≥40 rows with valid macro values (no null calories)
- [ ] `npx tsx scripts/seed-workout-plan.ts` completes without error
- [ ] `workout_days` has exactly 5 rows (day_number 1-5)
- [ ] `exercises` table has ~35-40 unique exercises (fewer than total because of deduplication)
- [ ] `workout_day_exercises` has ~41 rows (all exercise-day assignments across 5 days)
- [ ] Exercises that appear on multiple days (Lat Pulldown, Bayesian Curl, etc.) share a single `exercise_id`

---

### Sub-task 7: Vercel Deployment

**Order:** Last. Everything else must work locally first.

1. Push code to GitHub (create repo if not exists)
2. Import project in Vercel dashboard → select the GitHub repo
3. Framework preset: Next.js (auto-detected)
4. Add all 5 env vars in Vercel project settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SECRET_KEY`
   - `GOOGLE_GENERATIVE_AI_API_KEY`
   - `APP_PASSWORD`
   - `SESSION_SECRET`
5. Deploy and verify

**Acceptance criteria:**
- [ ] `npm run build` passes locally before pushing
- [ ] Vercel deployment succeeds (no build errors)
- [ ] Password gate works on the deployed URL
- [ ] App installs on iPhone Safari from the deployed URL (not localhost — PWA install requires HTTPS)
- [ ] All 5 pages load behind the auth gate on the deployed URL

---

## Complete File Structure

```
/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx             # password form
│   ├── (app)/
│   │   ├── layout.tsx               # shell: sidebar + bottom nav
│   │   ├── page.tsx                 # Today (stub)
│   │   ├── diet/
│   │   │   └── page.tsx             # Diet (stub)
│   │   ├── workout/
│   │   │   └── page.tsx             # Workout (stub)
│   │   ├── chat/
│   │   │   └── page.tsx             # Chat (stub)
│   │   └── more/
│   │       └── page.tsx             # More (stub)
│   ├── api/
│   │   ├── login/
│   │   │   └── route.ts             # POST: verify password, set cookie
│   │   └── chat/
│   │       └── route.ts             # stub with `export const runtime = 'edge'`
│   ├── apple-icon.png               # 180×180 — Next.js auto-detects
│   ├── globals.css                  # shadcn preset CSS variables
│   ├── layout.tsx                   # root: fonts, dark class, theme-color meta
│   └── manifest.ts                  # MetadataRoute.Manifest → /manifest.webmanifest
├── components/
│   └── nav/
│       ├── bottom-nav.tsx           # 5-tab mobile nav (client component)
│       └── sidebar.tsx              # desktop sidebar
├── lib/
│   ├── session.ts                   # jose encrypt/decrypt (server-only)
│   ├── supabase.ts                  # createServiceClient (server-only)
│   └── schemas/
│       └── auth.ts                  # zod loginSchema
├── public/
│   ├── icon-192.png
│   └── icon-512.png
├── scripts/
│   ├── seed-foods.ts
│   └── seed-workout-plan.ts
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
├── docs/                            # existing: spec.md, plan docs, brainstorms
├── middleware.ts                    # route protection
├── next.config.ts
├── tsconfig.json
├── package.json
└── .env.local                       # all 5 vars
```

---

## System-Wide Impact

### Interaction Graph

```
User opens URL
  → middleware.ts intercepts every (app) route
    → decrypt() reads 'session' cookie with jose
      → invalid/missing → redirect to /login
      → valid → NextResponse.next()

POST /api/login
  → compare formData.password against APP_PASSWORD
    → match → encrypt() creates 7-day JWT → set httpOnly cookie → redirect /
    → no match → redirect /login?error=1

Server action (any mutation in Phase 1+)
  → imports createServiceClient() from lib/supabase.ts
    → 'server-only' guard prevents client import
    → uses SUPABASE_SECRET_KEY (bypasses RLS)
```

### Error & Failure Propagation

| Failure | Behavior |
|---|---|
| `SESSION_SECRET` missing in prod | `jwtVerify` throws → middleware catches → redirect loop to /login |
| `SUPABASE_SECRET_KEY` missing | `createServiceClient()` succeeds, but queries return 401 errors |
| Supabase paused (7-day idle) | All DB queries return errors — resume from dashboard |
| `GOOGLE_GENERATIVE_AI_API_KEY` invalid | Seed scripts fail with Gemini auth error — does not affect runtime app |

### State Lifecycle Risks

- Phase 0 has no write operations at runtime (auth cookie only). No orphaned state possible.
- Seed scripts are idempotent if written with `ON CONFLICT DO NOTHING` — safe to re-run.

### API Surface Parity

- Login: only `/api/login` — no other auth surfaces.
- Nav stubs: no data fetching, no mutations — pure rendering.

---

## Alternative Approaches Considered

| Decision | Alternative | Why Rejected |
|---|---|---|
| `jose` for cookie signing | `iron-session` | Both are edge-compatible. `jose` is the approach used in official Next.js auth examples. |
| `@supabase/supabase-js` directly | `@supabase/ssr` | `@supabase/ssr` exists for per-user RLS session threading — wrong tool for a single-owner app with service role access |
| `app/manifest.ts` | Static `public/manifest.json` | `manifest.ts` is type-checked and auto-linked by Next.js metadata system |
| `app/apple-icon.png` | Manual `<link>` in layout | File convention auto-injects the link — less to maintain |
| `loadEnvConfig` from `@next/env` | `dotenv` | `@next/env` loads `.env.local` exactly like Next.js does — already in node_modules, zero extra deps |

---

## Dependencies & Prerequisites

| Prerequisite | Status |
|---|---|
| Supabase project created | Needed before Sub-task 2 |
| `.env.local` fully populated | Needed before Sub-task 6 (seed scripts) |
| All icons created (192px, 512px, 180px) | Needed before Sub-task 5/7 |
| GitHub repo for Vercel | Needed before Sub-task 7 |
| Vercel account | Needed before Sub-task 7 |

---

## Acceptance Criteria (Phase 0 Complete)

### Must pass locally
- [ ] `npm run build` exits 0 with no TypeScript errors
- [ ] `npm run dev` starts and serves the app
- [ ] Password gate works: correct password → cookie + redirect; wrong → error message
- [ ] All 5 nav tabs navigate to their page stubs
- [ ] Nav is 5-tab bottom bar on mobile, sidebar on desktop
- [ ] Both seed scripts run without error

### Must pass on deployed URL
- [ ] Vercel deployment succeeds
- [ ] Password gate works on HTTPS
- [ ] App installs from Safari iPhone → opens standalone (no browser chrome)
- [ ] `<meta name="theme-color" content="#09090b">` present
- [ ] `apple-touch-icon` linked in page source

### Database state
- [ ] `foods` table: ≥40 rows
- [ ] `workout_days`: exactly 5 rows
- [ ] `exercises`: ~35-40 unique rows
- [ ] `workout_day_exercises`: ~41 rows

---

## Risk Analysis

| Risk | Likelihood | Mitigation |
|---|---|---|
| shadcn preset `b5BbmAxeeg` applies incorrectly | Low | Run `npx shadcn@latest init --preset b5BbmAxeeg --base base --template next --pointer` exactly; verify CSS variables in globals.css |
| Gemini seed output is malformed JSON | Medium | Wrap Gemini call in try/catch; log raw response; re-run with fixed prompt if needed. Add `JSON.parse()` validation before inserting. |
| iOS PWA doesn't install (Safari requirement) | Low | Must test on actual iPhone with HTTPS URL (Vercel deploy) — localhost does not qualify for PWA install |
| Middleware matcher too broad/narrow | Low | Test: (1) unauthenticated visit to `/` redirects; (2) `/login` loads; (3) `/api/login` POST works; (4) `_next/static` assets load |
| Supabase service role key accidentally exposed | Medium | `lib/supabase.ts` has `import 'server-only'` — importing in a client component is a build-time error |

---

## Sources & References

### Origin
- **Brainstorm:** [docs/brainstorms/2026-06-06-forge-initial-brainstorm.md](../brainstorms/2026-06-06-forge-initial-brainstorm.md)
  - Key decisions carried forward: PWA in Phase 0 (not Phase 4), seed scripts in Phase 0 (Phase 1 starts with real data), 5-tab nav (Today/Diet/Workout/Chat/More)

### External References
- [Next.js Authentication Guide](https://nextjs.org/docs/app/guides/authentication) — `jose` + middleware pattern
- [Next.js manifest.ts file convention](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/manifest)
- [Next.js apple-icon file convention](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/app-icons)
- [Next.js PWA Guide](https://nextjs.org/docs/app/guides/progressive-web-apps)
- [shadcn/ui preset b5BbmAxeeg](https://ui.shadcn.com/create?preset=b5BbmAxeeg)
