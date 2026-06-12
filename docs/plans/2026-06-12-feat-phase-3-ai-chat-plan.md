---
title: "feat: Phase 3 — AI Chat"
type: feat
status: completed
date: 2026-06-12
origin: docs/brainstorms/2026-06-06-forge-initial-brainstorm.md
---

# Phase 3: AI Chat

## Overview

An AI coach that reads 90 days of the owner's actual fitness data — workouts, diet, weight, sleep, mood, smoking — and answers questions in context. Two core surfaces: a **threaded chat UI** at `/chat`, and **insight shortcut buttons** on the Today dashboard ("Daily Review", "Weekly Review") that generate and cache one-shot analyses. The AI knows the hypertrophy and diet plans and speaks in RIR/MPS/kcal vocabulary.

Phases 0–2 are complete. All DB tables for Phase 3 (`ai_threads`, `ai_messages`, `ai_insights`) were created in the initial migration.

*(see brainstorm: docs/brainstorms/2026-06-06-forge-initial-brainstorm.md — Phase 3 spec)*

---

## Proposed Solution

Five deliverables built in dependency order:

1. **Data context layer** (`lib/ai/context.ts`) — queries all lifestyle data for 90 days, formats as compact markdown tables; plan docs loaded once at module scope via `fs.readFileSync`
2. **System prompt** (`lib/ai/prompts.ts`) — coach persona builder, `dailyReviewPrompt()` and `weeklyReviewPrompt()` templates
3. **`/api/chat` route** — full streaming implementation; thread write in `onFinish`
4. **Chat UI** — thread list, message feed with markdown rendering, streaming input bar
5. **Insight buttons** — non-streaming server action with `ai_insights` cache; shown on Today and on chat page

---

## Key Decisions

### D1: Drop edge runtime on `/api/chat`

The `CLAUDE.md` originally specified edge runtime for `/api/chat`, but edge runtime prohibits Node.js `fs`. The plan docs (`docs/hypertrophy-plan.md`, `docs/diet-plan.md`) must be read at module scope for cheap caching. For a single-user personal tool, the latency difference between edge and Node.js is irrelevant. **Remove `export const runtime = 'edge'`** from `/api/chat/route.ts`.

The `createServiceClient()` import from `lib/supabase.ts` carries `import 'server-only'` — this works fine in a Node.js API route.

### D2: Vercel AI SDK `useChat` for streaming

Use `useChat` from `ai/react` in the client chat component. The route returns `result.toDataStreamResponse()`. Pass `threadId` in the request body so the route can write messages to the correct thread. Thread history is loaded server-side as `initialMessages` when switching threads.

### D3: Thread creation before first message

When the user clicks "New thread", a `createThread()` server action runs immediately and the URL updates to `/chat?thread=<id>`. `useChat` is initialized with that `threadId` as its `id` param and `initialMessages: []`. This avoids the complexity of creating a thread mid-stream.

Thread title: auto-set to the first 60 characters of the first user message (trimmed). Updated by the route in `onFinish`.

### D4: Data context scope (token budget)

90-day window total, but selective density by table:

| Data type | Window | Format |
|---|---|---|
| Workouts + sets | 90 days | One row per exercise per session, sets condensed: `40×12@2, 40×11@2` |
| Diet daily totals | 14 days | Daily macro aggregates only (calories, protein, carbs, fat vs target) |
| Weight | 90 days | One row per entry |
| Sleep / Mood / Smoking | 30 days | One row per entry |

Estimated context: ~20–35K tokens. Gemini 2.5 Flash has a 1M context window — no concern.

### D5: Insights are non-streaming

Daily and Weekly Review are generated with `generateText` (not `streamText`) via a server action. A spinner shows while generating, the full result renders when the Promise resolves. Response size (~400–800 tokens) means 2–4 seconds wait — acceptable for a once-per-day operation. Result is cached in `ai_insights(date, type)` with upsert, so subsequent opens are instant.

### D6: Markdown rendering via `react-markdown`

AI responses will contain markdown (bold, lists, tables). Install `react-markdown` + `remark-gfm`. This library is not currently in `package.json`.

