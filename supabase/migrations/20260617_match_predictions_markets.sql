-- Add market prediction columns to match_predictions
-- Run this in Supabase SQL Editor

ALTER TABLE public.match_predictions
  ADD COLUMN IF NOT EXISTS pred_over15     boolean,
  ADD COLUMN IF NOT EXISTS pred_over25     boolean,
  ADD COLUMN IF NOT EXISTS pred_btts       boolean,
  ADD COLUMN IF NOT EXISTS actual_total_goals integer,
  ADD COLUMN IF NOT EXISTS correct_over15  boolean,
  ADD COLUMN IF NOT EXISTS correct_over25  boolean,
  ADD COLUMN IF NOT EXISTS correct_btts    boolean;
