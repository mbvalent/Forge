'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { createThread } from '@/lib/actions/chat'
import { HugeiconsIcon } from '@hugeicons/react'
import { PencilEdit01Icon } from '@hugeicons/core-free-icons'
import type { Thread } from '@/lib/ai/types'
import { cn } from '@/lib/utils'

interface ThreadListProps {
  threads: Thread[]
  activeThreadId: string | null
}

export function ThreadList({ threads, activeThreadId }: ThreadListProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleNewThread() {
    startTransition(async () => {
      const thread = await createThread()
      router.push(`/chat?thread=${thread.id}`)
    })
  }

  function handleSelect(threadId: string) {
    router.push(`/chat?thread=${threadId}`)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between p-3 pb-2">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Threads
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleNewThread}
          disabled={isPending}
          className="h-7 w-7"
          title="New conversation"
        >
          <HugeiconsIcon icon={PencilEdit01Icon} size={15} />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {threads.length === 0 ? (
          <p className="px-2 py-4 text-center text-xs text-muted-foreground">No conversations yet</p>
        ) : (
          threads.map((thread) => (
            <button
              key={thread.id}
              onClick={() => handleSelect(thread.id)}
              className={cn(
                'w-full rounded-lg px-3 py-2 text-left text-sm transition-colors',
                thread.id === activeThreadId
                  ? 'bg-primary/15 text-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <span className="line-clamp-2 leading-snug">{thread.title}</span>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
