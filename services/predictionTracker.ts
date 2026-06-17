/**
 * predictionTracker.ts
 * ─────────────────────────────────────────────────────────────
 * Tracks AI prediction accuracy in real-time via Supabase.
 * - Shared across ALL users and devices (server-side storage).
 * - When a user opens a match analysis → prediction is saved.
 * - When a finished match is opened → actual result is stored.
 * - AccuracyModal reads aggregated stats from the table.
 *
 * PREREQUISITE: run supabase/migrations/20260611_match_predictions.sql
 * ─────────────────────────────────────────────────────────────
 */

import { supabase } from './supabase';

export type Outcome = 'local' | 'empate' | 'visitante';

export interface AccuracyStats {
  total: number;        // matches with known result
  correct: number;
  overallPct: number;
  victorias: { predicted: number; correct: number; pct: number };
  empates:   { predicted: number; correct: number; pct: number };
  visitante: { predicted: number; correct: number; pct: number };
  lastUpdated: Date;
}

// ─── Determine outcome from probabilities ────────────────────────────────────
export function outcomeFromProbs(pLocal: number, pEmpate: number, pVisitante: number): Outcome {
  if (pLocal >= pEmpate && pLocal >= pVisitante) return 'local';
  if (pEmpate >= pLocal && pEmpate >= pVisitante) return 'empate';
  return 'visitante';
}

// ─── Determine outcome from scores ───────────────────────────────────────────
export function outcomeFromScore(homeScore: number, awayScore: number): Outcome {
  if (homeScore > awayScore) return 'local';
  if (homeScore === awayScore) return 'empate';
  return 'visitante';
}

// ─── Save prediction (first write wins — ignoreDuplicates) ───────────────────
export async function savePrediction(
  matchId: string,
  competition: string,
  homeTeam: string,
  awayTeam: string,
  matchDate: string,
  predictedOutcome: Outcome,
): Promise<void> {
  try {
    await supabase.from('match_predictions').upsert(
      {
        match_id: matchId,
        competition,
        home_team: homeTeam,
        away_team: awayTeam,
        match_date: matchDate,
        predicted_outcome: predictedOutcome,
      },
      { onConflict: 'match_id', ignoreDuplicates: true }
    );
  } catch { /* silent — table might not exist yet */ }
}

// ─── Update actual result (only if not already set) ──────────────────────────
export async function updateActualResult(
  matchId: string,
  homeScore: number,
  awayScore: number,
): Promise<void> {
  try {
    const actual = outcomeFromScore(homeScore, awayScore);

    // Get current prediction to compute is_correct
    const { data } = await supabase
      .from('match_predictions')
      .select('predicted_outcome, actual_outcome')
      .eq('match_id', matchId)
      .maybeSingle();

    if (!data) return;                // no prediction recorded — skip
    if (data.actual_outcome) return;  // already resolved — skip

    await supabase
      .from('match_predictions')
      .update({
        actual_outcome: actual,
        home_score: homeScore,
        away_score: awayScore,
        is_correct: data.predicted_outcome === actual,
      })
      .eq('match_id', matchId);
  } catch { /* silent */ }
}

// ─── Fetch aggregated accuracy stats ─────────────────────────────────────────
export async function getAccuracyStats(): Promise<AccuracyStats | null> {
  try {
    const { data, error } = await supabase
      .from('match_predictions')
      .select('predicted_outcome, actual_outcome, is_correct')
      .not('actual_outcome', 'is', null);

    if (error || !data || data.length === 0) return null;

    const total   = data.length;
    const correct = data.filter(d => d.is_correct === true).length;

    const statFor = (outcome: Outcome) => {
      const rows = data.filter(d => d.predicted_outcome === outcome);
      const hits = rows.filter(d => d.is_correct === true).length;
      return {
        predicted: rows.length,
        correct: hits,
        pct: rows.length > 0 ? Math.round((hits / rows.length) * 100) : 0,
      };
    };

    return {
      total,
      correct,
      overallPct: Math.round((correct / total) * 100),
      victorias: statFor('local'),
      empates:   statFor('empate'),
      visitante: statFor('visitante'),
      lastUpdated: new Date(),
    };
  } catch {
    return null;
  }
}

// ─── Quick count for header button badge ─────────────────────────────────────
export async function getQuickStats(): Promise<{ pct: number; total: number } | null> {
  try {
    const { data } = await supabase
      .from('match_predictions')
      .select('is_correct')
      .not('actual_outcome', 'is', null);

    if (!data || data.length === 0) return null;
    const correct = data.filter(d => d.is_correct === true).length;
    return {
      pct: Math.round((correct / data.length) * 100),
      total: data.length,
    };
  } catch {
    return null;
  }
}
