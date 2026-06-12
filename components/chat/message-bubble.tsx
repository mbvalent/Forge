'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { UIMessage, TextUIPart } from 'ai'

interface MessageBubbleProps {
  message: UIMessage
}

function getTextContent(message: UIMessage): string {
  return message.parts
    .filter((p): p is TextUIPart => p.type === 'text')
    .map((p) => p.text)
    .join('')
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const text = getTextContent(message)

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-primary/15 px-4 py-3 text-sm text-foreground">
          {text}
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[90%] rounded-2xl rounded-tl-sm bg-muted px-4 py-3 text-sm text-foreground">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
            ul: ({ children }) => <ul className="mb-2 list-disc pl-4 last:mb-0">{children}</ul>,
            ol: ({ children }) => <ol className="mb-2 list-decimal pl-4 last:mb-0">{children}</ol>,
            li: ({ children }) => <li className="mb-1">{children}</li>,
            strong: ({ children }) => <strong className="font-semibold text-primary">{children}</strong>,
            table: ({ children }) => (
              <div className="mb-2 overflow-x-auto">
                <table className="w-full border-collapse text-xs">{children}</table>
              </div>
            ),
            th: ({ children }) => (
              <th className="border border-border/50 bg-muted-foreground/10 px-2 py-1 text-left font-medium">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="border border-border/50 px-2 py-1">{children}</td>
            ),
            code: ({ children, className }) => {
              const isBlock = className?.includes('language-')
              if (isBlock) {
                return (
                  <pre className="mb-2 overflow-x-auto rounded bg-background/50 p-3 text-xs">
                    <code>{children}</code>
                  </pre>
                )
              }
              return (
                <code className="rounded bg-background/50 px-1 py-0.5 text-xs font-mono">
                  {children}
                </code>
              )
            },
          }}
        >
          {text}
        </ReactMarkdown>
      </div>
    </div>
  )
}
