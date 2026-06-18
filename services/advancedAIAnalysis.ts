import { localDataService } from './localDataService';
import { getVenueWeather } from './weatherService';
import { getWcSquad } from './wcSquads';

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
// Safe odds: cap minimum at 1.10 (no more @0.98 garbage), cap maximum at 99.00
function safeOdds(prob: number): number {
  const raw = 100 / Math.max(1, prob) * 0.93;
  return parseFloat(Math.max(1.10, Math.min(99, raw)).toFixed(2));
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

export interface DobleOportunidadOpcion {
  probabilidad: number;
  cuota: number;
}

export interface MarcadorPorTiempo {
  local: { primeraParteProb: number; segundaParteProb: number; cuotaPrimeraParte: number; cuotaSegundaParte: number };
  visitante: { primeraParteProb: number; segundaParteProb: number; cuotaPrimeraParte: number; cuotaSegundaParte: number };
  equipoLocal_1H_marcar: number;
  equipoVisitante_1H_marcar: number;
  equipoLocal_2H_marcar: number;
  equipoVisitante_2H_marcar: number;
}

export interface MercadoJugador {
  nombre: string;
  equipo: 'local' | 'visitante';
  probabilidad: number;
  cuota: number;
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
      over4_5?: GolesPorLinea;
      over5_5?: GolesPorLinea;
      over6_5?: GolesPorLinea;
      over7_5?: GolesPorLinea;
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
      // Extended
      over6_5?: number; over7_5?: number; over11_5?: number;
      local_1H?: number; visitante_1H?: number; local_2H?: number; visitante_2H?: number;
      over3_5_1H?: number; over4_5_1H?: number; over5_5_1H?: number;
      cuota_over8_5?: number; cuota_over9_5?: number; cuota_over10_5?: number;
    };
    faltas: {
      total_esperado: number; local: number; visitante: number; over20_5: number;
      // Extended
      over15_5?: number; over17_5?: number; over24_5?: number;
      local_1H?: number; visitante_1H?: number; local_2H?: number; visitante_2H?: number;
      cuota_over20_5?: number;
    };
    tarjetas: {
      total_esperado: number; over2_5: number; over3_5: number; over4_5: number;
      under3_5: number; amarillas_local: number; amarillas_visitante: number;
      rojaProb: number; jugadores_riesgo: JugadorRiesgo[];
      // Extended
      over1_5?: number; over5_5?: number;
      amarillas_local_1H?: number; amarillas_visitante_1H?: number;
      cuota_over2_5?: number; cuota_over3_5?: number;
    };
    golesporMitad?: {
      local_xG_1H: number; visitante_xG_1H: number;
      local_xG_2H: number; visitante_xG_2H: number;
      over0_5_1H: number; over1_5_1H: number; over2_5_1H?: number; over3_5_1H?: number; over4_5_1H?: number; over5_5_1H?: number;
      over0_5_2H: number; over1_5_2H: number; over2_5_2H?: number; over3_5_2H?: number; over4_5_2H?: number; over5_5_2H?: number;
      cuota_over0_5_1H: number; cuota_over1_5_1H: number; cuota_over2_5_1H?: number; cuota_over3_5_1H?: number;
      cuota_over0_5_2H: number; cuota_over1_5_2H: number; cuota_over2_5_2H?: number; cuota_over3_5_2H?: number;
    };
    goleadores: {
      primer_goleador: GoleadorPrediccion;
      anytime: GoleadorPrediccion[];
    };
    resultados_exactos: ResultadoExacto[];
    resultadoMasProbable: string;
    primerGoleador: GoleadorPrediccion;
    dobleOportunidad?: {
      localOEmpate: DobleOportunidadOpcion;
      visitanteOEmpate: DobleOportunidadOpcion;
      localOVisitante: DobleOportunidadOpcion;
    };
    marcadorPorTiempo?: MarcadorPorTiempo;
    mercadosJugadores?: {
      asistencias: MercadoJugador[];
      scorerOAsistente: MercadoJugador[];
      golesporJugadorPrimeraMitad: MercadoJugador[];
      golesporJugadorSegundaMitad: MercadoJugador[];
    };
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
// Strategy: try the server-side Vercel proxy first (/api/analyze).
// This avoids browser CORS restrictions and is more reliable.
// Falls back to direct browser fetch if proxy fails (local dev or proxy error).
async function callClaudeAPI(prompt: string, maxTokens = 6000): Promise<string> {
  // ── 1. Server proxy (Vercel API route) ────────────────────────────────────
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 55000); // 55s (proxy has 60s limit)
    const proxyResponse = await fetch('/api/analyze', {
      method: 'POST',
      signal: controller.signal,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt, maxTokens }),
    });
    clearTimeout(timeoutId);
    if (proxyResponse.ok) {
      const data: any = await proxyResponse.json();
      const text = data.text || '';
      if (text) return text;
    }
  } catch {
    // Proxy failed (local dev or timeout) — fall through to direct API call
  }

  // ── 2. Direct browser fetch (fallback for local dev) ──────────────────────
  if (!CLAUDE_API_KEY) return '';
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);
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

