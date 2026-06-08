---
title: "feat: Phase 2 — Workout Logging"
type: feat
status: active
date: 2026-06-08
origin: docs/brainstorms/2026-06-06-forge-initial-brainstorm.md
---

# Phase 2: Workout Logging

## Enhancement Summary

**Deepened on:** 2026-06-08
**Research agents used:** TypeScript reviewer, race conditions reviewer, performance oracle, data integrity guardian, architecture strategist, code simplicity reviewer, security sentinel, Supabase Postgres best practices, shadcn component research, iOS/gym UX research, Next.js + React best practices research

### Key Improvements Added
1. **Critical: PostgREST filter syntax fix** — `.lt('workouts.date', before)` on embedded tables is not valid without `.filter()`. Recommend an RPC to avoid the ambiguity entirely.
2. **Critical: Missing database indexes** — Every query is a full table scan. Expanded migration includes 8 indexes + additional set_number uniqueness constraint.
3. **Critical: rAF cancellation token** — Plain `cancelAnimationFrame` doesn't prevent a stale loop from continuing. Need `cancelRef.current = true` guard inside the tick function.
4. **Critical: workoutId null guard** — Client must hold confirmed `workoutId` before allowing any set logging; without it, `logSet` receives `undefined` and corrupts data.
5. **Architecture: rest timer in workout layout** — Mount `RestTimer` in `app/(app)/workout/layout.tsx`, not the global app layout.
6. **Simplification: 3 file removals** — `lib/schemas/workout.ts` (merge into types), `components/workout/finish-button.tsx` (inline), and the ad-hoc visual grouping logic.
7. **shadcn: 6 new components required** — `ToggleGroup`, `Collapsible`, `Dialog`, `Command`, `Popover`, `DropdownMenu` replace raw HTML equivalents.
8. **UX: weight stepper + RIR pill row** — `type="text" inputmode="decimal"` hybrid stepper for weight; segmented 0–4 pill for RIR. Both faster than number keyboard in gym context.
9. **iOS: `100dvh` + safe-area insets** — Critical for keyboard overlap and home indicator coverage in PWA.

### New Risks Discovered
- iOS 18 WebKit bug: keyboard may not appear in PWA (unresolved Dec 2024) — test on physical device
- `set_number` has no DB uniqueness constraint — client-side compute can produce duplicates on race
- Supabase free tier: 5 parallel `getLastSessionSets` queries is fine, but an RPC halves the round trips

---

## Overview

Full gym session workflow for a 5-day hypertrophy split. The owner lands on `/workout`, is dropped directly into today's planned session (or auto-resumed if one is in progress), logs sets with last-session reference visible alongside, gets the rest timer auto-firing after each set, can add ad-hoc exercises, and marks the session complete. The Today dashboard gains a compact workout summary card. Past sessions are navigable via date nav and are read-only.

Phase 1 (diet logging) is complete. This phase builds on the same server-actions + Supabase + optimistic-update pattern established there. The migration in this phase adds a `UNIQUE(date)` constraint plus all missing indexes.

*(see brainstorm: docs/brainstorms/2026-06-06-forge-initial-brainstorm.md — Phase 2 spec)*

---

## Proposed Solution

Seven deliverables built in dependency order:

1. **Migration + types + server actions** — `UNIQUE(date)` + indexes + `lib/workout/types.ts` (Zod + TS interfaces combined), `lib/actions/workout.ts`
2. **Data query helpers** (`lib/workout/queries.ts`) — fetch workout, day exercises, last session via Postgres RPC
3. **Workout page + day picker** — `app/(app)/workout/page.tsx`, `app/(app)/workout/layout.tsx` (rest timer mount), `components/workout/day-picker.tsx` (ToggleGroup)
4. **Exercise card + set logging** (`components/workout/exercise-card.tsx`, `components/workout/set-row.tsx`) — Collapsible, optimistic, last-session ref, RIR pill
5. **Rest timer** (`components/workout/rest-timer.tsx`) — `requestAnimationFrame` + `localStorage`, Dialog overlay, visibility resync
6. **Ad-hoc exercise** (`components/workout/exercise-search.tsx`) — Command + Popover combobox
7. **Finish + Today summary card** — inline finish action in `workout-view.tsx`, `components/workout/workout-summary-card.tsx` (3 states only)

---

## Key Decisions Made

