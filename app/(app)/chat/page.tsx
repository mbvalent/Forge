import { getThreads, getMessages } from '@/lib/actions/chat'
import { ChatView } from '@/components/chat/chat-view'

interface ChatPageProps {
  searchParams: Promise<{ thread?: string }>
}

export default async function ChatPage({ searchParams }: ChatPageProps) {
  const { thread: threadParam } = await searchParams

  const threads = await getThreads()

  const activeThreadId = threads.some((t) => t.id === threadParam)
    ? threadParam!
    : (threads[0]?.id ?? null)

  const messages = activeThreadId ? await getMessages(activeThreadId) : []

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border/50 px-4 py-3 md:hidden">
        <h1 className="font-heading text-2xl font-bold">Chat</h1>
      </div>
      <div className="min-h-0 flex-1">
        <ChatView
          threads={threads}
          activeThreadId={activeThreadId}
          initialMessages={messages}
        />
      </div>
    </div>
  )
}
