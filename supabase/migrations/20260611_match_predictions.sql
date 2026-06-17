-- ============================================================
-- WikiBet: match_predictions table
-- Run this in the Supabase SQL Editor (supabase.com → SQL Editor)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.match_predictions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id      text UNIQUE NOT NULL,          -- ESPN/static match ID
  competition   text NOT NULL DEFAULT '',       -- e.g. 'FIFA.WORLD'
  home_team     text NOT NULL,
  away_team     text NOT NULL,
  match_date    timestamptz,
  predicted_outcome text,                       -- 'local' | 'empate' | 'visitante'
  actual_outcome    text,                       -- filled when match ends
  home_score    integer,
  away_score    integer,
  is_correct    boolean,                        -- predicted_outcome === actual_outcome
  created_at    timestamptz DEFAULT now()
);

-- RLS: public read, public write (stats are public, not sensitive)
ALTER TABLE public.match_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "match_predictions_select" ON public.match_predictions
  FOR SELECT USING (true);

CREATE POLICY "match_predictions_insert" ON public.match_predictions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "match_predictions_update" ON public.match_predictions
  FOR UPDATE USING (true) WITH CHECK (true);

-- Index for fast stats queries
CREATE INDEX IF NOT EXISTS idx_match_predictions_is_correct
  ON public.match_predictions (is_correct)
  WHERE actual_outcome IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_match_predictions_competition
  ON public.match_predictions (competition);
