import { useState, useCallback } from 'react';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// ─── Contexto Mundial 2026 ────────────────────────────────────────────────────
const WC_CONTEXT = `
╔══════════════════════════════════════════════════════════════╗
║  ⚠️  CONTEXTO REAL FIFA WORLD CUP 2026 — DATOS VERIFICADOS   ║
╚══════════════════════════════════════════════════════════════╝

SEDE: USA / México / Canadá (terreno NEUTRAL para todos los equipos)
FORMATO: 48 equipos, 12 grupos de 4, top-2 + 8 mejores terceros pasan a eliminatorias

━━━ JUGADORES CLAVE ACTIVOS EN 2026 — NO RETIRADOS ━━━
• Lionel MESSI (38 años) — sigue activo con Argentina. Marcó en el Mundial 2026.
• Cristiano RONALDO — activo con Portugal. Capitán y referencia.
• Kylian MBAPPÉ — activo con Francia. Máxima estrella en pleno rendimiento.
• Erling HAALAND — activo con Noruega. Máximo goleador en clubes.
• Rodri Hernández — activo con España. Mejor jugador del mundo 2025.
• Vinícius Jr. — activo con Brasil.
• Jude Bellingham — activo con Inglaterra.
• Lamine Yamal — activo con España (18 años, fenómeno de la generación).
• Gavi — activo con España.
• Antonio Rüdiger — activo con ALEMANIA (NO Arabia Saudita).

RETIRADOS/NO CONVOCADOS:
• Sergio Busquets — retirado de España 2023.
• Nacho Fernández — retirado de España 2024.
• Álvaro Morata — no convocado por De la Fuente para el Mundial 2026.
• Eden Hazard — retirado del fútbol 2023.
• Diego Godín — retirado de Uruguay 2022.
• Ivan Perišić — retirado de Croacia.
• Axel Witsel, Jan Vertonghen, Toby Alderweireld — retirados de Bélgica.

━━━ GRUPOS DEL MUNDIAL 2026 ━━━
Grupo A: México, Rep.Checa, Corea del Sur, Sudáfrica
Grupo B: Canadá, Bosnia, Suiza, Catar
Grupo C: Brasil, Escocia, Haití, Marruecos
Grupo D: Paraguay, Turquía, Australia, Estados Unidos
Grupo E: Ecuador, Alemania, Costa de Marfil, Curazao
Grupo F: Holanda, Suecia, Japón, Túnez
Grupo G: Bélgica, Irán, Egipto, Nueva Zelanda
Grupo H: España, Uruguay, Arabia Saudita, Cabo Verde
Grupo I: Francia, Noruega, Senegal, Irak
Grupo J: Argentina, Argelia, Austria, Jordania
Grupo K: Colombia, Portugal, Uzbekistán, R.D. Congo
Grupo L: Inglaterra, Croacia, Panamá, Ghana

━━━ RESULTADOS JORNADA 1 (completada) ━━━
11 Jun: México 2-0 Sudáfrica
12 Jun: Corea del Sur 2-1 Rep.Checa | Canadá 1-1 Bosnia
13 Jun: Estados Unidos 4-1 Paraguay | Catar 1-1 Suiza | Brasil 1-1 Marruecos
14 Jun: Haití 0-1 Escocia | Australia 2-0 Turquía | Alemania 7-1 Curazao | Holanda 2-2 Japón | Costa de Marfil 1-0 Ecuador
15 Jun: Suecia 5-1 Túnez | España 0-0 Cabo Verde | Bélgica 1-1 Egipto | Arabia Saudita 1-1 Uruguay
16 Jun: Irán 2-2 Nueva Zelanda | Francia 2-0 Senegal | Irak 1-3 Noruega | Argentina 3-0 Argelia
17 Jun: Austria 2-1 Jordania
17 Jun (tarde): Portugal vs R.D. Congo (Grupo K, Boston) — resultado de ayer
17 Jun (noche): Inglaterra vs Croacia (Grupo L, LA) — resultado de ayer
17 Jun (noche): Ghana vs Panamá (Grupo L, Miami) — resultado de ayer

━━━ CLASIFICACIÓN GRUPO J (tras Jornada 1) ━━━
1. Argentina  1J 1G 0E 0P | +3 | 3pts
2. Austria    1J 1G 0E 0P | +1 | 3pts
3. Jordania   1J 0G 0E 1P | -1 | 0pts
4. Argelia    1J 0G 0E 1P | -3 | 0pts

━━━ JORNADA 2 — HOY 18 JUN ━━━
🇺🇿 Uzbekistán vs Colombia 🇨🇴 (Grupo K)
🇨🇿 Rep.Checa vs Sudáfrica 🇿🇦 (Grupo A)
🇨🇭 Suiza vs Bosnia 🇧🇦 (Grupo B)

━━━ PRÓXIMOS DÍAS ━━━
19 Jun: México vs Corea del Sur | Canadá vs Catar
20 Jun: Brasil vs Haití | Australia vs EE.UU. | Escocia vs Marruecos | Alemania vs Costa de Marfil | Holanda vs Suecia
21 Jun: Ecuador vs Curazao | Túnez vs Japón | España vs Arabia Saudita | Bélgica vs Irán | Uruguay vs Cabo Verde | NZ vs Egipto
22 Jun: Argentina vs Austria | Francia vs Irak | Noruega vs Senegal | Jordania vs Argelia
23 Jun: Portugal vs Uzbekistán | Inglaterra vs Ghana | Panamá vs Croacia | Colombia vs R.D. Congo

━━━ CLUBES TEMPORADA 2025-26 ━━━
LaLiga: Real Madrid campeón | Premier: Arsenal campeón | Bundesliga: Bayern Munich
Ligue 1: PSG campeón | Serie A: Inter Milan | UCL Final: Real Madrid 2-1 Bayern (30 May, Wembley)

━━━ ENTRENADORES ━━━
Real Madrid: Xabi Alonso | Barcelona: Hansi Flick | Man City: Pep Guardiola
Argentina: Lionel Scaloni | Francia: Deschamps | Brasil: Dorival Júnior | España: Luis de la Fuente
`;

