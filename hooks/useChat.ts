import { useState, useCallback } from 'react';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// ─── Contexto del Mundial 2026 (actualizado continuamente) ───────────────────
const WC_CONTEXT = `
╔══════════════════════════════════════════════════════════════╗
║  ⚠️  CONTEXTO REAL ACTUALIZADO — PREVALECE SOBRE TU TRAINING ║
╚══════════════════════════════════════════════════════════════╝

FECHA ACTUAL: 17 de junio de 2026. Hora: ahora mismo.
EVENTO: FIFA WORLD CUP 2026 en curso en USA/México/Canadá.

━━━ JUGADORES ACTIVOS EN 2026 — NO ESTÁN RETIRADOS ━━━
• Lionel MESSI (38 años) — SIGUE JUGANDO con Argentina en el Mundial 2026.
  JUGÓ ANOCHE (16 Jun) contra Argelia y MARCÓ HAT-TRICK (3 goles).
  NO está retirado del fútbol internacional.
• Cristiano RONALDO — sigue activo, juega con Portugal.
• Kylian MBAPPÉ — activo, juega con Francia.
• Erling HAALAND — activo, juega con Noruega.
• Rodri Hernández — activo, juega con España.
• Vinícius Jr. — activo, juega con Brasil.
• Jude Bellingham — activo, juega con Inglaterra.
• Kevin De Bruyne — activo, juega con Bélgica.
• Harry Kane — activo, juega con Inglaterra.

REGLA CRÍTICA: Si un jugador jugó en el Mundial 2026 o en ligas 2025-26,
NO lo des por retirado. Asume que sigue activo si no hay info de retiro RECIENTE.

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

━━━ RESULTADOS JORNADA 1 (todos jugados) ━━━
11 Jun: México 2-0 Sudáfrica
12 Jun: Corea del Sur 2-1 Rep.Checa | Canadá 1-1 Bosnia
13 Jun: Estados Unidos 4-1 Paraguay | Catar 1-1 Suiza | Brasil 1-1 Marruecos
14 Jun: Haití 0-1 Escocia | Australia 2-0 Turquía | Alemania 7-1 Curazao | Holanda 2-2 Japón | Costa de Marfil 1-0 Ecuador
15 Jun: Suecia 5-1 Túnez | España 0-0 Cabo Verde | Bélgica 1-1 Egipto | Arabia Saudita 1-1 Uruguay
16 Jun: Irán 2-2 Nueva Zelanda | Francia 2-0 Senegal | Irak 1-3 Noruega
16-17 Jun (madrugada): ARGENTINA 3-0 ARGELIA ← MESSI HAT-TRICK (minutos 23, 58, 87)
17 Jun (madrugada): Austria 2-1 Jordania (jugado esta madrugada)

━━━ PARTIDOS DE HOY 17 JUN (pendientes o recién jugados) ━━━
✅ Argentina 3-0 Argelia (Grupo J) — JUGADO. Messi: 3 goles.
✅ Austria 2-1 Jordania (Grupo J) — JUGADO.
17:00h Portugal vs R.D. Congo (Grupo K) — Boston
20:00h Inglaterra vs Croacia (Grupo L) — Rose Bowl LA
23:00h Ghana vs Panamá (Grupo L) — Miami

━━━ JORNADA 2 PRÓXIMOS ━━━
18 Jun: Uzbekistán vs Colombia | Rep.Checa vs Sudáfrica | Suiza vs Bosnia
19 Jun: México vs Corea del Sur | Canadá vs Catar
20 Jun: Brasil vs Haití | Australia vs EE.UU. | Escocia vs Marruecos | Alemania vs Costa de Marfil | Holanda vs Suecia | Turquía vs Paraguay
21 Jun: Ecuador vs Curazao | Túnez vs Japón | España vs Arabia Saudita | Bélgica vs Irán | Uruguay vs Cabo Verde | Nueva Zelanda vs Egipto
22 Jun: Argentina vs Austria | Francia vs Irak | Noruega vs Senegal | Jordania vs Argelia
23 Jun: Portugal vs Uzbekistán | Inglaterra vs Ghana | Panamá vs Croacia | Colombia vs R.D. Congo

━━━ CLASIFICACIÓN GRUPO J (tras Jornada 1) ━━━
1. Argentina  1J 1G 0E 0P | GF:3 GA:0 +3 | 3pts
2. Austria    1J 1G 0E 0P | GF:2 GA:1 +1 | 3pts
3. Jordania   1J 0G 0E 1P | GF:1 GA:2 -1 | 0pts
4. Argelia    1J 0G 0E 1P | GF:0 GA:3 -3 | 0pts

━━━ CLUBES TEMPORADA 2025-26 ━━━
LaLiga: Real Madrid campeón. Top: Barça, Atlético
Premier: Arsenal campeón. Top: Liverpool, Man City
Bundesliga: Bayern Munich campeón
Ligue 1: PSG campeón
Serie A: Inter Milan campeón
UCL Final: Real Madrid 2-1 Bayern (30 May 2026, Wembley)

━━━ ENTRENADORES ACTUALES ━━━
Real Madrid: Xabi Alonso | Barcelona: Hansi Flick | Manchester City: Pep Guardiola
PSG: Luis Enrique | Bayern: Vincent Kompany | Argentina: Lionel Scaloni
Francia: Didier Deschamps | Brasil: Dorival Júnior | España: Luis de la Fuente
`;

