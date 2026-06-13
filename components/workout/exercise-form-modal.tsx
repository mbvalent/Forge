'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getExerciseTips, displayExerciseName } from '@/lib/workout/exercise-tips'

interface ExerciseFormModalProps {
  exerciseName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ExerciseFormModal({ exerciseName, open, onOpenChange }: ExerciseFormModalProps) {
  const tips = getExerciseTips(exerciseName)
  const name = displayExerciseName(exerciseName)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg">{name}</DialogTitle>
          {tips && (
            <p className="text-xs text-primary font-medium">{tips.targetMuscle}</p>
          )}
        </DialogHeader>

        {!tips ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No form notes available for this exercise.
          </p>
        ) : (
          <div className="space-y-5 pt-1">
            <Section title="Form Cues">
              {tips.cues.map((cue, i) => (
                <CueItem key={i} text={cue} />
              ))}
            </Section>

            {tips.mistakes && tips.mistakes.length > 0 && (
              <Section title="Common Mistakes">
                {tips.mistakes.map((m, i) => (
                  <MistakeItem key={i} text={m} />
                ))}
              </Section>
            )}

            {tips.tip && (
              <div className="rounded-lg bg-primary/10 border border-primary/20 p-3">
                <p className="text-xs font-semibold text-primary mb-1">Key Insight</p>
                <p className="text-sm text-foreground/90">{tips.tip}</p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</h3>
      <ul className="space-y-2">{children}</ul>
    </div>
  )
}

function CueItem({ text }: { text: string }) {
  return (
    <li className="flex gap-2.5 text-sm">
      <span className="mt-0.5 shrink-0 h-4 w-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">✓</span>
      <span>{text}</span>
    </li>
  )
}

function MistakeItem({ text }: { text: string }) {
  return (
    <li className="flex gap-2.5 text-sm text-muted-foreground">
      <span className="mt-0.5 shrink-0 text-destructive/70 text-xs leading-4">✗</span>
      <span>{text}</span>
    </li>
  )
}