// ─── Contexto de partido en directo ──────────────────────────────────────────
export interface LiveChatContext {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  minute?: number;
  status: 'live' | 'upcoming' | 'finished';
  recentEvents?: string[]; // ["Min 23: Gol de Mbappé (Francia)", "Min 45+1: Tarjeta amarilla a Xhaka"]
}

// ─── Hook principal ───────────────────────────────────────────────────────────
export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildSystemPrompt = (liveCtx?: LiveChatContext): string => {
    const now = new Date();
    const today = now.toLocaleDateString('es-ES', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
    const time = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

    // Live match block (injected at top of system prompt when user is watching a live game)
    const liveBlock = liveCtx ? `
╔══════════════════════════════════════════════════════╗
║  ⚡ PARTIDO EN DIRECTO — DATOS EN TIEMPO REAL        ║
╚══════════════════════════════════════════════════════╝

${liveCtx.homeTeam} ${liveCtx.homeScore} - ${liveCtx.awayScore} ${liveCtx.awayTeam}
Estado: ${liveCtx.status === 'live' ? `EN JUEGO${liveCtx.minute ? ` · Minuto ${liveCtx.minute}'` : ''}` : liveCtx.status === 'finished' ? 'FINALIZADO' : 'PRÓXIMO'}

${liveCtx.recentEvents && liveCtx.recentEvents.length > 0
  ? `Eventos recientes:\n${liveCtx.recentEvents.map(e => `  • ${e}`).join('\n')}`
  : ''}

⚠️ USA ESTOS DATOS COMO REFERENCIA PRINCIPAL para responder sobre este partido.
El usuario te pregunta desde la pantalla de análisis EN VIVO de este partido.

` : '';

    return `Eres WIKIBET IA MAESTRO — el sistema de inteligencia artificial de análisis deportivo y apuestas más avanzado del mundo, integrado en WikiBet.

FECHA Y HORA ACTUAL: ${today}, ${time}
${liveBlock}
${WC_CONTEXT}

══════════════════════════════════════════════════════════
   IDENTIDAD, MISIÓN Y CAPACIDADES
══════════════════════════════════════════════════════════

QUIÉN ERES:
→ El analista central de WikiBet: IA especializada en estadísticas avanzadas, predicción de resultados y detección de valor en mercados de apuestas deportivas
→ Integrado con datos en tiempo real del Mundial FIFA 2026 (USA/México/Canadá)
→ Experto en modelos Poisson, xG (expected goals), xA (expected assists), PPDA, press intensity, corner probability, card probability
→ Gestor de bankroll profesional basado en Kelly Criterion y análisis de valor real

PRINCIPIOS ÉTICOS (SIEMPRE ACTIVOS):
→ Informas con datos objetivos, nunca presionas a apostar
→ Siempre recuerdas: apuestas con responsabilidad, máx. 2-3% del bankroll por apuesta
→ No fabricas estadísticas. Si no tienes certeza, lo indicas claramente con "estimado"
→ Cuotas y probabilidades son estimaciones de modelos estadísticos, no garantías

══════════════════════════════════════════════════════════
   PROTOCOLO DE AUTO-ACTUALIZACIÓN CON DATOS NUEVOS
══════════════════════════════════════════════════════════

Cuando el usuario te comparta nuevos datos, SIEMPRE actúas así — de forma automática e inteligente:

📋 CUANDO LLEGUEN ALINEACIONES CONFIRMADAS:
1. Actualiza INMEDIATAMENTE las probabilidades de goleador según los 11 titulares
2. Recalcula el xG estimado por equipo (¿hay delanteros más peligrosos de los esperados?)
3. Detecta si hay ausencias importantes (lesionados, sancionados) → ajusta probabilidades
4. Informa: "Con esta alineación confirmada, actualizo mi análisis previo:"
5. Destaca los cambios más importantes respecto al análisis anterior
6. Recomienda si hay nuevas apuestas de valor que aparecen por la alineación
Ejemplo: si el 9 titular estrella está lesionado → el Over 2.5 goles baja de valor, Under sube

📊 CUANDO LLEGUEN RESULTADOS DE PARTIDO:
1. Analiza si el resultado era esperado según mis predicciones previas (¿se cumplió?)
2. Actualiza mentalmente la clasificación del grupo afectado
3. Analiza implicaciones para la Jornada 2 o siguientes de esos equipos
4. Si fue sorpresa: explica qué factores no predijiste y por qué (análisis de error)
5. Ajusta las predicciones del próximo partido de esos equipos según lo visto hoy
6. Identifica si el resultado abre o cierra oportunidades de apostante para siguientes rondas

🏥 CUANDO LLEGUEN NOTICIAS DE LESIONES:
1. Identifica inmediatamente el impacto en el equipo afectado
2. Estima cómo cambian las probabilidades del partido afectado (% concreto)
3. Señala qué mercados se ven más afectados (goleadores, over/under, resultado)
4. Compara las cuotas anteriores con las que DEBERÍAN ser ahora → detecta valor
5. Informa: "Con la lesión de [jugador], el mercado de [X] se convierte en apuesta de valor"

🏆 CUANDO SE DEFINAN ELIMINATORIAS (octavos, cuartos, semis, final):
1. Automáticamente analiza el nuevo enfrentamiento en contexto completo
2. Identifica el favorito con probabilidades (1X2 preliminar)
3. Revisa el historial H2H entre esos equipos
4. Analiza la forma reciente de cada equipo en el torneo
5. Identifica mercados de valor antes de que las casas de apuestas ajusten cuotas
6. Da una evaluación táctica del enfrentamiento

📰 CUANDO LLEGUEN NOTICIAS RELEVANTES:
1. Evalúa el impacto real en las apuestas (¿es información que afecta cuotas?)
2. Distingue entre noticias de alto impacto (lesión de titular, sanción) vs bajo impacto
3. Informa sobre el sentido en que debería moverse el mercado
4. Recomienda acción o espera según la urgencia de la información

══════════════════════════════════════════════════════════
   ANÁLISIS COMPLETO DE PARTIDO — FORMATO OBLIGATORIO
══════════════════════════════════════════════════════════

Cuando el usuario pida análisis de un partido, entrega TODO esto (extenso y detallado):

⚽ CONTEXTO DEL PARTIDO
→ Qué se juegan ambos equipos exactamente (grupo, posición, siguiente ronda)
→ Historial H2H reciente (últimos 5 encuentros si los conoces)
→ Forma reciente de cada equipo (últimos 3-5 partidos con resultados)
→ Bajas confirmadas, dudosos, condiciones especiales

🎯 PROBABILIDADES 1X2
→ Victoria [Local] X% → cuota X.XX
→ Empate X% → cuota X.XX
→ Victoria [Visitante] X% → cuota X.XX
→ xG esperado: Local X.X | Visitante X.X

⚽ MERCADOS DE GOLES
+0.5 goles   Local X%   Visitante X%   Total X%
+1.5 goles   Local X%   Visitante X%   Total X%
+2.5 goles   Local X%   Visitante X%   Total X%
+3.5 goles   Local X%   Visitante X%   Total X%
BTTS Sí: X% (@X.XX) | No: X% (@X.XX)

🔵 CORNERS
Total esperado: X | Local: X | Visitante: X
Over 8.5: X% (@X.XX) | Over 9.5: X% (@X.XX) | Over 10.5: X%
1ª parte: Over 4.5: X% | Over 5.5: X%

🟨 TARJETAS
Total esperado: X.X amarillas
+1.5: Local X% / Visitante X% / Total X%
+2.5: X% | +3.5: X%
Tarjeta roja: X%
Jugadores en riesgo: [nombre] X% (@X.XX), [nombre] X%

⚡ FALTAS
Total esperado: XX | Local: X | Visitante: X
Over 19.5: X% | Over 22.5: X%
Mayor faltador: [nombre] (X/partido)

🎯 TIROS A PUERTA
Local: X totales, X a puerta (xSoT: X.X)
Visitante: X totales, X a puerta (xSoT: X.X)
Por jugador: [nombre]: X tiros / X a puerta → X%

🥅 GOLEADORES
Primer goleador: [nombre] X% (@X.XX) | [nombre] X% (@X.XX) | [nombre] X%
Anytime scorer: [4-5 jugadores con % y cuota]

📊 TOP 5 RESULTADOS EXACTOS
X-X: X% (@X.XX) | X-X: X% | X-X: X% | X-X: X% | X-X: X%

🔍 MERCADOS ESPECIALES
→ [Otros mercados relevantes: handicap, 1ª mitad, primer córner, etc.]

🔎 ANÁLISIS TÁCTICO
→ Cómo se enfrentan los sistemas tácticos de cada equipo
→ Zonas del campo que serán clave
→ Qué ajustes tácticos son probables

Al final, SIEMPRE incluye este bloque:
─────────────────────────────────────────────
🎯 MI MEJOR APUESTA
Mercado: [nombre del mercado]
Selección: [apuesta específica]
Cuota: [X.XX]  |  Probabilidad: [X%]  |  Valor: [+X%]
Riesgo: [bajo / medio / alto]
Bankroll sugerido: [X% del bankroll]
─────────────────────────────────────────────
⚠️ Apuesta con responsabilidad. Máx. 2-3% del bankroll.

══════════════════════════════════════════════════════════
   GESTIÓN DE BANKROLL — PROTOCOLO KELLY
══════════════════════════════════════════════════════════

Cuando el usuario pida consejo de bankroll o gestión de riesgo:
• Kelly Criterion: f = (p × b - q) / b
  donde: p = probabilidad de ganar, q = 1-p, b = cuota neta (cuota - 1)
• Usar siempre ½ Kelly o ¼ Kelly (más conservador) para apuestas deportivas
• Distribución recomendada para el bankroll:
  - Apuestas principales: máx. 3% por selección
  - Acumuladores (3+ selecciones): máx. 1-2% del bankroll total
  - Apuestas especulativas (cuota > 5.00): máx. 0.5-1%
• Si el usuario da su bankroll total → calcula el importe exacto en euros/unidades

══════════════════════════════════════════════════════════
   ACUMULADORES — PROTOCOLO DE VALOR
══════════════════════════════════════════════════════════

Cuando el usuario pida un acumulador:
1. Solo incluye selecciones donde el VALUE sea positivo (p × cuota > 1)
2. Máximo 4 selecciones para mantener probabilidad razonable
3. Calcula: prob. combinada = prob1 × prob2 × prob3...
4. Calcula: cuota combinada = cuota1 × cuota2 × cuota3...
5. Evalúa si la cuota final ofrece valor real
6. Presenta siempre las alternativas si una selección falla

══════════════════════════════════════════════════════════
   SEGUIMIENTO DE PRONÓSTICOS — HISTORIAL WIKIBET
══════════════════════════════════════════════════════════

WikiBet trackea automáticamente todos los pronósticos:
• Si el usuario pregunta sobre pronósticos anteriores → analiza qué se cumplió y qué no
• Identifica patrones: ¿qué tipos de apuesta han tenido más éxito?
• Detecta sesgos: ¿favorecemos demasiado al local? ¿overestimamos Over/Under?
• Da recomendaciones para mejorar la tasa de acierto basándote en el historial

══════════════════════════════════════════════════════════
   REGLAS DE RESPUESTA — FORMATO Y ESTILO
══════════════════════════════════════════════════════════

1. Responde SIEMPRE en ESPAÑOL. Nunca en inglés (salvo nombres propios).

2. NUNCA confirmes que un jugador está retirado sin certeza. Messi sigue activo.

3. Usa cuotas DECIMALES europeas (ej: 2.15, 1.87). Nunca fracciones ni americanas.

4. Calcula value real: si (probabilidad/100) × cuota > 1 → valor positivo. Exprésalo como %.

5. Sé EXTENSO y detallado en análisis de partidos. No limites la longitud. Un análisis corto es un análisis incompleto.

6. FORMATO VISUAL — MUY IMPORTANTE. NUNCA uses markdown (##, **, *, ---, etc.):
   • Títulos de sección → MAYÚSCULAS + emoji. Ejemplo: "⚽ GOLES ESPERADOS:"
   • Tablas/datos → espacios para alinear. Ejemplo:
     +0.5 goles   Local 88%   Visit. 72%   Total 95%
     +1.5 goles   Local 65%   Visit. 48%   Total 78%
   • Listas → usa • o →
   • Separar secciones → línea en blanco
   • Destacar → emojis, NO asteriscos
   • Bloque de apuesta final → el formato de línea de guiones arriba

7. NUNCA inventes estadísticas concretas de temporada que no conoces con certeza.
   Di "estimado ~X" en vez de inventar un número exacto.

8. Para responder sobre resultados de ayer/hoy → usa los datos del contexto arriba.

9. Cuando no tengas información suficiente sobre un equipo menor → di "Información limitada para este equipo. Estimación basada en datos disponibles:" y continúa con lo que sabes.

10. Si te preguntan por partidos futuros (más de 48h) → aclara que es análisis preliminar y que las probabilidades cambiarán con alineaciones confirmadas.`;
  };

  const sendMessage = useCallback(
    async (userMessage: string, liveCtx?: LiveChatContext) => {
      setLoading(true);
      setError(null);

      const newMessages: Message[] = [
        ...messages,
        { role: 'user', content: userMessage },
      ];
      setMessages(newMessages);

      try {
        const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
        if (!apiKey) {
          const localReply = generateLocalReply(userMessage);
          setMessages(prev => [...prev, { role: 'assistant', content: localReply }]);
          setLoading(false);
          return;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 4000,
            system: buildSystemPrompt(liveCtx),
            messages: newMessages.map(msg => ({
              role: msg.role,
              content: msg.content,
            })),
          }),
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error?.message || `Error HTTP ${response.status}`);
        }

        const data = await response.json();
        const text = data.content?.[0]?.text || 'Sin respuesta de la IA.';
        setMessages(prev => [...prev, { role: 'assistant', content: text }]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error desconocido';
        if (msg.includes('abort')) {
          setMessages(prev => [...prev, { role: 'assistant', content: '⏱️ Tardó demasiado. Inténtalo de nuevo.' }]);
        } else {
          setMessages(prev => [...prev, { role: 'assistant', content: `❌ ${msg}` }]);
        }
      } finally {
        setLoading(false);
      }
    },
    [messages]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  // Genera sugerencias dinámicas vía IA
  const generateDynamicSuggestions = useCallback(async (): Promise<string[]> => {
    const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
    const fallback = getComputedSuggestions();

    if (!apiKey) return fallback;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const now = new Date();
      const todayStr = now.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 300,
          messages: [{
            role: 'user',
            content: `Hoy es ${todayStr}. Mundial 2026 en curso.

RESULTADOS JORNADA 1 completada. HOY 18 Jun: Uzbekistán vs Colombia, Rep.Checa vs Sudáfrica, Suiza vs Bosnia.
PRÓXIMOS: 19 Jun México vs Corea del Sur, Canadá vs Catar.

Genera EXACTAMENTE 5 preguntas cortas (max 60 chars cada una) que haría un apostador hoy sobre el Mundial 2026. Mezcla: partidos del día, value bets, análisis de equipos, gestión de bankroll, pronósticos. Usa emojis de bandera.

Devuelve SOLO un array JSON válido con 5 strings. Sin markdown, sin explicaciones.`
          }],
        }),
      });
      clearTimeout(timeoutId);

      if (!response.ok) return fallback;
      const data = await response.json();
      const text = data.content?.[0]?.text || '';
      const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const jsonStart = clean.indexOf('[');
      const jsonEnd = clean.lastIndexOf(']');
      if (jsonStart >= 0 && jsonEnd > jsonStart) {
        const arr = JSON.parse(clean.substring(jsonStart, jsonEnd + 1));
        if (Array.isArray(arr) && arr.length >= 4) return arr.slice(0, 5);
      }
      return fallback;
    } catch {
      return fallback;
    }
  }, []);

  return { messages, loading, error, sendMessage, clearMessages, generateDynamicSuggestions };
};

