CREATE TABLE supplement_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  supplement text NOT NULL,
  taken_at timestamptz DEFAULT now(),
  UNIQUE(date, supplement)
);
