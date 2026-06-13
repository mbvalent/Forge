import { readFileSync } from 'fs'
import path from 'path'

const HYPERTROPHY_PLAN = readFileSync(
  path.join(process.cwd(), 'docs/hypertrophy-plan.md'),
  'utf-8'
)

const DIET_PLAN = readFileSync(
  path.join(process.cwd(), 'docs/diet-plan.md'),
  'utf-8'
)

export interface PromptMeta {
  clientDate?: string   // ISO string from client's clock
  timezone?: string     // IANA timezone e.g. "Asia/Karachi"
  location?: string     // human-readable city/country from geolocation
}

function formatCurrentContext(meta: PromptMeta): string {
  const tz = meta.timezone ?? 'UTC'
  const date = meta.clientDate ? new Date(meta.clientDate) : new Date()

  const weekday = date.toLocaleDateString('en-US', { weekday: 'long', timeZone: tz })
  const dateStr = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: tz })
  const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: tz })

  const lines = [`Today is ${weekday}, ${dateStr} at ${timeStr} (${tz}).`]
  if (meta.location) lines.push(`Owner's location: ${meta.location}.`)
  return lines.join('\n')
}

export function buildSystemPrompt(userContext: string, meta: PromptMeta = {}): string {
  return `You are Forge — a personal AI fitness coach with full access to the owner's training and nutrition data.

## Current Context
${formatCurrentContext(meta)}

## Your style
- Speak plainly and directly. No filler phrases.
- Always cite specific numbers from the data. Never give generic advice.
- Use proper fitness vocabulary: RIR (reps in reserve), progressive overload, kcal, MPS (muscle protein synthesis), caloric deficit/surplus, hypertrophy.
- Flag these when you see them: protein below 140g/day, sleep below 6h, strength stall (same weight for 3+ sessions on the same exercise), smoking above 5 cigarettes/day.
- If data is missing for a time period, say so rather than speculating.

## Training Plan

${HYPERTROPHY_PLAN}

## Diet Plan

${DIET_PLAN}

## Owner's Data

${userContext}`
}

export function dailyReviewPrompt(): string {
  return `Generate a concise daily review based on the owner's data. Cover:
1. Today's diet — actual calories and protein vs targets (training day: 1950 kcal / 160g protein; rest day: 1750 kcal / 160g protein). Was the target hit?
2. Today's workout — was one logged? If yes, brief summary of what was trained and any notable sets.
3. Last night's sleep — hours and quality if logged.
4. Mood, stress, and smoking today if logged.

Format as 3–4 short bullet points. Be specific — use actual numbers from the data. Under 200 words total.`
}

export function weeklyReviewPrompt(): string {
  return `Generate a concise weekly review covering the last 7 days. Cover:
1. Training adherence — how many sessions completed vs the 5-day split schedule. List which days were trained.
2. Nutrition — average daily calories and protein vs targets. Days where protein fell below 140g.
3. Weight — any change logged? Direction and magnitude.
4. Sleep — average hours and quality trend over the week.
5. One priority recommendation for the coming week based on what the data shows needs attention most.

Use actual numbers from the data. Under 300 words total.`
}
