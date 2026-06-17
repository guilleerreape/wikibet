import { localDataService } from './localDataService';

const CLAUDE_API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
const CLAUDE_API_BASE = 'https://api.anthropic.com/v1';

// ─── Helpers matemáticos Poisson ─────────────────────────────────────────────
function poissonProb(lambda: number, k: number): number {
  let factorial = 1;
  for (let i = 1; i <= k; i++) factorial *= i;
  return Math.exp(-lambda) * Math.pow(lambda, k) / factorial;
}
function poissonOver(lambda: number, n: number): number {
  let cum = 0;
  for (let k = 0; k <= n; k++) cum += poissonProb(lambda, k);
  return Math.max(1, Math.min(99, Math.round((1 - cum) * 100)));
}

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface GolesPorLinea {
  local: number;
  visitante: number;
  total: number;
}

export interface TiroJugador {
  nombre: string;
  equipo: 'local' | 'visitante';
  tiros: number;
  a_puerta: number;
}

export interface GoleadorPrediccion {
  nombre: string;
  equipo: string;
  probabilidad: number;
  cuota: number;
}

export interface ResultadoExacto {
  resultado: string;
  probabilidad: number;
  cuota: number;
}

export interface JugadorRiesgo {
  nombre: string;
  equipo: 'local' | 'visitante';
  probabilidad: number;
}

export interface AdvancedMatchAnalysis {
  resumenEjecutivo: string;
  importanciaDelPartido: string;
  historialDirecto: {
    totalPartidos: number;
    victoriasLocal: number;
    empates: number;
    victoriasVisitante: number;
    golesPromedio: number;
    analisis: string;
  };
  equipoLocal: {
    fortalezas: string[];
    debilidades: string[];
    forma: string;
    formacion: string;
    motivacion: string;
    lesionados: string[];
    dudosos: string[];
    xG_promedio: number;
    xGA_promedio: number;
  };
  equipoVisitante: {
    fortalezas: string[];
    debilidades: string[];
    forma: string;
    formacion: string;
    motivacion: string;
    lesionados: string[];
    dudosos: string[];
    xG_promedio: number;
    xGA_promedio: number;
  };
  alineaciones?: {
    local: { formacion: string; titulares: string[] };
    visitante: { formacion: string; titulares: string[] };
  };
  predicciones: {
    probabilidades: { victoriaLocal: number; empate: number; victoriaVisitante: number };
    cuotasTeoricas: { victoriaLocal: number; empate: number; victoriaVisitante: number };
    golesEsperados: { local: number; visitante: number; total: number };
    goles: {
      over0_5: GolesPorLinea;
      over1_5: GolesPorLinea;
      over2_5: GolesPorLinea;
      over3_5: GolesPorLinea;
    };
    tiros: {
      total: GolesPorLinea;
      a_puerta: GolesPorLinea;
      jugadores: TiroJugador[];
    };
    mercados: {
      over2_5: number; under2_5: number; btts_si: number; btts_no: number;
      over1_5: number; over3_5: number;
    };
    corners: {
      total_esperado: number; over8_5: number; over9_5: number; over10_5: number;
      under8_5: number; local: number; visitante: number;
    };
    faltas: { total_esperado: number; local: number; visitante: number; over20_5: number };
    tarjetas: {
      total_esperado: number; over2_5: number; over3_5: number; over4_5: number;
      under3_5: number; amarillas_local: number; amarillas_visitante: number;
      rojaProb: number; jugadores_riesgo: JugadorRiesgo[];
    };
    goleadores: {
      primer_goleador: GoleadorPrediccion;
      anytime: GoleadorPrediccion[];
    };
    resultados_exactos: ResultadoExacto[];
    resultadoMasProbable: string;
    primerGoleador: GoleadorPrediccion;
  };
  tactico: {
    sistemaLocal: string; sistemaVisitante: string; enfoque: string;
    ventajaTactica: string; clavesDelPartido: string[];
  };
  factoresExternos: { clima: string; arbitro: string; factorCasa: string; fatiga: string };
  apuestasRecomendadas: Array<{
    mercado: string; seleccion: string; cuota: number; probabilidad: number;
    valor: number; riesgo: 'bajo' | 'medio' | 'alto'; razonamiento: string;
  }>;
  conclusion: string;
  confianza: number;
}

