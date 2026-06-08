-- 1. UNIQUE date constraint: required for upsert onConflict and maybeSingle() correctness
ALTER TABLE workouts ADD CONSTRAINT workouts_date_unique UNIQUE (date);

-- 2. Prevent duplicate set numbers (client-side compute is fragile without this)
ALTER TABLE workout_sets
  ADD CONSTRAINT workout_sets_set_number_unique
  UNIQUE (workout_id, exercise_id, set_number);

-- 3. Protect exercises from deletion while sets reference them
ALTER TABLE workout_sets
  DROP CONSTRAINT IF EXISTS workout_sets_exercise_id_fkey,
  ADD CONSTRAINT workout_sets_exercise_id_fkey
    FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE RESTRICT;

-- 4. Indexes for workout queries
CREATE INDEX workout_sets_workout_id_idx       ON workout_sets(workout_id);
CREATE INDEX workout_sets_exercise_id_idx      ON workout_sets(exercise_id);
CREATE INDEX workout_sets_exercise_workout_idx ON workout_sets(exercise_id, workout_id);
CREATE INDEX workouts_date_idx                 ON workouts(date);
CREATE INDEX wde_workout_day_id_idx            ON workout_day_exercises(workout_day_id);

-- 5. Indexes for diet queries (missing from Phase 1)
CREATE INDEX meals_date_idx         ON meals(date);
CREATE INDEX meal_items_meal_id_idx ON meal_items(meal_id);

-- 6. RPC: get last session sets for an exercise before a given date
--    Collapses the two-step query into one round trip per exercise.
CREATE OR REPLACE FUNCTION get_last_session_sets(
  p_exercise_id uuid,
  p_before date
)
RETURNS TABLE(set_number int, weight_kg numeric, reps int, rir int, workout_date date) AS $$
  SELECT ws.set_number, ws.weight_kg, ws.reps, ws.rir, w.date AS workout_date
  FROM workout_sets ws
  JOIN workouts w ON w.id = ws.workout_id
  WHERE ws.exercise_id = p_exercise_id
    AND w.date < p_before
  ORDER BY w.date DESC, ws.set_number
  LIMIT 10
$$ LANGUAGE sql STABLE;
