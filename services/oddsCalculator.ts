// ─── Motor de cuotas Poisson ───────────────────────────────────────────────────
// Calcula probabilidades reales para todos los mercados a partir de xG
// y las convierte en cuotas decimales con margen de casa (5%)

// xG por equipo para Mundial 2026 (basado en rendimiento histórico)
const TEAM_XG: Record<string, number> = {
  // Top tier
  Argentina: 1.75, Francia: 1.70, Brasil: 1.68, España: 1.65,
  Inglaterra: 1.62, Alemania: 1.60, Portugal: 1.58, Bélgica: 1.55,
  // Second tier
  Holanda: 1.42, Italia: 1.40, Uruguay: 1.38, Colombia: 1.36,
  México: 1.30, Croacia: 1.32, Senegal: 1.28, Marruecos: 1.26,
  'Estados Unidos': 1.24, Japón: 1.22, Ecuador: 1.20, Chile: 1.18,
  Perú: 1.16, 'Corea del Sur': 1.20, Australia: 1.15, Suiza: 1.30,
  Austria: 1.28, Dinamarca: 1.32, Polonia: 1.20, Suecia: 1.22,
  Noruega: 1.35, Serbia: 1.25, Turquía: 1.20, Ucrania: 1.22,
  // Resto
  Argelia: 1.10, Túnez: 1.05, Ghana: 1.08, Nigeria: 1.12,
  Camerún: 1.05, 'Côte d\'Ivoire': 1.15, Egipto: 1.10,
  'Arabia Saudí': 1.05, Irán: 1.00, Irak: 1.00, Jordania: 0.95,
  Catar: 0.90, Haití: 0.88, Curazao: 0.85, 'Cabo Verde': 0.92,
  'R.D. Congo': 0.88, Bolivia: 0.85, Venezuela: 0.95, Paraguay: 1.00,
};

const MARGIN = 0.05; // margen de la casa (5%)

function getXG(team: string): number {
  return TEAM_XG[team] ?? 1.10;
}

// Probabilidad de Poisson: P(k goles) dada media λ
function poisson(lambda: number, k: number): number {
  if (k < 0) return 0;
  let p = Math.exp(-lambda);
  for (let i = 1; i <= k; i++) p = (p * lambda) / i;
  return p;
}

// Distribución de marcadores (hasta max goles por equipo)
function scoreMatrix(homeXG: number, awayXG: number, max = 7) {
  const matrix: number[][] = [];
  for (let h = 0; h <= max; h++) {
    matrix[h] = [];
    for (let a = 0; a <= max; a++) {
      matrix[h][a] = poisson(homeXG, h) * poisson(awayXG, a);
    }
  }
  return matrix;
}

// Convierte probabilidad a cuota decimal con margen
function toOdds(prob: number): number {
  if (prob <= 0) return 99;
  const fair = 1 / prob;
  return Math.max(1.01, parseFloat((fair * (1 - MARGIN)).toFixed(2)));
}

// ─── Tipos de mercado ──────────────────────────────────────────────────────────
export interface Market {
  id:       string;
  label:    string;
  sublabel?: string;
  odds:     number;
  prob:     number; // 0-1
}

export interface MarketGroup {
  id:      string;
  icon:    string;
  title:   string;
  markets: Market[];
}

