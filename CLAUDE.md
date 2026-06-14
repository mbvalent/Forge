# CLAUDE.md — Forge

Personal fitness PWA. **Single user (the owner). Not a product.** Read `spec.md` for full feature spec and data model before building anything.

## What this is

Next.js 16 (App Router) + Supabase + Gemini 2.5 Flash + Vercel. Tracks workouts, diet, weight, sleep, smoking, mood, photos. AI chat with full data context.

## Commands

```bash
npm run dev          # local dev (Turbopack by default in v16)
npm run build        # verify before pushing — Vercel deploys main
npm run seed:foods   # seed food database
npm run seed:workout # seed workout plan
npx supabase db push # apply migrations (or run SQL in dashboard)
```

## Stack versions (do not downgrade)

- Next.js 16 + React 19.2
- Tailwind CSS v4 (CSS-first, no tailwind.config.ts)
- shadcn/ui v4 (preset `b5BbmAxeeg`)
- Supabase JS v2
- Zod v4, Vercel AI SDK v6, @ai-sdk/google v3

## Architecture rules

- **Server actions for all mutations.** No client-side API route fetching for CRUD. Forms call server actions directly.
- **API routes only for:** `/api/login` (password check) and `/api/chat` (AI streaming, edge runtime).
- **Supabase access:** server-only via `createServiceClient()` in `lib/supabase.ts`. NEVER import this in client components (`'use client'`). No RLS configured — security is the password gate.
- **Auth:** `proxy.ts` checks signed JWT cookie against `SESSION_SECRET`. That's the whole auth system. Don't add user tables, sessions tables, or auth libraries.
- **Validation:** zod schemas in `lib/schemas/`, shared by forms and server actions.
- **Dates:** store as `date` (not timestamptz) for day-keyed logs (weight, sleep, etc.). One row per day, upsert on conflict.
- **Macros are computed, not stored.** `meal_items` stores quantity; calories/protein/etc. derive from `foods` per-100g values at query time.
- **Navigation:** 5-tab bottom nav (mobile) — Today / Diet / Workout / Chat / More. Today is the hub; diet logging is inline on Today. More tab holds  trackers and charts.
- **Training day targets:** detected automatically — query `workout_sets` for today; if rows exist → 1950 kcal training targets, else → 1750 kcal rest day targets. No manual toggle.
- **Workout auto-resume:** `/workout` checks for an in-progress workout (has `workouts` row for today without `completed_at`). If found, loads it directly — no prompt.

## Next.js 16 conventions (IMPORTANT)

- **Auth proxy:** `proxy.ts` at root (not `middleware.ts`). Export function named `proxy`, not `middleware`.
- **Async APIs:** `cookies()`, `headers()`, `params`, `searchParams` are ALL async — always `await` them. Synchronous access is removed in v16.
- **Turbopack:** is default in v16 for both dev and build — do NOT add `--turbopack` flag to scripts.
- **`unstable_` prefix removed:** use `cacheLife`, `cacheTag` directly from `next/cache`.
- **`revalidateTag` requires second arg:** `revalidateTag('key', 'max')` — single-arg form throws TS error.

## UI rules — shadcn (CRITICAL, read carefully)

### Always use shadcn components. Never write raw HTML equivalents.

| Need | Use | Never use |
|---|---|---|
| Button | `<Button>` from `@/components/ui/button` | `<button>` |
| Text input | `<Input>` from `@/components/ui/input` | `<input>` |
| Card container | `<Card>`, `<CardHeader>`, `<CardContent>` | raw `<div>` with border |
| Form | shadcn Form + react-hook-form or native form | custom form wrappers |

### When you need a component not yet added to the project:
1. Check the shadcn MCP: `mcp__shadcn__search_items_in_registries` or `mcp__shadcn__list_items_in_registries`
2. Add it: `npx shadcn@latest add <component>`
3. Then import from `@/components/ui/<component>`

**Never build a custom component if shadcn has one.** Check first.

### Tailwind v4 styling rules

