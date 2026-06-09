'use client'

import { startTransition, useOptimistic, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { logMealItem, deleteMealItem, updateMealItem } from '@/lib/actions/diet'
import { computeItemMacros, sumMacros } from '@/lib/diet/compute'
import type { MealItemData } from '@/lib/diet/types'
import { FoodSearch, type FoodResult } from './food-search'
import { AddFoodForm } from './add-food-form'
import { EditItemForm } from './edit-item-form'
import { CustomFoodForm } from './custom-food-form'
import { cn } from '@/lib/utils'

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  snack: 'Snack',
  dinner: 'Dinner',
  prebed: 'Pre-bed',
}

type AddStep = 'idle' | 'searching' | 'grams' | 'creating'

type ItemAction =
  | { type: 'add'; item: MealItemData }
  | { type: 'delete'; id: string }
  | { type: 'update'; id: string; quantity_g: number }

interface MealCardProps {
  mealType: string
  items: MealItemData[]
  date: string
}

export function MealCard({ mealType, items: serverItems, date }: MealCardProps) {
  const readonly = date < format(new Date(), 'yyyy-MM-dd')
  const [optimisticItems, dispatchOptimistic] = useOptimistic<MealItemData[], ItemAction>(
    serverItems,
    (state, action) => {
      switch (action.type) {
        case 'add':
          return [...state, action.item]
        case 'delete':
          return state.filter((i) => i.id !== action.id)
        case 'update':
          return state.map((i) =>
            i.id === action.id ? { ...i, quantity_g: action.quantity_g } : i
          )
      }
    }
  )

  const router = useRouter()

  const [addStep, setAddStep] = useState<AddStep>('idle')
  const [selectedFood, setSelectedFood] = useState<FoodResult | null>(null)
  const [createName, setCreateName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  const mealTotal = sumMacros(optimisticItems)
  const hasItems = optimisticItems.length > 0

  async function handleAddConfirm(quantityG: number) {
    if (!selectedFood) return

    const tempItem: MealItemData = {
      id: `optimistic-${Date.now()}`,
      quantity_g: quantityG,
      food: selectedFood,
    }

    setAddStep('idle')
    setSelectedFood(null)

    startTransition(async () => {
      dispatchOptimistic({ type: 'add', item: tempItem })
      const result = await logMealItem(date, mealType, selectedFood.id, quantityG)
      if (!result.success) {
        toast.error('Failed to log — try again')
      } else {
        router.refresh()
      }
    })
  }

  async function handleDelete(id: string) {
    setEditingId(null)
    startTransition(async () => {
      dispatchOptimistic({ type: 'delete', id })
      const result = await deleteMealItem(id)
      if (!result.success) {
        toast.error('Failed to delete — try again')
      } else {
        router.refresh()
      }
    })
  }

  async function handleUpdate(id: string, quantityG: number) {
    setEditingId(null)
    startTransition(async () => {
      dispatchOptimistic({ type: 'update', id, quantity_g: quantityG })
      const result = await updateMealItem(id, quantityG)
      if (!result.success) {
        toast.error('Failed to update — try again')
      } else {
        router.refresh()
      }
    })
  }

  function handleFoodCreated(food: FoodResult) {
    setSelectedFood(food)
    setAddStep('grams')
  }

  return (
    <Card size="sm" className="overflow-hidden">
      <CardHeader className="border-b border-border/20 pb-3">
        <CardTitle className="text-sm">{MEAL_LABELS[mealType] ?? mealType}</CardTitle>
        {hasItems && (
          <CardAction>
            <span className="text-xs text-muted-foreground tabular-nums">
              {Math.round(mealTotal.calories)} kcal · {Math.round(mealTotal.protein)}g P
            </span>
          </CardAction>
        )}
      </CardHeader>

      <CardContent className="space-y-0 pt-1">
        {optimisticItems.map((item, i) => {
          const m = computeItemMacros(item)
          const isEditing = editingId === item.id
          const isPending = item.id.startsWith('optimistic-')

          return (
            <div key={item.id}>
              {i > 0 && <Separator className="opacity-20" />}
              <button
                className={cn(
                  'flex w-full items-center justify-between py-2.5 text-left transition-colors min-h-[44px]',
                  !readonly && 'hover:bg-muted/20 active:bg-muted/30',
                  isPending && 'opacity-60'
                )}
                onClick={() => {
                  if (readonly || isPending) return
                  setEditingId(isEditing ? null : item.id)
                  setAddStep('idle')
                }}
                disabled={readonly || isPending}
              >
                <span className="text-sm">{item.food.name}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {item.quantity_g}g · {Math.round(m.calories)} kcal
                </span>
              </button>

              {isEditing && !readonly && (
                <EditItemForm
                  item={item}
                  onSave={(g) => handleUpdate(item.id, g)}
                  onDelete={() => handleDelete(item.id)}
                  onCancel={() => setEditingId(null)}
                />
              )}
            </div>
          )
        })}

        {!readonly && (
          <div className={cn('pt-1', hasItems && 'mt-1 border-t border-border/20')}>
            {addStep === 'idle' && (
              <button
                className="flex w-full items-center gap-2 py-2 text-sm text-primary hover:text-primary/80 min-h-[44px]"
                onClick={() => { setAddStep('searching'); setEditingId(null) }}
              >
                <span className="text-base leading-none">+</span>
                <span>Add food</span>
              </button>
            )}

            {addStep === 'searching' && (
              <div className="py-2">
                <FoodSearch
                  onSelect={(food) => { setSelectedFood(food); setAddStep('grams') }}
                  onCreateNew={(name) => { setCreateName(name); setAddStep('creating') }}
                  onCancel={() => setAddStep('idle')}
                />
              </div>
            )}

            {addStep === 'grams' && selectedFood && (
              <div className="py-2">
                <AddFoodForm
                  food={selectedFood}
                  onConfirm={handleAddConfirm}
                  onBack={() => setAddStep('searching')}
                />
              </div>
            )}

            {addStep === 'creating' && (
              <div className="py-2">
                <CustomFoodForm
                  initialName={createName}
                  onSuccess={handleFoodCreated}
                  onCancel={() => setAddStep('searching')}
                />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
