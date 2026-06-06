# Forge — Project Spec

> Personal fitness tracking PWA. Single user. Tracks workouts, diet, weight, sleep, smoking, mood, photos. AI coach with full data context. Dark, athletic, chart-heavy UI (Whoop/Strava inspired).

---

## 1. Problem Statement

Existing apps (Hevy, Strong) limit free plans to 3-4 workout days (I run a 5-day split), don't track diet + lifestyle in one place, and have no AI that knows my data. I currently have to re-explain my entire context to AI tools every time I want insights.

**Forge solves this:** one app, all my data, an AI chat that already knows everything.

---

## 2. User

Exactly one: me.
- 27y, male, 73kg, cutting to 15% BF
- Runs a fixed 5-day hypertrophy split (see `docs/hypertrophy-plan.md`)
- Follows a fixed diet plan (see `docs/diet-plan.md`)
- Senior frontend dev — comfortable with technical UI, wants speed over hand-holding
- Devices: iPhone (PWA install via Safari) + laptop browser

---

## 3. Core Features (MVP — Week 1)

### 3.1 Password Gate
- App is publicly hosted but locked behind a single hardcoded password
- `APP_PASSWORD` env var, checked at `/api/login`, sets signed HTTP-only cookie
- Middleware redirects all unauthenticated routes to `/login`
- No user table, no OAuth, no signup. One password, one user.

### 3.2 Diet Logging
- Today view: meals as cards (Breakfast, Lunch, Snack, Dinner, Pre-bed)
- Add food via autocomplete from pre-seeded `foods` table (~50 Indian staples + my diet plan items)
- Quantity in grams → macros auto-calculated from per-100g values
- Daily totals bar: calories, protein, carbs, fat vs targets with progress bars
- Targets: training day 1950 kcal / 160g protein; rest day 1750 kcal / 160g protein
- **Training day detection:** auto — if a `workout_sets` row exists for today → training day targets; otherwise → rest day targets. No manual toggle.
- Edit/delete logged items inline
- Custom food creation (name + per-100g macros) for one-off items
- Date navigation: visible `< Today >` nav at top of /diet; defaults to today; past days are view-only (no editing)

### 3.3 Workout Logging
- Pick day from my 5-day plan (Day 1-5, pre-seeded from plan doc); pre-selects based on weekday (Mon→1, Tue→2, Wed→3, Fri→4, Sat→5), user can override
- Exercise list for that day → tap exercise → log sets: weight, reps, RIR
- **Show last session's numbers for the same exercise next to inputs** (killer feature)
- Rest timer auto-starts on set save (configurable per exercise: 60s/90s/2min/3min)
- Mark workout complete → stores summary
- Ad-hoc exercise addition: saved permanently to `exercises` table (searchable in future sessions)
- **Auto-resume:** /workout detects an in-progress workout for today and drops back in — no prompt
- Date navigation: visible `< Today >` nav at top of /workout; past days are view-only

### 3.4 AI Chat
- Named conversation threads stored in DB; thread list accessible; user can start new threads
- Every message → server fetches last 90 days of ALL data → injects into system prompt → streams Gemini 2.5 Flash response
- System prompt includes my full workout plan + diet plan (static context)
- No RAG, no embeddings — context stuffing (data is small, Gemini has 1M context)
- Two action buttons: "Daily Review" and "Weekly Review" → templated prompts → results cached in `ai_insights` table

### 3.5 PWA
- Installable on iPhone via Safari "Add to Home Screen" — set up in **Phase 0** (not deferred)
- manifest.json, apple-touch-icon, dark theme-color
- Offline support: nice-to-have, NOT a blocker. Don't build write-queues in MVP.

### 3.6 Navigation & Layout

- **Mobile:** 5-tab bottom nav — Today / Diet / Workout / Chat / More
- **Desktop:** sidebar equivalent
- **Today is the primary hub:** diet logging happens inline on the Today page; the workout card on Today launches /workout
- **More tab:** placeholder in Phase 0–3; becomes trackers + charts in Phase 4

---

## 4. Phase 2 Features (Week 2+, build only after dogfooding)

Priority order:
1. **Weight + measurements log** — daily weight, weekly waist; 7-day rolling average
2. **Progress photos** — front/side/back slots, Supabase Storage, client-side compression, date comparison view
3. **Quick trackers** — sleep hours + quality, cigarette count, mood/stress (single morning screen, 30 seconds)
4. **Charts page** (Recharts, no AI) — lives in the More tab:
   - Weight trend (7-day rolling avg line)
   - Strength progression: Lat Pulldown, Incline DB Press, Hack Squat, Bayesian Curl
   - Weekly volume per muscle group (bar)
   - Calories vs target (bar + target line)
   - Smoking trend (declining bar)
5. **Offline write queue** — only if gym signal is actually a problem

---

## 5. Non-Goals (explicitly out of scope)