// ─── Generador principal ───────────────────────────────────────────────────────
export function generateAllMarkets(
  homeTeam: string,
  awayTeam: string,
  homeXG?: number,
  awayXG?: number,
): MarketGroup[] {
  const hXG = homeXG ?? getXG(homeTeam);
  const aXG = awayXG ?? getXG(awayTeam);
  const M   = scoreMatrix(hXG, aXG);

  // ─── 1X2 ────────────────────────────────────────────────────────────────────
  let pHome = 0, pDraw = 0, pAway = 0;
  for (let h = 0; h <= 7; h++) {
    for (let a = 0; a <= 7; a++) {
      const p = M[h][a];
      if (h > a) pHome += p;
      else if (h === a) pDraw += p;
      else pAway += p;
    }
  }

  // ─── Doble oportunidad ───────────────────────────────────────────────────────
  const p1X = pHome + pDraw;
  const p12 = pHome + pAway;
  const pX2 = pDraw + pAway;

  // ─── Goles totales ───────────────────────────────────────────────────────────
  function overProb(line: number): number {
    let p = 0;
    for (let h = 0; h <= 7; h++)
      for (let a = 0; a <= 7; a++)
        if (h + a > line) p += M[h][a];
    return p;
  }

  // ─── Ambos marcan ───────────────────────────────────────────────────────────
  let pBTTS = 0;
  for (let h = 1; h <= 7; h++)
    for (let a = 1; a <= 7; a++)
      pBTTS += M[h][a];

  // ─── Goles local ────────────────────────────────────────────────────────────
  function homeOver(line: number): number {
    let p = 0;
    for (let h = 0; h <= 7; h++)
      for (let a = 0; a <= 7; a++)
        if (h > line) p += M[h][a];
    return p;
  }

  function awayOver(line: number): number {
    let p = 0;
    for (let h = 0; h <= 7; h++)
      for (let a = 0; a <= 7; a++)
        if (a > line) p += M[h][a];
    return p;
  }

  // ─── Hándicap asiático ───────────────────────────────────────────────────────
  function handicapHome(hcap: number): number {
    let p = 0;
    for (let h = 0; h <= 7; h++)
      for (let a = 0; a <= 7; a++)
        if (h - a + hcap > 0) p += M[h][a];
    return p;
  }

  // ─── Marcadores exactos (top 8) ─────────────────────────────────────────────
  const scores: { label: string; prob: number }[] = [];
  for (let h = 0; h <= 4; h++)
    for (let a = 0; a <= 4; a++)
      scores.push({ label: `${h}-${a}`, prob: M[h][a] });
  scores.sort((a, b) => b.prob - a.prob);
  const topScores = scores.slice(0, 8);

  // ─── Tarjetas (estimación basada en intensidad del partido) ────────────────
  const intensity = Math.abs(hXG - aXG) < 0.3 ? 1.1 : 0.95; // partidos igualados = más tarjetas
  const avgCards  = 3.8 * intensity;
  function cardsOver(line: number): number {
    let p = 0;
    for (let k = Math.ceil(line) + 1; k <= 12; k++) p += poisson(avgCards, k);
    return p;
  }

  // ─── Córners (estimación) ────────────────────────────────────────────────────
  const avgCorners = (hXG + aXG) * 3.2 + 2;
  function cornersOver(line: number): number {
    let p = 0;
    for (let k = Math.ceil(line) + 1; k <= 22; k++) p += poisson(avgCorners, k);
    return p;
  }

  // ─── Tiros totales ───────────────────────────────────────────────────────────
  const avgShots = (hXG + aXG) * 7.2;
  function shotsOver(line: number): number {
    let p = 0;
    for (let k = Math.ceil(line) + 1; k <= 40; k++) p += poisson(avgShots, k);
    return p;
  }

  // ─── Primer goleador (basado en xG por jugador estimado) ─────────────────────
  // Usamos distribución uniforme entre los ~3 delanteros clave por equipo
  const homeScoreProb = 1 - poisson(hXG, 0); // prob de que el local marque al menos 1
  const awayScoreProb = 1 - poisson(aXG, 0);
  const noGoalProb    = poisson(hXG, 0) * poisson(aXG, 0);

  const homeStrikers = [
    { name: `Delantero 1 (${homeTeam})`, share: 0.32 },
    { name: `Delantero 2 (${homeTeam})`, share: 0.22 },
    { name: `Mediocampista (${homeTeam})`, share: 0.14 },
  ];
  const awayStrikers = [
    { name: `Delantero 1 (${awayTeam})`, share: 0.32 },
    { name: `Delantero 2 (${awayTeam})`, share: 0.22 },
    { name: `Mediocampista (${awayTeam})`, share: 0.14 },
  ];

  // ─── Construir grupos ────────────────────────────────────────────────────────
  return [
    {
      id: '1x2', icon: '🏆', title: 'RESULTADO',
      markets: [
        { id: 'home',  label: homeTeam,  sublabel: '1',  odds: toOdds(pHome), prob: pHome },
        { id: 'draw',  label: 'Empate',  sublabel: 'X',  odds: toOdds(pDraw), prob: pDraw },
        { id: 'away',  label: awayTeam,  sublabel: '2',  odds: toOdds(pAway), prob: pAway },
      ],
    },
    {
      id: 'dc', icon: '🔄', title: 'DOBLE OPORTUNIDAD',
      markets: [
        { id: 'dc1x', label: `${homeTeam} o Empate`, sublabel: '1X', odds: toOdds(p1X), prob: p1X },
        { id: 'dc12', label: 'Sin empate',           sublabel: '12', odds: toOdds(p12), prob: p12 },
        { id: 'dcx2', label: `${awayTeam} o Empate`, sublabel: 'X2', odds: toOdds(pX2), prob: pX2 },
      ],
    },
    {
      id: 'goals', icon: '⚽', title: 'GOLES TOTALES',
      markets: [
        { id: 'ov05',  label: 'Más de 0.5',  odds: toOdds(overProb(0.5)),  prob: overProb(0.5)  },
        { id: 'ov15',  label: 'Más de 1.5',  odds: toOdds(overProb(1.5)),  prob: overProb(1.5)  },
        { id: 'ov25',  label: 'Más de 2.5',  odds: toOdds(overProb(2.5)),  prob: overProb(2.5)  },
        { id: 'ov35',  label: 'Más de 3.5',  odds: toOdds(overProb(3.5)),  prob: overProb(3.5)  },
        { id: 'ov45',  label: 'Más de 4.5',  odds: toOdds(overProb(4.5)),  prob: overProb(4.5)  },
        { id: 'un05',  label: 'Menos de 0.5', odds: toOdds(1 - overProb(0.5)), prob: 1 - overProb(0.5) },
        { id: 'un15',  label: 'Menos de 1.5', odds: toOdds(1 - overProb(1.5)), prob: 1 - overProb(1.5) },
        { id: 'un25',  label: 'Menos de 2.5', odds: toOdds(1 - overProb(2.5)), prob: 1 - overProb(2.5) },
        { id: 'un35',  label: 'Menos de 3.5', odds: toOdds(1 - overProb(3.5)), prob: 1 - overProb(3.5) },
        { id: 'btts_y', label: 'Ambos marcan — Sí', odds: toOdds(pBTTS),     prob: pBTTS     },
        { id: 'btts_n', label: 'Ambos marcan — No', odds: toOdds(1 - pBTTS), prob: 1 - pBTTS },
      ],
    },
    {
      id: 'teamgoals', icon: '🎯', title: 'GOLES POR EQUIPO',
      markets: [
        { id: 'h05', label: `${homeTeam} +0.5`, odds: toOdds(homeOver(0.5)), prob: homeOver(0.5) },
        { id: 'h15', label: `${homeTeam} +1.5`, odds: toOdds(homeOver(1.5)), prob: homeOver(1.5) },
        { id: 'h25', label: `${homeTeam} +2.5`, odds: toOdds(homeOver(2.5)), prob: homeOver(2.5) },
        { id: 'a05', label: `${awayTeam} +0.5`, odds: toOdds(awayOver(0.5)), prob: awayOver(0.5) },
        { id: 'a15', label: `${awayTeam} +1.5`, odds: toOdds(awayOver(1.5)), prob: awayOver(1.5) },
        { id: 'a25', label: `${awayTeam} +2.5`, odds: toOdds(awayOver(2.5)), prob: awayOver(2.5) },
      ],
    },
    {
      id: 'handicap', icon: '⚖️', title: 'HÁNDICAP ASIÁTICO',
      markets: [
        { id: 'hh-15', label: `${homeTeam} -1.5`, odds: toOdds(handicapHome(1.5)),  prob: handicapHome(1.5)  },
        { id: 'hh-10', label: `${homeTeam} -1`,   odds: toOdds(handicapHome(1)),    prob: handicapHome(1)    },
        { id: 'hh-05', label: `${homeTeam} -0.5`, odds: toOdds(handicapHome(0.5)),  prob: handicapHome(0.5)  },
        { id: 'hh+05', label: `${homeTeam} +0.5`, odds: toOdds(handicapHome(-0.5)), prob: handicapHome(-0.5) },
        { id: 'hh+10', label: `${homeTeam} +1`,   odds: toOdds(handicapHome(-1)),   prob: handicapHome(-1)   },
        { id: 'hh+15', label: `${homeTeam} +1.5`, odds: toOdds(handicapHome(-1.5)), prob: handicapHome(-1.5) },
      ],
    },
    {
      id: 'corners', icon: '🚩', title: 'CÓRNERS',
      markets: [
        { id: 'c75',  label: 'Más de 7.5',  odds: toOdds(cornersOver(7.5)),  prob: cornersOver(7.5)  },
        { id: 'c85',  label: 'Más de 8.5',  odds: toOdds(cornersOver(8.5)),  prob: cornersOver(8.5)  },
        { id: 'c95',  label: 'Más de 9.5',  odds: toOdds(cornersOver(9.5)),  prob: cornersOver(9.5)  },
        { id: 'c105', label: 'Más de 10.5', odds: toOdds(cornersOver(10.5)), prob: cornersOver(10.5) },
        { id: 'c115', label: 'Más de 11.5', odds: toOdds(cornersOver(11.5)), prob: cornersOver(11.5) },
        { id: 'cu75', label: 'Menos de 7.5', odds: toOdds(1-cornersOver(7.5)), prob: 1-cornersOver(7.5) },
        { id: 'cu85', label: 'Menos de 8.5', odds: toOdds(1-cornersOver(8.5)), prob: 1-cornersOver(8.5) },
        { id: 'cu95', label: 'Menos de 9.5', odds: toOdds(1-cornersOver(9.5)), prob: 1-cornersOver(9.5) },
      ],
    },
    {
      id: 'cards', icon: '🟨', title: 'TARJETAS',
      markets: [
        { id: 'ca25', label: 'Más de 2.5 tarjetas',  odds: toOdds(cardsOver(2.5)),  prob: cardsOver(2.5)  },
        { id: 'ca35', label: 'Más de 3.5 tarjetas',  odds: toOdds(cardsOver(3.5)),  prob: cardsOver(3.5)  },
        { id: 'ca45', label: 'Más de 4.5 tarjetas',  odds: toOdds(cardsOver(4.5)),  prob: cardsOver(4.5)  },
        { id: 'ca55', label: 'Más de 5.5 tarjetas',  odds: toOdds(cardsOver(5.5)),  prob: cardsOver(5.5)  },
        { id: 'cu25', label: 'Menos de 2.5 tarjetas', odds: toOdds(1-cardsOver(2.5)), prob: 1-cardsOver(2.5) },
        { id: 'cu35', label: 'Menos de 3.5 tarjetas', odds: toOdds(1-cardsOver(3.5)), prob: 1-cardsOver(3.5) },
      ],
    },
    {
      id: 'shots', icon: '🎯', title: 'TIROS TOTALES',
      markets: [
        { id: 'sh195', label: 'Más de 19.5 tiros',  odds: toOdds(shotsOver(19.5)),  prob: shotsOver(19.5)  },
        { id: 'sh215', label: 'Más de 21.5 tiros',  odds: toOdds(shotsOver(21.5)),  prob: shotsOver(21.5)  },
        { id: 'sh235', label: 'Más de 23.5 tiros',  odds: toOdds(shotsOver(23.5)),  prob: shotsOver(23.5)  },
        { id: 'sh255', label: 'Menos de 19.5 tiros', odds: toOdds(1-shotsOver(19.5)), prob: 1-shotsOver(19.5) },
        { id: 'sh275', label: 'Menos de 21.5 tiros', odds: toOdds(1-shotsOver(21.5)), prob: 1-shotsOver(21.5) },
      ],
    },
    {
      id: 'exact', icon: '🔢', title: 'MARCADOR EXACTO',
      markets: topScores.map((s, i) => ({
        id: `sc${i}`,
        label: s.label,
        sublabel: `${(s.prob * 100).toFixed(1)}% prob`,
        odds: toOdds(s.prob),
        prob: s.prob,
      })),
    },
  ];
}
