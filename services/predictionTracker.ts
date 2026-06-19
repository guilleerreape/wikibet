/**
 * predictionTracker.ts — AI accuracy tracking (global, shared via Supabase)
 * Dynamic system: AI emits as many predictions as it's confident about.
 * Each prediction stored in predictions_json (JSONB). All aggregate into global %.
 */

import { supabase } from './supabase';

export type Outcome = 'local' | 'empate' | 'visitante';

// ─── Dynamic prediction item ──────────────────────────────────────────────────
export interface PredItem {
  market: string;   // 'over0_5' | 'over2_5' | 'corners_over8_5' | 'cards_over3_5' | 'fouls_over20_5' | 'btts' | '1x2' | 'dc_1x' | 'scorer' ...
  label:  string;   // Human-readable
  emoji:  string;   // Display emoji
  prob?:  number;   // AI confidence % (e.g. 87)
  cuota?: number;   // Real market odds for this bet
  value?: string;   // For 1x2: 'local'|'empate'|'visitante'. For scorer: player name
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
  const prob1x2 = Math.max(pL, pD, pA);
  preds.push({ market: '1x2', label: outcomeLabel, emoji: '🏆', value: outcome, prob: Math.round(prob1x2) });

  // ── Over 0.5: incluir si >= 70% ────────────────────────────────────────────
  const over05 = goles.over0_5?.total ?? 90;
  if (over05 >= 70) {
    preds.push({ market: 'over0_5', label: 'Al menos 1 gol (Over 0.5)', emoji: '⚽', prob: Math.round(over05) });
  }

  // ── Under 3.5: fácil, incluir si >= 62% ───────────────────────────────────
  const over35raw = goles.over3_5?.total ?? mkts.over3_5 ?? 0;
  const under35 = 100 - over35raw;
  if (under35 >= 62) {
    preds.push({ market: 'under3_5', label: 'Menos de 3.5 goles', emoji: '🛡️', prob: Math.round(under35) });
  }

  // ── Over 1.5 o Under 1.5: incluir el lado confiado si >= 62% ──────────────
  const over15 = goles.over1_5?.total ?? mkts.over1_5 ?? 0;
  if (over15 >= 62) {
    preds.push({ market: 'over1_5', label: 'Más de 1.5 goles', emoji: '🔥', prob: Math.round(over15) });
  } else if ((100 - over15) >= 72) {
    preds.push({ market: 'under1_5', label: 'Menos de 1.5 goles', emoji: '🔒', prob: Math.round(100 - over15) });
  }

  // ── Over 2.5 o Under 2.5: incluir el lado confiado si >= 58% ──────────────
  const over25 = goles.over2_5?.total ?? mkts.over2_5 ?? 0;
  if (over25 >= 58) {
    preds.push({ market: 'over2_5', label: 'Más de 2.5 goles', emoji: '💥', prob: Math.round(over25) });
  } else if ((100 - over25) >= 58) {
    preds.push({ market: 'under2_5', label: 'Menos de 2.5 goles', emoji: '🔒', prob: Math.round(100 - over25) });
  }

  // ── BTTS Sí o No: incluir el lado confiado si >= 58% ──────────────────────
  const btts   = mkts.btts_si ?? 0;
  const bttsNo = mkts.btts_no ?? (100 - btts);
  if (btts >= 58) {
    preds.push({ market: 'btts', label: 'Ambos equipos marcan', emoji: '🎯', prob: Math.round(btts) });
  } else if (bttsNo >= 58) {
    preds.push({ market: 'btts_no', label: 'No marcan los dos (BTTS No)', emoji: '🚫', prob: Math.round(bttsNo) });
  }

  // ── Over 3.5: solo si >= 55% ───────────────────────────────────────────────
  if (over35raw >= 55) {
    preds.push({ market: 'over3_5', label: 'Más de 3.5 goles', emoji: '🚀', prob: Math.round(over35raw) });
  }

  // ── Corners ────────────────────────────────────────────────────────────────
  const corners = predicciones?.corners ?? {};
  if ((corners.over8_5 ?? 0) >= 60) {
    preds.push({ market: 'corners_over8_5', label: 'Más de 8.5 córners', emoji: '🚩', prob: Math.round(corners.over8_5) });
  } else if ((corners.under8_5 ?? 0) >= 60) {
    preds.push({ market: 'corners_under8_5', label: 'Menos de 8.5 córners', emoji: '🚩', prob: Math.round(corners.under8_5) });
  }
  if ((corners.over9_5 ?? 0) >= 55) {
    preds.push({ market: 'corners_over9_5', label: 'Más de 9.5 córners', emoji: '🚩', prob: Math.round(corners.over9_5) });
  }

