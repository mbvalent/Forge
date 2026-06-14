import 'server-only'

import { createServiceClient } from '@/lib/supabase'

export async function getStreakCount(): Promise<number> {
  const supabase = createServiceClient()

  // Fetch distinct dates from workout_sets and meal_items over the last 90 days
  const [workoutDates, mealDates] = await Promise.all([
    supabase
      .from('workout_sets')
      .select('workouts!inner(date)')
      .order('workouts(date)', { ascending: false })
      .limit(500),
    supabase
      .from('meal_items')
      .select('meals!inner(date)')
      .order('meals(date)', { ascending: false })
      .limit(500),
  ])

  const dateSet = new Set<string>()

  workoutDates.data?.forEach((row: any) => {
    const d = row.workouts?.date
    if (d) dateSet.add(d)
  })
  mealDates.data?.forEach((row: any) => {
    const d = row.meals?.date
    if (d) dateSet.add(d)
  })

  if (dateSet.size === 0) return 0

  // Sort dates descending
  const sorted = Array.from(dateSet).sort((a, b) => b.localeCompare(a))

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().slice(0, 10)

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().slice(0, 10)

  // Streak starts from today or yesterday (if today not yet logged)
  const startDate = sorted[0] === todayStr || sorted[0] === yesterdayStr
    ? sorted[0]
    : null

  if (!startDate) return 0

  let streak = 0
  let current = new Date(startDate)
  current.setHours(0, 0, 0, 0)

  while (true) {
    const dateStr = current.toISOString().slice(0, 10)
    if (!dateSet.has(dateStr)) break
    streak++
    current.setDate(current.getDate() - 1)
  }

  return streak
}