```bash
npm install react-markdown remark-gfm
```

---

## Technical Approach

### Architecture

```
lib/
  ai/
    context.ts        — fetchUserContext(days?: number): Promise<string>
                        HYPERTROPHY_PLAN, DIET_PLAN constants (module-scope, fs.readFileSync)
    prompts.ts        — buildSystemPrompt(context): string
                        dailyReviewPrompt(), weeklyReviewPrompt()
    types.ts          — Thread, ThreadMessage, InsightType shared types

lib/actions/
  chat.ts             — createThread(firstMessage?: string): Promise<{id, title}>
                        getThreads(): Promise<Thread[]>
                        getMessages(threadId): Promise<ThreadMessage[]>
                        updateThreadTitle(threadId, title): Promise<void>
                        generateInsight(type: 'daily'|'weekly'): Promise<{content: string}>

app/api/chat/
  route.ts            — POST handler, streamText, onFinish writes assistant message + updates thread

app/(app)/chat/
  page.tsx            — server component: await getThreads(), getMessages(activeThreadId)
                        passes data to ChatView

components/chat/
  chat-view.tsx       — 'use client' orchestrator; useChat hook; manages thread switching
  thread-list.tsx     — thread sidebar; "New thread" button at top; sorted by updated_at desc
  message-feed.tsx    — renders messages array; auto-scroll to bottom on new message
  message-bubble.tsx  — role-aware bubble (user/assistant); ReactMarkdown for assistant
  chat-input.tsx      — Textarea + Send Button; disabled during isLoading
  insight-panel.tsx   — Daily/Weekly review card; load → generate → display; button to open

components/today/
  insight-buttons.tsx — two Buttons ("Daily Review", "Weekly Review") → open sheet or navigate
```

### Data Context Format (`lib/ai/context.ts`)

```ts
// Module-scope constants — loaded once per Node.js process
import { readFileSync } from 'fs'
import path from 'path'

const HYPERTROPHY_PLAN = readFileSync(
  path.join(process.cwd(), 'docs/hypertrophy-plan.md'), 'utf-8'
)
const DIET_PLAN = readFileSync(
  path.join(process.cwd(), 'docs/diet-plan.md'), 'utf-8'
)

export async function fetchUserContext(days = 90): Promise<string> {
  const supabase = createServiceClient()
  const cutoff = /* today minus days */

  const [workouts, dailyMacros, weightLogs, sleepLogs, smokingLogs, moodLogs] =
    await Promise.all([
      fetchWorkoutsCompact(supabase, cutoff),
      fetchDailyMacros(supabase, cutoff14),    // 14-day window
      fetchWeightLogs(supabase, cutoff),
      fetchSleepLogs(supabase, cutoff30),       // 30-day window
      fetchSmokingLogs(supabase, cutoff30),
      fetchMoodLogs(supabase, cutoff30),
    ])

  return formatContextMarkdown({ workouts, dailyMacros, weightLogs, sleepLogs, smokingLogs, moodLogs })
}
```

The workout compact format joins `workouts → workout_day_exercises → exercises → workout_sets` and collapses sets into a string: `"Incline DB Press: 40×12@2, 40×11@2, 40×10@3"` per exercise per session.

Daily macro totals join `meals → meal_items → foods` grouped by date, computed the same way as the diet page's macro totals bar.

### Chat Route Design (`app/api/chat/route.ts`)