  // ── Cards ──────────────────────────────────────────────────────────────────
  const tarjetas = predicciones?.tarjetas ?? {};
  if ((tarjetas.over2_5 ?? 0) >= 60) {
    preds.push({ market: 'cards_over2_5', label: 'Más de 2.5 tarjetas', emoji: '🟨', prob: Math.round(tarjetas.over2_5) });
  }
  if ((tarjetas.over3_5 ?? 0) >= 55) {
    preds.push({ market: 'cards_over3_5', label: 'Más de 3.5 tarjetas', emoji: '🟨', prob: Math.round(tarjetas.over3_5) });
  } else if ((tarjetas.under3_5 ?? 0) >= 60) {
    preds.push({ market: 'cards_under3_5', label: 'Menos de 3.5 tarjetas', emoji: '🟨', prob: Math.round(tarjetas.under3_5) });
  }

  // ── First-half scoring ─────────────────────────────────────────────────────
  const mpt = predicciones?.marcadorPorTiempo ?? {};
  const localH1 = mpt.equipoLocal_1H_marcar ?? 0;
  const awayH1  = mpt.equipoVisitante_1H_marcar ?? 0;
  if (localH1 >= 55) {
    preds.push({ market: 'local_score_1H', label: 'Local marca en 1ª parte', emoji: '⏱️', prob: Math.round(localH1) });
  }
  if (awayH1 >= 50) {
    preds.push({ market: 'away_score_1H', label: 'Visitante marca en 1ª parte', emoji: '⏱️', prob: Math.round(awayH1) });
  }

  // ── Fouls over/under ───────────────────────────────────────────────────────
  const faltas = predicciones?.faltas ?? {};
  if ((faltas.over20_5 ?? 0) >= 62) {
    preds.push({ market: 'fouls_over20_5', label: 'Más de 20.5 faltas', emoji: '⚠️', prob: Math.round(faltas.over20_5) });
  }

  return preds;
}

// ─── Build verifiable predictions from the AI's own recommended bets ──────────
// Reads analysis.apuestasRecomendadas (varied + reasoned per match, with real odds)
// and parses each into a verifiable PredItem. This makes the AI bet panel DYNAMIC
// per match instead of always emitting the same generic markets.
export function buildDynamicPredictions(analysis: any, homeTeam: string, awayTeam: string): PredItem[] {
  const apuestas: any[] = analysis?.apuestasRecomendadas ?? [];
  const out: PredItem[] = [];
  const seen = new Set<string>();

  const push = (item: PredItem) => {
    if (seen.has(item.market)) return;
    seen.add(item.market);
    out.push(item);
  };

  // Always include the headline 1X2 from computed probabilities
  const probs = analysis?.predicciones?.probabilidades;
  if (probs) {
    const pL = probs.victoriaLocal ?? 0, pD = probs.empate ?? 0, pA = probs.victoriaVisitante ?? 0;
    const outcome: Outcome = pL >= pD && pL >= pA ? 'local' : pD >= pL && pD >= pA ? 'empate' : 'visitante';
    push({
      market: '1x2', emoji: '🏆',
      label: outcome === 'local' ? `Victoria ${homeTeam}` : outcome === 'empate' ? 'Empate' : `Victoria ${awayTeam}`,
      value: outcome, prob: Math.round(Math.max(pL, pD, pA)),
      cuota: analysis?.predicciones?.cuotasTeoricas?.[outcome === 'local' ? 'victoriaLocal' : outcome === 'empate' ? 'empate' : 'victoriaVisitante'],
    });
  }

  for (const a of apuestas) {
    const parsed = parseBetToPredItem(a, homeTeam, awayTeam);
    if (parsed) push(parsed);
  }

  // If the AI gave us almost nothing parseable, fall back to structured markets
  if (out.length < 4 && analysis?.predicciones) {
    for (const p of buildConfidentPredictions(analysis.predicciones)) push(p);
  }
  return out;
}

