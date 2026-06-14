---
title: "feat: Today Screen — Command UI Redesign"
type: feat
status: active
date: 2026-06-14
origin: docs/brainstorms/2026-06-06-forge-initial-brainstorm.md
---

# Today Screen — "Command" UI Redesign

## Overview

Implement the "Command" direction from the design handoff (`design_handoff_forge_app/`) for the Today screen. This is a layout and component refactor — no new design tokens, no architecture changes. The result: a data-viz-forward dark dashboard with a persistent left sidebar (desktop), a calorie ring gauge, macro mini-rings, a weight sparkline, and a bento-style hero grid, all keeping the existing mobile bottom-nav + single-column behavior.

This is PR 1 of 5. It introduces the `RingGauge` and `Sparkline` shared primitives that every subsequent screen reuses.

---

## Problem Statement

The current Today page (`app/(app)/page.tsx`) is a minimal single-column stack with linear progress bars. The redesign calls for:
- A proper sidebar layout on desktop (currently the sidebar exists but the content column has no max-width centering or gap system)
- A radial calorie ring + macro mini-rings instead of flat progress bars
- A two-column hero grid (nutrition left, workout+weight right)
- A weight sparkline tile (currently no weight display on Today at all)
- A "Command"-style meals strip (5 horizontal tiles with filled/empty states)
- An amber-gradient AI Coach card wrapping the existing `InsightPanel`
- A streak pill in the header

---

## Proposed Solution

Refactor `app/(app)/page.tsx` into a new component tree under `components/today/`. Add two shared chart primitives under `components/ui/`. Add a thin weight data layer in `lib/weight/`. Add a streak query in `lib/today/`. Add `--success` color token to `globals.css`. Restyle `components/nav/sidebar.tsx` active state to match spec.

No schema changes. No new server actions for mutations. New read-only queries only.

---

## Technical Approach

### Architecture

```
app/(app)/page.tsx                      ← async RSC, orchestrates data fetches, composes layout
  └── components/today/
        ├── today-header.tsx            ← "Today" h1 + date sub + streak pill
        ├── nutrition-card.tsx          ← RingGauge (kcal left) + 3 MiniRing (macros) → links /diet
        ├── workout-tile.tsx            ← in-progress card OR rest-day card → links /workout
        ├── weight-tile.tsx             ← latest weight + delta + Sparkline → links /more
        ├── meals-strip.tsx             ← 5 horizontal MealPreview tiles → links /diet
        └── ai-coach-card.tsx           ← amber gradient wrapper around InsightPanel

components/ui/
  ├── ring-gauge.tsx                    ← NEW: SVG radial ring primitive
  └── sparkline.tsx                     ← NEW: SVG polyline + area fill primitive

lib/weight/
  └── queries.ts                        ← NEW: getWeightLogsForRange(n), getLatestWeightLog()

lib/today/
  └── streak.ts                         ← NEW: getStreakCount()

components/nav/sidebar.tsx              ← RESTYLE: active item, widths, bottom section
app/globals.css                         ← ADD: --success token
```

### Implementation Phases

#### Phase 1: Shared primitives + globals (no page changes yet)

1. **`app/globals.css`** — Add `--success` to both `:root` and `.dark` blocks:
   ```css
   /* light mode :root */
   --success: oklch(0.55 0.16 150);

   /* .dark */
   --success: oklch(0.77 0.16 150);
   ```
   Also add to `@theme inline`: `--color-success: var(--success);`

2. **`components/ui/ring-gauge.tsx`** — SVG radial ring:
   ```tsx
   // Props: size, stroke, pct (0-100), color (CSS var string), children (center slot)
   // Two stacked <circle>: track at stroke-foreground/11, fill arc with strokeDashoffset
   // rotate(-90deg) on SVG, strokeLinecap="round"
   // Transition: stroke-dashoffset .6s cubic-bezier(.2,.7,.3,1)
   // Children: absolutely centered via inset-0 flex col items-center justify-center
   ```

3. **`components/ui/sparkline.tsx`** — SVG polyline + area:
   ```tsx
   // Props: data (number[]), w, h, color (default: var(--chart-2))
   // Normalize points to SVG coords, draw <path> for area fill (chart-2/13%)
   // Draw <polyline> or <path> stroke (strokeWidth=2, round caps/joins)
   // Dot on last point: <circle r=3.5 fill=var(--primary)>
   ```

