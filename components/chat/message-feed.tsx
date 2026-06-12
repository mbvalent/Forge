'use client'

import { useEffect, useRef } from 'react'
import type { UIMessage } from 'ai'
import { MessageBubble } from './message-bubble'

interface MessageFeedProps {
  messages: UIMessage[]
  isLoading: boolean
}

export function MessageFeed({ messages, isLoading }: MessageFeedProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Ask anything about your training, diet, or recovery.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      {isLoading && (
        <div className="flex justify-start">
          <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-3 text-sm text-muted-foreground">
            <span className="animate-pulse">Thinking…</span>
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  )
}