// ─── Poisson recalibration ────────────────────────────────────────────────────
// Overrides AI BTTS and Over/Under with mathematically correct Poisson values
// so results like "Portugal(2.8xG) vs DR Congo(0.4xG) → BTTS 67%" never happen again.
function recalibrateProbabilities(
  result: any,
  sdbContext?: {
    homeSquad: import('./sportsDbService').SDBSquadPlayer[];
    awaySquad: import('./sportsDbService').SDBSquadPlayer[];
    homeForm: import('./sportsDbService').SDBTeamForm;
    awayForm: import('./sportsDbService').SDBTeamForm;
  }
): AdvancedMatchAnalysis {
  const xGL = Number(result?.predicciones?.golesEsperados?.local) || 1.5;
  const xGA = Number(result?.predicciones?.golesEsperados?.visitante) || 1.0;
  const totalXG = xGL + xGA;

  // P(team scores ≥ 1) = 1 - e^(-xG)
  const pHomeScores = Math.round((1 - Math.exp(-xGL)) * 100);
  const pAwayScores = Math.round((1 - Math.exp(-xGA)) * 100);
  const btts = Math.round(pHomeScores * pAwayScores / 100);

  const over15 = poissonOver(totalXG, 1);
  const over25 = poissonOver(totalXG, 2);
  const over35 = poissonOver(totalXG, 3);
  const over45 = poissonOver(totalXG, 4);
  const over55 = poissonOver(totalXG, 5);
  const over65 = poissonOver(totalXG, 6);
  const over75 = poissonOver(totalXG, 7);

  if (!result.predicciones) return result;

  result.predicciones.mercados = {
    ...(result.predicciones.mercados ?? {}),
    btts_si: btts,
    btts_no: 100 - btts,
    over1_5: over15,
    over2_5: over25,
    under2_5: 100 - over25,
    over3_5: over35,
  };

  // Also recalculate per-line over probabilities for consistency
  if (result.predicciones.goles) {
    const xGHome = xGL;
    const xGAway = xGA;
    result.predicciones.goles.over1_5 = {
      local: poissonOver(xGHome, 1),
      visitante: poissonOver(xGAway, 1),
      total: over15,
    };
    result.predicciones.goles.over2_5 = {
      local: poissonOver(xGHome, 2),
      visitante: poissonOver(xGAway, 2),
      total: over25,
    };
    result.predicciones.goles.over3_5 = {
      local: poissonOver(xGHome, 3),
      visitante: poissonOver(xGAway, 3),
      total: over35,
    };
    result.predicciones.goles.over4_5 = {
      local: poissonOver(xGHome, 4),
      visitante: poissonOver(xGAway, 4),
      total: over45,
    };
    result.predicciones.goles.over5_5 = {
      local: poissonOver(xGHome, 5),
      visitante: poissonOver(xGAway, 5),
      total: over55,
    };
    result.predicciones.goles.over6_5 = {
      local: poissonOver(xGHome, 6),
      visitante: poissonOver(xGAway, 6),
      total: over65,
    };
    result.predicciones.goles.over7_5 = {
      local: poissonOver(xGHome, 7),
      visitante: poissonOver(xGAway, 7),
      total: over75,
    };
  }

  return result as AdvancedMatchAnalysis;
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
    },
    venue?: string,
  ): Promise<AdvancedMatchAnalysis> {
    // Fetch weather if venue provided
    let weatherStr = '';
    if (venue) {
      try {
        const weather = await getVenueWeather(venue);
        if (weather) {
          weatherStr = `\nCLIMA EN EL ESTADIO: ${weather.icon} ${weather.temp}°C (sensación ${weather.feelsLike}°C), ${weather.description}, Humedad ${weather.humidity}%, Viento ${weather.windSpeed}km/h.`;
          if (weather.windSpeed > 30) weatherStr += ' ⚠️ Viento fuerte: reduce precisión en pases largos y córners.';
          if (weather.temp > 32) weatherStr += ' ⚠️ Calor extremo: puede afectar al ritmo en el 2º tiempo.';
          if (weather.description.toLowerCase().includes('rain')) weatherStr += ' ⚠️ Lluvia: campo resbaladizo, más errores, puede favorecer marcadores bajos.';
        }
      } catch {}
    }

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

    // Build squad context strings from TheSportsDB data
    const homeSquadForLineup = sdbContext?.homeSquad.length
      ? sdbContext.homeSquad.slice(0, 20).map(p => `${p.name} (${p.position})`).join(', ')
      : null;
    const awaySquadForLineup = sdbContext?.awaySquad.length
      ? sdbContext.awaySquad.slice(0, 20).map(p => `${p.name} (${p.position})`).join(', ')
      : null;

    const prompt = `Eres el mejor analista cuantitativo de fútbol del mundo. Analiza ${homeTeam} vs ${awayTeam}.

═══════════════════════════════════════
PASO 1 — CALIBRACIÓN (mentalmente antes del JSON)
═══════════════════════════════════════
Evalúa calidad real de cada equipo (1-10 nivel FIFA), forma, lesiones conocidas.

REGLAS OBLIGATORIAS:
1. BTTS usa fórmula Poisson: btts_si = P(local≥1gol) × P(visitante≥1gol)
   P(equipo marca) = 1 - e^(-xG_equipo)
   → ${homeTeam} vs ${awayTeam}: calcula xG de cada equipo y aplica la fórmula
   → Si diferencia de calidad ≥3 puntos: el inferior tiene xG≤0.7 → P(marca)≤50%
   → NUNCA pongas btts_si > 50% si un equipo es claramente débil ofensivamente

2. PROBABILIDADES 1X2 suman exactamente 100:
   → Favorito claro (dif. calidad ≥3): ≥55% victoria, empate 20-28%, rival ≤20%
   → Equilibrados (dif. ≤1): 35-45% / 25-30% / 25-35%

3. Over/Under DEBEN derivarse de xG con Poisson (no valores genéricos)

4. ALINEACIONES — REGLAS ABSOLUTAS:
   → NUNCA pongas "Portero", "Defensa1", "Medio2" — esos no son nombres reales.
   → Si se proporciona PLANTILLA REAL abajo: los 11 titulares DEBEN ser nombres EXACTOS de esa lista. No puedes inventar ningún jugador fuera de ella.
   → Si NO hay plantilla: usa tu conocimiento real del equipo (jugadores actuales, no retirados).
   → Selecciona los 11 más probables según el sistema táctico del entrenador y su alineación habitual.

⚠️ JUGADORES RETIRADOS — NO INCLUYAS NUNCA:
   Sergio Busquets: retirado de la selección española en 2023.
   Nacho Fernández: retirado de la selección española en 2024.
   Álvaro Morata: NO convocado para el Mundial 2026 por De la Fuente.
   Eden Hazard: retirado del fútbol en 2023.
   Axel Witsel: retirado de la selección belga.
   Jan Vertonghen: retirado de la selección belga.
   Toby Alderweireld: retirado de la selección belga.
   Diego Godín: retirado de la selección uruguaya en 2022.
   Luis Suárez: ya no es convocado regularmente para Uruguay.
   Ivan Perišić: retirado de la selección croata.
   ANTONIO RÜDIGER JUEGA PARA ALEMANIA — es el capitán de la defensa alemana. NO confundas con Arabia Saudita.
   Comprueba mentalmente que CADA jugador que incluyes ESTÁ ACTIVO y CONVOCADO para el Mundial 2026.
${homeSquadForLineup ? `   ⚠️ PLANTILLA ${homeTeam} — USA SOLO ESTOS NOMBRES: ${homeSquadForLineup}` : `   → ${homeTeam}: usa tu conocimiento real de la plantilla actual.`}
${awaySquadForLineup ? `   ⚠️ PLANTILLA ${awayTeam} — USA SOLO ESTOS NOMBRES: ${awaySquadForLineup}` : `   → ${awayTeam}: usa tu conocimiento real de la plantilla actual.`}

═══════════════════════════════════════
DATOS DEL PARTIDO
═══════════════════════════════════════
PARTIDO: ${homeTeam} vs ${awayTeam}
COMPETICIÓN: ${league} | FECHA: ${today}
FORMA ${homeTeam}: ${homeFormStr}
FORMA ${awayTeam}: ${awayFormStr}
REF. SISTEMA ${homeTeam}: avgGoals=${homeTeamData?.avgGoals || 'N/D'}, winRate=${homeTeamData?.winRate || 'N/D'}%
REF. SISTEMA ${awayTeam}: avgGoals=${awayTeamData?.avgGoals || 'N/D'}, winRate=${awayTeamData?.winRate || 'N/D'}%${weatherStr}

⚠️ Tu conocimiento real prevalece sobre "REF. SISTEMA". Solo menciona jugadores de ${homeTeam} y ${awayTeam}.

⚠️ GOLEADORES — REGLAS ABSOLUTAS:
   → NUNCA uses "Delantero ${homeTeam}", "Goleador Rep. Checa" ni cualquier texto genérico.
   → En goleadores.anytime y goleadores.primer_goleador: escribe SOLO nombres reales (Ej: "Cristiano Ronaldo", "Kylian Mbappé", "Erling Haaland").
   → Si no conoces al delantero del equipo, usa el jugador más famoso o reconocible del equipo.
   → PROHIBIDO dejar "nombre real del jugador" como valor — rellena SIEMPRE con un nombre real.

⚠️ ESTADÍSTICAS DE TORNEO — REGLAS ABSOLUTAS:
   → NUNCA escribas cifras de goles de torneo exageradas o falsas. En una Copa del Mundo, un jugador anota típicamente 1-7 goles en TODA la competición.
   → NUNCA digas que un jugador tiene "67 goles en el torneo" o cifras absurdas.
   → En "resumenEjecutivo": si citas estadísticas de jugadores, sé conservador y realista.
   → PROHIBIDO inventar estadísticas de temporada: si no las conoces con certeza, omítelas.

⚠️ resumenEjecutivo DEBE tener MÍNIMO 4 FRASES EXTENSAS y 100% únicas para este partido. INCLUYE: análisis táctico real de ambos equipos, el jugador diferencial de cada lado con contexto, xG estimado, y qué está en juego. PROHIBIDO frases genéricas. EXTENSO y ESPECÍFICO.

⚠️ equipoLocal y equipoVisitante: MÍNIMO 4 fortalezas, 3 debilidades, forma detallada últimos 5 partidos. EXTENSO.

⚠️ tactico.enfoque: MÍNIMO 4 frases detalladas. sistemaLocal y sistemaVisitante deben explicar el estilo real del equipo, no solo la formación.

⚠️ conclusion: MÍNIMO 4 frases. Pronóstico definitivo con argumentos cuantitativos.

INSTRUCCIÓN APUESTAS CRÍTICA: Genera entre 10 y 15 apuestas en apuestasRecomendadas. OBLIGATORIO máxima variedad:
  - 2-3 de córners (total partido, 1ª mitad, por equipo)
  - 2 de tarjetas (total, jugador específico con amarilla)
  - 1-2 resultado 1X2 o doble oportunidad
  - 1-2 goles over/under (NO solo Over 0.5 — varía los umbrales)
  - 1-2 primera mitad (resultado 1H, goles 1H)
  - 1-2 jugadores específicos (goleador, asistencia)
  - 1 arriesgada creativa (resultado exacto, doble marcador, etc.)
  - 1 faltas over/under
  → Ejemplo de variedad: "Corners locales 1ª parte Over 3.5", "Tarjeta amarilla a [jugador]", "Resultado 1ª mitad: empate", "Goles locales Over 1.5", "Faltas totales Over 19.5"
  → PROHIBIDO hacer solo apuestas de "Over 0.5 goles" o "Victoria local" — eso no es variedad.

DEVUELVE SOLO JSON VÁLIDO. Las alineaciones van PRIMERO en el JSON. Enteros 0-100 para probabilidades (excepto xG y cuotas).

⚡ COMIENZA con "alineaciones" — es el primer campo del JSON. Titulares = 11 nombres reales.

{
  "alineaciones": {
    "local": {
      "formacion": "formación-real-del-entrenador",
      "titulares": ["NombreReal1", "NombreReal2", "NombreReal3", "NombreReal4", "NombreReal5", "NombreReal6", "NombreReal7", "NombreReal8", "NombreReal9", "NombreReal10", "NombreReal11"]
    },
    "visitante": {
      "formacion": "formación-real-del-entrenador",
      "titulares": ["NombreReal1", "NombreReal2", "NombreReal3", "NombreReal4", "NombreReal5", "NombreReal6", "NombreReal7", "NombreReal8", "NombreReal9", "NombreReal10", "NombreReal11"]
    }
  },
  "resumenEjecutivo": "OBLIGATORIO: 3-4 frases 100% ÚNICAS para este partido. INCLUYE: forma reciente exacta de cada equipo, el jugador diferencial de cada lado con sus estadísticas, y el pronóstico cuantitativo (xG estimado, % victoria). PROHIBIDO frases genéricas como 'duelo intenso', 'estilos contrastados' o 'factor local decisivo'. Cada frase debe ser específica de ${homeTeam} vs ${awayTeam} hoy.",
  "importanciaDelPartido": "Qué se juegan EXACTAMENTE ${homeTeam} y ${awayTeam} en esta competición: puntos en la tabla, clasificación en juego, consecuencias reales de ganar/perder/empatar.",
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
  "predicciones": {
    "probabilidades": {"victoriaLocal": 0, "empate": 0, "victoriaVisitante": 0},
    "cuotasTeoricas": {"victoriaLocal": 0.0, "empate": 0.0, "victoriaVisitante": 0.0},
    "golesEsperados": {"local": 0.0, "visitante": 0.0, "total": 0.0},
    "goles": {
      "over0_5": {"local": 0, "visitante": 0, "total": 0},
      "over1_5": {"local": 0, "visitante": 0, "total": 0},
      "over2_5": {"local": 0, "visitante": 0, "total": 0},
      "over3_5": {"local": 0, "visitante": 0, "total": 0},
      "over4_5": {"local": 0, "visitante": 0, "total": 0},
      "over5_5": {"local": 0, "visitante": 0, "total": 0},
      "over6_5": {"local": 0, "visitante": 0, "total": 0},
      "over7_5": {"local": 0, "visitante": 0, "total": 0}
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
      "total_esperado": 0, "local": 0, "visitante": 0,
      "over6_5": 0, "over7_5": 0, "over8_5": 0, "over9_5": 0, "over10_5": 0, "over11_5": 0, "under8_5": 0,
      "local_1H": 0, "visitante_1H": 0, "local_2H": 0, "visitante_2H": 0,
      "over3_5_1H": 0, "over4_5_1H": 0, "over5_5_1H": 0,
      "cuota_over8_5": 0.0, "cuota_over9_5": 0.0, "cuota_over10_5": 0.0
    },
    "faltas": {
      "total_esperado": 0, "local": 0, "visitante": 0,
      "local_1H": 0, "visitante_1H": 0, "local_2H": 0, "visitante_2H": 0,
      "over15_5": 0, "over17_5": 0, "over20_5": 0, "over24_5": 0,
      "cuota_over20_5": 0.0
    },
    "tarjetas": {
      "total_esperado": 0.0, "over1_5": 0, "over2_5": 0, "over3_5": 0, "over4_5": 0, "over5_5": 0, "under3_5": 0,
      "amarillas_local": 0, "amarillas_visitante": 0,
      "amarillas_local_1H": 0, "amarillas_visitante_1H": 0,
      "rojaProb": 0, "cuota_over2_5": 0.0, "cuota_over3_5": 0.0,
      "jugadores_riesgo": [
        {"nombre": "nombre real", "equipo": "local", "probabilidad": 0},
        {"nombre": "nombre real", "equipo": "visitante", "probabilidad": 0},
        {"nombre": "nombre real", "equipo": "local", "probabilidad": 0},
        {"nombre": "nombre real", "equipo": "visitante", "probabilidad": 0}
      ]
    },
    "golesporMitad": {
      "local_xG_1H": 0.0, "visitante_xG_1H": 0.0,
      "local_xG_2H": 0.0, "visitante_xG_2H": 0.0,
      "over0_5_1H": 0, "over1_5_1H": 0, "over2_5_1H": 0, "over3_5_1H": 0, "over4_5_1H": 0, "over5_5_1H": 0,
      "over0_5_2H": 0, "over1_5_2H": 0, "over2_5_2H": 0, "over3_5_2H": 0, "over4_5_2H": 0, "over5_5_2H": 0,
      "cuota_over0_5_1H": 0.0, "cuota_over1_5_1H": 0.0, "cuota_over2_5_1H": 0.0, "cuota_over3_5_1H": 0.0,
      "cuota_over0_5_2H": 0.0, "cuota_over1_5_2H": 0.0, "cuota_over2_5_2H": 0.0, "cuota_over3_5_2H": 0.0
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
    "primerGoleador": {"nombre": "nombre real", "equipo": "${homeTeam}", "probabilidad": 0, "cuota": 0.0},
    "dobleOportunidad": {
      "localOEmpate": {"probabilidad": 0, "cuota": 0.0},
      "visitanteOEmpate": {"probabilidad": 0, "cuota": 0.0},
      "localOVisitante": {"probabilidad": 0, "cuota": 0.0}
    },
    "marcadorPorTiempo": {
      "local": {"primeraParteProb": 0, "segundaParteProb": 0, "cuotaPrimeraParte": 0.0, "cuotaSegundaParte": 0.0},
      "visitante": {"primeraParteProb": 0, "segundaParteProb": 0, "cuotaPrimeraParte": 0.0, "cuotaSegundaParte": 0.0},
      "equipoLocal_1H_marcar": 0,
      "equipoVisitante_1H_marcar": 0,
      "equipoLocal_2H_marcar": 0,
      "equipoVisitante_2H_marcar": 0
    },
    "mercadosJugadores": {
      "asistencias": [
        {"nombre": "nombre real jugador", "equipo": "local", "probabilidad": 0, "cuota": 0.0},
        {"nombre": "nombre real jugador", "equipo": "visitante", "probabilidad": 0, "cuota": 0.0}
      ],
      "scorerOAsistente": [
        {"nombre": "nombre real jugador", "equipo": "local", "probabilidad": 0, "cuota": 0.0},
        {"nombre": "nombre real jugador", "equipo": "visitante", "probabilidad": 0, "cuota": 0.0}
      ],
      "golesporJugadorPrimeraMitad": [
        {"nombre": "nombre real jugador", "equipo": "local", "probabilidad": 0, "cuota": 0.0},
        {"nombre": "nombre real jugador", "equipo": "visitante", "probabilidad": 0, "cuota": 0.0}
      ],
      "golesporJugadorSegundaMitad": [
        {"nombre": "nombre real jugador", "equipo": "local", "probabilidad": 0, "cuota": 0.0},
        {"nombre": "nombre real jugador", "equipo": "visitante", "probabilidad": 0, "cuota": 0.0}
      ]
    }
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
    {"mercado": "Ambos marcan", "seleccion": "Sí/No", "cuota": 0.0, "probabilidad": 0, "valor": 0.00, "riesgo": "medio", "razonamiento": "basado en P(local marca) × P(visitante marca)"},
    {"mercado": "Córners", "seleccion": "Over/Under X.5 córners", "cuota": 0.0, "probabilidad": 0, "valor": 0.00, "riesgo": "bajo", "razonamiento": "basado en estilo de juego y estadísticas"},
    {"mercado": "Córners", "seleccion": "Over/Under X.5 córners primera mitad", "cuota": 0.0, "probabilidad": 0, "valor": 0.00, "riesgo": "bajo", "razonamiento": "histórico de córners en 1ª mitad"},
    {"mercado": "Tarjetas amarillas", "seleccion": "Over/Under X.5 tarjetas", "cuota": 0.0, "probabilidad": 0, "valor": 0.00, "riesgo": "bajo", "razonamiento": "histórico disciplinario de ambos equipos"},
    {"mercado": "Tarjeta amarilla jugador", "seleccion": "nombre real del jugador en riesgo", "cuota": 0.0, "probabilidad": 0, "valor": 0.00, "riesgo": "medio", "razonamiento": "jugador agresivo con historial de tarjetas"},
    {"mercado": "Resultado primera mitad", "seleccion": "1X2 primera mitad", "cuota": 0.0, "probabilidad": 0, "valor": 0.00, "riesgo": "medio", "razonamiento": "tendencia de inicio de partido de ambos equipos"},
    {"mercado": "Doble oportunidad", "seleccion": "descripción doble oportunidad", "cuota": 0.0, "probabilidad": 0, "valor": 0.00, "riesgo": "bajo", "razonamiento": "mercado de bajo riesgo con valor positivo"},
    {"mercado": "Goleador", "seleccion": "nombre real del jugador como goleador anytime", "cuota": 0.0, "probabilidad": 0, "valor": 0.00, "riesgo": "alto", "razonamiento": "máximo goleador con alta probabilidad de marcar"},
    {"mercado": "Tiros a puerta", "seleccion": "Over/Under X.5 tiros a puerta total", "cuota": 0.0, "probabilidad": 0, "valor": 0.00, "riesgo": "bajo", "razonamiento": "basado en xG y histórico de tiros"},
    {"mercado": "Faltas", "seleccion": "Over/Under X.5 faltas totales", "cuota": 0.0, "probabilidad": 0, "valor": 0.00, "riesgo": "bajo", "razonamiento": "solo si hay alta confianza en el dato"}
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
          // ── Poisson recalibration: override BTTS and Over/Under with math ──
          return recalibrateProbabilities(parsed, sdbContext);
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
    // These are always 'N/D' when called directly (no sdbContext available here)
    const homeFormStr = 'N/D';
    const awayFormStr = 'N/D';

    const homeXG = parseFloat((homeTeamData?.avgGoals ?? 1.4).toFixed(2));
    const awayXG = parseFloat((awayTeamData?.avgGoals ?? 1.2).toFixed(2));
    const totalXG = parseFloat((homeXG + awayXG).toFixed(2));

    const hwr = homeTeamData?.winRate ?? 50;
    const awr = awayTeamData?.winRate ?? 45;
    const totalWR = hwr + awr || 100;
    const homeWin = Math.min(65, Math.max(28, Math.round((hwr / totalWR) * 90)));
    const awayWin = Math.min(50, Math.max(15, Math.round((awr / totalWR) * 80)));
    const draw = Math.max(20, 100 - homeWin - awayWin);

    // Try to get real player names from wcSquads first (more reliable than localDataService)
    const wcHomeSquad = getWcSquad(homeTeam);
    const wcAwaySquad = getWcSquad(awayTeam);

    // Build top scorers: prefer wcSquads forwards/attackers, fallback to localData
    function wcSquadAttackers(squad: any[]): { name: string; goals: number }[] {
      if (!squad.length) return [];
      const fwds = squad.filter(p => {
        const pos = (p.position ?? '').toLowerCase();
        return pos.includes('forward') || pos.includes('striker') || pos.includes('winger') || pos.includes('attacking');
      });
      const selection = fwds.length >= 2 ? fwds : squad;
      return selection.slice(0, 4).map((p, i) => ({ name: p.name ?? p.strPlayer ?? '', goals: 4 - i }));
    }

    const wcHomeAttackers = wcSquadAttackers(wcHomeSquad);
    const wcAwayAttackers = wcSquadAttackers(wcAwaySquad);

    // Use wcSquads names if localData names look generic
    const GENERIC_NAME_RE = /^(portero|delantero|defensa|medio|goleador|jugador|player|forward|striker|defender)\s/i;
    const localHomeTop3 = [...homePlayers].sort((a, b) => b.goals - a.goals).slice(0, 3);
    const localAwayTop3 = [...awayPlayers].sort((a, b) => b.goals - a.goals).slice(0, 3);

    const useWcHome = wcHomeAttackers.length >= 2 &&
      (localHomeTop3.length === 0 || GENERIC_NAME_RE.test(localHomeTop3[0]?.name ?? ''));
    const useWcAway = wcAwayAttackers.length >= 2 &&
      (localAwayTop3.length === 0 || GENERIC_NAME_RE.test(localAwayTop3[0]?.name ?? ''));

    const homeTop3 = useWcHome ? wcHomeAttackers : localHomeTop3;
    const awayTop3 = useWcAway ? wcAwayAttackers : localAwayTop3;

    const homeTopScorer = homeTop3[0] ?? null;
    const awayTopScorer = awayTop3[0] ?? null;

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
      over4_5: {
        local: poissonOver(homeXG, 4),
        visitante: poissonOver(awayXG, 4),
        total: poissonOver(totalXG, 4),
      },
      over5_5: {
        local: poissonOver(homeXG, 5),
        visitante: poissonOver(awayXG, 5),
        total: poissonOver(totalXG, 5),
      },
      over6_5: {
        local: poissonOver(homeXG, 6),
        visitante: poissonOver(awayXG, 6),
        total: poissonOver(totalXG, 6),
      },
      over7_5: {
        local: poissonOver(homeXG, 7),
        visitante: poissonOver(awayXG, 7),
        total: poissonOver(totalXG, 7),
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
    const homeCorners1H = Math.round(homeCorners * 0.44);
    const awayCorners1H = Math.round(awayCorners * 0.42);
    const homeCorners2H = homeCorners - homeCorners1H;
    const awayCorners2H = awayCorners - awayCorners1H;
    const totalCorners1H = homeCorners1H + awayCorners1H;

    // Faltas
    const homeFaltas = Math.round(10 + (awayXG * 2.5));
    const awayFaltas = Math.round(10 + (homeXG * 2.8));
    const totalFaltas = homeFaltas + awayFaltas;
    const homeFaltas1H = Math.round(homeFaltas * 0.46);
    const awayFaltas1H = Math.round(awayFaltas * 0.46);
    const homeFaltas2H = homeFaltas - homeFaltas1H;
    const awayFaltas2H = awayFaltas - awayFaltas1H;

    // Tarjetas (correlacionadas con faltas y contexto)
    const amarillasLocal = Math.min(4, Math.max(1, Math.round(homeFaltas / 6)));
    const amarillasVisitante = Math.min(4, Math.max(1, Math.round(awayFaltas / 5.5)));
    const amarillasTotal = parseFloat((amarillasLocal + amarillasVisitante).toFixed(1));
    const amarillasLocal1H = Math.round(amarillasLocal * 0.4);
    const amarillasVisitante1H = Math.round(amarillasVisitante * 0.4);

    // Goals by half (xG split 45%/55%)
    const homeXG1H = parseFloat((homeXG * 0.45).toFixed(2));
    const awayXG1H = parseFloat((awayXG * 0.42).toFixed(2));
    const homeXG2H = parseFloat((homeXG * 0.55).toFixed(2));
    const awayXG2H = parseFloat((awayXG * 0.58).toFixed(2));
    const totalXG1H = homeXG1H + awayXG1H;
    const totalXG2H = homeXG2H + awayXG2H;

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
      resumenEjecutivo: [
        homeTopScorer
          ? `${homeTeam} llega como favorito local con ${homeTopScorer.name} como referencia ofensiva y un xG estimado de ${homeXG.toFixed(1)} goles por partido ante ${awayTeam}, que busca sorprender con ${awayTopScorer ? awayTopScorer.name + ' como carta ofensiva clave' : 'su bloque compacto y transiciones rápidas'}.`
          : `${homeTeam} afronta este duelo del ${league} contra ${awayTeam} con el peso de la localía y un xG estimado de ${homeXG.toFixed(1)}.`,
        homeFormStr !== 'N/D'
          ? `Forma reciente de ${homeTeam}: ${homeFormStr.split(' | ')[0]}.`
          : '',
        awayFormStr !== 'N/D'
          ? `${awayTeam} llega con: ${awayFormStr.split(' | ')[0]}.`
          : '',
        `xG estimado: ${homeTeamData ? homeTeamData.avgGoals.toFixed(1) : '~1.5'} (local) vs ${awayTeamData ? awayTeamData.avgGoals.toFixed(1) : '~1.0'} (visitante). Probabilidad victoria local: ~${homeTeamData && awayTeamData ? Math.round(homeTeamData.winRate) : 50}%.`,
      ].filter(Boolean).join(' '),
      importanciaDelPartido: `${homeTeam} busca los 3 puntos para mantenerse en la parte alta del ${league}. Para ${awayTeam}, cualquier resultado sin derrota es positivo de cara a la clasificación.`,
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
          local: homeCorners,
          visitante: awayCorners,
          over6_5: poissonOver(totalCorners, 6),
          over7_5: poissonOver(totalCorners, 7),
          over8_5: poissonOver(totalCorners, 8),
          over9_5: poissonOver(totalCorners, 9),
          over10_5: poissonOver(totalCorners, 10),
          over11_5: poissonOver(totalCorners, 11),
          under8_5: 100 - poissonOver(totalCorners, 8),
          local_1H: homeCorners1H,
          visitante_1H: awayCorners1H,
          local_2H: homeCorners2H,
          visitante_2H: awayCorners2H,
          over3_5_1H: poissonOver(totalCorners1H, 3),
          over4_5_1H: poissonOver(totalCorners1H, 4),
          over5_5_1H: poissonOver(totalCorners1H, 5),
          cuota_over8_5: safeOdds(poissonOver(totalCorners, 8)),
          cuota_over9_5: safeOdds(poissonOver(totalCorners, 9)),
          cuota_over10_5: safeOdds(poissonOver(totalCorners, 10)),
        },
        faltas: {
          total_esperado: totalFaltas,
          local: homeFaltas,
          visitante: awayFaltas,
          local_1H: homeFaltas1H,
          visitante_1H: awayFaltas1H,
          local_2H: homeFaltas2H,
          visitante_2H: awayFaltas2H,
          over15_5: poissonOver(totalFaltas, 15),
          over17_5: poissonOver(totalFaltas, 17),
          over20_5: poissonOver(totalFaltas, 20),
          over24_5: poissonOver(totalFaltas, 24),
          cuota_over20_5: safeOdds(poissonOver(totalFaltas, 20)),
        },
        tarjetas: {
          total_esperado: amarillasTotal,
          over1_5: poissonOver(amarillasTotal, 1),
          over2_5: poissonOver(amarillasTotal, 2),
          over3_5: poissonOver(amarillasTotal, 3),
          over4_5: poissonOver(amarillasTotal, 4),
          over5_5: poissonOver(amarillasTotal, 5),
          under3_5: 100 - poissonOver(amarillasTotal, 3),
          amarillas_local: amarillasLocal,
          amarillas_visitante: amarillasVisitante,
          amarillas_local_1H: amarillasLocal1H,
          amarillas_visitante_1H: amarillasVisitante1H,
          rojaProb: Math.min(20, Math.round(totalFaltas * 0.35)),
          cuota_over2_5: safeOdds(poissonOver(amarillasTotal, 2)),
          cuota_over3_5: safeOdds(poissonOver(amarillasTotal, 3)),
          jugadores_riesgo: [
            ...(homeTop3[0] ? [{ nombre: homeTop3[0].name, equipo: 'local' as const, probabilidad: 22 }] : []),
            ...(awayTop3[0] ? [{ nombre: awayTop3[0].name, equipo: 'visitante' as const, probabilidad: 18 }] : []),
            ...(homeTop3[1] ? [{ nombre: homeTop3[1].name, equipo: 'local' as const, probabilidad: 15 }] : []),
            ...(awayTop3[1] ? [{ nombre: awayTop3[1].name, equipo: 'visitante' as const, probabilidad: 13 }] : []),
          ],
        },
        golesporMitad: {
          local_xG_1H: homeXG1H,
          visitante_xG_1H: awayXG1H,
          local_xG_2H: homeXG2H,
          visitante_xG_2H: awayXG2H,
          over0_5_1H: poissonOver(totalXG1H, 0),
          over1_5_1H: poissonOver(totalXG1H, 1),
          over2_5_1H: poissonOver(totalXG1H, 2),
          over3_5_1H: poissonOver(totalXG1H, 3),
          over4_5_1H: poissonOver(totalXG1H, 4),
          over5_5_1H: poissonOver(totalXG1H, 5),
          over0_5_2H: poissonOver(totalXG2H, 0),
          over1_5_2H: poissonOver(totalXG2H, 1),
          over2_5_2H: poissonOver(totalXG2H, 2),
          over3_5_2H: poissonOver(totalXG2H, 3),
          over4_5_2H: poissonOver(totalXG2H, 4),
          over5_5_2H: poissonOver(totalXG2H, 5),
          cuota_over0_5_1H: safeOdds(poissonOver(totalXG1H, 0)),
          cuota_over1_5_1H: safeOdds(poissonOver(totalXG1H, 1)),
          cuota_over2_5_1H: safeOdds(poissonOver(totalXG1H, 2)),
          cuota_over3_5_1H: safeOdds(poissonOver(totalXG1H, 3)),
          cuota_over0_5_2H: safeOdds(poissonOver(totalXG2H, 0)),
          cuota_over1_5_2H: safeOdds(poissonOver(totalXG2H, 1)),
          cuota_over2_5_2H: safeOdds(poissonOver(totalXG2H, 2)),
          cuota_over3_5_2H: safeOdds(poissonOver(totalXG2H, 3)),
        },
        goleadores: {
          primer_goleador: primerGol,
          anytime,
        },
        resultados_exactos: exactScores.slice(0, 5),
        resultadoMasProbable: homeWin > 45 ? `2-1 ${homeTeam}` : homeWin > 35 ? `1-0 ${homeTeam}` : `1-1 Empate`,
        primerGoleador: primerGol,
        dobleOportunidad: {
          localOEmpate: {
            probabilidad: Math.min(99, homeWin + draw),
            cuota: parseFloat((100 / Math.max(1, homeWin + draw) * 0.93).toFixed(2)),
          },
          visitanteOEmpate: {
            probabilidad: Math.min(99, awayWin + draw),
            cuota: parseFloat((100 / Math.max(1, awayWin + draw) * 0.93).toFixed(2)),
          },
          localOVisitante: {
            probabilidad: Math.min(99, homeWin + awayWin),
            cuota: parseFloat((100 / Math.max(1, homeWin + awayWin) * 0.93).toFixed(2)),
          },
        },
        marcadorPorTiempo: {
          local: {
            primeraParteProb: Math.round(golesLines.over0_5.local * 0.45),
            segundaParteProb: Math.round(golesLines.over0_5.local * 0.55),
            cuotaPrimeraParte: parseFloat((100 / Math.max(1, golesLines.over0_5.local * 0.45) * 0.93).toFixed(2)),
            cuotaSegundaParte: parseFloat((100 / Math.max(1, golesLines.over0_5.local * 0.55) * 0.93).toFixed(2)),
          },
          visitante: {
            primeraParteProb: Math.round(golesLines.over0_5.visitante * 0.40),
            segundaParteProb: Math.round(golesLines.over0_5.visitante * 0.55),
            cuotaPrimeraParte: parseFloat((100 / Math.max(1, golesLines.over0_5.visitante * 0.40) * 0.93).toFixed(2)),
            cuotaSegundaParte: parseFloat((100 / Math.max(1, golesLines.over0_5.visitante * 0.55) * 0.93).toFixed(2)),
          },
          equipoLocal_1H_marcar: Math.round(golesLines.over0_5.local * 0.45),
          equipoVisitante_1H_marcar: Math.round(golesLines.over0_5.visitante * 0.40),
          equipoLocal_2H_marcar: Math.round(golesLines.over0_5.local * 0.55),
          equipoVisitante_2H_marcar: Math.round(golesLines.over0_5.visitante * 0.55),
        },
        mercadosJugadores: {
          asistencias: anytime.slice(0, 4).map(g => ({
            nombre: g.nombre,
            equipo: g.equipo === homeTeam ? 'local' as const : 'visitante' as const,
            probabilidad: Math.round(g.probabilidad * 0.6),
            cuota: parseFloat((g.cuota * 1.8).toFixed(2)),
          })),
          scorerOAsistente: anytime.slice(0, 4).map(g => ({
            nombre: g.nombre,
            equipo: g.equipo === homeTeam ? 'local' as const : 'visitante' as const,
            probabilidad: Math.min(85, Math.round(g.probabilidad * 1.4)),
            cuota: parseFloat((g.cuota * 0.7).toFixed(2)),
          })),
          golesporJugadorPrimeraMitad: anytime.slice(0, 4).map(g => ({
            nombre: g.nombre,
            equipo: g.equipo === homeTeam ? 'local' as const : 'visitante' as const,
            probabilidad: Math.round(g.probabilidad * 0.4),
            cuota: parseFloat((g.cuota * 2.2).toFixed(2)),
          })),
          golesporJugadorSegundaMitad: anytime.slice(0, 4).map(g => ({
            nombre: g.nombre,
            equipo: g.equipo === homeTeam ? 'local' as const : 'visitante' as const,
            probabilidad: Math.round(g.probabilidad * 0.5),
            cuota: parseFloat((g.cuota * 1.9).toFixed(2)),
          })),
        },
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
          seleccion: homeWin >= awayWin ? `Victoria ${homeTeam}` : `Victoria ${awayTeam}`,
          cuota: homeWin >= awayWin ? parseFloat((100 / Math.max(30, homeWin) * 0.93).toFixed(2)) : parseFloat((100 / Math.max(15, awayWin) * 0.93).toFixed(2)),
          probabilidad: Math.min(65, homeWin >= awayWin ? homeWin : awayWin),
          valor: parseFloat(((Math.min(65, homeWin) / 100) * (100 / Math.max(30, homeWin) * 0.93) - 1).toFixed(3)),
          riesgo: 'bajo' as const,
          razonamiento: `${homeTeam} favorito por factor local, mayor calidad y mejor historial H2H.`,
        },
        {
          mercado: 'Doble oportunidad',
          seleccion: homeWin >= awayWin ? `1X (${homeTeam} o Empate)` : `X2 (Empate o ${awayTeam})`,
          cuota: homeWin >= awayWin ? parseFloat((100 / Math.max(1, homeWin + draw) * 0.93).toFixed(2)) : parseFloat((100 / Math.max(1, awayWin + draw) * 0.93).toFixed(2)),
          probabilidad: Math.min(98, homeWin + draw),
          valor: parseFloat(((Math.min(98, homeWin + draw) / 100) * (100 / Math.max(1, homeWin + draw) * 0.93) - 1).toFixed(3)),
          riesgo: 'bajo' as const,
          razonamiento: `Mercado de bajo riesgo: cubre victoria local y empate. Probabilidad combinada alta.`,
        },
        {
          mercado: 'Total goles',
          seleccion: totalXG > 2.4 ? 'Over 2.5 goles' : 'Under 2.5 goles',
          cuota: 1.85,
          probabilidad: totalXG > 2.4 ? golesLines.over2_5.total : (100 - golesLines.over2_5.total),
          valor: parseFloat(((totalXG > 2.4 ? golesLines.over2_5.total : (100 - golesLines.over2_5.total)) / 100 * 1.85 - 1).toFixed(3)),
          riesgo: 'medio' as const,
          razonamiento: `xG total esperado de ${totalXG}. Ambos equipos con capacidad goleadora.`,
        },
        {
          mercado: 'Córners',
          seleccion: `Over ${totalCorners > 9 ? '9.5' : '8.5'} córners`,
          cuota: 1.90,
          probabilidad: totalCorners > 9 ? poissonOver(totalCorners, 9) : poissonOver(totalCorners, 8),
          valor: parseFloat(((totalCorners > 9 ? poissonOver(totalCorners, 9) : poissonOver(totalCorners, 8)) / 100 * 1.90 - 1).toFixed(3)),
          riesgo: 'medio' as const,
          razonamiento: `${homeTeam} genera ~${homeCorners} córners/partido. ${awayTeam} genera ~${awayCorners}. Total esperado: ${totalCorners}.`,
        },
        {
          mercado: 'Córners 1ª mitad',
          seleccion: `Over ${Math.round(totalCorners * 0.45) > 4 ? '4.5' : '3.5'} córners 1ª mitad`,
          cuota: 1.95,
          probabilidad: poissonOver(Math.round(totalCorners * 0.45), Math.round(totalCorners * 0.45) > 4 ? 4 : 3),
          valor: parseFloat((poissonOver(Math.round(totalCorners * 0.45), 4) / 100 * 1.95 - 1).toFixed(3)),
          riesgo: 'medio' as const,
          razonamiento: `Estimando ~${Math.round(totalCorners * 0.45)} córners en primera mitad basado en estilo de presión alta.`,
        },
        {
          mercado: 'Tarjetas amarillas',
          seleccion: amarillasTotal > 3 ? `Over 3.5 tarjetas amarillas` : `Over 2.5 tarjetas amarillas`,
          cuota: 1.88,
          probabilidad: amarillasTotal > 3 ? poissonOver(amarillasTotal, 3) : poissonOver(amarillasTotal, 2),
          valor: parseFloat(((amarillasTotal > 3 ? poissonOver(amarillasTotal, 3) : poissonOver(amarillasTotal, 2)) / 100 * 1.88 - 1).toFixed(3)),
          riesgo: 'medio' as const,
          razonamiento: `${amarillasTotal.toFixed(1)} tarjetas amarillas esperadas. Partido con intensidad física alta.`,
        },
        {
          mercado: 'Resultado 1ª mitad',
          seleccion: homeWin > 45 ? `Victoria local 1ª mitad` : `Sin goles 1ª mitad`,
          cuota: homeWin > 45 ? 2.40 : 1.75,
          probabilidad: homeWin > 45 ? Math.round(homeWin * 0.45) : Math.round(100 - golesLines.over0_5.total * 0.6),
          valor: parseFloat(((homeWin > 45 ? Math.round(homeWin * 0.45) : Math.round(100 - golesLines.over0_5.total * 0.6)) / 100 * (homeWin > 45 ? 2.40 : 1.75) - 1).toFixed(3)),
          riesgo: 'alto' as const,
          razonamiento: `Primera mitad suele ser más cerrada. ${homeWin > 45 ? 'Local presiona desde el inicio.' : 'Equipos tanteándose en los primeros 45.'}`,
        },
        {
          mercado: 'Ambos marcan',
          seleccion: Math.round(golesLines.over0_5.local * golesLines.over0_5.visitante / 100) >= 50 ? 'BTTS Sí' : 'BTTS No',
          cuota: 1.90,
          probabilidad: Math.round(golesLines.over0_5.local * golesLines.over0_5.visitante / 100) >= 50
            ? Math.round(golesLines.over0_5.local * golesLines.over0_5.visitante / 100)
            : (100 - Math.round(golesLines.over0_5.local * golesLines.over0_5.visitante / 100)),
          valor: parseFloat((Math.round(golesLines.over0_5.local * golesLines.over0_5.visitante / 100) / 100 * 1.90 - 1).toFixed(3)),
          riesgo: 'medio' as const,
          razonamiento: `P(local marca)=${golesLines.over0_5.local}% × P(visitante marca)=${golesLines.over0_5.visitante}% = BTTS ${Math.round(golesLines.over0_5.local * golesLines.over0_5.visitante / 100)}%.`,
        },
        ...(homeTopScorer ? [{
          mercado: 'Goleador anytime',
          seleccion: `${homeTopScorer.name} marca en cualquier momento`,
          cuota: parseFloat((100 / Math.max(10, Math.min(55, Math.round(golesLines.over0_5.local * 0.45))) * 0.90).toFixed(2)),
          probabilidad: Math.min(55, Math.round(golesLines.over0_5.local * 0.45)),
          valor: parseFloat((Math.min(55, Math.round(golesLines.over0_5.local * 0.45)) / 100 * (100 / Math.max(10, Math.min(55, Math.round(golesLines.over0_5.local * 0.45))) * 0.90) - 1).toFixed(3)),
          riesgo: 'alto' as const,
          razonamiento: `${homeTopScorer.name} es el máximo referente ofensivo. Alta probabilidad de participar en el marcador.`,
        }] : []),
      ],
      conclusion: `Partido de alto voltaje en el ${league}. ${homeTeam} favorito con ${Math.min(65, homeWin)}% de probabilidad. Factor casa y ${homeTopScorer?.name || 'su delantera'} claves. Recomendamos victoria local + Over ${totalXG > 2.4 ? '2.5' : '1.5'} goles. Gestión responsable: máx. 2-3% del bankroll.`,
      confianza: Math.round(Math.min(88, Math.max(65, 70 + Math.abs(homeWin - awayWin) * 0.5))),
    };
  },
};