- **Colors:** always use design tokens — `bg-background`, `text-foreground`, `border-border`, `text-primary`, `text-muted-foreground`, etc. Never hardcode colors (`bg-black`, `text-white`, `#09090b`).
- **Opacity on tokens:** use Tailwind's `/` modifier — `bg-background/50`, `border-border/30`. This works correctly with oklch variables.
- **Shadows with CSS vars:** use `color-mix()` not `rgba()`. oklch variables don't work in `rgba()`. Correct: `shadow-[0_0_20px_color-mix(in_oklch,var(--primary)_30%,transparent)]`.
- **No `tailwind.config.ts`:** v4 is CSS-first. All theme config lives in `@theme inline {}` in `globals.css`.
- **Font families:** `font-sans` (Oxanium), `font-heading` (Noto Serif) — defined via `@theme inline` in globals.css.
- **`@apply` in `@layer base`:** valid in v4, but prefer plain CSS property declarations for base resets.
- **`tw-animate-css`:** import via `@import "tw-animate-css"` in globals.css. Do NOT use `tailwindcss-animate` (v3 plugin).

### Component patterns

- Touch targets ≥44px (`min-h-[44px]` or `h-14`). Used mid-workout with sweaty hands.
- Recharts for charts. Import styles consistent with shadcn chart tokens (`--chart-1` through `--chart-5`). No other chart libraries.
- Mobile-first. Desktop supported via `md:` breakpoint.
- Icons: `HugeiconsIcon` from `@hugeicons/react` + icon data from `@hugeicons/core-free-icons`.

## AI integration rules

- All AI calls through Vercel AI SDK (`streamText`), model `gemini-2.5-flash` via `@ai-sdk/google`. Provider must stay swappable (one-line change to DeepSeek/OpenRouter later).
- Chat route: fetch last 90 days of all data in `Promise.all`, format compact (markdown tables, not JSON dumps), inject into system prompt with the static plan docs.
- Plan docs (`docs/hypertrophy-plan.md`, `docs/diet-plan.md`) are loaded once and cached in module scope — not re-read per request.
- **Never call AI automatically on page load.** Free tier is 1,500 req/day. AI fires on user action only (send message, click insight button).
- Insight buttons cache results in `ai_insights` — check cache before generating.

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
  (app)/                 # everything behind proxy.ts
    page.tsx             # today dashboard
    diet/
    workout/
    chat/
    trends/              # charts (phase 2)
  api/login/route.ts
  api/chat/route.ts      # edge runtime
lib/
  supabase.ts            # server-only client (createServiceClient)
  session.ts             # JWT encrypt/decrypt
  schemas/               # zod
  ai/context.ts          # data fetching + formatting for AI
  ai/prompts.ts          # system prompt + insight templates
components/
  ui/                    # shadcn components (auto-generated, don't hand-edit)
  nav/                   # bottom-nav.tsx, sidebar.tsx
proxy.ts                 # auth guard (Next.js 16 convention)
scripts/                 # one-time seeds (tsx)
docs/                    # hypertrophy-plan.md, diet-plan.md (AI context source)
supabase/migrations/
```

## Env vars required

```
NEXT_PUBLIC_SUPABASE_URL=      # from Supabase dashboard → Settings → API Keys
SUPABASE_SECRET_KEY=           # sb_secret_... (new format, not legacy service_role JWT)
GOOGLE_GENERATIVE_AI_API_KEY=
APP_PASSWORD=
SESSION_SECRET=                # 32 random chars: openssl rand -base64 32
```

## Gotchas (learned, don't rediscover)

- **`proxy.ts` not `middleware.ts`**: Next.js 16 renamed middleware to proxy. Edge runtime is not supported in `proxy` — it runs Node.js.
- **oklch + rgba = broken**: CSS vars with oklch values don't work inside `rgba()`. Use `color-mix(in oklch, var(--token) 30%, transparent)` for opacity on arbitrary colors.
- **Tailwind opacity modifiers work**: `bg-primary/50` works fine. Only `rgba()` is broken.
- Edge runtime on `/api/chat`: no Node-only packages. supabase-js and AI SDK are safe.
- iOS PWA installs via Safari only. `apple-touch-icon` at `/public/apple-touch-icon.png` required. Storage evictable — DB is the only source of truth.
- Supabase free tier pauses after 7 days idle. Daily use prevents it; if paused, resume from dashboard (no data loss).
- `weight_logs` etc. have unique date constraint — always upsert, never insert.
- Rest timer must survive screen lock on iOS: use timestamp math (`endTime - now`), never `setInterval` counting.
- `foods` and `exercises` tables have `UNIQUE` on `name` — seed scripts can use `upsert({ onConflict: 'name' })`.

## Current state

- [x] Phase 0: Setup + password gate + app shell + PWA install + full DB schema + seed scripts
- [ ] Phase 1: Diet logging
- [ ] Phase 2: Workout logging
- [ ] Phase 3: AI chat
- [ ] Phase 4: weight/photos/trackers/charts/insights (in More tab)

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
