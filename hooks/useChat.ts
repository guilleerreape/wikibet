import { useState, useCallback } from 'react';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const WC_MATCHES_CONTEXT = `MUNDIAL 2026 — GRUPOS REALES (datos ESPN, 16 Jun 2026):
GRUPO A: México, Rep.Checa, Corea del Sur, Sudáfrica
GRUPO B: Canadá, Bosnia, Suiza, Catar
GRUPO C: Brasil, Escocia, Haití, Marruecos
GRUPO D: Paraguay, Turquía, Australia, Estados Unidos
GRUPO E: Ecuador, Alemania, Costa de Marfil, Curazao
GRUPO F: Holanda, Suecia, Japón, Túnez
GRUPO G: Bélgica, Irán, Egipto, Nueva Zelanda
GRUPO H: España, Uruguay, Arabia Saudita, Cabo Verde
GRUPO I: Francia, Noruega, Senegal, Irak
GRUPO J: Argentina, Austria, Argelia, Jordania
GRUPO K: Colombia, Portugal, Uzbekistán, R.D. Congo
GRUPO L: Inglaterra, Croacia, Panamá, Ghana

RESULTADOS JORNADA 1 (ya jugados):
11 Jun: México 2-0 Sudáfrica
12 Jun: Corea del Sur 2-1 Rep.Checa | Canadá 1-1 Bosnia
13 Jun: Estados Unidos 4-1 Paraguay | Catar 1-1 Suiza | Brasil 1-1 Marruecos
14 Jun: Haití 0-1 Escocia | Australia 2-0 Turquía | Alemania 7-1 Curazao | Holanda 2-2 Japón | Costa de Marfil 1-0 Ecuador
15 Jun: Suecia 5-1 Túnez | España 0-0 Cabo Verde | Bélgica 1-1 Egipto | Arabia Saudita 1-1 Uruguay
16 Jun: Irán 2-2 Nueva Zelanda (jugado) | Francia vs Senegal (19:00h HOY) | Irak vs Noruega (22:00h HOY)

PRÓXIMOS PARTIDOS:
17 Jun: Argentina vs Argelia (01:00h) - MetLife NJ | Austria vs Jordania (04:00h) - SoFi LA
17 Jun: Portugal vs R.D. Congo (17:00h) | Inglaterra vs Croacia (20:00h) | Ghana vs Panamá (23:00h)
18 Jun: Uzbekistán vs Colombia (02:00h) | Rep.Checa vs Sudáfrica (16:00h) | Suiza vs Bosnia (19:00h)
19 Jun: México vs Corea del Sur (01:00h) | Canadá vs Catar (22:00h)
20 Jun: Estados Unidos vs Australia | Escocia vs Marruecos | Brasil vs Haití | Turquía vs Paraguay
20 Jun: Alemania vs Costa de Marfil | Holanda vs Suecia
21 Jun: Ecuador vs Curazao | Túnez vs Japón | España vs Arabia Saudita | Bélgica vs Irán | Uruguay vs Cabo Verde | Nueva Zelanda vs Egipto
22 Jun: Argentina vs Austria (MetLife) | Francia vs Irak | Noruega vs Senegal | Jordania vs Argelia
23 Jun: Portugal vs Uzbekistán | Inglaterra vs Ghana | Panamá vs Croacia | Colombia vs R.D. Congo

CLASIFICACIÓN PROVISIONAL (top equipos):
Grupo A: México 3pts, Corea Sur 3pts, Rep.Checa 0pts, Sudáfrica 0pts
Grupo C: Escocia 3pts, Brasil 1pt, Marruecos 1pt, Haití 0pts
Grupo D: Estados Unidos 3pts, Australia 3pts, Turquía 0pts, Paraguay 0pts
Grupo E: Alemania 3pts, Costa de Marfil 3pts, Ecuador 0pts, Curazao 0pts
Grupo F: Suecia 3pts, Holanda 1pt, Japón 1pt, Túnez 0pts
Grupo H: España 1pt, Arabia Saudita 1pt, Uruguay 1pt, Cabo Verde 1pt`;

const CLUBS_CONTEXT = `LIGAS DE CLUBES TEMPORADA 2025-26 (Terminada mayo 2026):
LA LIGA CAMPEÓN: Real Madrid (84pts). Top: Barcelona 80pts, Atletico Madrid 73pts, Sevilla, Girona, Villarreal
PREMIER LEAGUE CAMPEÓN: Arsenal (89pts). Top: Liverpool 85pts, Man City 80pts, Chelsea, Newcastle, Tottenham
BUNDESLIGA CAMPEÓN: Bayern Munich (78pts). Top: Bayer Leverkusen 72pts, Dortmund, RB Leipzig, Stuttgart
LIGUE 1 CAMPEÓN: PSG (91pts). Top: Monaco 71pts, Marseille 68pts, Lille, Lyon
SERIE A CAMPEÓN: Inter Milan (90pts). Top: Napoli 78pts, Juventus 73pts, Atalanta, AC Milan, Roma
CHAMPIONS LEAGUE: Real Madrid 2-1 Bayern Munich (Final Wembley 30 May 2026)`;

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

    return `Eres WikiBet IA, analista deportivo experto en fútbol y apuestas.

FECHA Y HORA ACTUAL: ${today}, ${time}

${WC_MATCHES_CONTEXT}

${CLUBS_CONTEXT}

REGLAS ESTRICTAS:
1. Responde SIEMPRE en ESPAÑOL. Nunca en inglés.
2. NUNCA preguntes "¿contra quién juega?" si el equipo aparece en el calendario arriba. Consulta el calendario primero.
3. Cuando pregunten por un partido, da SIEMPRE: formaciones, probabilidades 1X2 (%), cuotas justas, xG esperado, corners, tarjetas, mercados recomendados con value.
4. Usa cuotas DECIMALES reales (ej: 2.15, 1.87, 3.40). No uses fracciones.
5. Calcula value: si prob × cuota > 1, hay valor positivo.
6. Para "¿Argentina hoy?", "¿cuándo juega España?" etc. — consulta el calendario ANTES de responder.
7. Si hay lesiones o suspensiones conocidas (Haaland, Mbappé, Vinicius, Rodri), considéralas en el análisis.
8. Sé directo y conciso. Da análisis en 150-300 palabras máximo por respuesta.
9. Termina siempre con "⚠️ Apuesta con responsabilidad."`;
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
        const timeoutId = setTimeout(() => controller.abort(), 20000);

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
            max_tokens: 1024,
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
          setMessages(prev => [...prev, { role: 'assistant', content: '⏱️ La consulta tardó demasiado. Inténtalo de nuevo.' }]);
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

  return { messages, loading, error, sendMessage, clearMessages };
};

