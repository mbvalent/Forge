import { streamText, convertToModelMessages } from 'ai'
import { google } from '@ai-sdk/google'
import { fetchUserContext } from '@/lib/ai/context'
import { buildSystemPrompt } from '@/lib/ai/prompts'
import { createServiceClient } from '@/lib/supabase'
import type { UIMessage, TextUIPart } from 'ai'

function getTextContent(message: UIMessage): string {
  return message.parts
    .filter((p): p is TextUIPart => p.type === 'text')
    .map((p) => p.text)
    .join('')
}

export async function POST(req: Request) {
  const body = await req.json() as {
    id: string
    messages: UIMessage[]
  }

  const { id: threadId, messages } = body

  if (!threadId) {
    return new Response('Thread ID is required', { status: 400 })
  }

  const modelMessages = await convertToModelMessages(messages)
  const userContext = await fetchUserContext(90)
  const systemPrompt = buildSystemPrompt(userContext)

  const result = streamText({
    model: google('gemini-2.5-flash'),
    system: systemPrompt,
    messages: modelMessages,
    onFinish: async ({ text }) => {
      try {
        const supabase = createServiceClient()
        const lastUserMessage = messages[messages.length - 1]
        const userText = lastUserMessage ? getTextContent(lastUserMessage) : ''

        await supabase.from('ai_messages').insert([
          { thread_id: threadId, role: 'user', content: userText },
          { thread_id: threadId, role: 'assistant', content: text },
        ])

        const isFirstMessage = messages.length === 1
        await supabase.from('ai_threads').update({
          ...(isFirstMessage && userText
            ? { title: userText.slice(0, 60).trimEnd() }
            : {}),
          updated_at: new Date().toISOString(),
        }).eq('id', threadId)
      } catch (err) {
        console.error('[chat/onFinish] Failed to persist messages:', err)
      }
    },
  })

  return result.toUIMessageStreamResponse()
}