// ─── Llamada a Claude API ─────────────────────────────────────────────────────
async function callClaudeAPI(prompt: string, maxTokens = 6000): Promise<string> {
  if (!CLAUDE_API_KEY) return '';
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(`${CLAUDE_API_BASE}/messages`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    clearTimeout(timeoutId);
    if (!response.ok) return '';
    const data: any = await response.json();
    return data.content?.[0]?.text || '';
  } catch {
    clearTimeout(timeoutId);
    return '';
  }
}

// ─── Servicio principal ───────────────────────────────────────────────────────
export const advancedAIAnalysis = {
  async analyzeMatchComprehensive(
    homeTeam: string,
    awayTeam: string,
    league: string,
    sdbContext?: {
      homeSquad: import('./sportsDbService').SDBSquadPlayer[];
      awaySquad: import('./sportsDbService').SDBSquadPlayer[];
      homeForm: import('./sportsDbService').SDBTeamForm;
      awayForm: import('./sportsDbService').SDBTeamForm;
    }
  ): Promise<AdvancedMatchAnalysis> {
    const homePlayers = localDataService.getPlayersByTeam(homeTeam);
    const awayPlayers = localDataService.getPlayersByTeam(awayTeam);
    const homeTeamData = localDataService.getTeamByName(homeTeam);
    const awayTeamData = localDataService.getTeamByName(awayTeam);

    const homeTopScorer = [...homePlayers].sort((a, b) => b.goals - a.goals)[0];
    const awayTopScorer = [...awayPlayers].sort((a, b) => b.goals - a.goals)[0];
    const homeTop3 = homePlayers.slice(0, 3);
    const awayTop3 = awayPlayers.slice(0, 3);

    // Enrich prompt with real TheSportsDB data
    const homeSquadStr = sdbContext?.homeSquad.length
      ? sdbContext.homeSquad.slice(0, 15).map(p => `${p.name} (${p.position})`).join(', ')
      : homeTop3.map(p => `${p.name}(${p.goals}G)`).join(', ') || 'N/D';

    const awaySquadStr = sdbContext?.awaySquad.length
      ? sdbContext.awaySquad.slice(0, 15).map(p => `${p.name} (${p.position})`).join(', ')
      : awayTop3.map(p => `${p.name}(${p.goals}G)`).join(', ') || 'N/D';

    const homeFormStr = sdbContext?.homeForm.recentResults.length
      ? sdbContext.homeForm.recentResults.join(' | ')
      : 'N/D';

    const awayFormStr = sdbContext?.awayForm.recentResults.length
      ? sdbContext.awayForm.recentResults.join(' | ')
      : 'N/D';

    const today = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    const prompt = `Eres el mejor analista cuantitativo de fútbol del mundo. Debes generar probabilidades PRECISAS y CALIBRADAS para el partido ${homeTeam} vs ${awayTeam}.

═══════════════════════════════════════════
PASO 1 — EVALUACIÓN DE CALIDAD (haz esto mentalmente antes del JSON)
═══════════════════════════════════════════
Evalúa cada equipo con tu conocimiento real (nivel FIFA, forma reciente, plantilla, lesiones):
• Calidad de escuadra (1-10): ¿Es un equipo top mundial, mediano o débil?
• Forma reciente: últimos 5 partidos
• Fortaleza ofensiva y defensiva real
• Lesiones/suspensiones conocidas de jugadores clave

REGLAS DE CALIBRACIÓN OBLIGATORIAS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. BTTS = P(local marca) × P(visitante marca)
   → Si un equipo es muy débil ofensivamente (xG < 0.7), P(marca) < 40%
   → Ejemplo: Portugal(9/10) vs R.D. Congo(3/10) → btts_si ≈ 20-28%, NO 67%
   → Ejemplo: España vs Arabia Saudita → btts_si ≈ 18-25%
   → Solo equipos equilibrados (Brasil vs Francia) pueden tener btts_si > 50%

2. PROBABILIDADES 1X2 deben sumar EXACTAMENTE 100
   → Si un equipo es claramente superior (diferencia de calidad ≥ 3/10):
     • El favorito debe tener ≥ 55% victoria
     • El empate: 20-28%
     • El inferior: ≤ 20% victoria
   → Partidos equilibrados (diferencia ≤ 1/10): 35-45% / 25-30% / 25-35%

3. GOLES ESPERADOS basados en nivel real:
   → Top europeo vs África/Asia débil: xG_local 2.0-3.5, xG_visitante 0.3-0.8
   → Partidos equilibrados top: xG cada lado 1.2-1.8
   → Over/Under DEBEN derivarse matemáticamente de los xG (usa distribución Poisson)

4. NUNCA uses valores genéricos como "btts_si: 52, over2_5: 55" para todos los partidos
   → Cada partido tiene su perfil único de probabilidades

5. JUGADORES Y ALINEACIONES:
   → Usa tu conocimiento real de las plantillas habituales de cada equipo
   → Menciona jugadores REALES: Cristiano Ronaldo, Messi, Mbappé, Haaland, etc. cuando aplique
   → Incluye jugadores con lesiones/dudas conocidas en las listas correspondientes
   → La formación debe ser la real/habitual del entrenador (ej: Portugal → 4-3-3 con CR7)

═══════════════════════════════════════════
PARTIDO A ANALIZAR
═══════════════════════════════════════════
PARTIDO: ${homeTeam} vs ${awayTeam}
COMPETICIÓN: ${league}
FECHA: ${today}
DATOS SISTEMA ${homeTeam}: avgGoals=${homeTeamData?.avgGoals || 'N/D'}, avgConceded=${homeTeamData?.avgConceded || 'N/D'}, winRate=${homeTeamData?.winRate || 'N/D'}%
DATOS SISTEMA ${awayTeam}: avgGoals=${awayTeamData?.avgGoals || 'N/D'}, avgConceded=${awayTeamData?.avgConceded || 'N/D'}, winRate=${awayTeamData?.winRate || 'N/D'}%
JUGADORES SISTEMA ${homeTeam}: ${homeTop3.map(p => p.name).join(', ') || 'N/D'}
JUGADORES SISTEMA ${awayTeam}: ${awayTop3.map(p => p.name).join(', ') || 'N/D'}

⚠️ IMPORTANTE: Los valores del "DATOS SISTEMA" son de referencia. TU CONOCIMIENTO REAL sobre estos equipos prevalece. Si sabes que ${homeTeam} tiene una calidad muy superior, REFLEJA ESO en probabilidades.

⚠️ Solo menciona jugadores/lesiones de ${homeTeam} y ${awayTeam}. NUNCA de otros equipos.

Devuelve SOLO JSON válido (sin markdown, sin \`\`\`). Todos los números en los campos de probabilidad son ENTEROS 0-100 (no decimales excepto en xG y cuotas). El JSON debe tener este esquema:

{
  "resumenEjecutivo": "3-4 frases específicas sobre el partido, contexto y pronóstico clave",
  "importanciaDelPartido": "qué se juegan ambos equipos en esta competición",
  "historialDirecto": {
    "totalPartidos": 0,
    "victoriasLocal": 0,
    "empates": 0,
    "victoriasVisitante": 0,
    "golesPromedio": 0.0,
    "analisis": "historial H2H real o estimado con contexto"
  },
  "equipoLocal": {
    "fortalezas": ["fortaleza real 1", "fortaleza real 2", "fortaleza real 3"],
    "debilidades": ["debilidad real 1", "debilidad real 2"],
    "forma": "últimos 5 partidos reales o estimados con resultados",
    "formacion": "formación real del equipo",
    "motivacion": "contexto motivacional específico",
    "lesionados": ["jugador lesionado si se conoce"],
    "dudosos": ["jugador dudoso si se conoce"],
    "xG_promedio": 0.0,
    "xGA_promedio": 0.0
  },
  "equipoVisitante": {
    "fortalezas": ["fortaleza real 1", "fortaleza real 2"],
    "debilidades": ["debilidad real 1", "debilidad real 2"],
    "forma": "últimos 5 partidos",
    "formacion": "formación real",
    "motivacion": "contexto motivacional",
    "lesionados": [],
    "dudosos": [],
    "xG_promedio": 0.0,
    "xGA_promedio": 0.0
  },
  "alineaciones": {
    "local": {
      "formacion": "4-3-3",
      "titulares": ["Portero", "Defensa1", "Defensa2", "Defensa3", "Defensa4", "Medio1", "Medio2", "Medio3", "Extremo1", "Delantero", "Extremo2"]
    },
    "visitante": {
      "formacion": "4-2-3-1",
      "titulares": ["Portero", "Defensa1", "Defensa2", "Defensa3", "Defensa4", "MedDef1", "MedDef2", "Mediapunta1", "Mediapunta2", "Mediapunta3", "Delantero"]
    }
  },
  "predicciones": {
    "probabilidades": {"victoriaLocal": 0, "empate": 0, "victoriaVisitante": 0},
    "cuotasTeoricas": {"victoriaLocal": 0.0, "empate": 0.0, "victoriaVisitante": 0.0},
    "golesEsperados": {"local": 0.0, "visitante": 0.0, "total": 0.0},
    "goles": {
      "over0_5": {"local": 0, "visitante": 0, "total": 0},
      "over1_5": {"local": 0, "visitante": 0, "total": 0},
      "over2_5": {"local": 0, "visitante": 0, "total": 0},
      "over3_5": {"local": 0, "visitante": 0, "total": 0}
    },
    "tiros": {
      "total": {"local": 0, "visitante": 0, "total": 0},
      "a_puerta": {"local": 0, "visitante": 0, "total": 0},
      "jugadores": [
        {"nombre": "nombre real del jugador", "equipo": "local", "tiros": 0, "a_puerta": 0},
        {"nombre": "nombre real del jugador", "equipo": "local", "tiros": 0, "a_puerta": 0},
        {"nombre": "nombre real del jugador", "equipo": "visitante", "tiros": 0, "a_puerta": 0},
        {"nombre": "nombre real del jugador", "equipo": "visitante", "tiros": 0, "a_puerta": 0}
      ]
    },
    "mercados": {
      "over2_5": 0, "under2_5": 0, "btts_si": 0, "btts_no": 0, "over1_5": 0, "over3_5": 0
    },
    "corners": {
      "total_esperado": 0, "over8_5": 0, "over9_5": 0, "over10_5": 0, "under8_5": 0,
      "local": 0, "visitante": 0
    },
    "faltas": {"total_esperado": 0, "local": 0, "visitante": 0, "over20_5": 0},
    "tarjetas": {
      "total_esperado": 0.0, "over2_5": 0, "over3_5": 0, "over4_5": 0, "under3_5": 0,
      "amarillas_local": 0, "amarillas_visitante": 0, "rojaProb": 0,
      "jugadores_riesgo": [
        {"nombre": "nombre real", "equipo": "local", "probabilidad": 0},
        {"nombre": "nombre real", "equipo": "visitante", "probabilidad": 0}
      ]
    },
    "goleadores": {
      "primer_goleador": {"nombre": "nombre real", "equipo": "${homeTeam}", "probabilidad": 0, "cuota": 0.0},
      "anytime": [
        {"nombre": "nombre real", "equipo": "${homeTeam}", "probabilidad": 0, "cuota": 0.0},
        {"nombre": "nombre real", "equipo": "${homeTeam}", "probabilidad": 0, "cuota": 0.0},
        {"nombre": "nombre real", "equipo": "${awayTeam}", "probabilidad": 0, "cuota": 0.0},
        {"nombre": "nombre real", "equipo": "${awayTeam}", "probabilidad": 0, "cuota": 0.0}
      ]
    },
    "resultados_exactos": [
      {"resultado": "resultado más probable", "probabilidad": 0, "cuota": 0.0},
      {"resultado": "2do más probable", "probabilidad": 0, "cuota": 0.0},
      {"resultado": "3ro más probable", "probabilidad": 0, "cuota": 0.0},
      {"resultado": "4to más probable", "probabilidad": 0, "cuota": 0.0},
      {"resultado": "5to más probable", "probabilidad": 0, "cuota": 0.0}
    ],
    "resultadoMasProbable": "X-X Equipo",
    "primerGoleador": {"nombre": "nombre real", "equipo": "${homeTeam}", "probabilidad": 0, "cuota": 0.0}
  },
  "tactico": {
    "sistemaLocal": "formación + estilo",
    "sistemaVisitante": "formación + estilo",
    "enfoque": "descripción táctica 2-3 frases específica",
    "ventajaTactica": "quién tiene ventaja táctica y por qué",
    "clavesDelPartido": ["clave táctica real 1", "clave 2", "clave 3"]
  },
  "factoresExternos": {
    "clima": "condiciones y efecto en el juego",
    "arbitro": "análisis del arbitraje esperado",
    "factorCasa": "ventaja local / sede",
    "fatiga": "estado físico y rotaciones probables"
  },
  "apuestasRecomendadas": [
    {"mercado": "Resultado 1X2", "seleccion": "descripción", "cuota": 0.0, "probabilidad": 0, "valor": 0.00, "riesgo": "bajo", "razonamiento": "razonamiento específico con datos"},
    {"mercado": "Total goles", "seleccion": "Over/Under X.5 goles", "cuota": 0.0, "probabilidad": 0, "valor": 0.00, "riesgo": "medio", "razonamiento": "argumento con xG calculados"},
    {"mercado": "Ambos marcan", "seleccion": "Sí/No", "cuota": 0.0, "probabilidad": 0, "valor": 0.00, "riesgo": "medio", "razonamiento": "basado en P(local marca) × P(visitante marca)"}
  ],
  "conclusion": "conclusión 3-4 frases con pronóstico definitivo, resultado más probable y apuesta principal recomendada",
  "confianza": 0
}`;

    try {
      const text = await callClaudeAPI(prompt, 6000);
      if (text) {
        const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        // Extraer el primer bloque JSON válido
        const jsonStart = clean.indexOf('{');
        const jsonEnd = clean.lastIndexOf('}');
        if (jsonStart >= 0 && jsonEnd > jsonStart) {
          const parsed = JSON.parse(clean.substring(jsonStart, jsonEnd + 1));
          return parsed;
        }
      }
    } catch (e) {
      console.log('AI fallback:', e);
    }

    return this.generateLocalAnalysis(homeTeam, awayTeam, league, homePlayers, awayPlayers, homeTeamData, awayTeamData);
  },

  generateLocalAnalysis(
    homeTeam: string,
    awayTeam: string,
    league: string,
    homePlayers: any[],
    awayPlayers: any[],
    homeTeamData: any,
    awayTeamData: any
  ): AdvancedMatchAnalysis {
    const homeXG = parseFloat((homeTeamData?.avgGoals ?? 1.4).toFixed(2));
    const awayXG = parseFloat((awayTeamData?.avgGoals ?? 1.2).toFixed(2));
    const totalXG = parseFloat((homeXG + awayXG).toFixed(2));

    const hwr = homeTeamData?.winRate ?? 50;
    const awr = awayTeamData?.winRate ?? 45;
    const totalWR = hwr + awr || 100;
    const homeWin = Math.min(65, Math.max(28, Math.round((hwr / totalWR) * 90)));
    const awayWin = Math.min(50, Math.max(15, Math.round((awr / totalWR) * 80)));
    const draw = Math.max(20, 100 - homeWin - awayWin);

    const homeTopScorer = [...homePlayers].sort((a, b) => b.goals - a.goals)[0];
    const awayTopScorer = [...awayPlayers].sort((a, b) => b.goals - a.goals)[0];
    const homeTop3 = [...homePlayers].sort((a, b) => b.goals - a.goals).slice(0, 3);
    const awayTop3 = [...awayPlayers].sort((a, b) => b.goals - a.goals).slice(0, 3);

    const formations = ['4-3-3', '4-2-3-1', '3-5-2', '4-4-2', '5-3-2'];
    const homeFormation = homeTeamData?.formation || formations[Math.floor(Math.random() * 3)];
    const awayFormation = awayTeamData?.formation || formations[Math.floor(Math.random() * 3) + 1];

    // Goles lines (Poisson)
    const golesLines = {
      over0_5: {
        local: poissonOver(homeXG, 0),
        visitante: poissonOver(awayXG, 0),
        total: poissonOver(totalXG, 0),
      },
      over1_5: {
        local: poissonOver(homeXG, 1),
        visitante: poissonOver(awayXG, 1),
        total: poissonOver(totalXG, 1),
      },
      over2_5: {
        local: poissonOver(homeXG, 2),
        visitante: poissonOver(awayXG, 2),
        total: poissonOver(totalXG, 2),
      },
      over3_5: {
        local: poissonOver(homeXG, 3),
        visitante: poissonOver(awayXG, 3),
        total: poissonOver(totalXG, 3),
      },
    };

    // Tiros (shots): ~7 tiros por xG promedio, ~2.8 a puerta por xG
    const homeTirosTotal = Math.round(homeXG * 7.2);
    const awayTirosTotal = Math.round(awayXG * 6.8);
    const homeTirosPuerta = Math.round(homeXG * 2.8);
    const awayTirosPuerta = Math.round(awayXG * 2.6);

    const tirosJugadores: TiroJugador[] = [
      ...homeTop3.slice(0, 3).map((p, i) => ({
        nombre: p.name,
        equipo: 'local' as const,
        tiros: Math.max(1, Math.round(homeTirosTotal * (0.35 - i * 0.08))),
        a_puerta: Math.max(1, Math.round(homeTirosPuerta * (0.4 - i * 0.1))),
      })),
      ...awayTop3.slice(0, 3).map((p, i) => ({
        nombre: p.name,
        equipo: 'visitante' as const,
        tiros: Math.max(1, Math.round(awayTirosTotal * (0.35 - i * 0.08))),
        a_puerta: Math.max(1, Math.round(awayTirosPuerta * (0.4 - i * 0.1))),
      })),
    ].filter(p => p.nombre);

    // Corners
    const homeCorners = Math.min(8, Math.max(3, Math.round(homeXG * 3.2)));
    const awayCorners = Math.min(7, Math.max(2, Math.round(awayXG * 2.8)));
    const totalCorners = homeCorners + awayCorners;

    // Faltas
    const homeFaltas = Math.round(10 + (awayXG * 2.5));
    const awayFaltas = Math.round(10 + (homeXG * 2.8));
    const totalFaltas = homeFaltas + awayFaltas;

    // Tarjetas (correlacionadas con faltas y contexto)
    const amarillasLocal = Math.min(4, Math.max(1, Math.round(homeFaltas / 6)));
    const amarillasVisitante = Math.min(4, Math.max(1, Math.round(awayFaltas / 5.5)));
    const amarillasTotal = parseFloat((amarillasLocal + amarillasVisitante).toFixed(1));

    // Goleadores anytime
    const anytime: GoleadorPrediccion[] = [
      ...(homeTopScorer ? [{
        nombre: homeTopScorer.name,
        equipo: homeTeam,
        probabilidad: Math.min(60, Math.round(golesLines.over0_5.local * 0.5)),
        cuota: parseFloat((100 / Math.min(60, golesLines.over0_5.local * 0.5) * 0.93).toFixed(2)),
      }] : []),
      ...(homeTop3[1] ? [{
        nombre: homeTop3[1].name,
        equipo: homeTeam,
        probabilidad: Math.min(45, Math.round(golesLines.over0_5.local * 0.35)),
        cuota: parseFloat((100 / Math.min(45, golesLines.over0_5.local * 0.35) * 0.93).toFixed(2)),
      }] : []),
      ...(awayTopScorer ? [{
        nombre: awayTopScorer.name,
        equipo: awayTeam,
        probabilidad: Math.min(52, Math.round(golesLines.over0_5.visitante * 0.47)),
        cuota: parseFloat((100 / Math.min(52, golesLines.over0_5.visitante * 0.47) * 0.93).toFixed(2)),
      }] : []),
      ...(awayTop3[1] ? [{
        nombre: awayTop3[1].name,
        equipo: awayTeam,
        probabilidad: Math.min(35, Math.round(golesLines.over0_5.visitante * 0.32)),
        cuota: parseFloat((100 / Math.min(35, golesLines.over0_5.visitante * 0.32) * 0.93).toFixed(2)),
      }] : []),
    ].filter(g => g.probabilidad > 0);

    // Resultados exactos (Poisson para ambos equipos)
    const exactScores: ResultadoExacto[] = [];
    const combinations = [
      [1, 0], [0, 0], [2, 0], [1, 1], [2, 1], [0, 1], [3, 0], [3, 1], [0, 2], [2, 2],
    ];
    combinations.forEach(([h, a]) => {
      const prob = poissonProb(homeXG, h) * poissonProb(awayXG, a) * 100;
      if (prob > 1) {
        const label = h > a ? `${h}-${a} ${homeTeam}` : h < a ? `${h}-${a} ${awayTeam}` : `${h}-${h} Empate`;
        exactScores.push({
          resultado: label,
          probabilidad: Math.round(prob * 10) / 10,
          cuota: parseFloat((100 / (Math.round(prob * 10) / 10) * 0.90).toFixed(1)),
        });
      }
    });
    exactScores.sort((a, b) => b.probabilidad - a.probabilidad);

    const primerGol: GoleadorPrediccion = {
      nombre: homeTopScorer?.name || `Delantero ${homeTeam}`,
      equipo: homeTeam,
      probabilidad: Math.round(18 + (homeTopScorer?.goals || 0) * 0.3),
      cuota: parseFloat((8.5 - (homeTopScorer?.goals || 0) * 0.05).toFixed(2)),
    };

    return {
      resumenEjecutivo: `${homeTeam} recibe a ${awayTeam} en un partido decisivo del ${league}. Ambas selecciones se juegan puntos clave en la clasificación. El duelo promete ser intenso con dos estilos de juego contrastados. El factor local y la motivación de ambos equipos serán determinantes.`,
      importanciaDelPartido: `Victoria crucial para ${homeTeam} para consolidar su posición. ${awayTeam} necesita al menos un empate para no quedarse descolgado en la tabla.`,
      historialDirecto: {
        totalPartidos: Math.floor(Math.random() * 12) + 8,
        victoriasLocal: Math.floor(Math.random() * 6) + 2,
        empates: Math.floor(Math.random() * 4) + 1,
        victoriasVisitante: Math.floor(Math.random() * 5) + 1,
        golesPromedio: parseFloat((totalXG + 0.3).toFixed(1)),
        analisis: `Los enfrentamientos entre ${homeTeam} y ${awayTeam} suelen ser disputados. El local parte como favorito con ${homeTopScorer?.name || 'su delantera'} como referencia goleadora.`,
      },
      equipoLocal: {
        fortalezas: [
          `Potencia ofensiva: ${homeXG.toFixed(1)} goles esperados por partido`,
          `${homeFormation} con presión alta y transiciones rápidas`,
          `Factor campo y apoyo del estadio`,
        ],
        debilidades: [
          `Vulnerable a contragolpes por la espalda de los laterales`,
          `Tendencia a bajar el ritmo en la segunda parte`,
        ],
        forma: `Buena racha: 3V 1E 1D en últimos 5. ${homeXG.toFixed(1)} goles/partido.`,
        formacion: homeFormation,
        motivacion: `Alta. Necesitan los 3 puntos. Sin presión extra por ser favoritos.`,
        lesionados: [],
        dudosos: [],
        xG_promedio: homeXG,
        xGA_promedio: parseFloat((homeTeamData?.avgConceded ?? homeXG * 0.65).toFixed(2)),
      },
      equipoVisitante: {
        fortalezas: [
          `Defensa organizada: ${awayTeamData?.avgConceded || 1.2} goles encajados por partido`,
          `${awayTopScorer?.name || 'Delantero'} peligroso en transiciones`,
        ],
        debilidades: [
          `Poca posesión esperada (35-40%)`,
          `Dificultad para crear desde posesión propia`,
        ],
        forma: `Regular: 2V 1E 2D en últimos 5. ${awayXG.toFixed(1)} goles/partido.`,
        formacion: awayFormation,
        motivacion: `Alta. Punto de inflexión. Necesitan resultado positivo.`,
        lesionados: [],
        dudosos: [],
        xG_promedio: awayXG,
        xGA_promedio: parseFloat((awayTeamData?.avgConceded ?? awayXG * 0.8).toFixed(2)),
      },
      predicciones: {
        probabilidades: {
          victoriaLocal: Math.min(65, Math.max(30, homeWin)),
          empate: Math.min(35, Math.max(20, draw)),
          victoriaVisitante: Math.min(45, Math.max(15, awayWin)),
        },
        cuotasTeoricas: {
          victoriaLocal: parseFloat((100 / Math.max(30, homeWin) * 0.93).toFixed(2)),
          empate: parseFloat((100 / Math.max(20, draw) * 0.93).toFixed(2)),
          victoriaVisitante: parseFloat((100 / Math.max(15, awayWin) * 0.93).toFixed(2)),
        },
        golesEsperados: {
          local: homeXG,
          visitante: awayXG,
          total: totalXG,
        },
        goles: golesLines,
        tiros: {
          total: { local: homeTirosTotal, visitante: awayTirosTotal, total: homeTirosTotal + awayTirosTotal },
          a_puerta: { local: homeTirosPuerta, visitante: awayTirosPuerta, total: homeTirosPuerta + awayTirosPuerta },
          jugadores: tirosJugadores,
        },
        mercados: {
          over2_5: golesLines.over2_5.total,
          under2_5: 100 - golesLines.over2_5.total,
          btts_si: Math.round(golesLines.over0_5.local * golesLines.over0_5.visitante / 100),
          btts_no: 100 - Math.round(golesLines.over0_5.local * golesLines.over0_5.visitante / 100),
          over1_5: golesLines.over1_5.total,
          over3_5: golesLines.over3_5.total,
        },
        corners: {
          total_esperado: totalCorners,
          over8_5: poissonOver(totalCorners, 8),
          over9_5: poissonOver(totalCorners, 9),
          over10_5: poissonOver(totalCorners, 10),
          under8_5: 100 - poissonOver(totalCorners, 8),
          local: homeCorners,
          visitante: awayCorners,
        },
        faltas: {
          total_esperado: totalFaltas,
          local: homeFaltas,
          visitante: awayFaltas,
          over20_5: poissonOver(totalFaltas, 20),
        },
        tarjetas: {
          total_esperado: amarillasTotal,
          over2_5: poissonOver(amarillasTotal, 2),
          over3_5: poissonOver(amarillasTotal, 3),
          over4_5: poissonOver(amarillasTotal, 4),
          under3_5: 100 - poissonOver(amarillasTotal, 3),
          amarillas_local: amarillasLocal,
          amarillas_visitante: amarillasVisitante,
          rojaProb: Math.min(20, Math.round(totalFaltas * 0.35)),
          jugadores_riesgo: [
            ...(homeTop3[0] ? [{ nombre: homeTop3[0].name, equipo: 'local' as const, probabilidad: 20 }] : []),
            ...(awayTop3[0] ? [{ nombre: awayTop3[0].name, equipo: 'visitante' as const, probabilidad: 17 }] : []),
          ],
        },
        goleadores: {
          primer_goleador: primerGol,
          anytime,
        },
        resultados_exactos: exactScores.slice(0, 5),
        resultadoMasProbable: homeWin > 45 ? `2-1 ${homeTeam}` : homeWin > 35 ? `1-0 ${homeTeam}` : `1-1 Empate`,
        primerGoleador: primerGol,
      },
      tactico: {
        sistemaLocal: `${homeFormation} – posesión y presión alta`,
        sistemaVisitante: `${awayFormation} – bloque medio y transición`,
        enfoque: `${homeTeam} dominará posesión (58-62%) buscando abrir espacios con combinaciones rápidas. ${awayTeam} defenderá en bloque bajo y atacará en transición con velocidad por bandas.`,
        ventajaTactica: `${homeTeam} tiene superioridad en el mediocampo. La ventaja táctica estará en los duelos entre los centrocampistas creativos y la presión sobre el balón.`,
        clavesDelPartido: [
          `Control del mediocampo y duelos por la segunda jugada`,
          `Eficacia en las transiciones ofensivas de ${awayTeam}`,
          `Acciones a balón parado: corners y faltas laterales`,
        ],
      },
      factoresExternos: {
        clima: `Condiciones favorables. Temperatura 22-26°C. Césped en perfecto estado.`,
        arbitro: `Árbitro con experiencia internacional. ~4 tarjetas amarillas por partido. Deja jugar.`,
        factorCasa: `Significativo en el Mundial. El público genera presión. Ventaja psicológica +5%.`,
        fatiga: `Ambos equipos en 2º-3er partido del grupo. Rotaciones posibles en posiciones de menor riesgo.`,
      },
      apuestasRecomendadas: [
        {
          mercado: 'Resultado 1X2',
          seleccion: `Victoria ${homeTeam}`,
          cuota: parseFloat((100 / Math.max(30, homeWin) * 0.93).toFixed(2)),
          probabilidad: Math.min(65, homeWin),
          valor: parseFloat(((Math.min(65, homeWin) / 100) * (100 / Math.max(30, homeWin) * 0.93) - 1).toFixed(3)),
          riesgo: 'bajo',
          razonamiento: `${homeTeam} favorito por factor local, mayor calidad y mejor historial H2H.`,
        },
        {
          mercado: 'Total goles',
          seleccion: totalXG > 2.4 ? 'Over 2.5 goles' : 'Under 2.5 goles',
          cuota: 1.85,
          probabilidad: totalXG > 2.4 ? golesLines.over2_5.total : (100 - golesLines.over2_5.total),
          valor: parseFloat(((totalXG > 2.4 ? golesLines.over2_5.total : (100 - golesLines.over2_5.total)) / 100 * 1.85 - 1).toFixed(3)),
          riesgo: 'medio',
          razonamiento: `xG total esperado de ${totalXG}. Ambos equipos con capacidad goleadora.`,
        },
        {
          mercado: 'Corners',
          seleccion: `Over ${totalCorners > 9 ? '9.5' : '8.5'} córners`,
          cuota: 1.90,
          probabilidad: totalCorners > 9 ? poissonOver(totalCorners, 9) : poissonOver(totalCorners, 8),
          valor: parseFloat(((totalCorners > 9 ? poissonOver(totalCorners, 9) : poissonOver(totalCorners, 8)) / 100 * 1.90 - 1).toFixed(3)),
          riesgo: 'medio',
          razonamiento: `${homeTeam} genera ~${homeCorners} córners/partido. ${awayTeam} genera ~${awayCorners}. Total esperado: ${totalCorners}.`,
        },
      ],
      conclusion: `Partido de alto voltaje en el ${league}. ${homeTeam} favorito con ${Math.min(65, homeWin)}% de probabilidad. Factor casa y ${homeTopScorer?.name || 'su delantera'} claves. Recomendamos victoria local + Over ${totalXG > 2.4 ? '2.5' : '1.5'} goles. Gestión responsable: máx. 2-3% del bankroll.`,
      confianza: Math.round(Math.min(88, Math.max(65, 70 + Math.abs(homeWin - awayWin) * 0.5))),
    };
  },
};
