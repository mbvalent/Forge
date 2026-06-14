import 'server-only'

import { createServiceClient } from '@/lib/supabase'

export interface WeightLog {
  date: string
  weight_kg: number
}

export interface LatestWeightLog {
  date: string
  weight_kg: number
  delta_wk: number | null
  series: number[]
}

export async function getLatestWeightLog(): Promise<LatestWeightLog | null> {
  const supabase = createServiceClient()

  const { data } = await supabase
    .from('weight_logs')
    .select('date, weight_kg')
    .order('date', { ascending: false })
    .limit(14)

  if (!data || data.length === 0) return null

  const latest = data[0]!
  const series = [...data].reverse().map((r) => Number(r.weight_kg))

  // Weekly delta: compare latest to entry ~7 days prior
  const sevenDaysAgo = new Date(latest.date)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10)

  const weekOldEntry = data.find((r) => r.date <= sevenDaysAgoStr)
  const delta_wk = weekOldEntry
    ? Number(latest.weight_kg) - Number(weekOldEntry.weight_kg)
    : null

  return {
    date: latest.date,
    weight_kg: Number(latest.weight_kg),
    delta_wk,
    series,
  }
}

export async function getWeightLogsForRange(days: number): Promise<WeightLog[]> {
  const supabase = createServiceClient()

  const { data } = await supabase
    .from('weight_logs')
    .select('date, weight_kg')
    .order('date', { ascending: false })
    .limit(days)

  if (!data) return []
  return data.map((r) => ({ date: r.date, weight_kg: Number(r.weight_kg) }))
}