#### Phase 2: Data layer

4. **`lib/weight/queries.ts`**:
   ```ts
   // getWeightLogsForRange(days: number): Promise<WeightLog[]>
   //   SELECT date, weight_kg FROM weight_logs ORDER BY date DESC LIMIT n
   // getLatestWeightLog(): Promise<WeightLog | null>
   //   Same, LIMIT 1, include weekly delta (compare to 7 days prior)
   //   Return: { date, weight_kg, delta_wk: number | null, series: number[] (last 14) }
   ```

5. **`lib/today/streak.ts`**:
   ```ts
   // getStreakCount(): Promise<number>
   // Strategy: fetch distinct dates from workout_sets UNION meal_items for last 90 days,
   // sort DESC, count consecutive from today (or yesterday if today not yet logged)
   // Returns number (0 if never logged)
   ```

#### Phase 3: Today component tree

6. **`components/today/today-header.tsx`** (server component):
   - Props: `{ date: string, isTrainingDay: boolean, streak: number }`
   - `<h1 className="font-heading text-3xl font-bold">Today</h1>`
   - `<p className="text-sm text-muted-foreground">{dayName}, {formattedDate} · {Training/Rest} day</p>`
   - Streak pill: `<Fire03Icon size={15} /> {streak}-day streak` — only render if `streak > 0`, use `bg-primary/15 text-primary rounded-full px-3 py-1.5 text-sm font-semibold`

7. **`components/today/nutrition-card.tsx`** (server component or passes props from page):
   - Props: `{ totals: MacroTotals, targets: MacroTargets, isTrainingDay: boolean }`
   - Wraps in `<Card>` as a `<Link href="/diet">` (whole card clickable)
   - Left: `<RingGauge size={150} stroke={13} pct={(totals.calories/targets.calories)*100} color="var(--primary)">` center shows `kcal left` in `font-heading text-4xl tabular-nums`
   - Right: 3 `<RingGauge size={70} stroke={7}>` for Protein (primary), Carbs (chart-2), Fat (chart-4) with gram values centered and label below

8. **`components/today/workout-tile.tsx`** (server component):
   - Props: `{ summary: WorkoutSummary | null, isTrainingDay: boolean }`
   - If training day + summary: show in-progress tile — dumbbell chip, day label, "X of Y sets · N exercises", thin `<Progress>` bar
   - If training day + no summary: show "Start workout" state
   - If rest day: show rest-day tile with `Bedug02Icon`
   - Wraps in `<Link href="/workout">`

9. **`components/today/weight-tile.tsx`** (server component):
   - Props: `{ log: WeightLog | null }`
   - If null: dashed placeholder "Log weight" state
   - If data: eyebrow "Weight", `▼ X kg / wk` in `text-success font-bold`, big `font-heading` weight value, `<Sparkline>` with `series` data
   - Wraps in `<Link href="/more">`

10. **`components/today/meals-strip.tsx`**:
    - Props: `{ meals: MealSummary[] }` (computed from existing meals data)
    - Desktop: `grid grid-cols-5 gap-[14px]`
    - Mobile: `flex flex-col gap-2` (single column)
    - Each tile: filled → `bg-card ring-1 ring-border rounded-2xl p-3.5` with `font-heading text-lg` kcal + `text-xs text-muted-foreground` "kcal · Ng P"
    - Empty → `rounded-2xl border border-dashed border-foreground/20 p-3.5` with `<Add01Icon>` "+ Add"
    - All link to `/diet`

11. **`components/today/ai-coach-card.tsx`** (client, wraps InsightPanel):
    - Amber gradient `Card`: `bg-gradient-to-br from-primary/13 to-card ring-1 ring-primary/24`
    - Eyebrow: `<FlashIcon size={15} color="var(--primary)" /> AI COACH` in `text-primary`
    - Renders `<InsightPanel date={date} />` inside
    - Two buttons below InsightPanel: `<Button asChild>` `<Link href="/chat">Daily Review</Link>` (primary) + `<Button variant="outline">Weekly Review</Button>` → `/chat`

#### Phase 4: Page assembly + sidebar restyle

