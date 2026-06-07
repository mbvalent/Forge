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

export function BottomNav({ className }: { className?: string }) {
  const pathname = usePathname()

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 flex h-16 border-t border-border/30 bg-background/70 backdrop-blur-xl',
        className,
      )}
    >
      {tabs.map(({ href, label, icon }) => {
        const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-1 min-h-[44px] text-xs transition-colors',
              active ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            <HugeiconsIcon
              icon={icon}
              size={22}
              strokeWidth={active ? 2 : 1.5}
            />
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
