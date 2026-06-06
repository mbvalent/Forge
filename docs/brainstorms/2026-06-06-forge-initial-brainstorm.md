# Forge — Initial Brainstorm

**Date:** 2026-06-06  
**Status:** Finalized — ready for planning

---

## What We're Building

A personal fitness PWA for a single user. One place for workouts, diet, weight, sleep, smoking, mood, and progress photos. An AI coach that already knows all your data. No multi-user, no sharing, no App Store — a personal tool built for speed and daily gym use.

Stack is decided: Next.js 15 (App Router), Supabase, Gemini 2.5 Flash via Vercel AI SDK, Vercel hosting.

---

## Why This Approach

- Existing apps (Hevy, Strong) cap free plans at 3-4 workout days; this runs a 5-day split.
- No single app tracks diet + workouts + lifestyle in one place.
- No AI coach knows your actual data — you re-explain context every time. Forge fixes this with context stuffing (90-day data in system prompt, no RAG needed at this data scale).
- Build once, use daily. Calibrated for personal tool quality, not production SaaS.

---

## Key Decisions

| Decision | Choice | Why |
|---|---|---|
| Auth | Signed cookie, single `APP_PASSWORD` | Zero overhead. One user. No OAuth needed. |
| DB access | Service role key, server-only | No RLS. Middleware is the only security layer. |
| Mutations | Server actions (not API routes) | Cleaner than client-side fetch for CRUD. |
| AI | Context stuffing, not RAG | 90-day data is ~30-40K tokens. Gemini 1M context handles it easily. No embedding infra needed. |
| Macros | Computed at query time from foods.per100g | Not denormalized. Stays correct when food data changes. |
| Dates | `date` type (not timestamptz) | Day-keyed logs need upsert on date, not timestamp. |
| Training day detection | Auto from workout logged today | If workout exists today → 1950 kcal target. Otherwise → 1750. Zero UI friction. |
| Rest timer | Timestamp math (`endTime - now`), not `setInterval` | iOS screen lock kills intervals. Timestamp approach survives lock. |
| PWA install | Phase 0 (moved from Phase 4) | Used on iPhone in the gym from day one. Install capability must exist at launch. |
| Dashboard strategy | Phase-by-phase additions | No placeholder cards. Each phase adds its own section to the Today view. |
| Food seeding | Phase 0 (not Phase 1) | Phase 1 assumes real food data exists. Seed script uses Gemini to parse diet-plan.md. |
| Charts | Recharts only | Consistent with shadcn styling. No other chart libraries. |
| AI calls | User-triggered only | Gemini free tier: 1,500 req/day. Never auto-call on page load. |
| Today dashboard | Hub, not summary | Primary interaction surface. Diet logging happens inline here. Workout card launches /workout. |
| Mobile nav | 5 tabs: Today / Diet / Workout / Chat / More | More tab for Phase 4 trackers + charts. Direct access to Diet and Workout daily. |
| History / date nav | Visible date nav (< Today >) on Diet + Workout pages | Defaults to today. Scrolling back supported. Previous days view-only (no editing). |
| In-progress workout | Auto-resume | /workout detects active session for today and drops back in. No prompt. |
| Ad-hoc exercises | Saved permanently to exercises table | Builds up library over time. Searchable in future sessions. |
| AI chat threads | Named threads with thread list | Can start new threads, name them. Thread list accessible. Each thread is a separate context. |

---

## Phase Breakdown

### Phase 0: Foundation
**Goal:** Deployed, PWA-installable app with password gate + empty shell behind it. Real seed data in DB.

**Deliverables:**
- Next.js 15 project, TypeScript strict, shadcn preset `b5BbmAxeeg` applied, dark theme
- Full Supabase schema (all tables from spec.md §7 in one migration)
- `/api/login` + middleware + signed cookie auth (`SESSION_SECRET`)
- App shell: bottom nav (mobile) + sidebar (desktop) with stubs for `/diet`, `/workout`, `/chat`
- PWA: `manifest.json`, `apple-touch-icon`, `<meta name="theme-color">`, no service worker yet
- Seed scripts (tsx): parse `hypertrophy-plan.md` + `diet-plan.md` via Gemini → insert exercises, workout_days, workout_day_exercises, foods
- Deploy to Vercel, all env vars configured

**Done when:** App installs on iPhone via Safari. Password gate works. Behind it: navigation shell with empty pages.

---

### Phase 1: Diet Logging
**Goal:** Log every meal for the day, see macro progress against targets.

**Deliverables (build in this order):**

1. **DB + server actions layer** — CRUD for meals, meal_items; read foods with search; computed macro totals query (JOIN meal_items → foods, sum per day)
2. **Macro totals bar** — calories, protein, carbs, fat vs targets. Training day (1950 kcal) auto-detected from today's workout_sets (if row exists for today → training day). Progress bars with number display.
3. **Meal cards** — 5 cards (Breakfast, Lunch, Snack, Dinner, Pre-bed) on the Today view. Each shows logged items + their macros + meal total.
4. **Add food flow** — Tap card → food search autocomplete (debounced, search foods.name) → select → enter grams → save (server action, upsert meal row + insert meal_item). Instant optimistic update.
5. **Edit/delete** — Tap logged item → inline edit quantity OR delete. Confirm via single tap (no dialog).
6. **Custom food creation** — Small form: name + calories/protein/carbs/fat per 100g. Saves to foods table. Appears in search immediately.

**Done when:** Full daily diet workflow works on iPhone. Can log breakfast through pre-bed, see running macro totals update live.

---

### Phase 2: Workout Logging
**Goal:** Full gym session workflow — pick day, log sets with last session reference, rest timer, mark complete.

**Deliverables (build in this order):**