12. **`app/(app)/page.tsx`** — rewrite to new layout:
    ```tsx
    // Parallel data fetch:
    const [dayMacros, workoutSummary, weightLog, streak] = await Promise.all([
      getMacrosForDate(date),
      getWorkoutSummaryForDate(date),
      getLatestWeightLog(),
      getStreakCount(),
    ])

    // Layout:
    // max-w-[900px] mx-auto px-5 md:px-10 py-9 flex flex-col gap-3.5
    // <TodayHeader>
    // <div className="grid grid-cols-1 md:grid-cols-[1.3fr_1fr] gap-3.5">
    //   <NutritionCard />
    //   <div className="flex flex-col gap-3.5">
    //     <WorkoutTile />
    //     <WeightTile />
    //   </div>
    // </div>
    // <MealsStrip />
    // <AICoachCard />
    ```

13. **`components/nav/sidebar.tsx`** — restyle:
    - Active item: `bg-primary/15 ring-1 ring-primary/25 text-primary` (replace current active classes)
    - Active icon: `strokeWidth={2}` (inactive: `strokeWidth={1.6}`)
    - Width: `w-[236px]` (currently `w-56` = 224px; increment to 236)
    - Background: `bg-background/86 backdrop-blur-md border-r border-foreground/8`
    - Bottom: ensure ThemeToggle + logout section matches spec (user initial circle, "Log out" text)

---

## Files Changed

| File | Action | Notes |
|---|---|---|
| `app/globals.css` | Edit | Add `--success` token to `:root`, `.dark`, `@theme inline` |
| `components/ui/ring-gauge.tsx` | Create | SVG radial ring primitive |
| `components/ui/sparkline.tsx` | Create | SVG sparkline primitive |
| `lib/weight/queries.ts` | Create | `getLatestWeightLog()` + `getWeightLogsForRange()` |
| `lib/today/streak.ts` | Create | `getStreakCount()` |
| `components/today/today-header.tsx` | Create | Header + streak pill |
| `components/today/nutrition-card.tsx` | Create | Calorie ring + macro mini-rings |
| `components/today/workout-tile.tsx` | Create | Workout in-progress / rest-day tile |
| `components/today/weight-tile.tsx` | Create | Weight + sparkline tile |
| `components/today/meals-strip.tsx` | Create | 5-tile meals preview |
| `components/today/ai-coach-card.tsx` | Create | Amber gradient wrapper around InsightPanel |
| `app/(app)/page.tsx` | Rewrite | New parallel data fetch + component assembly |
| `components/nav/sidebar.tsx` | Edit | Active state + width + background restyle |

**Not changed:** `components/diet/meal-card.tsx`, `components/diet/macro-totals-bar.tsx`, `components/diet/supplement-tracker.tsx`, `components/workout/*`, `components/nav/bottom-nav.tsx`. The redesign is additive — existing components are composed inside the new layout, not replaced.

---

## System-Wide Impact

### Interaction Graph
`app/(app)/page.tsx` calls `getMacrosForDate()` (already called) + `getWorkoutSummaryForDate()` (already called) + new `getLatestWeightLog()` + new `getStreakCount()` → all 4 run in `Promise.all` → no sequential blocking. Diet mutations (`logMealItem`, `toggleSupplement`) already call `revalidatePath('/')` — Today will re-render fresh data on each mutation. No new revalidation wiring needed.

### State Lifecycle Risks
All new components are server components passing props down. No new client state introduced in this PR except what `InsightPanel` already manages. Weight tile and streak pill are read-only — no mutation risk.

### API Surface Parity
`getLatestWeightLog()` reads `weight_logs` table. This table already exists in the schema (from Phase 0 migration) with a unique date constraint. The query is read-only — no impact on write paths.

`getStreakCount()` queries `workout_sets` and `meal_items` with a `DISTINCT date` + window approach. Read-only. Heavy query on cold start but negligible on a single-user app with <365 rows.

### Integration Test Scenarios
1. Training day with active workout: NutritionCard shows partial pct ring, WorkoutTile shows in-progress state with correct set count
2. Rest day: WorkoutTile shows rest-day empty state, calorie target shows 1750 instead of 1950
3. Zero weight logs: WeightTile shows placeholder dashed card (no JS error from empty series array)
4. Zero streak: streak pill is hidden (not rendered with "0-day streak")
5. Mobile viewport: hero grid collapses to single column, meals strip becomes vertical list