```ts
// No edge runtime — Node.js only
import { streamText } from 'ai'
import { google } from '@ai-sdk/google'
import { buildSystemPrompt } from '@/lib/ai/prompts'
import { fetchUserContext } from '@/lib/ai/context'
import { createServiceClient } from '@/lib/supabase'

export async function POST(req: Request) {
  const { messages, threadId } = await req.json()

  const context = await fetchUserContext(90)
  const systemPrompt = buildSystemPrompt(context)

  const result = streamText({
    model: google('gemini-2.5-flash'),
    system: systemPrompt,
    messages,
    onFinish: async ({ text }) => {
      const supabase = createServiceClient()
      // Save assistant message
      await supabase.from('ai_messages').insert({
        thread_id: threadId,
        role: 'assistant',
        content: text,
      })
      // Update thread updated_at + title (first message auto-naming)
      const userContent = messages[messages.length - 1]?.content
      if (messages.length === 1 && typeof userContent === 'string') {
        await supabase.from('ai_threads').update({
          title: userContent.slice(0, 60),
          updated_at: new Date().toISOString(),
        }).eq('id', threadId)
      } else {
        await supabase.from('ai_threads').update({
          updated_at: new Date().toISOString(),
        }).eq('id', threadId)
      }
    },
  })

  return result.toDataStreamResponse()
}
```

Note: `messages` sent from client already includes the current user message (this is how `useChat` works). The route does NOT save the user message — the client already has it. We only save the assistant message in `onFinish`.

Wait — for persistence, user messages should also be saved. Two options:
- Save user message in `onFinish` by reading `messages[messages.length - 1]` (the user message that triggered the response)
- Save user message via a server action called before `handleSubmit`

**Decision**: Save user message in `onFinish` alongside assistant message. The route already receives `messages`; the last message before the assistant response is the user's. This avoids a second round-trip.

### Chat UI Flow

```
/chat?thread=abc123

page.tsx (server):
  threads = await getThreads()
  messages = await getMessages('abc123')
  → <ChatView threads={threads} activeThreadId="abc123" initialMessages={messages} />

ChatView (client):
  useChat({
    api: '/api/chat',
    id: activeThreadId,
    initialMessages,
    body: { threadId: activeThreadId },
  })
  
  Layout:
    [ThreadList | MessageFeed + ChatInput]
    mobile: ThreadList collapses to a dropdown at top
```

Thread switching: when the user selects a thread, `router.push('/chat?thread=<newId>')`. The page re-renders server-side with new `initialMessages`. `useChat` reinitializes with the new thread's messages because the `id` changes.

### Insight Buttons Design

On **Today dashboard** (`app/(app)/page.tsx`):
```tsx
<InsightButtons date={date} />  // adds after WorkoutSummaryCard and DietView
```

`InsightButtons` is a client component with two buttons. Clicking "Daily Review":
1. Calls `generateInsight('daily')` server action
2. Shows the result in an expanding section below (or a Sheet)
3. Caches — next click within the same day is instant

The insight display should be a `<Sheet>` (shadcn) sliding up from the bottom on mobile, with the markdown content rendered inside. This keeps the Today page clean.

On the **chat page**, the `InsightPanel` component shows the same buttons with the same behavior, but renders inline within the chat layout rather than in a Sheet.

---

## Implementation Phases

### Phase 3.1: Data layer + Prompt (Day 1, ~2h)

**Files:**
- Create `lib/ai/types.ts` — Thread, ThreadMessage, InsightType interfaces
- Create `lib/ai/context.ts` — `fetchUserContext`, 6 parallel queries, markdown formatter
- Create `lib/ai/prompts.ts` — `buildSystemPrompt`, review prompt templates

**`buildSystemPrompt` persona** (key content for prompts.ts):
```
You are Forge — a personal fitness coach AI with full access to the owner's data.
You speak plainly, cite specific numbers from the data, and use fitness vocabulary:
RIR (reps in reserve), MPS (muscle protein synthesis), progressive overload, deficit/surplus.
Flag: protein below 140g/day, sleep below 6h, strength stalls (same weight 3+ sessions),
smoking above 5 cigarettes/day.
Do not give generic advice. Every answer must reference the actual logged data provided.

## Training Plan
<hypertrophy plan content>

## Diet Plan
<diet plan content>

## Current Data (Last 90 Days)
<fetchUserContext() output>
```

**`dailyReviewPrompt()`**:
Review today's diet vs targets, workout if logged today, sleep last night, mood/stress, smoking. Give 3 actionable bullets.

**`weeklyReviewPrompt()`**:
Review the past 7 days: training adherence, avg calories vs target, avg protein, weight trend, sleep quality trend. Flag any stalls or misses. Recommend one priority for the coming week.

