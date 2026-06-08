'use client'

import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { searchFoods } from '@/lib/actions/diet'
import { cn } from '@/lib/utils'

export interface FoodResult {
  id: string
  name: string
  calories_100g: number
  protein_100g: number
  carbs_100g: number
  fat_100g: number
}

interface FoodSearchProps {
  onSelect: (food: FoodResult) => void
  onCreateNew: (name: string) => void
  onCancel: () => void
}

export function FoodSearch({ onSelect, onCreateNew, onCancel }: FoodSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FoodResult[]>([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!query.trim()) {
      setResults([])
      setLoading(false)
      return
    }

    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      const { foods } = await searchFoods(query)
      setResults(foods as FoodResult[])
      setLoading(false)
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  const showCreate = query.trim().length >= 2 && !loading && results.length === 0

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search food..."
          className="flex-1"
        />
        <Button variant="ghost" size="icon" onClick={onCancel} aria-label="Cancel search">
          ✕
        </Button>
      </div>

      {loading && (
        <p className="px-1 text-xs text-muted-foreground">Searching...</p>
      )}

      {results.length > 0 && (
        <ul className="max-h-48 overflow-y-auto rounded-xl bg-muted/40 ring-1 ring-border">
          {results.map((food) => (
            <li key={food.id}>
              <button
                className={cn(
                  'flex w-full items-center justify-between px-3 py-2.5 text-left transition-colors',
                  'hover:bg-muted/60 active:bg-muted/80 min-h-[44px]'
                )}
                onClick={() => onSelect(food)}
              >
                <span className="text-sm font-medium">{food.name}</span>
                <span className="text-xs text-muted-foreground">
                  {Math.round(food.calories_100g)} kcal/100g
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {showCreate && (
        <button
          className={cn(
            'flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm',
            'bg-muted/30 text-primary ring-1 ring-primary/30 hover:bg-muted/50 min-h-[44px]'
          )}
          onClick={() => onCreateNew(query.trim())}
        >
          <span className="text-base leading-none">+</span>
          <span>Create &ldquo;{query.trim()}&rdquo;</span>
        </button>
      )}
    </div>
  )
}