// Parse a single AI bet ({mercado, seleccion, cuota, probabilidad}) into a PredItem.
export function parseBetToPredItem(a: any, homeTeam: string, awayTeam: string): PredItem | null {
  const txt = `${a?.mercado ?? ''} ${a?.seleccion ?? ''}`.toLowerCase().trim();
  if (!txt) return null;
  const cuota = typeof a?.cuota === 'number' ? a.cuota : undefined;
  const prob  = typeof a?.probabilidad === 'number' ? Math.round(a.probabilidad) : undefined;
  const hL = homeTeam.toLowerCase(), aL = awayTeam.toLowerCase();

  // Extract a "N.5" line if present
  const lineMatch = txt.match(/(\d+)[.,](\d+)/);
  const lineKey = lineMatch ? `${lineMatch[1]}_${lineMatch[2]}` : null;
  const lineLabel = lineMatch ? `${lineMatch[1]}.${lineMatch[2]}` : '';
  const isUnder = /under|menos|<|por debajo/.test(txt);
  const side = isUnder ? 'under' : 'over';
  const sideLabel = isUnder ? 'Menos de' : 'Más de';

  const base = (market: string, label: string, emoji: string): PredItem => ({ market, label, emoji, prob, cuota });

  // ── Córners ──
  if (/c[óo]rner/.test(txt)) {
    if (!lineKey) return null;
    return base(`corners_${side}${lineKey}`, `${sideLabel} ${lineLabel} córners`, '🚩');
  }
  // ── Tarjetas ──
  if (/tarjeta/.test(txt)) {
    if (!lineKey) return null;
    return base(`cards_${side}${lineKey}`, `${sideLabel} ${lineLabel} tarjetas`, '🟨');
  }
  // ── Faltas ──
  if (/falta/.test(txt)) {
    if (!lineKey) return null;
    return base(`fouls_${side}${lineKey}`, `${sideLabel} ${lineLabel} faltas`, '⚠️');
  }
  // ── BTTS / Ambos marcan ──
  if (/ambos\s+marcan|btts|ambos\s+equipos/.test(txt)) {
    const no = /\bno\b/.test(txt);
    return base(no ? 'btts_no' : 'btts', no ? 'No marcan los dos' : 'Ambos equipos marcan', no ? '🚫' : '🎯');
  }
  // ── Goles over/under ──
  if (/gol/.test(txt) && lineKey) {
    const emoji = side === 'over' ? (parseFloat(lineLabel) >= 3 ? '🚀' : '💥') : '🛡️';
    return base(`${side}${lineKey}`, `${sideLabel} ${lineLabel} goles`, emoji);
  }
  // ── Doble oportunidad ── (strip the "1X2" market token first so it isn't confused)
  const txtDC = txt.replace(/1\s*[x×]\s*2/g, ' ');
  if (/doble\s*opor|doble\b/.test(txt) || /\b1x\b|\bx2\b|\b12\b/.test(txtDC)) {
    if (/1x|local.*empate|empate.*local/.test(txtDC)) return base('dc_1x', `Doble: ${homeTeam} o Empate`, '🛡️');
    if (/x2|visitante.*empate|empate.*visitante/.test(txtDC)) return base('dc_x2', `Doble: Empate o ${awayTeam}`, '🛡️');
    if (/\b12\b/.test(txtDC)) return base('dc_12', 'Doble: Local o Visitante', '🛡️');
  }
  // ── Goleador ──
  if (/goleador|marca(r)?\b|anytime|primer gol/.test(txt)) {
    // Player name usually in seleccion before keywords
    const sel = (a?.seleccion ?? '').trim();
    const name = sel.replace(/goleador|anytime|primer|marca(r)?|gol|en cualquier momento|\(.*\)/gi, '').trim();
    if (name.length >= 3) return { market: 'scorer', label: `${name} marca`, emoji: '🥅', value: name, prob, cuota };
    return null;
  }
  // ── 1X2 / Victoria ──
  if (/victoria|gana|1x2|resultado/.test(txt)) {
    if (txt.includes(hL) || /local/.test(txt)) return { market: '1x2', label: `Victoria ${homeTeam}`, emoji: '🏆', value: 'local', prob, cuota };
    if (txt.includes(aL) || /visitante/.test(txt)) return { market: '1x2', label: `Victoria ${awayTeam}`, emoji: '🏆', value: 'visitante', prob, cuota };
    if (/empate/.test(txt)) return { market: '1x2', label: 'Empate', emoji: '🏆', value: 'empate', prob, cuota };
  }
  return null;
}

// ─── Real match stats (from ESPN / TheSportsDB) ───────────────────────────────
export interface LiveMatchStats {
  corners?:     number;  // total corners
  yellowCards?: number;  // total yellow cards
  redCards?:    number;  // total red cards (each counts as 1 for betting total)
  fouls?:       number;  // total fouls
  // Optional list of scorer names (lowercased) to verify goalscorer markets
  scorers?:     string[];
  // totalCards = yellowCards + redCards
}