### D1: Weekday → workout day mapping

Default day highlighted (not auto-selected) when landing on `/workout` for today with no existing workout:

| Weekday | Highlighted |
|---|---|
| Monday | Day 1 — Back + Biceps + Rear Delts |
| Tuesday | Day 2 — Chest + Triceps + Side Delts |
| Wednesday | Day 3 — Legs |
| Thursday | *(no highlight — REST day)* |
| Friday | Day 4 — Shoulders + Arms Pump + Abs |
| Saturday | Day 5 — Arm Specialization + Back Pump |
| Sunday | *(no highlight — REST day)* |

The expected day is **highlighted** (a small ring indicator on the ToggleGroupItem) but NOT auto-selected. The user explicitly taps a day to confirm — this is the UX pattern from the research: "don't auto-select, just indicate." User can always override without confirmation.

A `workouts` row is only written once the user taps a day — not on page load.
*(see brainstorm: docs/brainstorms/2026-06-06-forge-initial-brainstorm.md — "Pre-select based on weekday schedule… but user can override")*

### D2: Auto-resume on `/workout`

`/workout` (today's date) checks for a `workouts` row with `completed_at IS NULL` for today. If found, skips the day picker entirely and loads the in-progress session directly. No prompt.
*(see brainstorm: "In-progress workout → Auto-resume")*

### D3: Completed workout behavior

Once `completed_at` is set, the workout is view-only everywhere — today and past dates. "Add set" inputs and the finish action are disabled. No re-opening.

### D4: Migration — UNIQUE constraint + all indexes

**Consolidate into one migration file `002_workout_constraints_and_indexes.sql`:**

```sql
-- UNIQUE constraint: required for upsert onConflict and maybeSingle() correctness
ALTER TABLE workouts ADD CONSTRAINT workouts_date_unique UNIQUE (date);

-- Prevent duplicate set numbers (client-side compute is fragile without this)
ALTER TABLE workout_sets
  ADD CONSTRAINT workout_sets_set_number_unique
  UNIQUE (workout_id, exercise_id, set_number);

-- Protect against exercise deletion orphaning sets
ALTER TABLE workout_sets
  DROP CONSTRAINT workout_sets_exercise_id_fkey,
  ADD CONSTRAINT workout_sets_exercise_id_fkey
    FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE RESTRICT;

-- FK indexes (Postgres doesn't auto-index FK columns)
CREATE INDEX workout_sets_workout_id_idx   ON workout_sets(workout_id);
CREATE INDEX workout_sets_exercise_id_idx  ON workout_sets(exercise_id);
CREATE INDEX workout_sets_exercise_workout_idx ON workout_sets(exercise_id, workout_id);

-- workouts date lookup (Today page, getWorkoutForDate)
CREATE INDEX workouts_date_idx ON workouts(date);

-- workout day plan query
CREATE INDEX wde_workout_day_id_idx ON workout_day_exercises(workout_day_id);

-- Diet queries (Today page DietView — also missing from Phase 1)
CREATE INDEX meals_date_idx         ON meals(date);
CREATE INDEX meal_items_meal_id_idx ON meal_items(meal_id);
```

Apply before any workout data exists: `npx supabase db push`

### D5: Workout creation timing + workoutId guard

`createOrResumeWorkout(date, workoutDayId)` upserts on `date`. Called only on explicit day confirm.

**Critical client-side guard:** The `DayPicker` holds a `useState<string | null>(null)` for `workoutId`. It's `null` until `createOrResumeWorkout` resolves. All exercise cards receive `workoutId` as a prop and their "Add set" button is disabled while `workoutId === null`. Use `useTransition` to track the pending state and show a loading indicator on the day picker buttons during the server round trip.

```ts
const [isPending, startTransition] = useTransition()
const [workoutId, setWorkoutId] = useState<string | null>(existingWorkout?.id ?? null)

function handleDaySelect(dayId: string) {
  startTransition(async () => {
    const result = await createOrResumeWorkout(date, dayId)
    if (result.success) setWorkoutId(result.workoutId)
  })
}
// All exercise cards: disabled={!workoutId || isPending}
```

### D6: Weight + reps pre-fill in "Add set"

When "Add set" input row appears:
1. Sets exist in current workout for this exercise → pre-fill from most recent set in this workout
2. No sets yet in current workout, but last session exists → pre-fill from first set of most recent previous session
3. No history at all → empty inputs

**One-tap "same as last time"**: When pre-filled from history, show a large primary "Same as last" button that submits immediately with those exact values. This is the 80% case (user wants to match or beat last session). The weight/reps inputs are still editable for overrides.

### D7: Last session reference display

```
Last (Mon Jun 2): 40×12 RIR2 · 40×11 RIR2 · 40×10 RIR2
```

Displayed above the set input row inside the expanded `Collapsible` section. Fetched server-side as part of the exercise list and passed as a prop — never fetched client-side.

### D8: Postgres RPC for last session (replaces two-step query)

The original plan's `workouts!inner(date)` embedded filter with `.lt()` is not valid PostgREST syntax — embedded relation filters must use `.filter()` which has inconsistent PostgREST version support. Replace with a Postgres function that collapses two sequential queries into one:

```sql
-- In migration 002
CREATE OR REPLACE FUNCTION get_last_session_sets(
  p_exercise_id uuid,
  p_before date
)
RETURNS TABLE(set_number int, weight_kg numeric, reps int, rir int, workout_date date) AS $$
  SELECT ws.set_number, ws.weight_kg, ws.reps, ws.rir, w.date
  FROM workout_sets ws
  JOIN workouts w ON w.id = ws.workout_id
  WHERE ws.exercise_id = p_exercise_id
    AND w.date < p_before
  ORDER BY w.date DESC, ws.set_number
  LIMIT 10
$$ LANGUAGE sql STABLE;
```

```ts
// getLastSessionSets — single round trip
export async function getLastSessionSets(exerciseId: string, before: string): Promise<LastSession | null> {
  const supabase = createServiceClient()
  const { data } = await supabase.rpc('get_last_session_sets', {
    p_exercise_id: exerciseId,
    p_before: before,
  })
  if (!data || data.length === 0) return null
  return {
    date: data[0].workout_date,
    sets: data.map((r) => ({ weight_kg: r.weight_kg, reps: r.reps, rir: r.rir })),
  }
}
```

This halves query count (5 RPCs vs 10 queries) and eliminates the sequential coupling within each call.

### D9: Set number auto-compute

`set_number` = count of current sets in the optimistic state for `(workoutId, exerciseId)` + 1. Computed client-side. The new `UNIQUE(workout_id, exercise_id, set_number)` constraint in D4 will surface any duplicates as a hard error rather than silently storing corrupt data.

### D10: Ad-hoc exercises — no visual distinction (Phase 2)

Ad-hoc exercises appear at the bottom of the exercise list in the order they were first added. No planned/ad-hoc grouping logic — the join-diff approach (comparing `workout_sets` vs `workout_day_exercises`) adds fragile complexity for zero user value. The owner knows what they added. Plain list, no visual separator.
*(simplicity reviewer finding)*

### D11: Shared `DateNav` component

Extract `app/(app)/diet/date-nav.tsx` → `components/nav/date-nav.tsx` with a `basePath` prop. Diet page updates its import. Workout page uses `basePath="/workout"`.

### D12: Rest timer — rAF + localStorage + visibility resync

```ts
localStorage key: `forge_rest_timer_YYYY-MM-DD`
value: { endTime: number }   // exerciseId removed — not needed at runtime
```

**Correct rAF loop with cancellation token:**
```ts
const cancelRef = useRef(false)
const rafRef = useRef<number>(0)

useEffect(() => {
  cancelRef.current = false
  const tick = () => {
    if (cancelRef.current) return           // guard: stops stale loops after unmount
    const remaining = endTime - Date.now()
    if (remaining <= 0) { onExpire(); return }
    setRemaining(remaining)
    rafRef.current = requestAnimationFrame(tick)
  }
  rafRef.current = requestAnimationFrame(tick)
  return () => {
    cancelRef.current = true
    cancelAnimationFrame(rafRef.current)
  }
}, [endTime])

// Visibility resync (tab switch / screen lock return)
useEffect(() => {
  const onVisible = () => {
    if (document.visibilityState === 'visible') {
      cancelAnimationFrame(rafRef.current)
      cancelRef.current = false
      rafRef.current = requestAnimationFrame(tick)  // restart loop from current endTime
    }
  }
  document.addEventListener('visibilitychange', onVisible)
  return () => document.removeEventListener('visibilitychange', onVisible)
}, [endTime])
```

**Mount location:** `app/(app)/workout/layout.tsx` — scoped to the workout route subtree. Survives navigation between `/workout` and `/workout?date=...` without affecting Diet/Chat/More tabs.

**Visual design:** Circular arc progress ring that drains. Final 10s: color shifts to amber. Final 5s: red + pulse. `+15` / `-15` second buttons flanking the timer (56px touch targets). Skip button below with lower visual weight.

**No vibration:** Web Vibration API is blocked in Safari PWA. Visual pulse + optional audio only.
*(see brainstorm: "timestamp math (endTime - now), never setInterval")*

### D13: Weight input — hybrid stepper

```tsx
<div className="flex items-center gap-2">
  <Button variant="outline" size="icon" className="min-h-[56px] min-w-[56px]"
    onClick={() => setWeight(w => Math.max(0, w - 2.5))}>−</Button>
  <Input
    type="text"
    inputMode="decimal"     // triggers numeric keyboard without type="number" quirks
    value={weight}
    onChange={...}
    className="text-center tabular-nums w-24"
  />
  <Button variant="outline" size="icon" className="min-h-[56px] min-w-[56px]"
    onClick={() => setWeight(w => w + 2.5)}>+</Button>
</div>
```

Default step: **2.5kg**. `type="text"` (not `type="number"`) avoids Android decimal input issues and removes browser stepper chrome.

### D14: RIR input — segmented pill row

Replace number input with a 5-button pill row (0–4). Faster than keyboard in gym context; only 5 discrete values.

```tsx
<ToggleGroup type="single" value={rir?.toString()} onValueChange={(v) => setRir(v ? Number(v) : null)}>
  {[0, 1, 2, 3, 4].map((n) => (
    <ToggleGroupItem key={n} value={String(n)} className="flex-1 min-h-[44px]">{n}</ToggleGroupItem>
  ))}
</ToggleGroup>
```

RIR is **optional** — show the row after set save with a "Skip" option; don't block submission.

### D15: Today dashboard workout card (3 states only)

`<WorkoutSummaryCard date={today} />` — server component, single query.

**No workout today:** Shows "No workout" with "Start session →" link. No REST day prediction logic.
**In progress:** Day label + "In Progress" badge (amber) + set count + "Continue →" link.
**Complete:** Day label + "Complete" badge (green) + set count + top lift (e.g., `Incline DB · 40×12`).

The 4th "REST day predicted" state is removed — the weekday inference is already in the day picker; duplicating it on the Today card adds a maintenance surface for zero user value.
*(simplicity reviewer finding)*

### D16: iOS PWA layout rules

```css
/* Containers: use dvh, not vh */
.workout-page { height: 100dvh; }

/* Bottom-pinned UI (rest timer overlay bottom button, etc.) */
.bottom-pinned { padding-bottom: env(safe-area-inset-bottom); }
```

`100dvh` adjusts dynamically when the iOS keyboard opens. `100vh` does not — content gets hidden.

**iOS 18 keyboard bug:** Unresolved WebKit bug (Dec 2024) — keyboard may not appear for inputs in PWA standalone mode. Ensure every input has a real `type` attribute, is not inside a CSS `transform`ed container, and test on a physical iOS 18 device before shipping.

**No `rgba()` with CSS vars:** Already in CLAUDE.md. Use `color-mix(in oklch, var(--token) 30%, transparent)` for opacity variants.

---

## Technical Approach

### New files

```
supabase/migrations/002_workout_constraints_and_indexes.sql   # UNIQUE + indexes + RPC

lib/workout/types.ts      # Zod schemas + TS interfaces combined (no separate schemas file)
lib/actions/workout.ts
lib/workout/queries.ts    # import 'server-only', RPC-based getLastSessionSets

components/nav/date-nav.tsx                  # extracted from diet/date-nav.tsx, adds basePath prop
app/(app)/workout/layout.tsx                 # RestTimer mount point (scoped to workout route)
components/workout/workout-view.tsx          # server component — data fetching shell
components/workout/day-picker.tsx            # client — ToggleGroup, workoutId state + useTransition
components/workout/exercise-card.tsx         # client — Collapsible, optimistic sets, RIR pill
components/workout/set-row.tsx               # client — set row with DropdownMenu delete
components/workout/rest-timer.tsx            # client — Dialog overlay, rAF cancelRef, visibilitychange
components/workout/exercise-search.tsx       # client — Command + Popover combobox
components/workout/workout-summary-card.tsx  # server component — Today page card
```

### Modified files

```
app/(app)/workout/page.tsx      # replace stub with real implementation
app/(app)/diet/date-nav.tsx     # update import path to shared component
app/(app)/page.tsx              # add <WorkoutSummaryCard date={today} /> above <DietView>
```

### Removed from original plan

```
lib/schemas/workout.ts          # merged into lib/workout/types.ts
components/workout/finish-button.tsx   # inline the finish action in workout-view.tsx
```

### shadcn components to install

```bash
npx shadcn@latest add toggle-group collapsible dialog command popover dropdown-menu
```

| Component | Used for |
|---|---|
| `ToggleGroup` + `ToggleGroupItem` | Day picker (5 days), RIR pill row (0–4) |
| `Collapsible` | Exercise card expand/collapse |
| `Dialog` | Rest timer full-screen overlay |
| `Command` + `Popover` | Exercise search combobox (ad-hoc add) |
| `DropdownMenu` | Set row delete action |

### `lib/workout/types.ts` — combined types + schemas

```ts
import { z } from 'zod'

// --- Zod schemas ---
export const createOrResumeWorkoutSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  workoutDayId: z.string().uuid(),
})
export const logSetSchema = z.object({
  workoutId: z.string().uuid(),
  exerciseId: z.string().uuid(),
  setNumber: z.number().int().min(1),
  weightKg: z.number().min(0).max(500),
  reps: z.number().int().min(1).max(100),
  rir: z.number().int().min(0).max(4).nullable(),
})
export const updateSetSchema = z.object({
  setId: z.string().uuid(),
  weightKg: z.number().min(0).max(500),
  reps: z.number().int().min(1).max(100),
  rir: z.number().int().min(0).max(4).nullable(),
})
export const deleteSetSchema = z.object({ setId: z.string().uuid() })
export const finishWorkoutSchema = z.object({ workoutId: z.string().uuid() })
export const searchExercisesSchema = z.object({
  query: z.string().trim().min(1).max(100),   // max(100) prevents slow ILIKE on large strings
})

// --- TypeScript interfaces ---
export type ActionResult<T = never> =
  | { success: true; data?: T }
  | { success: false; error: string }

export interface SetSavedPayload {
  exerciseId: string
  restSec: number
}

export interface Exercise {
  id: string
  name: string
  muscle_group: string | null
  default_rep_min: number | null
  default_rep_max: number | null
  default_rest_sec: number
}

export interface WorkoutSet {
  id: string
  exercise_id: string
  set_number: number
  weight_kg: number
  reps: number
  rir: number | null
}

export interface LastSession {
  date: string   // ISO date string
  sets: Array<{ weight_kg: number; reps: number; rir: number | null }>
}

export interface WorkoutDayExercise {
  id: string
  position: number
  target_sets: number
  target_rir_label: string | null   // display label only (e.g. "0-2") — NOT a number
  exercise: Exercise
  last_session: LastSession | null
}

export interface WorkoutData {
  id: string
  date: string
  workout_day_id: string | null
  completed_at: string | null
  sets: WorkoutSet[]
}
```

### `lib/workout/queries.ts`

```ts
import 'server-only'
import { createServiceClient } from '@/lib/supabase'
import type { WorkoutData, WorkoutDayExercise, LastSession } from './types'

export async function getWorkoutForDate(date: string): Promise<WorkoutData | null> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('workouts')
    .select('id, date, workout_day_id, completed_at, workout_sets(id, exercise_id, set_number, weight_kg, reps, rir)')
    .eq('date', date)
    .maybeSingle()
  return data ?? null
}

export async function getExercisesForDay(workoutDayId: string, today: string): Promise<WorkoutDayExercise[]> {
  const supabase = createServiceClient()
  const { data: dayExercises } = await supabase
    .from('workout_day_exercises')
    .select('id, position, target_sets, target_rir, exercise:exercises(id, name, muscle_group, default_rep_min, default_rep_max, default_rest_sec)')
    .eq('workout_day_id', workoutDayId)
    .order('position')
  if (!dayExercises) return []

  // Parallel last-session fetches using RPC (single round trip per exercise)
  const lastSessions = await Promise.all(
    dayExercises.map((de) => getLastSessionSets(de.exercise.id, today))
  )
  return dayExercises.map((de, i) => ({ ...de, target_rir_label: de.target_rir, last_session: lastSessions[i] }))
}

export async function getLastSessionSets(exerciseId: string, before: string): Promise<LastSession | null> {
  const supabase = createServiceClient()
  const { data } = await supabase.rpc('get_last_session_sets', {
    p_exercise_id: exerciseId,
    p_before: before,
  })
  if (!data || data.length === 0) return null
  return {
    date: data[0].workout_date,
    sets: data.map((r: { weight_kg: number; reps: number; rir: number | null }) => ({
      weight_kg: r.weight_kg, reps: r.reps, rir: r.rir,
    })),
  }
}

export async function getWorkoutDays() {
  const supabase = createServiceClient()
  const { data } = await supabase.from('workout_days').select('id, day_number, label').order('day_number')
  return data ?? []
}
```

### `lib/actions/workout.ts` — pattern with typed return

```ts
'use server'
import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase'
import { logSetSchema, type ActionResult } from '@/lib/workout/types'

export async function logSet(
  workoutId: string, exerciseId: string, setNumber: number,
  weightKg: number, reps: number, rir: number | null
): Promise<ActionResult> {
  const parsed = logSetSchema.safeParse({ workoutId, exerciseId, setNumber, weightKg, reps, rir })
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const supabase = createServiceClient()
  const { error } = await supabase.from('workout_sets').insert({
    workout_id: parsed.data.workoutId,
    exercise_id: parsed.data.exerciseId,
    set_number: parsed.data.setNumber,
    weight_kg: parsed.data.weightKg,
    reps: parsed.data.reps,
    rir: parsed.data.rir,
  })
  if (error) return { success: false, error: 'Failed to log set' }

  revalidatePath('/')
  revalidatePath('/workout')
  return { success: true }
}

export async function createOrResumeWorkout(date: string, workoutDayId: string): Promise<ActionResult<{ workoutId: string }>> {
  // validate inputs...
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('workouts')
    .upsert({ date, workout_day_id: workoutDayId }, { onConflict: 'date' })
    .select('id')
    .single()
  if (error || !data) return { success: false, error: 'Failed to create workout' }
  revalidatePath('/workout')
  return { success: true, data: { workoutId: data.id } }
}
```

### Component state architecture

**`exercise-card.tsx`** (client):
- `useOptimistic` on sets array — **revert is automatic** when transition ends; no `router.refresh()` on error
- `startTransition` wraps server action calls
- Props: `workoutId: string | null` — "Add set" button `disabled={!workoutId}` while workout is being created
- Props: `onSetSaved?: (payload: SetSavedPayload) => void` — parent shows rest timer
- Local state: `isExpanded`, `editingSetId`, `showAddRow`

**`workout-view.tsx`** (server component) fetches all data and passes down. The day picker handles its own `workoutId` state client-side via `useTransition`.

**Today page parallel fetch:**
```ts
// app/(app)/page.tsx — fetch both in parallel
const [workout, dietData] = await Promise.all([
  getWorkoutSummaryForDate(today),  // new: single lightweight query
  getMacrosForDate(today),           // existing
])
```

### Page structure

```tsx
// app/(app)/workout/page.tsx
export default async function WorkoutPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { date: dateParam } = await searchParams
  const today = format(new Date(), 'yyyy-MM-dd')
  const date = (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) ? dateParam : today
  const isPast = !isToday(parseISO(date))

  const [workout, workoutDays] = await Promise.all([
    getWorkoutForDate(date),
    getWorkoutDays(),
  ])

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <h1 className="font-heading text-2xl font-bold">Workout</h1>
      <DateNav date={date} todayStr={today} basePath="/workout" />
      <WorkoutView
        date={date}
        workout={workout}
        workoutDays={workoutDays}
        readonly={isPast || !!workout?.completed_at}
      />
    </div>
  )
}
```

```tsx
// app/(app)/workout/layout.tsx — RestTimer scoped to workout route
'use client'
export default function WorkoutLayout({ children }: { children: React.ReactNode }) {
  const [timerPayload, setTimerPayload] = useState<{ endTime: number } | null>(null)
  return (
    <WorkoutTimerContext.Provider value={{ setTimerPayload }}>
      {children}
      {timerPayload && (
        <RestTimer endTime={timerPayload.endTime} onDismiss={() => setTimerPayload(null)} />
      )}
    </WorkoutTimerContext.Provider>
  )
}
```

---

## System-Wide Impact

**Training day detection (diet):** `lib/diet/macros.ts:34` already queries `workouts` + `workout_sets` with `.maybeSingle()`. The new `UNIQUE(date)` constraint (D4) prevents the multi-row scenario that would cause `.maybeSingle()` to silently return null. No code changes to `lib/diet/macros.ts` needed.

**Today page render time:** Both `WorkoutSummaryCard` and `DietView` run their Supabase queries in parallel via `Promise.all` at the page level. Single lightweight query for workout summary (one workouts row + set count).

**Revalidation:** All workout actions call `revalidatePath('/')` and `revalidatePath('/workout')`. When sets are logged, Today page re-renders and diet macro bar flips to 1950 kcal training targets automatically.

---

## Acceptance Criteria

### Core workflow
- [ ] `/workout` today with no existing workout → day picker shown, expected day highlighted (not selected)
- [ ] `/workout` today with in-progress workout → day picker skipped, exercises load immediately
- [ ] Day picker uses ToggleGroup; buttons disabled while `createOrResumeWorkout` is pending
- [ ] Exercises load in correct order (by `position`) for selected workout day
- [ ] Tapping exercise opens Collapsible, shows current sets + last session reference
- [ ] "Add set" input disabled until `workoutId` is confirmed; weight/reps pre-filled from history
- [ ] "Same as last" shortcut confirms pre-filled values in one tap
- [ ] Set saves via server action; exercise card updates optimistically
- [ ] Rest timer fires after set save with correct `default_rest_sec` for that exercise
- [ ] Rest timer: Dialog overlay, circular arc drain, color shift last 10s, +15/-15 buttons, Skip
- [ ] Rest timer auto-resumes after iOS screen lock if time remaining
- [ ] "Add exercise" opens Command+Popover search; selecting appends to session
- [ ] Inline finish action marks workout complete; exercise cards become read-only
- [ ] Sets have DropdownMenu delete (single tap confirm)

### Today page
- [ ] WorkoutSummaryCard shows 3 states: no workout, in-progress, complete
- [ ] Card links to `/workout`; diet macro bar shows 1950 kcal training targets after first set logged
- [ ] WorkoutSummaryCard and DietView queries run in parallel

### Date navigation
- [ ] `/workout?date=YYYY-MM-DD` loads that date's workout as read-only
- [ ] Date nav back stops at 90 days; forward stops at today

### Quality
- [ ] All interactive elements ≥44px touch target (weight ± buttons ≥56px)
- [ ] `type="text" inputMode="decimal"` on weight input (no `type="number"`)
- [ ] RIR uses ToggleGroup pill row (0–4), not number input
- [ ] Containers use `100dvh` not `100vh`; bottom UI has `env(safe-area-inset-bottom)` padding
- [ ] No `rgba()` with CSS variables — use `color-mix(in oklch, ...)`
- [ ] Zod validation on all server action inputs; `searchExercises` query capped at `.max(100)`
- [ ] No `setInterval` in rest timer; `cancelRef.current = true` in rAF cleanup; `visibilitychange` resync
- [ ] Test rest timer on physical iOS 18 device (keyboard may not appear — known WebKit bug)

---

## Dependencies & Risks

**Migration must be applied before implementation.** `002_workout_constraints_and_indexes.sql` creates the UNIQUE constraint, indexes, RPC function, and set_number uniqueness constraint. Without it, the upsert has no conflict target and `getLastSessionSets` uses an invalid query pattern.

**Risk: iOS 18 WebKit keyboard bug.** Keyboard may not appear for inputs in PWA standalone mode (unresolved as of Dec 2024). Mitigations: ensure all inputs have a real `type` attribute, avoid CSS `transform` on input containers, test on physical iOS 18 device before calling Phase 2 done.

**Risk: rAF double-loop on remount.** Covered by `cancelRef.current = true` in the cleanup. The `visibilitychange` handler also restarts the loop cleanly on screen unlock. Needs explicit test: lock screen mid-timer, unlock, verify single countdown.

**Risk: workoutId null guard.** If `createOrResumeWorkout` is slow (free tier cold start), the user sees exercise cards briefly with disabled Add Set. The loading state via `useTransition` on the day picker handles this — disable picker buttons during pending, keep cards rendered but inputs disabled.

**Risk: RPC function in production.** The `get_last_session_sets` function must be deployed via Supabase migration (`npx supabase db push`) before the app code runs. If the RPC is missing, `supabase.rpc()` returns an error and last-session data silently shows as null for all exercises. Test this migration locally first.

---

## Migration

```sql
-- supabase/migrations/002_workout_constraints_and_indexes.sql

-- 1. UNIQUE date constraint (required for upsert + maybeSingle correctness)
ALTER TABLE workouts ADD CONSTRAINT workouts_date_unique UNIQUE (date);

-- 2. Prevent duplicate set numbers
ALTER TABLE workout_sets
  ADD CONSTRAINT workout_sets_set_number_unique
  UNIQUE (workout_id, exercise_id, set_number);

-- 3. Protect exercises from deletion while sets reference them
ALTER TABLE workout_sets
  DROP CONSTRAINT workout_sets_exercise_id_fkey,
  ADD CONSTRAINT workout_sets_exercise_id_fkey
    FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE RESTRICT;

-- 4. Indexes
CREATE INDEX workout_sets_workout_id_idx       ON workout_sets(workout_id);
CREATE INDEX workout_sets_exercise_id_idx      ON workout_sets(exercise_id);
CREATE INDEX workout_sets_exercise_workout_idx ON workout_sets(exercise_id, workout_id);
CREATE INDEX workouts_date_idx                 ON workouts(date);
CREATE INDEX wde_workout_day_id_idx            ON workout_day_exercises(workout_day_id);
CREATE INDEX meals_date_idx                    ON meals(date);
CREATE INDEX meal_items_meal_id_idx            ON meal_items(meal_id);

-- 5. RPC for last session (eliminates two-step query + PostgREST embedded filter ambiguity)
CREATE OR REPLACE FUNCTION get_last_session_sets(
  p_exercise_id uuid,
  p_before date
)
RETURNS TABLE(set_number int, weight_kg numeric, reps int, rir int, workout_date date) AS $$
  SELECT ws.set_number, ws.weight_kg, ws.reps, ws.rir, w.date AS workout_date
  FROM workout_sets ws
  JOIN workouts w ON w.id = ws.workout_id
  WHERE ws.exercise_id = p_exercise_id
    AND w.date < p_before
  ORDER BY w.date DESC, ws.set_number
  LIMIT 10
$$ LANGUAGE sql STABLE;
```

Apply: `npx supabase db push`

---

## Sources & References

### Origin
- **Brainstorm document:** [docs/brainstorms/2026-06-06-forge-initial-brainstorm.md](docs/brainstorms/2026-06-06-forge-initial-brainstorm.md)
  - Key decisions carried forward: auto-resume, timestamp-math rest timer, weekday day pre-selection, ad-hoc exercises in exercises table, Today dashboard workout card in Phase 2

### Internal patterns to follow
- Server actions: `lib/actions/diet.ts:1` — identical structure
- Query helpers: `lib/diet/macros.ts:1` — `server-only`, parallel fetches
- Optimistic updates: `components/diet/meal-card.tsx:41` — `useOptimistic` + `startTransition`; revert is automatic, no `router.refresh()` on error
- Date navigation: `app/(app)/diet/date-nav.tsx:1` — extract to shared component
- Schema: `supabase/migrations/001_initial_schema.sql:1` — all workout tables exist

### Research sources
- [useOptimistic — React docs](https://react.dev/reference/react/useOptimistic) — auto-revert on transition failure
- [Supabase PostgREST Joins](https://supabase.com/docs/guides/database/joins-and-nesting) — `!inner` filter syntax
- [iOS 18 PWA keyboard bug — WebKit](https://bugs.webkit.org/show_bug.cgi?id=279904) — unresolved
- [Hevy rest timer UX](https://www.hevyapp.com/features/workout-rest-timer/) — +15/-15 button pattern
- [NNGroup input steppers](https://www.nngroup.com/articles/input-steppers/) — hybrid stepper for wide value ranges
- [dvh units for iOS keyboard](https://dev.to/franciscomoretti/fix-mobile-keyboard-overlap-with-visualviewport-3a4a)