---

## Acceptance Criteria

- [ ] `<RingGauge>` renders a two-circle SVG with correct `strokeDashoffset` for any `pct` 0–100; animates `.6s` on mount
- [ ] `<Sparkline>` renders a polyline with area fill and amber dot on last point; handles single-element arrays gracefully (no division-by-zero)
- [ ] Today page on desktop (≥768px): sidebar + content column max-width 900px, hero shows 2-column grid
- [ ] Today page on mobile (<768px): bottom-nav only, hero stacks single-column, meals strip is vertical
- [ ] NutritionCard: calorie ring shows `(eaten/target)×100` pct; 3 macro rings show correct gram values and colors (`primary`, `chart-2`, `chart-4`)
- [ ] WorkoutTile: shows in-progress state when `workoutSummary != null`; shows rest-day state on rest days
- [ ] WeightTile: shows real data when weight logs exist; shows placeholder when `getLatestWeightLog()` returns null
- [ ] Streak pill: hidden when streak = 0; shows correct count from `getStreakCount()`
- [ ] MealsStrip: filled tiles show kcal + protein; empty tiles show dashed "+ Add"
- [ ] AICoachCard: amber gradient matches spec; Daily Review / Weekly Review buttons navigate to `/chat`
- [ ] Sidebar active item: `bg-primary/15 ring-1 ring-primary/25 text-primary` with icon `strokeWidth={2}`
- [ ] `--success` token renders correctly in dark mode (green weight delta indicator)
- [ ] `npm run build` passes with zero TypeScript errors
- [ ] No new design tokens added beyond `--success`
- [ ] No `rgba()` used with CSS vars (use `color-mix(in oklch, ...)` or Tailwind `/` opacity modifier)

---

## Dependencies & Prerequisites

- Phase 0 complete (schema exists: `weight_logs`, `workout_sets`, `meal_items`, `workout_days` tables all in DB) ✅
- `InsightPanel` exists at `components/today/insight-buttons.tsx` ✅
- Hugeicons installed (`@hugeicons/react`, `@hugeicons/core-free-icons`) ✅
- Icons needed: `Fire03Icon`, `FlashIcon`, `Add01Icon`, `Dumbbell01Icon`, `Bedug02Icon` — all in `@hugeicons/core-free-icons`

---

## Risk Analysis

| Risk | Likelihood | Mitigation |
|---|---|---|
| `getStreakCount()` query is slow on large datasets | Low (single user, <365 rows) | Acceptable; add `revalidatePath` caching if needed later |
| `weight_logs` table has no rows (fresh install) | Medium | WeightTile handles null gracefully with placeholder |
| `InsightPanel` makes AI call on load | Already mitigated | InsightPanel uses cache check — won't fire unless user clicks |
| SVG ring rendering differs from Recharts tokens | None | RingGauge is pure SVG, no Recharts involved |
| `--success` token conflicts with existing usage | Low | Only `workout-summary-card.tsx` uses hardcoded green; update it to use `text-success` |

---

## Sources & References

### Origin
- **Brainstorm:** `docs/brainstorms/2026-06-06-forge-initial-brainstorm.md` — Key decisions carried forward: (1) Today is the hub, each phase adds its own section; (2) 5-tab bottom nav mobile-first; (3) no new chart libraries (Recharts only, but ring gauge is raw SVG not Recharts)

### Design References
- `design_handoff_forge_app/README.md` — Full spec, token mapping table, inline-style → Tailwind mapping
- `design_handoff_forge_app/prototype/app-shell.jsx` — `Ring`, `MiniRing`, `Sparkline`, `Bar` reference implementations
- `design_handoff_forge_app/prototype/screen-today.jsx` — Today layout reference

### Internal
- Today page: `app/(app)/page.tsx`
- App layout: `app/(app)/layout.tsx`
- Sidebar: `components/nav/sidebar.tsx`
- Diet macros: `lib/diet/macros.ts`, `lib/diet/targets.ts`
- Workout query: `lib/workout/queries.ts:116` (`WorkoutSummary` type)
- InsightPanel: `components/today/insight-buttons.tsx`
- Design tokens: `app/globals.css`