---

### Phase 3.2: Chat API route (Day 1, ~1h)

**Files:**
- `app/api/chat/route.ts` — full implementation (overwrite the 501 stub)

**Checklist:**
- [ ] Remove `export const runtime = 'edge'`
- [ ] `POST` reads `{ messages, threadId }` from body
- [ ] Calls `fetchUserContext(90)` + `buildSystemPrompt`
- [ ] `streamText` with `gemini-2.5-flash` via `@ai-sdk/google`
- [ ] `onFinish`: saves user message (last in `messages`) + assistant message to `ai_messages`; updates `ai_threads.updated_at`; sets thread title on first message
- [ ] Returns `result.toDataStreamResponse()`

---

### Phase 3.3: Server actions for thread management (Day 1, ~1h)

**Files:**
- Create `lib/actions/chat.ts`

**Actions:**
```ts
createThread(): Promise<{ id: string; title: string }>
  // inserts ai_threads row with title='New conversation', returns id

getThreads(): Promise<Thread[]>
  // selects ai_threads ordered by updated_at desc, limit 50

getMessages(threadId: string): Promise<ThreadMessage[]>
  // selects ai_messages for thread, ordered by created_at asc

generateInsight(type: 'daily' | 'weekly'): Promise<{ content: string }>
  // 1. Check ai_insights for today + type
  // 2. If found → return content
  // 3. If not → generateText(gemini-2.5-flash, prompt + context)
  //             → upsert ai_insights
  //             → return content
```

Zod schemas for inputs (in `lib/ai/types.ts` or a separate `lib/schemas/chat.ts`).

---

### Phase 3.4: Chat UI (Day 2, ~3h)

**Dependencies:** Install `react-markdown remark-gfm`

**Files:**
- `components/chat/message-bubble.tsx`
- `components/chat/message-feed.tsx`
- `components/chat/chat-input.tsx`
- `components/chat/thread-list.tsx`
- `components/chat/chat-view.tsx`
- Update `app/(app)/chat/page.tsx`

**Thread list layout on mobile:**

Since mobile uses a bottom nav (no sidebar), the thread list on mobile should be a top-of-page dropdown or a separate route. Simplest: a `<Select>`-style dropdown (shadcn `Select` component) at the top of the chat page for thread switching on mobile. On desktop (`md:` breakpoint), a sidebar column appears.

**Message bubble styles:**
- User messages: `bg-primary/15 text-foreground` right-aligned
- Assistant messages: `bg-muted text-foreground` left-aligned, full width, markdown rendered
- Timestamp: small muted text below each bubble

**Auto-scroll:**
```tsx
const bottomRef = useRef<HTMLDivElement>(null)
useEffect(() => {
  bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
}, [messages])
```

**Empty states:**
- No threads at all: "Ask your AI coach anything about your training and diet." with a prominent "Start a conversation" button
- Thread selected but no messages: "What would you like to know?" 

**shadcn components needed:**
- `Select` (thread picker on mobile) — check if already added
- `Sheet` (for insight panel on Today) — check if already added
- `Separator` — already added

Check with `mcp__shadcn__search_items_in_registries` before adding.

---

### Phase 3.5: Insight buttons (Day 2, ~1.5h)

**Files:**
- Create `components/chat/insight-panel.tsx`
- Create `components/today/insight-buttons.tsx`
- Update `app/(app)/page.tsx` to add `<InsightButtons date={date} />`

**InsightButtons component:**
```tsx
'use client'
// Two buttons: "Daily Review" and "Weekly Review"
// State: idle | loading | displaying
// On click: generateInsight(type) server action → setState(displaying, content)
// Display: <Sheet> opens with markdown content
// Next click same day: server action returns cached content instantly
```

**Placement on Today page:**
Add after the `<DietView>` block, before closing div:
```tsx
<InsightButtons date={date} />
```

---

## File List

