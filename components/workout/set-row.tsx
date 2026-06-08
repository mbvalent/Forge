'use client'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { WorkoutSet } from '@/lib/workout/types'
import { cn } from '@/lib/utils'

interface SetRowProps {
  set: WorkoutSet
  index: number
  readonly?: boolean
  onDelete: (id: string) => void
  onEdit: (set: WorkoutSet) => void
}

export function SetRow({ set, index, readonly = false, onDelete, onEdit }: SetRowProps) {
  const isPending = set.id.startsWith('optimistic-')

  const content = (
    <div
      className={cn(
        'flex items-center justify-between py-2.5 min-h-[44px] w-full text-left',
        isPending && 'opacity-60'
      )}
    >
      <span className="text-xs text-muted-foreground w-6 tabular-nums">{index + 1}</span>
      <span className="flex-1 text-sm tabular-nums">
        {set.weight_kg}kg × {set.reps}
      </span>
      {set.rir !== null && (
        <span className="text-xs text-muted-foreground">RIR {set.rir}</span>
      )}
    </div>
  )

  if (readonly || isPending) return content

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full hover:bg-muted/20 active:bg-muted/30 rounded transition-colors text-left">
        {content}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEdit(set)}>Edit</DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => onDelete(set.id)}
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
