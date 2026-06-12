'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { generateInsight } from '@/lib/actions/chat'
import type { InsightType } from '@/lib/ai/types'

interface InsightPanelProps {
  date: string
}

type State = { status: 'idle' } | { status: 'loading'; type: InsightType } | { status: 'done'; type: InsightType; content: string }

export function InsightPanel({ date }: InsightPanelProps) {
  const [state, setState] = useState<State>({ status: 'idle' })
  const [open, setOpen] = useState(false)

  async function handleInsight(type: InsightType) {
    setState({ status: 'loading', type })
    setOpen(true)
    try {
      const { content } = await generateInsight(type)
      setState({ status: 'done', type, content })
    } catch {
      setState({ status: 'idle' })
      setOpen(false)
    }
  }

  const title = state.status !== 'idle'
    ? (state.type === 'daily' ? 'Daily Review' : 'Weekly Review')
    : ''

  return (
    <>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleInsight('daily')}
          disabled={state.status === 'loading'}
          className="flex-1 text-xs"
        >
          Daily Review
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleInsight('weekly')}
          disabled={state.status === 'loading'}
          className="flex-1 text-xs"
        >
          Weekly Review
        </Button>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[80dvh] overflow-y-auto rounded-t-2xl">
          <SheetHeader>
            <SheetTitle className="font-heading">{title}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 text-sm">
            {state.status === 'loading' && (
              <p className="animate-pulse text-muted-foreground">Generating review…</p>
            )}
            {state.status === 'done' && (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
                  ul: ({ children }) => <ul className="mb-3 list-disc pl-4 space-y-1 last:mb-0">{children}</ul>,
                  ol: ({ children }) => <ol className="mb-3 list-decimal pl-4 space-y-1 last:mb-0">{children}</ol>,
                  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                  strong: ({ children }) => <strong className="font-semibold text-primary">{children}</strong>,
                }}
              >
                {state.content}
              </ReactMarkdown>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
