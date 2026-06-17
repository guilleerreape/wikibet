/**
 * predictionTracker.ts — AI accuracy tracking (global, shared via Supabase)
 * Dynamic system: AI emits as many predictions as it's confident about.
 * Each prediction stored in predictions_json (JSONB). All aggregate into global %.
 */

import { supabase } from './supabase';

export type Outcome = 'local' | 'empate' | 'visitante';

// ─── Dynamic prediction item ──────────────────────────────────────────────────
export interface PredItem {
  market: string;   // 'over0_5' | 'over1_5' | 'over2_5' | 'under2_5' | 'over3_5' | 'under3_5' | 'btts' | 'btts_no' | '1x2'
  label:  string;   // Human-readable
  emoji:  string;   // Display emoji
  value?: string;   // For 1x2: 'local'|'empate'|'visitante'
  hit?:   boolean;  // Set after verification
}

export interface MarketStat {
  label:     string;
  emoji:     string;
  predicted: number;
  correct:   number;
  pct:       number;
}

export interface AccuracyStats {
  totalPredictions:   number;
  correctPredictions: number;
  overallPct:         number;
  totalMatches:       number;

  markets: MarketStat[];   // sorted by pct desc

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

// ─── Build confident predictions from AI analysis ─────────────────────────────
// Takes predicciones object from advancedAIAnalysis result.
// Adds a prediction ONLY when the AI is confident enough.
export function buildConfidentPredictions(predicciones: any): PredItem[] {
  const preds: PredItem[] = [];
  const probs = predicciones?.probabilidades ?? {};
  const mkts  = predicciones?.mercados ?? {};
  const goles = predicciones?.goles ?? {};

  const pL = probs.victoriaLocal ?? 0;
  const pD = probs.empate ?? 0;
  const pA = probs.victoriaVisitante ?? 0;

  // ── 1X2: siempre incluir ──────────────────────────────────────────────────
  const outcome: Outcome =
    pL >= pD && pL >= pA ? 'local' :
    pD >= pL && pD >= pA ? 'empate' : 'visitante';
  const outcomeLabel =
    outcome === 'local' ? 'Local gana (1X2)' :
    outcome === 'empate' ? 'Empate (1X2)' : 'Visitante gana (1X2)';
  preds.push({ market: '1x2', label: outcomeLabel, emoji: '🏆', value: outcome });

  // ── Over 0.5: incluir si >= 70% ────────────────────────────────────────────
  const over05 = goles.over0_5?.total ?? 90;
  if (over05 >= 70) {
    preds.push({ market: 'over0_5', label: 'Al menos 1 gol (Over 0.5)', emoji: '⚽' });
  }

  // ── Under 3.5: fácil, incluir si >= 62% ───────────────────────────────────
  const over35raw = goles.over3_5?.total ?? mkts.over3_5 ?? 0;
  const under35 = 100 - over35raw;
  if (under35 >= 62) {
    preds.push({ market: 'under3_5', label: 'Menos de 3.5 goles', emoji: '🛡️' });
  }

  // ── Over 1.5 o Under 1.5: incluir el lado confiado si >= 62% ──────────────
  const over15 = goles.over1_5?.total ?? mkts.over1_5 ?? 0;
  if (over15 >= 62) {
    preds.push({ market: 'over1_5', label: 'Más de 1.5 goles', emoji: '🔥' });
  } else if ((100 - over15) >= 72) {
    preds.push({ market: 'under1_5', label: 'Menos de 1.5 goles', emoji: '🔒' });
  }

  // ── Over 2.5 o Under 2.5: incluir el lado confiado si >= 58% ──────────────
  const over25 = goles.over2_5?.total ?? mkts.over2_5 ?? 0;
  if (over25 >= 58) {
    preds.push({ market: 'over2_5', label: 'Más de 2.5 goles', emoji: '💥' });
  } else if ((100 - over25) >= 58) {
    preds.push({ market: 'under2_5', label: 'Menos de 2.5 goles', emoji: '🔒' });
  }

  // ── BTTS Sí o No: incluir el lado confiado si >= 58% ──────────────────────
  const btts   = mkts.btts_si ?? 0;
  const bttsNo = mkts.btts_no ?? (100 - btts);
  if (btts >= 58) {
    preds.push({ market: 'btts', label: 'Ambos equipos marcan', emoji: '🎯' });
  } else if (bttsNo >= 58) {
    preds.push({ market: 'btts_no', label: 'No marcan los dos (BTTS No)', emoji: '🚫' });
  }

  // ── Over 3.5: solo si >= 55% ───────────────────────────────────────────────
  if (over35raw >= 55) {
    preds.push({ market: 'over3_5', label: 'Más de 3.5 goles', emoji: '🚀' });
  }

  return preds;
}

// ─── Verify predictions against actual score ──────────────────────────────────
export function verifyPredictions(preds: PredItem[], hs: number, as_: number): PredItem[] {
  const total     = hs + as_;
  const actual1x2 = outcomeFromScore(hs, as_);
  return preds.map(p => {
    let hit: boolean;
    switch (p.market) {
      case '1x2':     hit = p.value === actual1x2; break;
      case 'over0_5': hit = total > 0; break;
      case 'over1_5': hit = total > 1; break;
      case 'over2_5': hit = total > 2; break;
      case 'under2_5':hit = total < 3; break;
      case 'over3_5': hit = total > 3; break;
      case 'under3_5':hit = total < 4; break;
      case 'under1_5':hit = total < 2; break;
      case 'btts':    hit = hs > 0 && as_ > 0; break;
      case 'btts_no': hit = !(hs > 0 && as_ > 0); break;
      default:        hit = false;
    }
    return { ...p, hit };
  });
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

function predictMatchSeed(homeTeam: string, awayTeam: string) {
  const h   = TEAM_RATINGS[homeTeam]  ?? { wr:50, xg:1.5 };
  const a   = TEAM_RATINGS[awayTeam]  ?? { wr:50, xg:1.5 };
  const D   = 0.72;
  const hxg = h.xg * D;
  const axg = a.xg * D;
  const exp = hxg + axg;

  const hStr = (h.wr/100) * (h.xg/2.5);
  const aStr = (a.wr/100) * (a.xg/2.5);
  const tot  = hStr + aStr || 1;
  const pH   = Math.min(0.75, Math.max(0.25, hStr/tot));
  const pA   = Math.min(0.60, Math.max(0.15, aStr/tot));
  const pD   = Math.max(0.10, 1-pH-pA);

  // Build a fake predicciones object so buildConfidentPredictions works
  const over05  = 92;
  const over15  = Math.round(Math.min(95, Math.max(20, (exp / 1.5) * 60)));
  const over25  = Math.round(Math.min(90, Math.max(15, (exp / 2.5) * 55)));
  const over35  = Math.round(Math.min(70, Math.max(5,  (exp / 3.5) * 45)));
  const btts    = Math.round(Math.min(85, Math.max(15, hxg * axg * 80)));
  const bttsNo  = 100 - btts;

  return {
    outcome: outcomeFromProbs(pH*100, pD*100, pA*100),
    predicciones: {
      probabilidades: {
        victoriaLocal:       Math.round(pH * 100),
        empate:              Math.round(pD * 100),
        victoriaVisitante:   Math.round(pA * 100),
      },
      goles: {
        over0_5: { local: 80, visitante: 75, total: over05 },
        over1_5: { local: 55, visitante: 50, total: over15 },
        over2_5: { local: 40, visitante: 35, total: over25 },
        over3_5: { local: 25, visitante: 20, total: over35 },
      },
      mercados: {
        over1_5: over15, over2_5: over25, over3_5: over35,
        under2_5: 100 - over25,
        btts_si: btts, btts_no: bttsNo,
      },
    },
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

// ─── Seed historical WC data (always upsert to populate predictions_json) ─────
export async function seedHistoricalData(): Promise<number> {
  try {
    const rows = WC_HISTORICAL.map(m => {
      const { outcome, predicciones } = predictMatchSeed(m.home, m.away);
      const preds = buildConfidentPredictions(predicciones);
      const verified = verifyPredictions(preds, m.hs, m.as_);
      const actual = outcomeFromScore(m.hs, m.as_);
      const total  = m.hs + m.as_;
      return {
        match_id:          m.id,
        competition:       'FIFA.WORLD',
        home_team:         m.home,
        away_team:         m.away,
        match_date:        m.date,
        predicted_outcome: outcome,
        actual_outcome:    actual,
        home_score:        m.hs,
        away_score:        m.as_,
        is_correct:        outcome === actual,
        actual_total_goals: total,
        predictions_json:  verified,
      };
    });
    // No ignoreDuplicates → updates existing rows with predictions_json
    const { error } = await supabase
      .from('match_predictions')
      .upsert(rows, { onConflict: 'match_id' });
    return error ? 0 : rows.length;
  } catch { return 0; }
}

// ─── Save prediction when AI analysis runs ────────────────────────────────────
export async function savePrediction(
  matchId:          string,
  competition:      string,
  homeTeam:         string,
  awayTeam:         string,
  matchDate:        string,
  predictedOutcome: Outcome,
  predictions:      PredItem[] = [],
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
        predictions_json:  predictions,
      },
      { onConflict: 'match_id', ignoreDuplicates: true }
    );
  } catch { /* silent */ }
}

// ─── Record actual result + verify predictions_json ───────────────────────────
export async function updateActualResult(
  matchId: string, homeScore: number, awayScore: number
): Promise<void> {
  try {
    const { data } = await supabase
      .from('match_predictions')
      .select('predicted_outcome,actual_outcome,predictions_json')
      .eq('match_id', matchId).maybeSingle();
    if (!data || data.actual_outcome) return;

    const actual   = outcomeFromScore(homeScore, awayScore);
    const total    = homeScore + awayScore;
    const rawPreds: PredItem[] = data.predictions_json ?? [];
    const verified = rawPreds.length > 0
      ? verifyPredictions(rawPreds, homeScore, awayScore)
      : [];

    await supabase.from('match_predictions').update({
      actual_outcome:     actual,
      home_score:         homeScore,
      away_score:         awayScore,
      is_correct:         data.predicted_outcome === actual,
      actual_total_goals: total,
      predictions_json:   verified,
    }).eq('match_id', matchId);
  } catch { /* silent */ }
}

// ─── Full accuracy stats ──────────────────────────────────────────────────────
export async function getAccuracyStats(): Promise<AccuracyStats | null> {
  try {
    const { data, error } = await supabase
      .from('match_predictions')
      .select('predicted_outcome,actual_outcome,is_correct,predictions_json,pred_over05,pred_over15,pred_over25,pred_under25,pred_btts,pred_over35,correct_over05,correct_over15,correct_over25,correct_under25,correct_btts,correct_over35')
      .not('actual_outcome', 'is', null);

    if (error || !data || data.length === 0) return null;

    const totalMatches = data.length;
    let totalP = 0, totalC = 0;

    // Per-market accumulators
    const mktMap: Record<string, { label: string; emoji: string; predicted: number; correct: number }> = {};
    const addMkt = (market: string, label: string, emoji: string, hit: boolean) => {
      if (!mktMap[market]) mktMap[market] = { label, emoji, predicted: 0, correct: 0 };
      mktMap[market].predicted++;
      if (hit) mktMap[market].correct++;
      totalP++;
      if (hit) totalC++;
    };

    // 1X2 sub-breakdown
    const sub1x2 = { local: { p:0,c:0 }, empate: { p:0,c:0 }, visitante: { p:0,c:0 } };

    for (const row of data) {
      const preds: PredItem[] = row.predictions_json ?? [];

      if (preds.length > 0) {
        // ── New system: read from predictions_json ──
        for (const p of preds) {
          if (p.hit === undefined || p.hit === null) continue;
          const label =
            p.market === '1x2' ? 'Resultado 1X2' :
            p.label;
          addMkt(p.market, label, p.emoji, p.hit === true);

          // 1X2 sub-breakdown
          if (p.market === '1x2' && p.value) {
            const sub = sub1x2[p.value as keyof typeof sub1x2];
            if (sub) { sub.p++; if (p.hit === true) sub.c++; }
          }
        }
      } else {
        // ── Fallback: read from old boolean columns ──
        const outcome1x2Hit = row.is_correct === true;
        if (row.predicted_outcome) {
          addMkt('1x2', 'Resultado 1X2', '🏆', outcome1x2Hit);
          const sub = sub1x2[row.predicted_outcome as keyof typeof sub1x2];
          if (sub) { sub.p++; if (outcome1x2Hit) sub.c++; }
        }
        const legacy = [
          { key: 'pred_over05',  corr: 'correct_over05',  label: 'Over 0.5 goles',  emoji: '⚽', market: 'over0_5'  },
          { key: 'pred_over15',  corr: 'correct_over15',  label: 'Over 1.5 goles',  emoji: '🔥', market: 'over1_5'  },
          { key: 'pred_over25',  corr: 'correct_over25',  label: 'Over 2.5 goles',  emoji: '💥', market: 'over2_5'  },
          { key: 'pred_under25', corr: 'correct_under25', label: 'Under 2.5 goles', emoji: '🔒', market: 'under2_5' },
          { key: 'pred_btts',    corr: 'correct_btts',    label: 'Ambos marcan',    emoji: '🎯', market: 'btts'     },
          { key: 'pred_over35',  corr: 'correct_over35',  label: 'Over 3.5 goles',  emoji: '🚀', market: 'over3_5'  },
        ] as const;
        for (const l of legacy) {
          const pred = (row as any)[l.key];
          const corr = (row as any)[l.corr];
          if (pred !== null && pred !== undefined && corr !== null && corr !== undefined) {
            addMkt(l.market, l.label, l.emoji, corr === true);
          }
        }
      }
    }

    // Build sorted MarketStat[]
    const markets: MarketStat[] = Object.values(mktMap)
      .map(m => ({
        label:     m.label,
        emoji:     m.emoji,
        predicted: m.predicted,
        correct:   m.correct,
        pct:       m.predicted > 0 ? Math.round((m.correct / m.predicted) * 100) : 0,
      }))
      .sort((a, b) => b.pct - a.pct);

    const toSub = (s: { p: number; c: number }) => ({
      predicted: s.p, correct: s.c,
      pct: s.p > 0 ? Math.round((s.c / s.p) * 100) : 0,
    });

    return {
      totalPredictions:   totalP,
      correctPredictions: totalC,
      overallPct:         totalP > 0 ? Math.round((totalC / totalP) * 100) : 0,
      totalMatches,
      markets,
      victorias: toSub(sub1x2.local),
      empates:   toSub(sub1x2.empate),
      visitante: toSub(sub1x2.visitante),
      lastUpdated: new Date(),
    };
  } catch { return null; }
}

// ─── Quick composite % for button badge ──────────────────────────────────────
export async function getQuickStats(): Promise<{ pct: number; total: number } | null> {
  try {
    const { data } = await supabase
      .from('match_predictions')
      .select('is_correct,predictions_json,pred_over05,pred_over15,pred_over25,pred_under25,pred_btts,pred_over35,correct_over05,correct_over15,correct_over25,correct_under25,correct_btts,correct_over35')
      .not('actual_outcome', 'is', null);

    if (!data || data.length === 0) return null;

    let total = 0, correct = 0;
    for (const r of data) {
      const preds: PredItem[] = (r as any).predictions_json ?? [];
      if (preds.length > 0) {
        for (const p of preds) {
          if (p.hit === undefined || p.hit === null) continue;
          total++;
          if (p.hit === true) correct++;
        }
      } else {
        // Fallback to old columns
        total++;   if (r.is_correct === true) correct++;
        const legacyPairs = [
          [(r as any).pred_over05,  (r as any).correct_over05],
          [(r as any).pred_over15,  (r as any).correct_over15],
          [(r as any).pred_over25,  (r as any).correct_over25],
          [(r as any).pred_under25, (r as any).correct_under25],
          [(r as any).pred_btts,    (r as any).correct_btts],
          [(r as any).pred_over35,  (r as any).correct_over35],
        ];
        for (const [pred, corr] of legacyPairs) {
          if (pred !== null && pred !== undefined && corr !== null && corr !== undefined) {
            total++; if (corr === true) correct++;
          }
        }
      }
    }
    if (total === 0) return null;
    return { pct: Math.round((correct / total) * 100), total };
  } catch { return null; }
}
