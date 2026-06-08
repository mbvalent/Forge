'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { MealItemData } from '@/lib/diet/types'

interface EditItemFormProps {
  item: MealItemData
  onSave: (quantityG: number) => void
  onDelete: () => void
  onCancel: () => void
}

export function EditItemForm({ item, onSave, onDelete, onCancel }: EditItemFormProps) {
  const [value, setValue] = useState(String(item.quantity_g))
  const [saving, setSaving] = useState(false)

  const quantity = parseFloat(value)
  const isValid = !isNaN(quantity) && quantity >= 1 && quantity <= 5000

  function handleSave() {
    if (!isValid || saving) return
    setSaving(true)
    onSave(quantity)
  }

  return (
    <div className="mt-2 flex items-center gap-2 border-t border-border/30 pt-2">
      <div className="relative flex-1">
        <Input
          type="number"
          inputMode="decimal"
          step="any"
          min={1}
          max={5000}
          value={value}
          onChange={(e) => { setValue(e.target.value); setSaving(false) }}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          autoFocus
          className="pr-8"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          g
        </span>
      </div>
      <Button
        size="sm"
        onClick={handleSave}
        disabled={!isValid || saving}
        className="min-h-[44px]"
      >
        Save
      </Button>
      <Button
        size="icon"
        variant="destructive"
        onClick={onDelete}
        aria-label="Delete item"
        className="min-h-[44px]"
      >
        ✕
      </Button>
      <Button
        size="icon"
        variant="ghost"
        onClick={onCancel}
        aria-label="Cancel edit"
        className="min-h-[44px]"
      >
        ↩
      </Button>
    </div>
  )
}