// Returns hit (true/false) or undefined when the market cannot be verified yet.
// ctx carries the score plus any real stats that are available.
function verifyMarket(p: PredItem, ctx: {
  hs: number; as_: number; stats?: LiveMatchStats;
}): boolean | undefined {
  const { hs, as_, stats } = ctx;
  const total      = hs + as_;
  const actual1x2  = outcomeFromScore(hs, as_);
  const corners    = stats?.corners;
  const fouls      = stats?.fouls;
  const totalCards = (stats?.yellowCards != null || stats?.redCards != null)
    ? (stats?.yellowCards ?? 0) + (stats?.redCards ?? 0)
    : undefined;

  // Parameterized line parsing: "corners_over8_5" → { side:'over', line:8.5 }
  const parseLine = (market: string, prefix: string): { side: 'over' | 'under'; line: number } | null => {
    const m = market.match(new RegExp(`^${prefix}_(over|under)(\\d+)_(\\d+)$`));
    if (!m) return null;
    return { side: m[1] as 'over' | 'under', line: parseFloat(`${m[2]}.${m[3]}`) };
  };
  const cmp = (value: number | undefined, side: 'over' | 'under', line: number): boolean | undefined => {
    if (value == null) return undefined;
    return side === 'over' ? value > line : value < line;
  };

  // Goals over/under (generic): goals_over2_5 / over2_5 / under2_5
  const goalsLine = parseLine(p.market, 'goals') || (() => {
    const m = p.market.match(/^(over|under)(\d+)_(\d+)$/);
    return m ? { side: m[1] as 'over' | 'under', line: parseFloat(`${m[2]}.${m[3]}`) } : null;
  })();
  if (goalsLine) return cmp(total, goalsLine.side, goalsLine.line);

  // Corners
  const cLine = parseLine(p.market, 'corners');
  if (cLine) return cmp(corners, cLine.side, cLine.line);

  // Cards (red counts as a card)
  const kLine = parseLine(p.market, 'cards');
  if (kLine) return cmp(totalCards, kLine.side, kLine.line);

  // Fouls
  const fLine = parseLine(p.market, 'fouls');
  if (fLine) return cmp(fouls, fLine.side, fLine.line);

  switch (p.market) {
    case '1x2':     return p.value === actual1x2;
    case 'btts':    return hs > 0 && as_ > 0;
    case 'btts_no': return !(hs > 0 && as_ > 0);
    // Double chance
    case 'dc_1x':   return actual1x2 === 'local' || actual1x2 === 'empate';
    case 'dc_x2':   return actual1x2 === 'visitante' || actual1x2 === 'empate';
    case 'dc_12':   return actual1x2 === 'local' || actual1x2 === 'visitante';
    // Goalscorer — needs scorer list
    case 'scorer':
      if (!stats?.scorers) return undefined;
      return p.value ? stats.scorers.some(s => s.includes(p.value!.toLowerCase()) || p.value!.toLowerCase().includes(s)) : undefined;
    // Half-time specific — cannot verify from final score
    case 'local_score_1H':
    case 'away_score_1H':
      return undefined;
    default:
      return undefined;  // unknown / not yet verifiable → never count as wrong
  }
}

// ─── Verify predictions against actual score (no extra stats) ─────────────────
// Score-only markets get true/false; stats-only markets (corners/cards/fouls)
// stay undefined so they're never counted as wrong without real data.
export function verifyPredictions(preds: PredItem[], hs: number, as_: number): PredItem[] {
  return preds.map(p => ({ ...p, hit: verifyMarket(p, { hs, as_ }) }));
}

