-- Store per-session exercise display order (as array of exercise IDs)
ALTER TABLE workouts ADD COLUMN exercise_order jsonb;
