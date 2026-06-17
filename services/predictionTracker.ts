/**
 * predictionTracker.ts — AI accuracy tracking (global, shared via Supabase)
 * Tracks the same 7 markets shown in PostMatchBanner:
 *   1X2 · Over 0.5 · Over 1.5 · Over 2.5 · Under 2.5 · BTTS · Over 3.5
 */

import { supabase } from './supabase';

export type Outcome = 'local' | 'empate' | 'visitante';

export interface MarketStat {
  label:     string;
  emoji:     string;
  predicted: number;
  correct:   number;
  pct:       number;
}

export interface AccuracyStats {
  // Composite (all 7 markets)
  totalPredictions:   number;
  correctPredictions: number;
  overallPct:         number;
  totalMatches:       number;

  // Per market (sorted for display)
  markets: MarketStat[];

  // 1X2 sub-breakdown
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

// ─── National team ratings for WC 2026 seeding ───────────────────────────────
const TEAM_RATINGS: Record<string, { wr: number; xg: number }> = {
  'Argentina': {wr:78,xg:2.8},'Brasil': {wr:72,xg:2.5},'Francia': {wr:74,xg:2.4},
  'Alemania': {wr:71,xg:2.6},'España': {wr:72,xg:2.2},'Holanda': {wr:69,xg:2.3},
  'Portugal': {wr:70,xg:2.4},'Inglaterra': {wr:67,xg:2.1},'Bélgica': {wr:66,xg:2.2},
  'Noruega': {wr:61,xg:2.0},'Suecia': {wr:60,xg:1.9},'México': {wr:62,xg:1.9},
  'Uruguay': {wr:60,xg:1.8},'Colombia': {wr:58,xg:1.8},'Japón': {wr:58,xg:1.9},
  'Marruecos': {wr:58,xg:1.6},'Suiza': {wr:58,xg:1.8},'Estados Unidos': {wr:57,xg:1.9},
  'Corea del Sur': {wr:55,xg:1.8},'Ecuador': {wr:55,xg:1.7},'Austria': {wr:55,xg:1.8},
  'Australia': {wr:54,xg:1.7},'Senegal': {wr:54,xg:1.7},'Canadá': {wr:52,xg:1.7},
  'Costa de Marfil': {wr:52,xg:1.7},'Turquía': {wr:52,xg:1.7},'Rep. Checa': {wr:52,xg:1.6},
  'Escocia': {wr:50,xg:1.7},'Egipto': {wr:50,xg:1.5},'Bosnia': {wr:48,xg:1.6},
  'Irán': {wr:48,xg:1.4},'Paraguay': {wr:48,xg:1.4},'Argelia': {wr:48,xg:1.4},
  'Arabia Saudita': {wr:46,xg:1.4},'Túnez': {wr:45,xg:1.3},'Sudáfrica': {wr:44,xg:1.3},
  'Irak': {wr:44,xg:1.3},'Cabo Verde': {wr:42,xg:1.2},'Nueva Zelanda': {wr:42,xg:1.3},
  'Jordania': {wr:42,xg:1.2},'Catar': {wr:40,xg:1.2},'Haití': {wr:38,xg:1.1},
  'Curazao': {wr:35,xg:1.0},
};

function predictMatch(homeTeam: string, awayTeam: string) {
  const h   = TEAM_RATINGS[homeTeam]  ?? { wr:50, xg:1.5 };
  const a   = TEAM_RATINGS[awayTeam]  ?? { wr:50, xg:1.5 };
  const D   = 0.72; // WC group stage discount
  const hxg = h.xg * D;
  const axg = a.xg * D;
  const exp = hxg + axg;

  const hStr = (h.wr/100) * (h.xg/2.5);
  const aStr = (a.wr/100) * (a.xg/2.5);
  const tot  = hStr + aStr || 1;
  const pH   = Math.min(0.75, Math.max(0.25, hStr/tot));
  const pA   = Math.min(0.60, Math.max(0.15, aStr/tot));
  const pD   = Math.max(0.10, 1-pH-pA);

  return {
    outcome:   outcomeFromProbs(pH*100, pD*100, pA*100),
    over05:    true,             // AI always predicts at least 1 goal
    over15:    exp > 1.7,
    over25:    exp > 2.5,
    under25:   exp <= 2.5,       // complement of over25
    btts:      hxg > 0.62 && axg > 0.62,
    over35:    exp > 3.2,
  };
}

// ─── Compute all 7 market correctness from actual score ──────────────────────
function computeMarketHits(hs: number, as_: number) {
  const total = hs + as_;
  return {
    actual_over05:   total > 0,
    actual_over15:   total > 1,
    actual_over25:   total > 2,
    actual_under25:  total < 3,
    actual_btts:     hs > 0 && as_ > 0,
    actual_over35:   total > 3,
    actual_total:    total,
  };
}

// ─── Historical WC 2026 matches ───────────────────────────────────────────────
const WC_HISTORICAL = [
  {id:'wc_a1',home:'México',          away:'Sudáfrica',    hs:2,as_:0,date:'2026-06-11T18:00:00Z'},
  {id:'wc_a2',home:'Corea del Sur',   away:'Rep. Checa',   hs:2,as_:1,date:'2026-06-12T21:00:00Z'},
  {id:'wc_b1',home:'Canadá',          away:'Bosnia',       hs:1,as_:1,date:'2026-06-12T18:00:00Z'},
  {id:'wc_b2',home:'Catar',           away:'Suiza',        hs:1,as_:1,date:'2026-06-13T18:00:00Z'},
  {id:'wc_c1',home:'Brasil',          away:'Marruecos',    hs:1,as_:1,date:'2026-06-13T21:00:00Z'},
  {id:'wc_c2',home:'Haití',           away:'Escocia',      hs:0,as_:1,date:'2026-06-14T18:00:00Z'},
  {id:'wc_d1',home:'Estados Unidos',  away:'Paraguay',     hs:4,as_:1,date:'2026-06-13T00:00:00Z'},
  {id:'wc_d2',home:'Australia',       away:'Turquía',      hs:2,as_:0,date:'2026-06-14T21:00:00Z'},
  {id:'wc_e1',home:'Alemania',        away:'Curazao',      hs:7,as_:1,date:'2026-06-14T20:00:00Z'},
  {id:'wc_e2',home:'Costa de Marfil', away:'Ecuador',      hs:1,as_:0,date:'2026-06-14T23:00:00Z'},
  {id:'wc_f1',home:'Holanda',         away:'Japón',        hs:2,as_:2,date:'2026-06-14T17:00:00Z'},
  {id:'wc_f2',home:'Suecia',          away:'Túnez',        hs:5,as_:1,date:'2026-06-15T21:00:00Z'},
  {id:'wc_g1',home:'España',          away:'Cabo Verde',   hs:0,as_:0,date:'2026-06-15T18:00:00Z'},
  {id:'wc_g2',home:'Arabia Saudita',  away:'Uruguay',      hs:1,as_:1,date:'2026-06-15T21:00:00Z'},
  {id:'wc_h1',home:'Bélgica',         away:'Egipto',       hs:1,as_:1,date:'2026-06-15T17:00:00Z'},
  {id:'wc_h2',home:'Irán',            away:'Nueva Zelanda',hs:2,as_:2,date:'2026-06-16T16:00:00Z'},
  {id:'wc_i1',home:'Francia',         away:'Senegal',      hs:2,as_:0,date:'2026-06-16T19:00:00Z'},
  {id:'wc_i2',home:'Irak',            away:'Noruega',      hs:1,as_:3,date:'2026-06-16T22:00:00Z'},
  {id:'wc_j1',home:'Argentina',       away:'Argelia',      hs:3,as_:0,date:'2026-06-17T01:00:00Z'},
  {id:'wc_j2',home:'Austria',         away:'Jordania',     hs:2,as_:1,date:'2026-06-17T04:00:00Z'},
];

// ─── Seed historical WC data (idempotent) ─────────────────────────────────────
export async function seedHistoricalData(): Promise<number> {
  try {
    const rows = WC_HISTORICAL.map(m => {
      const p  = predictMatch(m.home, m.away);
      const ah = computeMarketHits(m.hs, m.as_);
      const actual = outcomeFromScore(m.hs, m.as_);
      return {
        match_id: m.id, competition: 'FIFA.WORLD',
        home_team: m.home, away_team: m.away, match_date: m.date,
        predicted_outcome: p.outcome, actual_outcome: actual,
        home_score: m.hs, away_score: m.as_,
        is_correct:      p.outcome === actual,
        pred_over05:     p.over05,   correct_over05:  p.over05  === ah.actual_over05,
        pred_over15:     p.over15,   correct_over15:  p.over15  === ah.actual_over15,
        pred_over25:     p.over25,   correct_over25:  p.over25  === ah.actual_over25,
        pred_under25:    p.under25,  correct_under25: p.under25 === ah.actual_under25,
        pred_btts:       p.btts,     correct_btts:    p.btts    === ah.actual_btts,
        pred_over35:     p.over35,   correct_over35:  p.over35  === ah.actual_over35,
        actual_total_goals: ah.actual_total,
      };
    });
    const { error } = await supabase
      .from('match_predictions')
      .upsert(rows, { onConflict: 'match_id', ignoreDuplicates: true });
    return error ? 0 : rows.length;
  } catch { return 0; }
}

// ─── Save prediction when AI analysis runs ────────────────────────────────────
export async function savePrediction(
  matchId: string, competition: string,
  homeTeam: string, awayTeam: string, matchDate: string,
  predictedOutcome: Outcome,
  markets?: {
    pred_over05?:  boolean; pred_over15?:  boolean;
    pred_over25?:  boolean; pred_under25?: boolean;
    pred_btts?:    boolean; pred_over35?:  boolean;
  }
): Promise<void> {
  try {
    await supabase.from('match_predictions').upsert(
      { match_id: matchId, competition, home_team: homeTeam, away_team: awayTeam,
        match_date: matchDate, predicted_outcome: predictedOutcome, ...(markets ?? {}) },
      { onConflict: 'match_id', ignoreDuplicates: true }
    );
  } catch { /* silent */ }
}

// ─── Record actual result + compute all market correctness ────────────────────
export async function updateActualResult(
  matchId: string, homeScore: number, awayScore: number
): Promise<void> {
  try {
    const { data } = await supabase
      .from('match_predictions')
      .select('predicted_outcome,actual_outcome,pred_over05,pred_over15,pred_over25,pred_under25,pred_btts,pred_over35')
      .eq('match_id', matchId).maybeSingle();
    if (!data || data.actual_outcome) return;

    const actual = outcomeFromScore(homeScore, awayScore);
    const ah     = computeMarketHits(homeScore, awayScore);

    const maybeCorrect = (pred: boolean | null | undefined, hit: boolean) =>
      pred !== null && pred !== undefined ? pred === hit : undefined;

    await supabase.from('match_predictions').update({
      actual_outcome: actual, home_score: homeScore, away_score: awayScore,
      is_correct: data.predicted_outcome === actual,
      actual_total_goals: ah.actual_total,
      ...(maybeCorrect(data.pred_over05,  ah.actual_over05)  !== undefined ? { correct_over05:  data.pred_over05  === ah.actual_over05  } : {}),
      ...(maybeCorrect(data.pred_over15,  ah.actual_over15)  !== undefined ? { correct_over15:  data.pred_over15  === ah.actual_over15  } : {}),
      ...(maybeCorrect(data.pred_over25,  ah.actual_over25)  !== undefined ? { correct_over25:  data.pred_over25  === ah.actual_over25  } : {}),
      ...(maybeCorrect(data.pred_under25, ah.actual_under25) !== undefined ? { correct_under25: data.pred_under25 === ah.actual_under25 } : {}),
      ...(maybeCorrect(data.pred_btts,    ah.actual_btts)    !== undefined ? { correct_btts:    data.pred_btts    === ah.actual_btts    } : {}),
      ...(maybeCorrect(data.pred_over35,  ah.actual_over35)  !== undefined ? { correct_over35:  data.pred_over35  === ah.actual_over35  } : {}),
    }).eq('match_id', matchId);
  } catch { /* silent */ }
}

// ─── Full accuracy stats ──────────────────────────────────────────────────────
export async function getAccuracyStats(): Promise<AccuracyStats | null> {
  try {
    const { data, error } = await supabase
      .from('match_predictions')
      .select('predicted_outcome,actual_outcome,is_correct,pred_over05,pred_over15,pred_over25,pred_under25,pred_btts,pred_over35,correct_over05,correct_over15,correct_over25,correct_under25,correct_btts,correct_over35')
      .not('actual_outcome', 'is', null);

    if (error || !data || data.length === 0) return null;

    const totalMatches = data.length;
    let totalP = 0, totalC = 0;

    // 1X2
    const n1x2  = data.filter(d => d.predicted_outcome !== null).length;
    const c1x2  = data.filter(d => d.is_correct === true).length;
    totalP += n1x2; totalC += c1x2;

    // Market stat helper
    const mkt = (label: string, emoji: string,
      predKey: keyof typeof data[0], corrKey: keyof typeof data[0]): MarketStat => {
      const rows = data.filter(d => d[predKey] !== null && d[predKey] !== undefined && d[corrKey] !== null && d[corrKey] !== undefined);
      const hits = rows.filter(d => d[corrKey] === true).length;
      totalP += rows.length; totalC += hits;
      return { label, emoji, predicted: rows.length, correct: hits,
               pct: rows.length > 0 ? Math.round((hits/rows.length)*100) : 0 };
    };

    const rawMarkets = [
      { label: 'Resultado 1X2',  emoji: '🏆', predicted: n1x2,  correct: c1x2,
        pct: n1x2 > 0 ? Math.round((c1x2/n1x2)*100) : 0 },
      mkt('Over 0.5 goles',  '⚽', 'pred_over05',  'correct_over05'),
      mkt('Over 1.5 goles',  '🔥', 'pred_over15',  'correct_over15'),
      mkt('Over 2.5 goles',  '💥', 'pred_over25',  'correct_over25'),
      mkt('Under 2.5 goles', '🛡️', 'pred_under25', 'correct_under25'),
      mkt('Ambos marcan',    '🎯', 'pred_btts',    'correct_btts'),
      mkt('Over 3.5 goles',  '🚀', 'pred_over35',  'correct_over35'),
    ];
    // Sort by accuracy desc
    const markets = [...rawMarkets].sort((a, b) => b.pct - a.pct);

    const subFor = (outcome: Outcome) => {
      const rows = data.filter(d => d.predicted_outcome === outcome);
      const hits = rows.filter(d => d.is_correct === true).length;
      return { predicted: rows.length, correct: hits,
               pct: rows.length > 0 ? Math.round((hits/rows.length)*100) : 0 };
    };

    return {
      totalPredictions: totalP, correctPredictions: totalC,
      overallPct: totalP > 0 ? Math.round((totalC/totalP)*100) : 0,
      totalMatches, markets,
      victorias: subFor('local'),
      empates:   subFor('empate'),
      visitante: subFor('visitante'),
      lastUpdated: new Date(),
    };
  } catch { return null; }
}

// ─── Quick composite % for button badge ──────────────────────────────────────
export async function getQuickStats(): Promise<{ pct: number; total: number } | null> {
  try {
    const { data } = await supabase
      .from('match_predictions')
      .select('is_correct,correct_over05,correct_over15,correct_over25,correct_under25,correct_btts,correct_over35,pred_over05,pred_over15,pred_over25,pred_under25,pred_btts,pred_over35')
      .not('actual_outcome', 'is', null);

    if (!data || data.length === 0) return null;
    let total = 0, correct = 0;
    for (const r of data) {
      total++;    if (r.is_correct === true) correct++;
      if (r.pred_over05  !== null && r.pred_over05  !== undefined && r.correct_over05  !== null) { total++; if (r.correct_over05  === true) correct++; }
      if (r.pred_over15  !== null && r.pred_over15  !== undefined && r.correct_over15  !== null) { total++; if (r.correct_over15  === true) correct++; }
      if (r.pred_over25  !== null && r.pred_over25  !== undefined && r.correct_over25  !== null) { total++; if (r.correct_over25  === true) correct++; }
      if (r.pred_under25 !== null && r.pred_under25 !== undefined && r.correct_under25 !== null) { total++; if (r.correct_under25 === true) correct++; }
      if (r.pred_btts    !== null && r.pred_btts    !== undefined && r.correct_btts    !== null) { total++; if (r.correct_btts    === true) correct++; }
      if (r.pred_over35  !== null && r.pred_over35  !== undefined && r.correct_over35  !== null) { total++; if (r.correct_over35  === true) correct++; }
    }
    return { pct: Math.round((correct/total)*100), total };
  } catch { return null; }
}
