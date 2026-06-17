-- Extend match_predictions with 3 more market columns
-- Run this in Supabase SQL Editor

ALTER TABLE public.match_predictions
  ADD COLUMN IF NOT EXISTS pred_over05   boolean,
  ADD COLUMN IF NOT EXISTS pred_under25  boolean,
  ADD COLUMN IF NOT EXISTS pred_over35   boolean,
  ADD COLUMN IF NOT EXISTS correct_over05  boolean,
  ADD COLUMN IF NOT EXISTS correct_under25 boolean,
  ADD COLUMN IF NOT EXISTS correct_over35  boolean;
