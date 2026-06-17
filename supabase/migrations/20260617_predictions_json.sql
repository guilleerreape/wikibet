-- Add flexible predictions_json column (replaces fixed market columns)
-- Run this in Supabase SQL Editor

ALTER TABLE public.match_predictions
  ADD COLUMN IF NOT EXISTS predictions_json jsonb DEFAULT '[]'::jsonb;
