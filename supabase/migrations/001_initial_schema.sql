-- Workout tracking
CREATE TABLE exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  muscle_group text,
  default_rep_min int,
  default_rep_max int,
  default_rest_sec int DEFAULT 90,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE workout_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_number int NOT NULL UNIQUE,
  label text NOT NULL
);

CREATE TABLE workout_day_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_day_id uuid NOT NULL REFERENCES workout_days(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  position int NOT NULL,
  target_sets int NOT NULL,
  target_rir text
);

CREATE TABLE workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  workout_day_id uuid REFERENCES workout_days(id),
  notes text,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE workout_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id uuid NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES exercises(id),
  set_number int NOT NULL,
  weight_kg numeric NOT NULL,
  reps int NOT NULL,
  rir int,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Diet tracking
CREATE TABLE foods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  calories_100g numeric NOT NULL,
  protein_100g numeric NOT NULL,
  carbs_100g numeric NOT NULL,
  fat_100g numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  meal_type text NOT NULL,
  logged_at timestamptz DEFAULT now(),
  UNIQUE(date, meal_type)
);

CREATE TABLE meal_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id uuid NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  food_id uuid NOT NULL REFERENCES foods(id),
  quantity_g numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Lifestyle tracking (unique date per table — always upsert, never insert)
CREATE TABLE weight_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  weight_kg numeric NOT NULL,
  waist_cm numeric,
  bf_pct numeric
);

CREATE TABLE sleep_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  hours numeric NOT NULL,
  quality int CHECK (quality BETWEEN 1 AND 5)
);

CREATE TABLE smoking_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  count int NOT NULL
);

CREATE TABLE mood_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  mood int NOT NULL CHECK (mood BETWEEN 1 AND 5),
  stress int NOT NULL CHECK (stress BETWEEN 1 AND 5),
  notes text
);

CREATE TABLE progress_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  type text NOT NULL CHECK (type IN ('front', 'side', 'back')),
  storage_path text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- AI
CREATE TABLE ai_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES ai_threads(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE ai_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  type text NOT NULL CHECK (type IN ('daily', 'weekly')),
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(date, type)
);
