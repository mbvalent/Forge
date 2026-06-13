'use server'

import { generateText } from 'ai'
import { google } from '@ai-sdk/google'
import { createServiceClient } from '@/lib/supabase'
import { fetchUserContext } from '@/lib/ai/context'
import { buildSystemPrompt, dailyReviewPrompt, weeklyReviewPrompt } from '@/lib/ai/prompts'
import type { Thread, ThreadMessage, InsightType } from '@/lib/ai/types'
import type { PromptMeta } from '@/lib/ai/prompts'

export async function createThread(): Promise<{ id: string; title: string }> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('ai_threads')
    .insert({ title: 'New conversation' })
    .select('id, title')
    .single()

  if (error || !data) throw new Error('Failed to create thread')
  return data
}

export async function getThreads(): Promise<Thread[]> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('ai_threads')
    .select('id, title, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(50)
  return (data as Thread[]) ?? []
}

export async function getMessages(threadId: string): Promise<ThreadMessage[]> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('ai_messages')
    .select('id, thread_id, role, content, created_at')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })
  return (data as ThreadMessage[]) ?? []
}

export async function generateInsight(
  type: InsightType,
  meta: PromptMeta = {}
): Promise<{ content: string }> {
  const supabase = createServiceClient()

  // Use the client's local date as cache key so UTC midnight doesn't trigger a stale cache
  const today = meta.clientDate
    ? new Date(meta.clientDate).toLocaleDateString('en-CA', { timeZone: meta.timezone ?? 'UTC' })
    : new Date().toISOString().split('T')[0]!

  const { data: cached } = await supabase
    .from('ai_insights')
    .select('content')
    .eq('date', today)
    .eq('type', type)
    .maybeSingle()

  if (cached) return { content: cached.content }

  const userContext = await fetchUserContext(90)
  const systemPrompt = buildSystemPrompt(userContext, meta)
  const prompt = type === 'daily' ? dailyReviewPrompt() : weeklyReviewPrompt()

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Insight generation timed out')), 30_000)
  )

  const { text } = await Promise.race([
    generateText({
      model: google('gemini-2.5-flash'),
      system: systemPrompt,
      prompt,
    }),
    timeoutPromise,
  ])

  await supabase
    .from('ai_insights')
    .upsert({ date: today, type, content: text }, { onConflict: 'date,type', ignoreDuplicates: false })

  return { content: text }
}
