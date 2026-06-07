'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { FoodResult } from './food-search'

interface AddFoodFormProps {
  food: FoodResult
  onConfirm: (quantityG: number) => void
  onBack: () => void
  isPending?: boolean
}

export function AddFoodForm({ food, onConfirm, onBack, isPending = false }: AddFoodFormProps) {
  const [value, setValue] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const quantity = parseFloat(value)
  const isValid = !isNaN(quantity) && quantity >= 1 && quantity <= 5000

  const macros = isValid
    ? {
        cal: Math.round((quantity / 100) * food.calories_100g),
        p: Math.round((quantity / 100) * food.protein_100g * 10) / 10,
      }
    : null

  function handleConfirm() {
    if (!isValid || submitted) return
    setSubmitted(true)
    onConfirm(quantity)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium truncate pr-2">{food.name}</p>
        <Button variant="ghost" size="icon-xs" onClick={onBack} aria-label="Back to search">
          ←
        </Button>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type="number"
            inputMode="decimal"
            step="any"
            min={1}
            max={5000}
            value={value}
            onChange={(e) => { setValue(e.target.value); setSubmitted(false) }}
            onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
            placeholder="grams"
            autoFocus
            className="pr-10"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            g
          </span>
        </div>
        <Button
          onClick={handleConfirm}
          disabled={!isValid || submitted || isPending}
          className="min-h-[44px]"
        >
          Add
        </Button>
      </div>

      {macros && (
        <p className="text-xs text-muted-foreground">
          ≈ {macros.cal} kcal · {macros.p}g protein
        </p>
      )}
    </div>
  )
}
