'use client'

import { useEffect, useState, useTransition } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { buttonVariants } from '@/components/ui/button'
import { searchExercises } from '@/lib/actions/workout'

interface ExerciseResult {
  id: string
  name: string
  muscle_group: string | null
  default_rest_sec: number
}

interface ExerciseSearchProps {
  onSelect: (exercise: ExerciseResult) => void
  disabled?: boolean
}

export function ExerciseSearch({ onSelect, disabled }: ExerciseSearchProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ExerciseResult[]>([])
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }
    const t = setTimeout(() => {
      startTransition(async () => {
        const { exercises } = await searchExercises(query)
        setResults(exercises as ExerciseResult[])
      })
    }, 300)
    return () => clearTimeout(t)
  }, [query])

  function handleSelect(exercise: ExerciseResult) {
    setOpen(false)
    setQuery('')
    setResults([])
    onSelect(exercise)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={buttonVariants({ variant: 'outline', className: 'w-full min-h-[44px]' })} disabled={disabled}>
        + Add exercise
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start">
        <Command>
          <CommandInput
            placeholder="Search exercises..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {!isPending && query.trim() && results.length === 0 && (
              <CommandEmpty>No exercises found.</CommandEmpty>
            )}
            {results.length > 0 && (
              <CommandGroup>
                {results.map((ex) => (
                  <CommandItem
                    key={ex.id}
                    value={ex.name}
                    onSelect={() => handleSelect(ex)}
                    className="min-h-[44px]"
                  >
                    <span>{ex.name}</span>
                    {ex.muscle_group && (
                      <span className="ml-auto text-xs text-muted-foreground">
                        {ex.muscle_group}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