| File | Action |
|---|---|
| `lib/ai/types.ts` | Create |
| `lib/ai/context.ts` | Create |
| `lib/ai/prompts.ts` | Create |
| `lib/actions/chat.ts` | Create |
| `app/api/chat/route.ts` | Overwrite (drop edge, full impl) |
| `app/(app)/chat/page.tsx` | Overwrite (full server component) |
| `components/chat/message-bubble.tsx` | Create |
| `components/chat/message-feed.tsx` | Create |
| `components/chat/chat-input.tsx` | Create |
| `components/chat/thread-list.tsx` | Create |
| `components/chat/chat-view.tsx` | Create |
| `components/chat/insight-panel.tsx` | Create |
| `components/today/insight-buttons.tsx` | Create |
| `app/(app)/page.tsx` | Update (add InsightButtons) |

**Packages to install before starting:**
```bash
npm install react-markdown remark-gfm
```

---

## System-Wide Impact

### Interaction Graph

1. User types message → `useChat.handleSubmit()` → `POST /api/chat` with `{ messages, threadId }`
2. Route: `fetchUserContext(90)` → 6 parallel Supabase queries → markdown string
3. `streamText(gemini-2.5-flash, system, messages)` → streams tokens back
4. Client: `useChat` appends streaming tokens to `messages` state → `MessageFeed` re-renders
5. Stream ends → `onFinish(text)` → saves user + assistant messages to `ai_messages` → updates `ai_threads.updated_at` → optionally sets thread title
6. `ThreadList` does NOT auto-refresh (no polling) — title appears on next page load

For insights:
1. User clicks "Daily Review" → `generateInsight('daily')` server action
2. Check `ai_insights` cache → cache hit: return content immediately
3. Cache miss: `generateText(gemini-2.5-flash, dailyReviewPrompt())` (non-streaming) → wait 2–4s → upsert `ai_insights` → return content
4. `InsightButtons` state changes to `displaying` → Sheet opens with markdown content

### Error & Failure Propagation

- **Context fetch failure** (Supabase down): `fetchUserContext` individual query errors can be caught and silently omitted — partial context is better than no response. Wrap each `Promise.all` branch.
- **`onFinish` DB write failure**: message streamed to user but not persisted. Silent for the user — they still see the conversation in their current session. On page reload, the message is gone. Acceptable for a personal tool; log to console.
- **Gemini rate limit** (15 RPM): For a single user, hitting 15 RPM would require sending 15 messages in 60 seconds. Not a real concern.
- **generateInsight timeout**: `generateText` has no built-in timeout. If Gemini hangs, the server action hangs. Add a 30s timeout via `Promise.race` with a `setTimeout` rejection.
- **Thread not found**: if `threadId` in the request body doesn't exist in `ai_threads`, the `ai_messages` insert fails (FK violation). The route should validate the thread exists before calling `streamText`, or let the FK error surface and return 400.

### State Lifecycle Risks

- `useChat` stores messages in React state (memory only). If the user navigates away and back, the page reloads server-side messages from DB. The only gap: messages sent during the session are in both client state and DB (via onFinish). If `onFinish` fails, the client shows the message but DB doesn't. On reload: missing. Risk: low — personal tool, no financial/critical data.
- `ai_insights` upsert uses `UNIQUE(date, type)` — multiple concurrent insight requests (user double-clicks) would cause one to fail on upsert. Use `ignoreDuplicates: true` or `onConflict: 'date,type'` to handle gracefully.

### API Surface Parity

- `/api/chat` is the only AI API route. No duplication.
- `generateInsight` server action and the chat route both call Gemini — they share the same `fetchUserContext` and `buildSystemPrompt` logic. Verify no duplication in system prompt construction.

### Integration Test Scenarios

1. **Thread creation → first message → persistence**: Create thread → send message → reload page → confirm message in thread list and message feed
2. **Context accuracy**: Log a meal → send "what did I eat today?" → confirm response cites logged food
3. **Insight caching**: Click "Daily Review" → confirm `ai_insights` row created → click again → no duplicate Gemini call (verify via response speed)
4. **Thread switching**: Start thread A → send a message → switch to thread B (different messages) → confirm thread A messages don't bleed into thread B's `useChat` state
5. **Concurrent insight requests**: Double-click "Daily Review" rapidly → confirm no duplicate rows in `ai_insights`

