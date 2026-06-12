'use client'

import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { HugeiconsIcon } from '@hugeicons/react'
import { SentIcon } from '@hugeicons/core-free-icons'

interface ChatInputProps {
  input: string
  isLoading: boolean
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
}

export function ChatInput({ input, isLoading, onInputChange, onSubmit }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!input.trim() || isLoading) return
      const form = e.currentTarget.closest('form')
      form?.requestSubmit()
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex items-end gap-2 border-t border-border/50 bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
    >
      <Textarea
        ref={textareaRef}
        value={input}
        onChange={onInputChange}
        onKeyDown={handleKeyDown}
        placeholder="Ask Forge anything…"
        disabled={isLoading}
        rows={1}
        className="max-h-32 min-h-[44px] flex-1 resize-none text-sm"
      />
      <Button
        type="submit"
        disabled={!input.trim() || isLoading}
        size="icon"
        className="h-11 w-11 shrink-0"
      >
        <HugeiconsIcon icon={SentIcon} size={18} />
      </Button>
    </form>
  )
}