- Multi-user support, social features, sharing
- Real authentication (OAuth, magic links)
- Barcode scanning / food photo recognition
- Native app / App Store
- Apple Health / Google Fit sync
- Push notifications (iOS PWA can't without paid dev account)
- Monetization, analytics, telemetry

---

## 6. Tech Stack (decided, do not revisit)

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 15, App Router, TypeScript | Server actions for mutations |
| UI | Tailwind + shadcn/ui | Preset created already via shadcn.ui (See design language below) |
| Charts | Recharts |  |
| DB | Supabase (Postgres) | Free tier; service role key server-only |
| Storage | Supabase Storage | Progress photos |
| AI | Vercel AI SDK + `@ai-sdk/google` | Gemini 2.5 Flash, free tier (1,500 req/day) |
| Hosting | Vercel free tier | Edge runtime on AI routes |
| PWA | manifest + minimal service worker | Serwist if needed |
| Validation | Zod | Shared schemas client/server |
| Dates | date-fns | |

**AI fallback path:** If Gemini free tier becomes insufficient → DeepSeek V3 via OpenRouter (~₹50/month at my usage). Build the AI call through Vercel AI SDK so provider swap is one line.

---

## 7. Data Model

```sql
-- Exercise & workout tracking
exercises (
  id uuid pk, name text, muscle_group text,
  default_rep_min int, default_rep_max int, default_rest_sec int
)
workout_days (        -- the 5-day plan template
  id uuid pk, day_number int, label text  -- "Day 1: Back + Biceps + Rear Delts"
)
workout_day_exercises (
  id uuid pk, workout_day_id fk, exercise_id fk,
  position int, target_sets int, target_rir text
)
workouts (
  id uuid pk, date date, workout_day_id fk null, notes text,
  completed_at timestamptz
)
workout_sets (
  id uuid pk, workout_id fk, exercise_id fk,
  set_number int, weight_kg numeric, reps int, rir int, notes text
)

-- Diet tracking
foods (
  id uuid pk, name text, calories_100g numeric,
  protein_100g numeric, carbs_100g numeric, fat_100g numeric
)
meals (
  id uuid pk, date date, meal_type text,  -- breakfast/lunch/snack/dinner/prebed
  logged_at timestamptz
)
meal_items (
  id uuid pk, meal_id fk, food_id fk, quantity_g numeric
  -- macros computed from foods at query time, not denormalized
)

-- Lifestyle tracking
weight_logs (id uuid pk, date date unique, weight_kg numeric, waist_cm numeric null, bf_pct numeric null)
sleep_logs (id uuid pk, date date unique, hours numeric, quality int)        -- quality 1-5
smoking_logs (id uuid pk, date date unique, count int)
mood_logs (id uuid pk, date date unique, mood int, stress int, notes text)  -- 1-5 scales
progress_photos (id uuid pk, date date, type text, storage_path text)       -- front/side/back

-- AI
ai_threads (id uuid pk, title text, created_at timestamptz)
ai_messages (id uuid pk, thread_id fk, role text, content text, created_at timestamptz)
ai_insights (id uuid pk, date date, type text, content text, created_at timestamptz)  -- daily/weekly
```

Seeding: one-time scripts parse `docs/hypertrophy-plan.md` and `docs/diet-plan.md` via Gemini → JSON → insert. Scripts live in `/scripts`, run with `tsx`. **Seed scripts are built and run in Phase 0** so Phase 1 starts with real food and workout plan data.

---

## 8. AI Context Strategy

On every chat message, the API route:
1. Fetches last 90 days: workouts+sets, meals+items+macros, weight, sleep, smoking, mood (parallel queries)
2. Formats as compact markdown (tables, not verbose JSON)
3. Builds system prompt: coach persona + full plan docs + user data
4. Streams response via `streamText`

System prompt rules:
- Concise, data-driven, references specific numbers from my logs
- Proactively flags: sleep <6hrs, smoking creep, protein misses, strength stalls
- Uses my vocabulary: RIR, MPS, kcal, kg
- Says "I don't have that data" rather than guessing

Token budget: ~30-40K tokens per request with 90 days of data. Well within Gemini's 1M context and free tier TPM.

---

## 9. Design Language

- Strictly follow shadcn ui design. Preset already created from shadcn https://ui.shadcn.com/create?preset=b5BbmAxeeg `npx shadcn@latest init --preset b5BbmAxeeg --base base --template next --pointer`

- Style: luma, Base color: mauve, Base color: yellow, Chart color: cyan, Heading: noto serif, Font: oxanium, Icons: hugeicons, radius: large 

---

## 10. Performance / Quality Bar (personal app, calibrated)

- Page loads <1s on 4G (it's mostly text and numbers)
- Logging a set: ≤3 taps from app open
- Logging a meal: ≤5 taps with autocomplete
- NO: error boundaries everywhere, exhaustive a11y audit, unit tests, i18n
- YES: TypeScript strict, zod validation on writes, mobile-first responsive

---

## 11. Env Vars

```
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=     # server-only
GOOGLE_GENERATIVE_AI_API_KEY=
APP_PASSWORD=
SESSION_SECRET=                # random 32 chars, signs the auth cookie
```

---

## 12. Known Constraints & Gotchas

- Supabase free tier pauses after 7 days inactivity (daily logging prevents this)
- Gemini free: 1,500 req/day, 15 RPM — never auto-call AI on page load, button-triggered only
- iOS PWA: Safari-only install, no push, storage can be evicted — DB is source of truth, never localStorage
- Vercel edge runtime: no Node-only libs on AI routes; supabase-js + AI SDK are edge-safe
- Service role key bypasses RLS — server actions/API routes only, never client