# CLAUDE.md — Forge

Personal fitness PWA. **Single user (the owner). Not a product.** Read `spec.md` for full feature spec and data model before building anything.

## What this is

Next.js 15 (App Router) + Supabase + Gemini 2.5 Flash + Vercel. Dark Whoop/Strava-style UI. Tracks workouts, diet, weight, sleep, smoking, mood, photos. AI chat with full data context.

## Commands

```bash
npm run dev          # local dev
npm run build        # verify before pushing — Vercel deploys main
npx tsx scripts/<x>  # seed scripts
npx supabase db push # apply migrations (or run SQL in dashboard)
```

## Architecture rules

- **Server actions for all mutations.** No client-side API route fetching for CRUD. Forms call server actions directly.
- **API routes only for:** `/api/login` (password check) and `/api/chat` (AI streaming, edge runtime).
- **Supabase access:** server-only via service role key in `lib/supabase.ts`. NEVER import this in client components. No RLS configured — security is the password gate.
- **Auth:** middleware checks signed cookie against `SESSION_SECRET`. That's the whole auth system. Don't add user tables, sessions tables, or auth libraries.
- **Validation:** zod schemas in `lib/schemas/`, shared by forms and server actions.
- **Dates:** store as `date` (not timestamptz) for day-keyed logs (weight, sleep, etc.). One row per day, upsert on conflict.
- **Macros are computed, not stored.** `meal_items` stores quantity; calories/protein/etc. derive from `foods` per-100g values at query time.
- **Navigation:** 5-tab bottom nav (mobile) — Today / Diet / Workout / Chat / More. Today is the hub; diet logging is inline on Today. More tab holds Phase 2+ trackers and charts.
- **Training day targets:** detected automatically — query `workout_sets` for today; if rows exist → 1950 kcal training targets, else → 1750 kcal rest day targets. No manual toggle.
- **Workout auto-resume:** `/workout` checks for an in-progress workout (has `workouts` row for today without `completed_at`). If found, loads it directly — no prompt.

## AI integration rules

- All AI calls through Vercel AI SDK (`streamText`), model `gemini-2.5-flash` via `@ai-sdk/google`. Provider must stay swappable (one-line change to DeepSeek/OpenRouter later).
- Chat route: fetch last 90 days of all data in `Promise.all`, format compact (markdown tables, not JSON dumps), inject into system prompt with the static plan docs.
- Plan docs (`docs/hypertrophy-plan.md`, `docs/diet-plan.md`) are loaded once and cached in module scope — not re-read per request.
- **Never call AI automatically on page load.** Free tier is 1,500 req/day. AI fires on user action only (send message, click insight button).
- Insight buttons cache results in `ai_insights` — check cache before generating.

## UI rules

- shadcn/ui components, Strictly follow shadcn ui design. Preset already created from shadcn https://ui.shadcn.com/create?preset=b5BbmAxeeg `npx shadcn@latest init --preset b5BbmAxeeg --base base --template next --pointer`
- Touch targets ≥44px. This is used mid-workout with sweaty hands.
- Recharts for charts use styling from shadcn. No other chart libraries.
- Mobile-first. Desktop supported.

## Quality bar — IMPORTANT, read this

This is a personal tool, not production SaaS. Calibrate accordingly:

**DO:** TypeScript strict, zod on writes, clean component structure, fast interactions.

**DON'T (even though you'll want to):**
- No error boundaries on every component — one root boundary is enough
- No i18n, no a11y audits, no SEO (it's password-gated)

When in doubt: **the simplest thing that works today.** The owner is a senior FE dev who will refactor when actually needed.

## File conventions

```
app/
  (auth)/login/          # password gate page
  (app)/                 # everything behind middleware
    page.tsx             # today dashboard
    diet/
    workout/
    chat/
    trends/              # charts (phase 2)
  api/login/route.ts
  api/chat/route.ts      # edge runtime
lib/
  supabase.ts            # server-only client
  schemas/               # zod
  ai/context.ts          # data fetching + formatting for AI
  ai/prompts.ts          # system prompt + insight templates
components/              # shadcn + custom
scripts/                 # one-time seeds (tsx)
docs/                    # hypertrophy-plan.md, diet-plan.md (AI context source)
supabase/migrations/
```

## Gotchas (learned, don't rediscover)

- Edge runtime on `/api/chat`: no Node-only packages. supabase-js and AI SDK are safe.
- iOS PWA installs via Safari only. `apple-touch-icon` required. Storage evictable — DB is the only source of truth.
- Supabase free tier pauses after 7 days idle. Daily use prevents it; if paused, resume from dashboard (no data loss).
- `weight_logs` etc. have unique date constraint — always upsert, never insert.
- Rest timer must survive screen lock on iOS: use timestamp math (`endTime - now`), never `setInterval` counting.

## Current state

<!-- Update this section as phases complete -->
- [ ] Phase 0: Setup + password gate + app shell + PWA install + full DB schema + seed scripts + deploy
- [ ] Phase 1: Diet logging
- [ ] Phase 2: Workout logging
- [ ] Phase 3: AI chat
- [ ] Week 2+: weight/photos/trackers/charts/insights (in More tab)