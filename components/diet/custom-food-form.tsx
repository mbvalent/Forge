'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { createFood } from '@/lib/actions/diet'
import type { FoodResult } from './food-search'

interface CustomFoodFormProps {
  initialName?: string
  onSuccess: (food: FoodResult) => void
  onCancel: () => void
}

export function CustomFoodForm({ initialName = '', onSuccess, onCancel }: CustomFoodFormProps) {
  const [name, setName] = useState(initialName)
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const isValid =
    name.trim().length >= 2 &&
    isNumericField(calories) &&
    isNumericField(protein) &&
    isNumericField(carbs) &&
    isNumericField(fat)

  function isNumericField(v: string) {
    const n = parseFloat(v)
    return !isNaN(n) && n >= 0
  }

  async function handleSubmit() {
    if (!isValid || saving) return
    setSaving(true)
    setError('')

    const result = await createFood(
      name.trim(),
      parseFloat(calories),
      parseFloat(protein),
      parseFloat(carbs),
      parseFloat(fat)
    )

    if (!result.success) {
      setError(result.error ?? 'Failed to create food')
      setSaving(false)
      return
    }

    onSuccess(result.food as FoodResult)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Create food</p>
        <Button variant="ghost" size="icon-xs" onClick={onCancel} aria-label="Cancel">
          ✕
        </Button>
      </div>

      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Food name"
        autoFocus={!initialName}
      />

      <p className="text-xs text-muted-foreground">Per 100g:</p>
      <div className="grid grid-cols-2 gap-2">
        <MacroInput label="Calories (kcal)" value={calories} onChange={setCalories} />
        <MacroInput label="Protein (g)" value={protein} onChange={setProtein} />
        <MacroInput label="Carbs (g)" value={carbs} onChange={setCarbs} />
        <MacroInput label="Fat (g)" value={fat} onChange={setFat} />
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button
          className="flex-1 min-h-[44px]"
          onClick={handleSubmit}
          disabled={!isValid || saving}
        >
          {saving ? 'Saving...' : 'Save food'}
        </Button>
        <Button variant="ghost" className="min-h-[44px]" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

function MacroInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <Input
        type="number"
        inputMode="decimal"
        step="any"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
      />
    </div>
  )
}
