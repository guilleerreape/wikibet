/**
 * predictionTracker.ts — AI accuracy tracking (global, shared via Supabase)
 * Tracks 4 markets per match: 1X2 · Over 1.5 · Over 2.5 · BTTS
 */

import { supabase } from './supabase';

export type Outcome = 'local' | 'empate' | 'visitante';

// ─── Stats interfaces ─────────────────────────────────────────────────────────
export interface MarketStat {
  predicted: number;   // matches where this market was predicted
  correct:   number;
  pct:       number;
}

export interface AccuracyStats {
  // Composite (all 4 markets combined)
  totalPredictions:  number;   // sum of all individual predictions
  correctPredictions: number;
  overallPct:        number;   // composite accuracy shown in button badge
  totalMatches:      number;   // distinct finished matches

  // Per market
  h1x2:   MarketStat;
  over15: MarketStat;
  over25: MarketStat;
  btts:   MarketStat;

  // 1X2 sub-breakdown
  victorias: MarketStat;
  empates:   MarketStat;
  visitante: MarketStat;

  lastUpdated: Date;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function outcomeFromProbs(pLocal: number, pEmpate: number, pVisitante: number): Outcome {
  if (pLocal >= pEmpate && pLocal >= pVisitante) return 'local';
  if (pEmpate >= pLocal && pEmpate >= pVisitante) return 'empate';
  return 'visitante';
}

export function outcomeFromScore(homeScore: number, awayScore: number): Outcome {
  if (homeScore > awayScore) return 'local';
  if (homeScore === awayScore) return 'empate';
  return 'visitante';
}

// ─── National team ratings for seeding (xg = expected goals per game) ────────
const TEAM_RATINGS: Record<string, { wr: number; xg: number }> = {
  'Argentina':      { wr: 78, xg: 2.8 }, 'Brasil':         { wr: 72, xg: 2.5 },
  'Francia':        { wr: 74, xg: 2.4 }, 'Alemania':       { wr: 71, xg: 2.6 },
  'España':         { wr: 72, xg: 2.2 }, 'Holanda':        { wr: 69, xg: 2.3 },
  'Portugal':       { wr: 70, xg: 2.4 }, 'Inglaterra':     { wr: 67, xg: 2.1 },
  'Bélgica':        { wr: 66, xg: 2.2 }, 'Noruega':        { wr: 61, xg: 2.0 },
  'Suecia':         { wr: 60, xg: 1.9 }, 'México':         { wr: 62, xg: 1.9 },
  'Uruguay':        { wr: 60, xg: 1.8 }, 'Colombia':       { wr: 58, xg: 1.8 },
  'Japón':          { wr: 58, xg: 1.9 }, 'Marruecos':      { wr: 58, xg: 1.6 },
  'Suiza':          { wr: 58, xg: 1.8 }, 'Estados Unidos': { wr: 57, xg: 1.9 },
  'Corea del Sur':  { wr: 55, xg: 1.8 }, 'Ecuador':        { wr: 55, xg: 1.7 },
  'Austria':        { wr: 55, xg: 1.8 }, 'Australia':      { wr: 54, xg: 1.7 },
  'Senegal':        { wr: 54, xg: 1.7 }, 'Canadá':         { wr: 52, xg: 1.7 },
  'Costa de Marfil':{ wr: 52, xg: 1.7 }, 'Turquía':        { wr: 52, xg: 1.7 },
  'Rep. Checa':     { wr: 52, xg: 1.6 }, 'Escocia':        { wr: 50, xg: 1.7 },
  'Egipto':         { wr: 50, xg: 1.5 }, 'Bosnia':         { wr: 48, xg: 1.6 },
  'Irán':           { wr: 48, xg: 1.4 }, 'Paraguay':       { wr: 48, xg: 1.4 },
  'Argelia':        { wr: 48, xg: 1.4 }, 'Arabia Saudita': { wr: 46, xg: 1.4 },
  'Túnez':          { wr: 45, xg: 1.3 }, 'Sudáfrica':      { wr: 44, xg: 1.3 },
  'Irak':           { wr: 44, xg: 1.3 }, 'Cabo Verde':     { wr: 42, xg: 1.2 },
  'Nueva Zelanda':  { wr: 42, xg: 1.3 }, 'Jordania':       { wr: 42, xg: 1.2 },
  'Catar':          { wr: 40, xg: 1.2 }, 'Haití':          { wr: 38, xg: 1.1 },
  'Curazao':        { wr: 35, xg: 1.0 },
};

// 0.72 discount applied to raw xg for WC group stage (teams play more cautiously)
const WC_DISCOUNT = 0.72;

function predictFromRatings(homeTeam: string, awayTeam: string): {
  outcome: Outcome; over15: boolean; over25: boolean; btts: boolean;
} {
  const h = TEAM_RATINGS[homeTeam] ?? { wr: 50, xg: 1.5 };
  const a = TEAM_RATINGS[awayTeam] ?? { wr: 50, xg: 1.5 };

  // 1X2 via relative strength
  const hStr = (h.wr / 100) * (h.xg / 2.5);
  const aStr = (a.wr / 100) * (a.xg / 2.5);
  const tot  = hStr + aStr || 1;
  const pH   = Math.min(0.75, Math.max(0.25, hStr / tot));
  const pA   = Math.min(0.60, Math.max(0.15, aStr / tot));
  const pD   = Math.max(0.10, 1 - pH - pA);
  const outcome = outcomeFromProbs(pH * 100, pD * 100, pA * 100);

  // Goal markets via discounted xg
  const hXG = h.xg * WC_DISCOUNT;
  const aXG = a.xg * WC_DISCOUNT;
  const expectedTotal = hXG + aXG;
  const over15 = expectedTotal > 1.7;   // predict over if expected > 1.7
  const over25 = expectedTotal > 2.5;   // predict over if expected > 2.5
  const btts   = hXG > 0.62 && aXG > 0.62; // both teams likely to score

  return { outcome, over15, over25, btts };
}

// ─── Historical WC 2026 group stage day-1 matches ────────────────────────────
const WC_HISTORICAL = [
  { id:'wc_a1', home:'México',          away:'Sudáfrica',     hs:2, as_:0, date:'2026-06-11T18:00:00Z' },
  { id:'wc_a2', home:'Corea del Sur',   away:'Rep. Checa',    hs:2, as_:1, date:'2026-06-12T21:00:00Z' },
  { id:'wc_b1', home:'Canadá',          away:'Bosnia',        hs:1, as_:1, date:'2026-06-12T18:00:00Z' },
  { id:'wc_b2', home:'Catar',           away:'Suiza',         hs:1, as_:1, date:'2026-06-13T18:00:00Z' },
  { id:'wc_c1', home:'Brasil',          away:'Marruecos',     hs:1, as_:1, date:'2026-06-13T21:00:00Z' },
  { id:'wc_c2', home:'Haití',           away:'Escocia',       hs:0, as_:1, date:'2026-06-14T18:00:00Z' },
  { id:'wc_d1', home:'Estados Unidos',  away:'Paraguay',      hs:4, as_:1, date:'2026-06-13T00:00:00Z' },
  { id:'wc_d2', home:'Australia',       away:'Turquía',       hs:2, as_:0, date:'2026-06-14T21:00:00Z' },
  { id:'wc_e1', home:'Alemania',        away:'Curazao',       hs:7, as_:1, date:'2026-06-14T20:00:00Z' },
  { id:'wc_e2', home:'Costa de Marfil', away:'Ecuador',       hs:1, as_:0, date:'2026-06-14T23:00:00Z' },
  { id:'wc_f1', home:'Holanda',         away:'Japón',         hs:2, as_:2, date:'2026-06-14T17:00:00Z' },
  { id:'wc_f2', home:'Suecia',          away:'Túnez',         hs:5, as_:1, date:'2026-06-15T21:00:00Z' },
  { id:'wc_g1', home:'España',          away:'Cabo Verde',    hs:0, as_:0, date:'2026-06-15T18:00:00Z' },
  { id:'wc_g2', home:'Arabia Saudita',  away:'Uruguay',       hs:1, as_:1, date:'2026-06-15T21:00:00Z' },
  { id:'wc_h1', home:'Bélgica',         away:'Egipto',        hs:1, as_:1, date:'2026-06-15T17:00:00Z' },
  { id:'wc_h2', home:'Irán',            away:'Nueva Zelanda', hs:2, as_:2, date:'2026-06-16T16:00:00Z' },
  { id:'wc_i1', home:'Francia',         away:'Senegal',       hs:2, as_:0, date:'2026-06-16T19:00:00Z' },
  { id:'wc_i2', home:'Irak',            away:'Noruega',       hs:1, as_:3, date:'2026-06-16T22:00:00Z' },
  { id:'wc_j1', home:'Argentina',       away:'Argelia',       hs:3, as_:0, date:'2026-06-17T01:00:00Z' },
  { id:'wc_j2', home:'Austria',         away:'Jordania',      hs:2, as_:1, date:'2026-06-17T04:00:00Z' },
];

// ─── Seed all WC historical matches (idempotent) ──────────────────────────────
export async function seedHistoricalData(): Promise<number> {
  try {
    const rows = WC_HISTORICAL.map(m => {
      const p = predictFromRatings(m.home, m.away);
      const total = m.hs + m.as_;
      const actual_over15 = total > 1;
      const actual_over25 = total > 2;
      const actual_btts   = m.hs > 0 && m.as_ > 0;
      const actual        = outcomeFromScore(m.hs, m.as_);

      return {
        match_id:           m.id,
        competition:        'FIFA.WORLD',
        home_team:          m.home,
        away_team:          m.away,
        match_date:         m.date,
        predicted_outcome:  p.outcome,
        actual_outcome:     actual,
        home_score:         m.hs,
        away_score:         m.as_,
        is_correct:         p.outcome === actual,
        pred_over15:        p.over15,
        pred_over25:        p.over25,
        pred_btts:          p.btts,
        actual_total_goals: total,
        correct_over15:     p.over15 === actual_over15,
        correct_over25:     p.over25 === actual_over25,
        correct_btts:       p.btts === actual_btts,
      };
    });

    const { error } = await supabase
      .from('match_predictions')
      .upsert(rows, { onConflict: 'match_id', ignoreDuplicates: true });

    return error ? 0 : rows.length;
  } catch {
    return 0;
  }
}

// ─── Save prediction from analysis (first-write-wins) ────────────────────────
export async function savePrediction(
  matchId: string,
  competition: string,
  homeTeam: string,
  awayTeam: string,
  matchDate: string,
  predictedOutcome: Outcome,
  markets?: {
    pred_over15?: boolean;
    pred_over25?: boolean;
    pred_btts?:   boolean;
  }
): Promise<void> {
  try {
    await supabase.from('match_predictions').upsert(
      {
        match_id:          matchId,
        competition,
        home_team:         homeTeam,
        away_team:         awayTeam,
        match_date:        matchDate,
        predicted_outcome: predictedOutcome,
        ...(markets ?? {}),
      },
      { onConflict: 'match_id', ignoreDuplicates: true }
    );
  } catch { /* silent */ }
}

// ─── Record actual result + compute all market correctness ────────────────────
export async function updateActualResult(
  matchId: string,
  homeScore: number,
  awayScore: number,
): Promise<void> {
  try {
    const { data } = await supabase
      .from('match_predictions')
      .select('predicted_outcome, actual_outcome, pred_over15, pred_over25, pred_btts')
      .eq('match_id', matchId)
      .maybeSingle();

    if (!data || data.actual_outcome) return; // already resolved

    const actual        = outcomeFromScore(homeScore, awayScore);
    const total         = homeScore + awayScore;
    const actual_over15 = total > 1;
    const actual_over25 = total > 2;
    const actual_btts   = homeScore > 0 && awayScore > 0;

    await supabase.from('match_predictions').update({
      actual_outcome:     actual,
      home_score:         homeScore,
      away_score:         awayScore,
      is_correct:         data.predicted_outcome === actual,
      actual_total_goals: total,
      // Only set correctness if we had the market prediction
      ...(data.pred_over15 !== null && data.pred_over15 !== undefined
            ? { correct_over15: data.pred_over15 === actual_over15 } : {}),
      ...(data.pred_over25 !== null && data.pred_over25 !== undefined
            ? { correct_over25: data.pred_over25 === actual_over25 } : {}),
      ...(data.pred_btts   !== null && data.pred_btts   !== undefined
            ? { correct_btts:   data.pred_btts   === actual_btts   } : {}),
    }).eq('match_id', matchId);
  } catch { /* silent */ }
}

// ─── Full accuracy stats ──────────────────────────────────────────────────────
export async function getAccuracyStats(): Promise<AccuracyStats | null> {
  try {
    const { data, error } = await supabase
      .from('match_predictions')
      .select(`
        predicted_outcome, actual_outcome, is_correct,
        pred_over15, pred_over25, pred_btts,
        correct_over15, correct_over25, correct_btts
      `)
      .not('actual_outcome', 'is', null);

    if (error || !data || data.length === 0) return null;

    const totalMatches = data.length;
    let totalPredictions = 0;
    let correctPredictions = 0;

    // 1X2
    const h1x2Predicted = data.filter(d => d.predicted_outcome !== null).length;
    const h1x2Correct   = data.filter(d => d.is_correct === true).length;
    totalPredictions  += h1x2Predicted;
    correctPredictions += h1x2Correct;

    const statFor = (outcome: Outcome) => {
      const rows = data.filter(d => d.predicted_outcome === outcome);
      const hits = rows.filter(d => d.is_correct === true).length;
      return { predicted: rows.length, correct: hits,
               pct: rows.length > 0 ? Math.round((hits / rows.length) * 100) : 0 };
    };

    // Market stats helper
    const mktStat = (
      predKey: 'pred_over15' | 'pred_over25' | 'pred_btts',
      corrKey: 'correct_over15' | 'correct_over25' | 'correct_btts'
    ): MarketStat => {
      const rows = data.filter(d => d[predKey] !== null && d[predKey] !== undefined && d[corrKey] !== null && d[corrKey] !== undefined);
      const hits = rows.filter(d => d[corrKey] === true).length;
      totalPredictions   += rows.length;
      correctPredictions += hits;
      return { predicted: rows.length, correct: hits,
               pct: rows.length > 0 ? Math.round((hits / rows.length) * 100) : 0 };
    };

    const over15 = mktStat('pred_over15', 'correct_over15');
    const over25 = mktStat('pred_over25', 'correct_over25');
    const btts   = mktStat('pred_btts',   'correct_btts');

    return {
      totalPredictions,
      correctPredictions,
      overallPct:  totalPredictions > 0 ? Math.round((correctPredictions / totalPredictions) * 100) : 0,
      totalMatches,
      h1x2:  { predicted: h1x2Predicted, correct: h1x2Correct,
                pct: h1x2Predicted > 0 ? Math.round((h1x2Correct / h1x2Predicted) * 100) : 0 },
      over15, over25, btts,
      victorias: statFor('local'),
      empates:   statFor('empate'),
      visitante: statFor('visitante'),
      lastUpdated: new Date(),
    };
  } catch { return null; }
}

// ─── Quick composite % for button badge ──────────────────────────────────────
export async function getQuickStats(): Promise<{ pct: number; total: number } | null> {
  try {
    const { data } = await supabase
      .from('match_predictions')
      .select('is_correct, correct_over15, correct_over25, correct_btts, pred_over15, pred_over25, pred_btts')
      .not('actual_outcome', 'is', null);

    if (!data || data.length === 0) return null;

    let total   = 0;
    let correct = 0;

    for (const r of data) {
      // 1X2
      total++;
      if (r.is_correct === true) correct++;
      // Over 1.5
      if (r.pred_over15 !== null && r.pred_over15 !== undefined && r.correct_over15 !== null) {
        total++;
        if (r.correct_over15 === true) correct++;
      }
      // Over 2.5
      if (r.pred_over25 !== null && r.pred_over25 !== undefined && r.correct_over25 !== null) {
        total++;
        if (r.correct_over25 === true) correct++;
      }
      // BTTS
      if (r.pred_btts !== null && r.pred_btts !== undefined && r.correct_btts !== null) {
        total++;
        if (r.correct_btts === true) correct++;
      }
    }

    return { pct: Math.round((correct / total) * 100), total };
  } catch { return null; }
}