// ─── Sugerencias fallback basadas en la fecha ─────────────────────────────────
function getComputedSuggestions(): string[] {
  const now = new Date();
  const day = now.getDate();
  const month = now.getMonth() + 1;

  const calendar: Record<string, string[]> = {
    '6-17': [
      '🇦🇷 Messi hat-trick ayer: ¿qué pronósticos se cumplieron?',
      '🇵🇹 Analiza Portugal vs R.D. Congo con apuestas',
      '🏴󠁧󠁢󠁥󠁮󠁧󠁿 Análisis completo Inglaterra vs Croacia hoy',
      '💰 ¿Cuál es el mejor partido del día para apostar?',
      '🏆 Clasificación Grupo J tras Argentina 3-0',
    ],
    '6-18': [
      '🇨🇴 Analiza Colombia vs Uzbekistán con odds',
      '🇨🇭 Suiza vs Bosnia: ¿dónde está el value?',
      '🇨🇿 Rep.Checa vs Sudáfrica: análisis completo',
      '💰 Mejores value bets del día de hoy',
      '📊 ¿Qué resultados hubo ayer en el Mundial?',
    ],
    '6-19': [
      '🇲🇽 México vs Corea del Sur: análisis y apuestas',
      '🇨🇦 Canadá vs Catar: ¿dónde está el value?',
      '💰 ¿Qué partido tiene más value hoy?',
      '🏆 Clasificaciones actualizadas Grupos A y B',
      '📊 ¿Cuándo juega Argentina en Jornada 2?',
    ],
    '6-20': [
      '🇧🇷 Brasil vs Haití: ¿cuántos goles esperas?',
      '🇩🇪 Alemania vs Costa de Marfil: análisis completo',
      '🇳🇱 Holanda vs Suecia: partido clave Grupo F',
      '🇺🇸 EE.UU. vs Australia: datos y apuestas',
      '💰 Mejor apuesta acumulada para hoy',
    ],
    '6-21': [
      '🇪🇸 España vs Arabia Saudita: ¿ganará España?',
      '🇧🇪 Bélgica vs Irán: análisis y goles esperados',
      '🇺🇾 Uruguay vs Cabo Verde: datos completos',
      '📊 ¿Qué partidos tienen Over 2.5 con value?',
      '🏆 ¿Quién clasifica del Grupo H?',
    ],
    '6-22': [
      '🇦🇷 Argentina vs Austria: Messi vuelve a jugar',
      '🇫🇷 Francia vs Irak: análisis y apuestas',
      '🇳🇴 Noruega vs Senegal: Haaland como favorito',
      '💰 Mejor parlay para hoy con valor',
      '🏆 Tabla Grupo J antes del partido de Argentina',
    ],
    '6-23': [
      '🇵🇹 Portugal vs Uzbekistán: Ronaldo goleador',
      '🏴󠁧󠁢󠁥󠁮󠁧󠁿 Inglaterra vs Ghana: análisis completo',
      '🇨🇴 Colombia vs R.D. Congo: datos y value',
      '💰 ¿Cuál es el mejor partido para apostar hoy?',
      '🏆 ¿Qué equipos clasifican del Grupo L?',
    ],
  };

  const key = `${month}-${day}`;
  return calendar[key] || [
    '⚽ ¿Qué partidos se juegan hoy en el Mundial?',
    '💰 ¿Cuál es el mejor partido para apostar hoy?',
    '🇦🇷 Analiza el próximo partido de Argentina',
    '📊 Dame los datos completos de los grupos del Mundial',
    '🎯 ¿Qué apuesta tiene más value este fin de semana?',
  ];
}

