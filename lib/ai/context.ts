import 'server-only'
import { createServiceClient } from '@/lib/supabase'

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]!
}

interface WorkoutSetRow {
  set_number: number
  weight_kg: number
  reps: number
  rir: number | null
  exercise: { name: string; muscle_group: string | null } | null
}

interface WorkoutRow {
  date: string
  workout_day: { label: string } | null
  workout_sets: WorkoutSetRow[]
}

interface MealItemRow {
  quantity_g: number
  food: {
    calories_100g: number
    protein_100g: number
    carbs_100g: number
    fat_100g: number
  } | null
}

interface MealRow {
  date: string
  meal_items: MealItemRow[]
}

async function fetchWorkoutsCompact(supabase: ReturnType<typeof createServiceClient>, cutoff: string): Promise<string> {
  const { data } = await supabase
    .from('workouts')
    .select(`
      date,
      workout_day:workout_days(label),
      workout_sets(set_number, weight_kg, reps, rir, exercise:exercises(name, muscle_group))
    `)
    .gte('date', cutoff)
    .not('completed_at', 'is', null)
    .order('date', { ascending: false })

  if (!data || data.length === 0) return 'No completed workouts in this period.'

  const rows = data as unknown as WorkoutRow[]
  const lines: string[] = []

  for (const workout of rows) {
    const dayLabel = workout.workout_day?.label ?? 'Unknown day'
    lines.push(`\n### ${workout.date} — ${dayLabel}`)

    const byExercise = new Map<string, string[]>()
    const sorted = [...workout.workout_sets].sort((a, b) => a.set_number - b.set_number)

    for (const s of sorted) {
      const name = s.exercise?.name ?? 'Unknown exercise'
      const setStr = s.rir != null ? `${s.weight_kg}×${s.reps}@${s.rir}` : `${s.weight_kg}×${s.reps}`
      if (!byExercise.has(name)) byExercise.set(name, [])
      byExercise.get(name)!.push(setStr)
    }

    for (const [name, sets] of byExercise) {
      lines.push(`- ${name}: ${sets.join(', ')}`)
    }
  }

  return lines.join('\n')
}

async function fetchDailyMacros(supabase: ReturnType<typeof createServiceClient>, cutoff: string): Promise<string> {
  const { data: meals } = await supabase
    .from('meals')
    .select(`date, meal_items(quantity_g, food:foods(calories_100g, protein_100g, carbs_100g, fat_100g))`)
    .gte('date', cutoff)
    .order('date', { ascending: false })

  if (!meals || meals.length === 0) return 'No diet data in this period.'

  const rows = meals as unknown as MealRow[]

  const byDate = new Map<string, { kcal: number; protein: number; carbs: number; fat: number }>()
  for (const meal of rows) {
    if (!byDate.has(meal.date)) byDate.set(meal.date, { kcal: 0, protein: 0, carbs: 0, fat: 0 })
    const totals = byDate.get(meal.date)!
    for (const item of meal.meal_items) {
      if (!item.food) continue
      const r = item.quantity_g / 100
      totals.kcal += r * item.food.calories_100g
      totals.protein += r * item.food.protein_100g
      totals.carbs += r * item.food.carbs_100g
      totals.fat += r * item.food.fat_100g
    }
  }

  const header = '| Date | Calories | Protein | Carbs | Fat |\n|------|----------|---------|-------|-----|'
  const tableRows = [...byDate.entries()].map(([date, t]) =>
    `| ${date} | ${Math.round(t.kcal)} | ${Math.round(t.protein)}g | ${Math.round(t.carbs)}g | ${Math.round(t.fat)}g |`
  )
  return header + '\n' + tableRows.join('\n')
}

async function fetchWeightLogs(supabase: ReturnType<typeof createServiceClient>, cutoff: string): Promise<string> {
  const { data } = await supabase
    .from('weight_logs')
    .select('date, weight_kg, waist_cm')
    .gte('date', cutoff)
    .order('date', { ascending: false })

  if (!data || data.length === 0) return 'No weight data in this period.'

  const header = '| Date | Weight (kg) | Waist (cm) |\n|------|-------------|------------|'
  const rows = data.map((r) => `| ${r.date} | ${r.weight_kg} | ${r.waist_cm ?? '—'} |`)
  return header + '\n' + rows.join('\n')
}

async function fetchSleepLogs(supabase: ReturnType<typeof createServiceClient>, cutoff: string): Promise<string> {
  const { data } = await supabase
    .from('sleep_logs')
    .select('date, hours, quality')
    .gte('date', cutoff)
    .order('date', { ascending: false })

  if (!data || data.length === 0) return 'No sleep data in this period.'

  const header = '| Date | Hours | Quality (1-5) |\n|------|-------|---------------|'
  const rows = data.map((r) => `| ${r.date} | ${r.hours} | ${r.quality ?? '—'} |`)
  return header + '\n' + rows.join('\n')
}

async function fetchSmokingLogs(supabase: ReturnType<typeof createServiceClient>, cutoff: string): Promise<string> {
  const { data } = await supabase
    .from('smoking_logs')
    .select('date, count')
    .gte('date', cutoff)
    .order('date', { ascending: false })

  if (!data || data.length === 0) return 'No smoking data in this period.'

  const header = '| Date | Cigarettes |\n|------|------------|'
  const rows = data.map((r) => `| ${r.date} | ${r.count} |`)
  return header + '\n' + rows.join('\n')
}

async function fetchMoodLogs(supabase: ReturnType<typeof createServiceClient>, cutoff: string): Promise<string> {
  const { data } = await supabase
    .from('mood_logs')
    .select('date, mood, stress, notes')
    .gte('date', cutoff)
    .order('date', { ascending: false })

  if (!data || data.length === 0) return 'No mood data in this period.'

  const header = '| Date | Mood (1-5) | Stress (1-5) | Notes |\n|------|------------|--------------|-------|'
  const rows = data.map((r) => `| ${r.date} | ${r.mood} | ${r.stress} | ${r.notes ?? ''} |`)
  return header + '\n' + rows.join('\n')
}

export async function fetchUserContext(days = 90): Promise<string> {
  const supabase = createServiceClient()
  const cutoff90 = daysAgo(days)
  const cutoff30 = daysAgo(30)
  const cutoff14 = daysAgo(14)

  const [workouts, dailyMacros, weightLogs, sleepLogs, smokingLogs, moodLogs] = await Promise.all([
    fetchWorkoutsCompact(supabase, cutoff90).catch(() => 'Error fetching workout data.'),
    fetchDailyMacros(supabase, cutoff14).catch(() => 'Error fetching diet data.'),
    fetchWeightLogs(supabase, cutoff90).catch(() => 'Error fetching weight data.'),
    fetchSleepLogs(supabase, cutoff30).catch(() => 'Error fetching sleep data.'),
    fetchSmokingLogs(supabase, cutoff30).catch(() => 'Error fetching smoking data.'),
    fetchMoodLogs(supabase, cutoff30).catch(() => 'Error fetching mood data.'),
  ])

  return `## Workout Sessions (last ${days} days)
${workouts}

## Daily Macro Totals (last 14 days)
${dailyMacros}

## Weight Log (last ${days} days)
${weightLogs}

## Sleep Log (last 30 days)
${sleepLogs}

## Smoking Log (last 30 days)
${smokingLogs}

## Mood & Stress Log (last 30 days)
${moodLogs}`
}