function generateLocalReply(question: string): string {
  const q = question.toLowerCase();
  if (q.includes('argentina')) {
    return '🇦🇷 Argentina (Grupo J) — próximo: vs Argelia, 17 Jun 01:00h (MetLife NJ)\n\nProbabilidades: Victoria Argentina 64% | Empate 22% | Argelia 14%\nCuotas justas: 1.56 / 4.55 / 7.14\n\nMercados recomendados:\n• Victoria Argentina @1.55 ← VALOR POSITIVO si la oferta supera\n• Over 2.5 goles @1.85 (Argentina promedian 2.3 goles)\n• BTTS Sí @1.90\n\nxG esperado: Argentina 2.1 — Argelia 0.9\nCorners esperados: 10 (Over 9.5 @1.80)\n\n⚠️ Apuesta con responsabilidad.';
  }
  if (q.includes('españa') || q.includes('spain')) {
    return '🇪🇸 España (Grupo H) — DEBUT: 0-0 vs Cabo Verde (no anotaron)\nPróximo: vs Arabia Saudita, 21 Jun\n\nProbabilidades: España 68% | Empate 20% | Arabia 12%\nCuotas justas: 1.47 / 5.00 / 8.33\n\nMercados:\n• Victoria España necesitada @1.45 ← ALTA PROBABILIDAD\n• Over 1.5 goles @1.40 (España necesita marcar)\n• BTTS No @1.60 — España portería sólida\n\n⚠️ Apuesta con responsabilidad.';
  }
  if (q.includes('brasil') || q.includes('brazil')) {
    return '🇧🇷 Brasil (Grupo C) — DEBUT: 1-1 vs Marruecos\nPróximo: vs Haití, 20 Jun\n\nProbabilidades: Brasil 82% | Empate 13% | Haití 5%\nCuotas justas: 1.22 / 7.69 / 20.0\n\nMercados:\n• Brasil -1.5 handicap @1.70 ← VALOR\n• Over 3.5 goles @1.90\n• Brasil primer gol @1.15\n\nNota: Brasil empató vs Marruecos y está bajo presión.\n\n⚠️ Apuesta con responsabilidad.';
  }
  if (q.includes('alemania') || q.includes('germany')) {
    return '🇩🇪 Alemania (Grupo E) — DEBUT: 7-1 vs Curazao ¡GOLEADA!\nPróximo: vs Costa de Marfil, 20 Jun\n\nProbabilidades: Alemania 72% | Empate 18% | Costa de Marfil 10%\nCuotas justas: 1.39 / 5.56 / 10.0\n\nMercados:\n• Over 2.5 goles @1.55 ← OBLIGATORIO tras el 7-1\n• Victoria Alemania @1.38\n• Alemania +2 goles de ventaja @1.85\n\nNota: Nagelsmann en modo ofensivo. 7 goles en el debut.\n\n⚠️ Apuesta con responsabilidad.';
  }
  if (q.includes('partidos') || q.includes('hoy')) {
    return '📅 HOY 16 Jun 2026:\n• 19:00h Francia vs Senegal (AT&T Dallas) — Grupo I\n• 22:00h Irak vs Noruega (Levi\'s SF) — Grupo I\n\nMAÑANA 17 Jun:\n• 01:00h Argentina vs Argelia (MetLife NJ) — Grupo J\n• 04:00h Austria vs Jordania (SoFi LA) — Grupo J\n• 17:00h Portugal vs R.D. Congo (Boston) — Grupo K\n• 20:00h Inglaterra vs Croacia (Rose Bowl LA) — Grupo L\n• 23:00h Ghana vs Panamá (Miami) — Grupo L\n\n⚠️ Para análisis IA completo, configura la API key.';
  }
  return '🤖 WikiBet IA — modo sin API key.\n\nPuedo responder sobre cualquier selección del Mundial 2026 o clubes de las 5 grandes ligas.\n\nGrupos confirmados A-L con 48 selecciones. Resultados de Jornada 1 actualizados.\n\nPara análisis IA completo con Claude, añade EXPO_PUBLIC_ANTHROPIC_API_KEY a tu .env';
}
