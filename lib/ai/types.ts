export interface Thread {
  id: string
  title: string
  created_at: string
  updated_at: string
}

export interface ThreadMessage {
  id: string
  thread_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export type InsightType = 'daily' | 'weekly'