// ─── Hook principal ───────────────────────────────────────────────────────────
export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildSystemPrompt = (): string => {
    const now = new Date();
    const today = now.toLocaleDateString('es-ES', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
    const time = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

    return `Eres WikiBet IA, el analista de apuestas deportivas más experto del mundo.
FECHA Y HORA ACTUAL: ${today}, ${time}

${WC_CONTEXT}

━━━ TUS REGLAS DE RESPUESTA ━━━

1. Responde SIEMPRE en ESPAÑOL. Nunca en inglés.

2. NUNCA digas que un jugador se retiró sin confirmación explícita. Messi JUGÓ ANOCHE. Sigue activo.

REGLA OBLIGATORIA — JUGADORES RETIRADOS: NUNCA menciones jugadores retirados o que no están en la convocatoria actual.
   Sergio Busquets: retirado de la selección española en 2023. NO está en el Mundial 2026.
   Nacho Fernández: retirado de la selección española en 2024. NO está en el Mundial 2026.
   Álvaro Morata: NO convocado para el Mundial 2026 por De la Fuente.
   Eden Hazard: retirado del fútbol profesional en 2023.
   Diego Godín: retirado de la selección uruguaya en 2022.
   Luis Suárez: ya no es convocado regularmente para Uruguay.
   Axel Witsel: retirado de la selección belga.
   Jan Vertonghen: retirado de la selección belga.
   Ivan Perišić: retirado de la selección croata.
   ANTONIO RÜDIGER JUEGA PARA ALEMANIA — es capitán de la defensa alemana en el Mundial 2026. NUNCA lo pongas en Arabia Saudita.
   Usa siempre plantillas actuales 2025-2026 para el Mundial 2026.

3. CUANDO TE PIDAN ANÁLISIS DE UN PARTIDO, da OBLIGATORIAMENTE TODO esto:
   ┌─ ANÁLISIS COMPLETO ─────────────────────────────────────
   │ • Contexto del partido y qué se juegan
   │ • Probabilidades 1X2: % exactos + cuotas decimales
   │ • xG esperado por equipo (local y visitante)
   │ • GOLES — tabla completa:
   │   +0.5 goles: local X% | visitante X% | total X%
   │   +1.5 goles: local X% | visitante X% | total X%
   │   +2.5 goles: local X% | visitante X% | total X%
   │   +3.5 goles: local X% | visitante X% | total X%
   │ • CÓRNERS — tabla:
   │   Total esperado: X | Local: X | Visitante: X
   │   +8.5: X% | +9.5: X% | +10.5: X%
   │ • TARJETAS — tabla:
   │   Total esperado: X.X amarillas
   │   +1.5: local X% visit X% total X%
   │   +2.5: local X% visit X% total X%
   │   +3.5: local X% visit X% total X%
   │   Roja: X% | Jugadores en riesgo: [nombres y %]
   │ • FALTAS:
   │   Total: X | Local: X | Visitante: X
   │   Jugadores que más faltan: [nombres con % y cuota falta]
   │ • TIROS A PUERTA:
   │   Local: X totales, X a puerta | Visitante: X totales, X a puerta
   │   Por jugador: [nombre: X tiros, X a puerta]
   │ • GOLEADORES:
   │   Primer goleador: [nombre] X% (cuota X.XX)
   │   Anytime: [4-5 jugadores con % y cuota]
   │ • TOP 5 RESULTADOS EXACTOS con probabilidad y cuota
   │ • BTTS Sí/No con %
   │ • Análisis táctico (3-4 frases)
   └──────────────────────────────────────────────────────────

   Al final SIEMPRE pon:
   🎯 MI MEJOR APUESTA: [mercado] → [selección] @[cuota] | Valor: [%] | Riesgo: [bajo/medio/alto]
   ⚠️ Apuesta con responsabilidad. Máx. 2-3% del bankroll.

4. Usa cuotas DECIMALES europeas (ej: 2.15, 1.87). Nunca fracciones.

5. Calcula value real: si (probabilidad/100) × cuota > 1 → hay valor positivo.

6. Para preguntas sobre resultados de ayer → usa los resultados de la Jornada 1 arriba.

7. Para preguntas sobre el grupo de un equipo → consulta los grupos arriba ANTES de responder.

8. Sé EXTENSO y detallado en análisis de partidos. No limites la longitud.

9. FORMATO DE RESPUESTA — MUY IMPORTANTE:
   NUNCA uses markdown: nada de ##, ###, **, *, ---, _texto_, [texto], etc.
   USA este estilo limpio y visual:

   • Para títulos de sección → escríbelos en MAYÚSCULAS seguidos de dos puntos, con emoji
     Ejemplo: "⚽ GOLES ESPERADOS:" o "🎯 PROBABILIDADES 1X2:"

   • Para tablas/datos → usa espacios y guiones para alinear
     Ejemplo:
     +0.5 goles   Local 88%   Visit. 72%   Total 95%
     +1.5 goles   Local 65%   Visit. 48%   Total 78%

   • Para listas → usa • o → al inicio
     Ejemplo: "• Victoria Argentina @1.60 — valor positivo"

   • Para separar secciones → usa una línea en blanco, nada más

   • Para destacar algo → usa emojis, NO asteriscos
     Ejemplo: "🔥 Messi en racha" NO "**Messi en racha**"

   • Para la apuesta final → usa este formato:
     ─────────────────────────────
     🎯 MI MEJOR APUESTA
     Mercado: [nombre]
     Selección: [apuesta]
     Cuota: [X.XX]  |  Probabilidad: [X%]  |  Valor: [+X%]
     Riesgo: [bajo/medio/alto]
     ─────────────────────────────

   Respuestas limpias, con espaciado, sin caracteres extraños de markdown.`;
  };

  const sendMessage = useCallback(
    async (userMessage: string) => {
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
            max_tokens: 3000,
            system: buildSystemPrompt(),
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
            content: `Hoy es ${new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}. Mundial 2026.

JUGADOS HOY/AYER: Argentina 3-0 Argelia (Messi hat-trick), Austria 2-1 Jordania.
HOY PENDIENTES: Portugal vs R.D. Congo (17h), Inglaterra vs Croacia (20h), Ghana vs Panamá (23h).
MAÑANA: Uzbekistán vs Colombia, Rep.Checa vs Sudáfrica, Suiza vs Bosnia.

Genera EXACTAMENTE 5 preguntas cortas (max 60 chars cada una) que haría un apostador hoy sobre el Mundial 2026. Mezcla preguntas sobre partidos del día, resultados de ayer, y apuestas. Usa emojis de bandera.

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
      '📊 Argentina cuando juega vs Austria Jornada 2?',
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

⚽ ÚLTIMO RESULTADO: Argentina 3-0 Argelia (16-17 Jun)
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

🎯 MI MEJOR APUESTA: Victoria Argentina @1.60 | Valor: +2.4% | Riesgo: bajo

⚠️ Apuesta con responsabilidad.`;
  }

  if (q.includes('portugal') || q.includes('ronaldo')) {
    return `🇵🇹 PORTUGAL — Grupo K

PRÓXIMO HOY: Portugal vs R.D. Congo (17:00h, Boston)
Jornada 1: Portugal pendiente (este es su debut)

ANÁLISIS Portugal vs R.D. Congo:
Probabilidades: Portugal 78% | Empate 15% | R.D. Congo 7%
Cuotas: 1.28 / 6.67 / 14.3

GOLES:
+0.5: Por 92% | RDC 61% | Total 97%
+1.5: Por 78% | RDC 38% | Total 88%
+2.5: Por 56% | RDC 18% | Total 65%
+3.5: Por 32% | RDC 8% | Total 38%

Córners: Total 11 (Portugal 7 | RDC 4)
Tarjetas: +3.5 → 62%
Roja: 12%

GOLEADORES:
Cristiano Ronaldo (anytime): 58% @1.95
Bruno Fernandes: 42% @2.40
João Félix: 32% @3.20

🎯 MI MEJOR APUESTA: Portugal -1.5 handicap @1.75 | Valor: +3.5% | Riesgo: medio

⚠️ Apuesta con responsabilidad.`;
  }

  if (q.includes('hoy') || q.includes('partidos')) {
    return `📅 PARTIDOS DE HOY — 17 Jun 2026

✅ Ya jugados:
• Argentina 3-0 Argelia (Messi hat-trick 🔥)
• Austria 2-1 Jordania

⏰ Pendientes:
• 17:00h 🇵🇹 Portugal vs R.D. Congo 🇨🇩 (Grupo K)
• 20:00h 🏴󠁧󠁢󠁥󠁮󠁧󠁿 Inglaterra vs Croacia 🇭🇷 (Grupo L)
• 23:00h 🇬🇭 Ghana vs Panamá 🇵🇦 (Grupo L)

MEJOR APUESTA DEL DÍA:
Portugal -1.5 handicap vs R.D. Congo @1.75
Portugal es muy superior y viene con hambre de goles.

⚠️ Apuesta con responsabilidad.`;
  }

  if (q.includes('goles') || q.includes('over') || q.includes('under')) {
    return `⚽ MERCADOS DE GOLES — Mundial 2026

Los mejores Over 2.5 de hoy:
• Portugal vs R.D. Congo: Over 2.5 @1.65 → 65%
• Inglaterra vs Croacia: Over 2.5 @1.80 → 55%

BTTS más probable:
• Inglaterra vs Croacia: BTTS Sí @1.85 → 58%

Consejo: Portugal tiene el xG más alto del día (~2.8).
Over 2.5 Portugal vs RDC tiene value positivo.

🎯 MEJOR APUESTA GOLES: Over 2.5 Portugal vs RDC @1.65

⚠️ Apuesta con responsabilidad.`;
  }

  return `🤖 WikiBet IA — Sin conexión API

Puedo analizar cualquier partido del Mundial 2026 con datos completos.
Pregúntame por Argentina, Portugal, España, Brasil o cualquier selección.

Resultados de ayer: 🇦🇷 Argentina 3-0 🇩🇿 Argelia (Messi HAT-TRICK)

Para análisis completos con IA, activa la API key.`;
}