---

## Acceptance Criteria

### Functional Requirements

- [ ] `/chat` shows a thread list and an active message thread
- [ ] "New thread" creates a new thread and focuses the input
- [ ] Sending a message streams the response token by token
- [ ] Thread title auto-updates from first user message
- [ ] Thread history persists across page reloads (stored in `ai_messages`)
- [ ] AI responses cite actual logged data (numbers from DB, not generic advice)
- [ ] "Daily Review" button on Today page generates a review of today's data
- [ ] "Weekly Review" button generates a 7-day summary
- [ ] Insights cache within the same day (second click is instant)
- [ ] Markdown in AI responses renders correctly (bold, lists, tables)

### Non-Functional Requirements

- [ ] First token of streaming response appears within 3s
- [ ] Insight generation completes within 10s (30s timeout guard)
- [ ] No Gemini calls on page load (user-action only)
- [ ] Thread list sorted by most recent activity (`updated_at` desc)

### Quality Gates

- [ ] `npm run build` passes with no TypeScript errors
- [ ] No `console.error` in browser DevTools during normal chat flow
- [ ] Tested on iPhone Safari (PWA): input doesn't get hidden behind keyboard, streaming works

---

## Dependencies & Prerequisites

- `react-markdown` + `remark-gfm` — not yet installed
- shadcn `Select` component — check if added; if not: `npx shadcn@latest add select`
- shadcn `Sheet` component — check if added; if not: `npx shadcn@latest add sheet`
- shadcn `ScrollArea` component — for message feed; check if added: `npx shadcn@latest add scroll-area`
- Gemini API key in env (`GOOGLE_GENERATIVE_AI_API_KEY`) — must be set in Vercel env vars

---

## Risk Analysis

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Context token overflow (>1M tokens) | Very Low | High | 90-day cap + density limits as designed |
| Gemini API key not in Vercel env | Low | High | Verify in Vercel dashboard before deploying |
| `react-markdown` conflicts with Tailwind v4 | Low | Medium | Test rendering; use `prose` class or custom component map |
| `onFinish` message persistence failure | Medium | Low | Log error, acceptable data loss for personal tool |
| iOS PWA keyboard covers input bar | Medium | High | Use `100dvh`, `safe-area-inset-bottom`, and `window.visualViewport` resize listener |
| Thread state mismatch on switch | Low | Medium | Always use page-level URL param for thread identity; `useChat` key changes on threadId |

---

## Sources & References

### Origin

- **Brainstorm document:** [docs/brainstorms/2026-06-06-forge-initial-brainstorm.md](docs/brainstorms/2026-06-06-forge-initial-brainstorm.md)
  
  Key decisions carried forward:
  1. Context stuffing (not RAG) — 90-day data fits in Gemini's 1M context window
  2. Named threads with thread list — each thread is a separate context
  3. Insight buttons cache in `ai_insights` — check before generating

### Internal References

- DB schema: `supabase/migrations/001_initial_schema.sql:113` — ai_threads, ai_messages, ai_insights tables
- Supabase client: `lib/supabase.ts:4` — `createServiceClient()` pattern
- Server action pattern: `lib/actions/workout.ts:1` — `'use server'`, Zod parse, createServiceClient, revalidatePath
- Today page: `app/(app)/page.tsx:10` — where `<InsightButtons>` will be added after `<DietView>`
- Chat stub: `app/api/chat/route.ts:1` — will be completely overwritten

### External References

- Vercel AI SDK v6 `streamText`: https://sdk.vercel.ai/docs/reference/ai-sdk-core/stream-text
- Vercel AI SDK v6 `useChat`: https://sdk.vercel.ai/docs/reference/ai-sdk-ui/use-chat
- `@ai-sdk/google` provider: https://sdk.vercel.ai/providers/ai-sdk-providers/google-generative-ai
- `react-markdown`: https://github.com/remarkjs/react-markdown
