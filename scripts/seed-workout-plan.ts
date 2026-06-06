import { loadEnvConfig } from '@next/env'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateObject } from 'ai'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

loadEnvConfig(process.cwd())

const google = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY! })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
)

const WorkoutPlanSchema = z.object({
  days: z.array(z.object({
    day_number: z.number().int().min(1).max(5),
    label: z.string(),
    exercises: z.array(z.object({
      name: z.string(),
      muscle_group: z.string(),
      position: z.number().int(),
      target_sets: z.number().int(),
      target_rir: z.string(),
      default_rep_min: z.number().int(),
      default_rep_max: z.number().int(),
      default_rest_sec: z.number().int(),
    })),
  })),
})

async function main() {
  const plan = readFileSync(join(process.cwd(), 'docs/hypertrophy-plan.md'), 'utf-8')

  console.log('Parsing workout plan via Gemini...')

  const { object } = await generateObject({
    model: google('gemini-2.5-flash'),
    schema: WorkoutPlanSchema,
    prompt: `
Parse this 5-day hypertrophy workout plan and extract structured data.

For each day, extract:
- day_number: 1-5
- label: the day's label (e.g. "Back + Biceps + Rear Delts")
- exercises: all exercises listed for that day

For each exercise:
- name: exact exercise name
- muscle_group: primary muscle (Back, Chest, Legs, Shoulders, Biceps, Triceps, Abs, etc.)
- position: order in the workout (1-indexed)
- target_sets: number of working sets (default 3 if not specified)
- target_rir: RIR target as string (e.g. "1-2", "2", "0-1")
- default_rep_min / default_rep_max: rep range (e.g. 8-12 → min 8, max 12)
- default_rest_sec: rest time in seconds (60=1min, 90=90s, 120=2min, 180=3min)

Workout plan:
${plan.slice(0, 20000)}
    `.trim(),
  })

  console.log(`Parsed ${object.days.length} days. Inserting into DB...`)

  // Collect all unique exercise names across all days
  const allExerciseNames = [...new Set(object.days.flatMap(d => d.exercises.map(e => e.name)))]

  // Upsert exercises (deduplicate by name)
  type ExerciseRow = { name: string; muscle_group: string; default_rep_min: number; default_rep_max: number; default_rest_sec: number }
  const exerciseRows: ExerciseRow[] = []
  for (const name of allExerciseNames) {
    for (const day of object.days) {
      const ex = day.exercises.find(e => e.name === name)
      if (ex) {
        exerciseRows.push({
          name: ex.name,
          muscle_group: ex.muscle_group,
          default_rep_min: ex.default_rep_min,
          default_rep_max: ex.default_rep_max,
          default_rest_sec: ex.default_rest_sec,
        })
        break
      }
    }
  }

  const { data: insertedExercises, error: exErr } = await supabase
    .from('exercises')
    .upsert(exerciseRows, { onConflict: 'name' })
    .select('id, name')

  if (exErr) { console.error('exercises error:', exErr); process.exit(1) }

  const exerciseMap = new Map((insertedExercises ?? []).map(e => [e.name, e.id]))
  console.log(`✓ Upserted ${exerciseMap.size} exercises`)

  // Upsert workout days
  const dayRows = object.days.map(d => ({ day_number: d.day_number, label: d.label }))
  const { data: insertedDays, error: dayErr } = await supabase
    .from('workout_days')
    .upsert(dayRows, { onConflict: 'day_number' })
    .select('id, day_number')

  if (dayErr) { console.error('workout_days error:', dayErr); process.exit(1) }

  const dayMap = new Map((insertedDays ?? []).map(d => [d.day_number, d.id]))
  console.log(`✓ Upserted ${dayMap.size} workout days`)

  // Build workout_day_exercises
  const wdeRows = object.days.flatMap(day =>
    day.exercises
      .filter(ex => exerciseMap.has(ex.name) && dayMap.has(day.day_number))
      .map(ex => ({
        workout_day_id: dayMap.get(day.day_number)!,
        exercise_id: exerciseMap.get(ex.name)!,
        position: ex.position,
        target_sets: ex.target_sets,
        target_rir: ex.target_rir,
      }))
  )

  // Delete existing day-exercises before re-inserting (clean re-seed)
  const dayIds = [...dayMap.values()]
  await supabase.from('workout_day_exercises').delete().in('workout_day_id', dayIds)

  const { error: wdeErr } = await supabase.from('workout_day_exercises').insert(wdeRows)
  if (wdeErr) { console.error('workout_day_exercises error:', wdeErr); process.exit(1) }

  console.log(`✓ Seeded ${wdeRows.length} day-exercise links`)

  for (const day of object.days) {
    console.log(`\n  Day ${day.day_number}: ${day.label}`)
    day.exercises.forEach(ex => console.log(`    ${ex.position}. ${ex.name} — ${ex.target_sets}×${ex.default_rep_min}-${ex.default_rep_max} @ RIR ${ex.target_rir}`))
  }
}

main().catch(e => { console.error(e); process.exit(1) })
