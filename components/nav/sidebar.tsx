'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Home01Icon,
  Restaurant01Icon,
  Dumbbell01Icon,
  ChatBotIcon,
  More01Icon,
} from '@hugeicons/core-free-icons'
import { cn } from '@/lib/utils'

const tabs = [
  { href: '/', label: 'Today', icon: Home01Icon },
  { href: '/diet', label: 'Diet', icon: Restaurant01Icon },
  { href: '/workout', label: 'Workout', icon: Dumbbell01Icon },
  { href: '/chat', label: 'Chat', icon: ChatBotIcon },
  { href: '/more', label: 'More', icon: More01Icon },
]

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        'flex w-56 shrink-0 flex-col border-r border-border bg-background pt-6',
        className,
      )}
    >
      <div className="px-4 pb-6">
        <span className="font-heading text-xl font-bold tracking-tight text-foreground">
          Forge
        </span>
      </div>
      <nav className="flex flex-col gap-1 px-2">
        {tabs.map(({ href, label, icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors min-h-[44px]',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              <HugeiconsIcon
                icon={icon}
                size={20}
                strokeWidth={active ? 2 : 1.5}
              />
              {label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
