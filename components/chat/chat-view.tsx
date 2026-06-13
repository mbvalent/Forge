'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createThread } from '@/lib/actions/chat'
import { ThreadList } from './thread-list'
import { MessageFeed } from './message-feed'
import { ChatInput } from './chat-input'
import type { Thread, ThreadMessage } from '@/lib/ai/types'
import type { UIMessage } from 'ai'

interface ChatViewProps {
  threads: Thread[]
  activeThreadId: string | null
  initialMessages: ThreadMessage[]
}

function dbMessagesToUI(messages: ThreadMessage[]): UIMessage[] {
  return messages.map((m) => ({
    id: m.id,
    role: m.role as 'user' | 'assistant',
    parts: [{ type: 'text' as const, text: m.content }],
  }))
}

interface ThreadChatProps {
  threadId: string
  initialMessages: UIMessage[]
}

function ThreadChat({ threadId, initialMessages }: ThreadChatProps) {
  const [input, setInput] = useState('')
  const locationRef = useRef<string | null>(null)

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`
        )
        const data = await res.json()
        const city = data.address?.city ?? data.address?.town ?? data.address?.village
        const country = data.address?.country
        locationRef.current = [city, country].filter(Boolean).join(', ') || null
      } catch {
        // location stays null; AI will just lack location context
      }
    }, () => {})
  }, [])

  const { messages, sendMessage, status } = useChat({
    id: threadId,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: () => ({
        clientDate: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        ...(locationRef.current ? { location: locationRef.current } : {}),
      }),
    }),
  })

  const isLoading = status === 'submitted' || status === 'streaming'

  function handleSend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const text = input.trim()
    if (!text || isLoading) return
    sendMessage({ text })
    setInput('')
  }

  return (
    <>
      <MessageFeed messages={messages} isLoading={isLoading} />
      <ChatInput
        input={input}
        isLoading={isLoading}
        onInputChange={(e) => setInput(e.target.value)}
        onSubmit={handleSend}
      />
    </>
  )
}

export function ChatView({ threads, activeThreadId, initialMessages }: ChatViewProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const aiInitialMessages = dbMessagesToUI(initialMessages)

  function handleNewThread() {
    startTransition(async () => {
      const thread = await createThread()
      router.push(`/chat?thread=${thread.id}`)
    })
  }

  function handleThreadSelect(threadId: string | null) {
    if (!threadId) return
    router.push(`/chat?thread=${threadId}`)
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar — desktop only */}
      <aside className="hidden w-56 shrink-0 border-r border-border/50 md:flex md:flex-col">
        <ThreadList threads={threads} activeThreadId={activeThreadId} />
      </aside>

      {/* Main chat area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile thread picker */}
        <div className="flex items-center gap-2 border-b border-border/50 p-3 md:hidden">
          <Select
            value={activeThreadId ?? ''}
            onValueChange={handleThreadSelect}
          >
            <SelectTrigger className="h-9 flex-1 text-sm">
              <SelectValue placeholder="Select thread…" />
            </SelectTrigger>
            <SelectContent>
              {threads.map((t) => (
                <SelectItem key={t.id} value={t.id} className="text-sm">
                  <span className="line-clamp-1">{t.title}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNewThread}
            disabled={isPending}
            className="h-9 shrink-0 text-xs"
          >
            New
          </Button>
        </div>

        {activeThreadId ? (
          <ThreadChat
            key={activeThreadId}
            threadId={activeThreadId}
            initialMessages={aiInitialMessages}
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="space-y-2">
              <p className="font-heading text-lg font-semibold">Ask your AI coach</p>
              <p className="text-sm text-muted-foreground">
                Forge knows your workouts, diet, weight, sleep, and more.
              </p>
            </div>
            <Button onClick={handleNewThread} disabled={isPending}>
              Start a conversation
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