1. **DB + server actions layer** — Create workout for date, insert/update workout_sets, query last session for each exercise (most recent workout_sets WHERE exercise_id = X), mark workout complete
2. **Day picker** — Workout page shows today's date + option to pick which workout day (Day 1-5). Pre-select based on weekday schedule (Mon→1, Tue→2, etc.) but user can override.
3. **Exercise list** — For selected workout day, show exercises in order (from workout_day_exercises). Tap exercise to expand set logging.
4. **Set logging UI** — For each exercise: list of logged sets (weight × reps, RIR). "Add set" button. Input row: weight (kg), reps, RIR. **Show last session's sets for this exercise alongside** — e.g., "Last: 40kg × 12, 40kg × 11, 40kg × 10". Touch targets ≥44px.
5. **Rest timer** — Auto-starts on set save. Duration from exercise.default_rest_sec (configurable: 60/90/120/180s). Full-screen overlay on mobile. Countdown using `endTime = Date.now() + duration` then `remaining = endTime - Date.now()` in a `requestAnimationFrame` loop. Survives screen lock.
6. **Ad-hoc exercise** — "Add exercise" at bottom of list. Search all exercises → append to session.
7. **Complete workout** — "Finish" button → mark workout completed_at. Today dashboard shows compact workout card (day label + total sets + key lifts logged).

**Done when:** Can run a full gym session. Pick Day 2, log incline press with last session reference visible, rest timer fires, finish session, see it on the dashboard.

---

### Phase 3: AI Chat
**Goal:** AI coach that cites your actual data in responses.

**Deliverables (build in this order):**

1. **Data context layer** (`lib/ai/context.ts`) — `fetchUserContext(days = 90)` runs parallel queries for workouts+sets, meals+items+macros, weight_logs, sleep_logs, smoking_logs, mood_logs. Formats as compact markdown tables (not JSON). Cached module-scope for plan docs.
2. **System prompt** (`lib/ai/prompts.ts`) — Coach persona (data-driven, uses RIR/MPS/kcal vocabulary, flags sleep <6hr, protein misses, strength stalls). Injects plan docs + user context. `dailyReviewPrompt()` and `weeklyReviewPrompt()` templates.
3. **`/api/chat` route** — Edge runtime. `streamText` with Gemini 2.5 Flash. Reads/writes `ai_threads` + `ai_messages`. Full context on every message.
4. **Chat UI** — Thread list (sidebar or top nav). Message feed with streaming display. Input bar with send. Streaming response renders as markdown.
5. **Insight buttons** — "Daily Review" + "Weekly Review" on chat page or dashboard shortcut. Check `ai_insights` for today's cached result first. If none, generate + cache. Shows result inline (not in a thread).

**Done when:** Can send "how's my protein this week?" and get a response that cites specific numbers from logged meals. Daily Review button works and caches.

---

### Phase 4: Lifestyle Trackers + Charts (Week 2+)
**Build only after dogfooding Phases 0–3 for at least a week.**

**Priority order (from spec):**

1. **Weight + measurements** — Daily entry: weight (kg), waist (cm, optional). Today dashboard card. 7-day rolling average computed. Unique date constraint, upsert.
2. **Progress photos** — Front/side/back slots per date. Client-side compression before upload (resize to 1200px max). Supabase Storage. Date comparison view (two dates side-by-side).
3. **Morning check-in screen** — Single quick screen: sleep hours, sleep quality (1-5), cigarette count, mood (1-5), stress (1-5). Optional notes. Takes <30 seconds. Appears as a prompt on dashboard if not done today.
4. **Charts page** — Recharts, shadcn styling:
   - Weight trend with 7-day rolling average line
   - Strength progression: Lat Pulldown, Incline DB Press, Hack Squat, Bayesian Curl (the 4 tracked lifts)
   - Weekly volume per muscle group (bar)
   - Calories vs target (bar + target line)
   - Smoking trend (declining bar, ideally)

---

## Coding Session Structure

Each phase maps to discrete sessions that can be independently planned:

| Phase | Sessions | Output |
|---|---|---|
| 0 | 1–2 | Deployed, installable, seeded |
| 1 | 2–3 | Full diet logging |
| 2 | 2–3 | Full workout logging |
| 3 | 1–2 | AI chat + insights |
| 4 | 1 per feature | Trackers, photos, charts (order per dogfooding feedback) |

---

## Open Questions (Resolved)

- **Training/rest day detection** → Auto from workout logged today
- **PWA timing** → Phase 0 (not Phase 4)
- **Food seeding** → Phase 0 (not Phase 1)
- **Rest timer** → Blocking requirement in Phase 2, iOS-safe timestamp approach
- **Dashboard** → Phase-by-phase sections, no placeholders; Today is the hub
- **Mobile nav** → 5 tabs: Today / Diet / Workout / Chat / More
- **Date navigation** → Visible date nav on Diet + Workout, defaults to today, view-only for past
- **In-progress workout** → Auto-resume when reopening /workout
- **Ad-hoc exercises** → Saved permanently to exercises table
- **AI threads** → Named threads with thread list (not single persistent feed)

---

## Constraints & Gotchas to Remember

- Edge runtime on `/api/chat`: no Node-only packages. supabase-js + AI SDK confirmed safe.
- Gemini free: 1,500 req/day, 15 RPM — seed script should batch/delay if inserting many items.
- iOS PWA: Safari-only install, `apple-touch-icon` required, storage evictable — DB is source of truth.
- `weight_logs`, `sleep_logs`, etc: unique date constraint — always upsert, never insert.
- Rest timer: timestamp math only. `setInterval` dies on iOS screen lock.
- Supabase free tier pauses after 7 days idle — daily app use prevents this.
- Service role key: server actions and API routes only. Never client-side.
