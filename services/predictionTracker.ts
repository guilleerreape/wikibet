/**
 * predictionTracker.ts — AI accuracy tracking (global, shared via Supabase)
 */

import { supabase } from './supabase';

export type Outcome = 'local' | 'empate' | 'visitante';

export interface AccuracyStats {
  total: number;
  correct: number;
  overallPct: number;
  victorias: { predicted: number; correct: number; pct: number };
  empates:   { predicted: number; correct: number; pct: number };
  visitante: { predicted: number; correct: number; pct: number };
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

// ─── National team quality ratings for WC 2026 predictions ───────────────────
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

function predictFromRatings(homeTeam: string, awayTeam: string): Outcome {
  const h = TEAM_RATINGS[homeTeam] ?? { wr: 50, xg: 1.5 };
  const a = TEAM_RATINGS[awayTeam] ?? { wr: 50, xg: 1.5 };
  const hStr = (h.wr / 100) * (h.xg / 2.5);
  const aStr = (a.wr / 100) * (a.xg / 2.5);
  const tot  = hStr + aStr || 1;
  const pH   = Math.min(0.75, Math.max(0.25, hStr / tot));
  const pA   = Math.min(0.60, Math.max(0.15, aStr / tot));
  const pD   = Math.max(0.10, 1 - pH - pA);
  return outcomeFromProbs(pH * 100, pD * 100, pA * 100);
}

// ─── All finished WC 2026 matches (static data from espnMatchService) ─────────
const WC_HISTORICAL: {
  id: string; home: string; away: string;
  hs: number; as_: number; date: string;
}[] = [
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

// ─── Seed all historical WC matches (idempotent upsert) ───────────────────────
export async function seedHistoricalData(): Promise<number> {
  try {
    const rows = WC_HISTORICAL.map(m => {
      const predicted = predictFromRatings(m.home, m.away);
      const actual    = outcomeFromScore(m.hs, m.as_);
      return {
        match_id:          m.id,
        competition:       'FIFA.WORLD',
        home_team:         m.home,
        away_team:         m.away,
        match_date:        m.date,
        predicted_outcome: predicted,
        actual_outcome:    actual,
        home_score:        m.hs,
        away_score:        m.as_,
        is_correct:        predicted === actual,
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

// ─── Save prediction when any user opens analysis ────────────────────────────
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
      { match_id: matchId, competition, home_team: homeTeam, away_team: awayTeam,
        match_date: matchDate, predicted_outcome: predictedOutcome },
      { onConflict: 'match_id', ignoreDuplicates: true }
    );
  } catch { /* silent */ }
}

// ─── Record actual result when match finishes ─────────────────────────────────
export async function updateActualResult(
  matchId: string,
  homeScore: number,
  awayScore: number,
): Promise<void> {
  try {
    const actual = outcomeFromScore(homeScore, awayScore);
    const { data } = await supabase
      .from('match_predictions')
      .select('predicted_outcome, actual_outcome')
      .eq('match_id', matchId)
      .maybeSingle();

    if (!data || data.actual_outcome) return; // skip if not found or already resolved
    await supabase.from('match_predictions').update({
      actual_outcome: actual, home_score: homeScore, away_score: awayScore,
      is_correct: data.predicted_outcome === actual,
    }).eq('match_id', matchId);
  } catch { /* silent */ }
}

// ─── Full accuracy stats for modal ───────────────────────────────────────────
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
      return { predicted: rows.length, correct: hits,
               pct: rows.length > 0 ? Math.round((hits / rows.length) * 100) : 0 };
    };
    return {
      total, correct,
      overallPct: Math.round((correct / total) * 100),
      victorias: statFor('local'),
      empates:   statFor('empate'),
      visitante: statFor('visitante'),
      lastUpdated: new Date(),
    };
  } catch { return null; }
}

// ─── Quick badge stats for header button ────────────────────────────────────
export async function getQuickStats(): Promise<{ pct: number; total: number } | null> {
  try {
    const { data } = await supabase
      .from('match_predictions')
      .select('is_correct')
      .not('actual_outcome', 'is', null);

    if (!data || data.length === 0) return null;
    const correct = data.filter(d => d.is_correct === true).length;
    return { pct: Math.round((correct / data.length) * 100), total: data.length };
  } catch { return null; }
}
