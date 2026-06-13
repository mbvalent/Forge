-- Add persistent reminder notes to exercises
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS notes text;

-- Per-session per-exercise notes (specific to a workout day)
CREATE TABLE IF NOT EXISTS workout_exercise_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id uuid NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  notes text NOT NULL DEFAULT '',
  updated_at timestamptz DEFAULT now(),
  UNIQUE(workout_id, exercise_id)
);