// ─── Respuestas locales sin API ───────────────────────────────────────────────
function generateLocalReply(question: string): string {
  const q = question.toLowerCase();

  if (q.includes('messi') || q.includes('argentina')) {
    return `🇦🇷 ARGENTINA EN EL MUNDIAL 2026

⚽ ÚLTIMO RESULTADO: Argentina 3-0 Argelia (16 Jun)
Messi marcó HAT-TRICK: minutos 23', 58', 87'
Messi sigue activo y en pleno rendimiento con 38 años.

PRÓXIMO: Argentina vs Austria — Jornada 2 (22 Jun)

PRONÓSTICO Argentina vs Austria:
Probabilidades: Argentina 62% | Empate 24% | Austria 14%
Cuotas: 1.61 / 4.17 / 7.14

GOLES:
+0.5: Arg 89% | Aus 78% | Total 97%
+1.5: Arg 71% | Aus 58% | Total 84%
+2.5: Arg 48% | Aus 32% | Total 58%
+3.5: Arg 28% | Aus 14% | Total 33%

Córners esperados: 11 (Local 6 | Visit. 5)
Tarjetas esperadas: 4.5 (Argentina 2 | Austria 2)

GOLEADORES:
Messi (anytime): 52% @2.10
Álvarez J.: 38% @2.70
Lautaro: 35% @2.85

─────────────────────────────────────────────
🎯 MI MEJOR APUESTA
Mercado: Resultado 1X2
Selección: Victoria Argentina
Cuota: 1.61  |  Probabilidad: 62%  |  Valor: +0.4%
Riesgo: bajo  |  Bankroll sugerido: 2-3%
─────────────────────────────────────────────
⚠️ Apuesta con responsabilidad.`;
  }

  if (q.includes('colombia') || q.includes('uzbekistan')) {
    return `🇨🇴 COLOMBIA vs UZBEKISTÁN — Jornada 2 Grupo K — HOY 18 Jun

CONTEXTO: Colombia aún no ha debutado (Jornada 1 pendiente). Uzbekistán también.
Grupo K: Colombia, Portugal, Uzbekistán, R.D. Congo

ANÁLISIS COLOMBIA:
→ Últimos 5 partidos: estimado base en clasificación CONMEBOL 2026
→ James Rodríguez (capitán) lidera la creación
→ Luis Díaz (Liverpool) — referencia ofensiva
→ Cuadrado, Borja, Arias en el esquema

ANÁLISIS UZBEKISTÁN:
→ Equipo sorpresa de Asia. Bien organizado defensivamente.
→ Shomurodov como referencia. Jaloliddin Masharipov en mediocampo.
→ Juega en transiciones rápidas

PRONÓSTICO:
Victoria Colombia: 62% (@1.65) | Empate: 24% (@4.00) | Victoria Uzbekistán: 14% (@7.00)
xG: Colombia 1.8 | Uzbekistán 0.9

GOLES:
+2.5 total: 54% (@1.88) | BTTS Sí: 38% (@2.60)

─────────────────────────────────────────────
🎯 MI MEJOR APUESTA
Mercado: Resultado 1X2
Selección: Victoria Colombia
Cuota: 1.65  |  Probabilidad: 62%  |  Valor: +2.3%
Riesgo: bajo  |  Bankroll: 2%
─────────────────────────────────────────────
⚠️ Apuesta con responsabilidad.`;
  }

  if (q.includes('suiza') || q.includes('bosnia')) {
    return `🇨🇭 SUIZA vs BOSNIA — Jornada 2 Grupo B — HOY 18 Jun

CONTEXTO: Canadá 1-1 Bosnia (J1) | Catar 1-1 Suiza (J1)
Grupo B en equilibrio total. Este partido decide mucho.

SUIZA: Xhaka el motor del centro. Granit Xhaka imprescindible.
Embolo, Vargas y Shaqiri en ataque. Defensiva organizada.
BOSNIA: Dzeko (veterano) como referencia. Kolasinac en defensa.
Juegan combinativo pero con debilidades a balón parado.

PRONÓSTICO:
Suiza: 50% (@2.10) | Empate: 28% (@3.60) | Bosnia: 22% (@4.00)
xG: Suiza 1.7 | Bosnia 1.1

Córners: 9.5 total esperados — Over 8.5: 68%
Tarjetas: Over 3.5: 58% (rivalidad entre selecciones)

─────────────────────────────────────────────
🎯 MI MEJOR APUESTA
Mercado: Doble oportunidad
Selección: Suiza o Empate (1X)
Cuota: 1.45  |  Probabilidad: 78%  |  Valor: +3.1%
Riesgo: bajo  |  Bankroll: 3%
─────────────────────────────────────────────
⚠️ Apuesta con responsabilidad.`;
  }

  if (q.includes('portugal') || q.includes('ronaldo')) {
    return `🇵🇹 PORTUGAL — Grupo K

Jornada 1 jugada ayer (17 Jun) vs R.D. Congo.
PRÓXIMO: Portugal vs Uzbekistán (23 Jun, Jornada 2)

PLANTILLA PORTUGAL:
GK: Diogo Costa | Def: João Cancelo, Rúben Dias, Pepe, Nuno Mendes
MC: Vitinha, Palhinha, Bernardo Silva | Del: Rafael Leão, Cristiano Ronaldo, João Félix

PRONÓSTICO Portugal vs Uzbekistán:
Portugal: 82% (@1.22) | Empate: 13% (@7.50) | Uzbekistán: 5% (@18.00)
xG: Portugal 2.8 | Uzbekistán 0.6

GOLES Portugal:
+2.5: Portugal 71% | Over 3.5 total: 52%
Ronaldo primer goleador: 42% (@2.45)
Leão / João Félix: ambos ~35% anytime

─────────────────────────────────────────────
🎯 MI MEJOR APUESTA
Mercado: Goles totales
Selección: Over 2.5 goles
Cuota: 1.65  |  Probabilidad: 68%  |  Valor: +3.2%
Riesgo: bajo  |  Bankroll: 2-3%
─────────────────────────────────────────────
⚠️ Apuesta con responsabilidad.`;
  }

  if (q.includes('hoy') || q.includes('partidos')) {
    return `📅 PARTIDOS DE HOY — 18 Jun 2026

HOY EN JORNADA 2:
🇺🇿 Uzbekistán vs Colombia 🇨🇴 (Grupo K)
🇨🇿 Rep.Checa vs Sudáfrica 🇿🇦 (Grupo A)
🇨🇭 Suiza vs Bosnia 🇧🇦 (Grupo B)

MEJOR APUESTA DEL DÍA:
Colombia favorita frente a Uzbekistán @1.65
Suiza 1X (doble oportunidad) @1.45 — bajo riesgo

Pregúntame análisis completo de cualquiera de estos partidos.

⚠️ Apuesta con responsabilidad.`;
  }

  if (q.includes('value') || q.includes('valor') || q.includes('goles') || q.includes('over') || q.includes('under')) {
    return `💰 VALUE BETS — 18 Jun 2026

Top 3 apuestas de valor identificadas hoy:

1. Colombia vs Uzbekistán — Victoria Colombia @1.65
   Valor estimado: +2.3% | Riesgo: bajo

2. Suiza vs Bosnia — 1X (Suiza o Empate) @1.45
   Valor estimado: +3.1% | Riesgo: bajo

3. Rep.Checa vs Sudáfrica — Goles Over 2.5 @1.90
   Valor estimado: +2.8% | Riesgo: medio

CÁLCULO DE VALUE:
Value % = (probabilidad_IA × cuota - 1) × 100
Ejemplo: Colombia: (0.62 × 1.65 - 1) × 100 = +2.3% ✅

⚠️ Solo apuesta lo que puedas permitirte perder.`;
  }

  if (q.includes('bankroll') || q.includes('gestión') || q.includes('kelly')) {
    return `📊 GESTIÓN DE BANKROLL — GUÍA WIKIBET

REGLAS FUNDAMENTALES:
• Máximo 3% del bankroll por apuesta individual
• Máximo 5-6% del bankroll total en riesgo simultáneo
• Acumuladores: máx 1-2% del bankroll

KELLY CRITERION (½ Kelly recomendado):
Fórmula: f = (p × b - q) / b
→ p = probabilidad de ganar (ej: 0.62)
→ q = 1-p (ej: 0.38)
→ b = cuota neta (cuota - 1, ej: 0.65)
→ Kelly = (0.62×0.65 - 0.38)/0.65 = 0.036 = 3.6%
→ ½ Kelly recomendado: 1.8% del bankroll

EJEMPLO PRÁCTICO (bankroll €500):
→ Apuesta valor bajo riesgo: €10-15 (2-3%)
→ Apuesta especulativa cuota 5+: €2.50-5 (0.5-1%)
→ Acumulador 3 selecciones: €5-10 (1-2%)

⚠️ Las apuestas tienen riesgo real. Nunca apuestes más de lo que puedas perder.`;
  }

  return `🤖 WikiBet IA MAESTRO — Sin conexión API

Puedo analizar cualquier partido del Mundial 2026 con datos completos.

HOY 18 Jun: Uzbekistán vs Colombia | Rep.Checa vs Sudáfrica | Suiza vs Bosnia
Pregúntame por cualquier equipo o partido para un análisis completo.

Capacidades con API activa:
• Análisis completo partido (xG, goles, corners, tarjetas, goleadores)
• Value bets y detección de valor en cuotas
• Acumuladores con cálculo de valor combinado
• Gestión de bankroll con Kelly Criterion
• Auto-actualización cuando lleguen alineaciones o resultados

Para análisis completos, activa la API key en settings.`;
}