// ─── Verify predictions with real match stats (corners, cards, fouls) ────────
// Call this when ESPN/TheSportsDB stats are available. Red cards count as cards.
export function verifyPredictionsWithStats(
  preds: PredItem[],
  hs: number,
  as_: number,
  stats: LiveMatchStats
): PredItem[] {
  return preds.map(p => ({ ...p, hit: verifyMarket(p, { hs, as_, stats }) }));
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

  // Estimated corners / cards / fouls (so these markets are tracked too)
  const totalCorners = Math.round(8 + exp * 1.6);            // ~9-12
  const totalCards   = 3 + Math.round((10 - (pH + pA) * 5)); // tighter games → more cards
  const totalFouls   = Math.round(20 + (1 - Math.abs(pH - pA)) * 6);

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
      corners: {
        over8_5:  totalCorners >= 9  ? 64 : 45,
        under8_5: totalCorners >= 9  ? 36 : 55,
        over9_5:  totalCorners >= 10 ? 58 : 38,
      },
      tarjetas: {
        over2_5:  totalCards >= 3 ? 66 : 45,
        over3_5:  totalCards >= 4 ? 56 : 35,
        under3_5: totalCards <  4 ? 60 : 40,
      },
      faltas: {
        over20_5: totalFouls >= 21 ? 64 : 42,
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
// Pass real match stats (corners/cards/fouls) to verify ALL markets correctly.
export async function updateActualResult(
  matchId: string, homeScore: number, awayScore: number, stats?: LiveMatchStats
): Promise<void> {
  try {
    const { data } = await supabase
      .from('match_predictions')
      .select('predicted_outcome,actual_outcome,predictions_json')
      .eq('match_id', matchId).maybeSingle();
    if (!data) return;
    // Re-verify even if already finished, so newly-available stats upgrade old rows.

    const actual   = outcomeFromScore(homeScore, awayScore);
    const total    = homeScore + awayScore;
    const rawPreds: PredItem[] = data.predictions_json ?? [];
    const verified = rawPreds.length > 0
      ? (stats ? verifyPredictionsWithStats(rawPreds, homeScore, awayScore, stats)
               : verifyPredictions(rawPreds, homeScore, awayScore))
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

// ─── Re-verify ALL finished matches with freshly-fetched real stats ───────────
// statsFetcher resolves corners/cards/fouls for a match; pass from the UI layer
// (which has access to ESPN + TheSportsDB) to avoid circular imports here.
export async function reVerifyAllMatches(
  statsFetcher?: (matchId: string, home: string, away: string) => Promise<LiveMatchStats | null>
): Promise<number> {
  try {
    const { data } = await supabase
      .from('match_predictions')
      .select('match_id,home_team,away_team,home_score,away_score,predicted_outcome,predictions_json')
      .not('actual_outcome', 'is', null);
    if (!data || data.length === 0) return 0;

    let updated = 0;
    for (const row of data) {
      const hs = row.home_score, as_ = row.away_score;
      if (hs == null || as_ == null) continue;
      const rawPreds: PredItem[] = row.predictions_json ?? [];
      if (rawPreds.length === 0) continue;

      let stats: LiveMatchStats | null = null;
      if (statsFetcher) {
        try { stats = await statsFetcher(row.match_id, row.home_team, row.away_team); } catch {}
      }
      const verified = stats
        ? verifyPredictionsWithStats(rawPreds, hs, as_, stats)
        : verifyPredictions(rawPreds, hs, as_);

      await supabase.from('match_predictions').update({
        is_correct:       row.predicted_outcome === outcomeFromScore(hs, as_),
        predictions_json: verified,
      }).eq('match_id', row.match_id);
      updated++;
    }
    return updated;
  } catch { return 0; }
}

// Group parameterized markets into clean categories for the accuracy table.
// All corner lines → "corners", all card lines → "cards", etc. Goals stay per-line.
function normalizeMarketGroup(market: string): string {
  if (market.startsWith('corners_')) return 'corners';
  if (market.startsWith('cards_'))   return 'cards';
  if (market.startsWith('fouls_'))   return 'fouls';
  if (market.startsWith('dc_'))      return 'double_chance';
  return market;
}
function normalizeMarketLabel(market: string, fallback: string): string {
  const g = normalizeMarketGroup(market);
  switch (g) {
    case 'corners':       return 'Córners (todas las líneas)';
    case 'cards':         return 'Tarjetas (incl. rojas)';
    case 'fouls':         return 'Faltas';
    case 'double_chance': return 'Doble oportunidad';
    case 'scorer':        return 'Goleador';
    default:              return fallback;
  }
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
          // Only skip when we genuinely have no result yet (hit undefined/null).
          // Corners/cards/fouls NOW count whenever real stats verified them.
          if (p.hit === undefined || p.hit === null) continue;
          const label =
            p.market === '1x2' ? 'Resultado 1X2' :
            normalizeMarketLabel(p.market, p.label);
          addMkt(normalizeMarketGroup(p.market), label, p.emoji, p.hit === true);

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
          // Skip only when there's no result yet. Corners/cards/fouls count
          // once real stats have verified them (hit is a boolean).
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
