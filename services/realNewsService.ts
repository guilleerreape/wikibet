export interface RealNews {
  id: string;
  title: string;
  description: string;
  url?: string;
  source: string;
  publishedAt: string;
  emoji: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  category: 'injury' | 'suspension' | 'form' | 'tactical' | 'weather' | 'transfer';
  teams: string[];
  bettingImpact: string;
  relevanceScore: number;
}

// Cache: 8 minutos (balance entre frescura y coste de API)
let _cache: RealNews[] | null = null;
let _cacheTime = 0;
const CACHE_TTL = 8 * 60 * 1000;

const CLAUDE_API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
const CLAUDE_URL = 'https://api.anthropic.com/v1/messages';

// Fallback mínimo de emergencia (solo si ESPN y IA fallan)
const EMERGENCY_NEWS: RealNews[] = [
  {
    id: 'emerg_001',
    title: 'Mundial 2026 en marcha — Fase de grupos activa',
    description: 'El Mundial 2026 está en pleno desarrollo con partidos en USA, México y Canadá. Las selecciones más fuertes afrontan sus próximos compromisos con todo el grupo intacto y la presión de clasificar a octavos.',
    source: 'WikiBet',
    publishedAt: new Date().toISOString(),
    emoji: '🏆',
    impact: 'HIGH',
    category: 'form',
    teams: [],
    bettingImpact: 'Consulta el calendario de partidos para encontrar los mejores mercados del día.',
    relevanceScore: 80,
  },
  {
    id: 'emerg_002',
    title: 'Cuidado con las bajas de última hora — Factor clave en apuestas',
    description: 'Las lesiones de último momento son el mayor movedor de cuotas en la fase de grupos. Antes de apostar, revisa siempre los titulares de los equipos implicados. Un jugador clave de baja puede cambiar completamente el mercado 1X2.',
    source: 'WikiBet',
    publishedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    emoji: '🩹',
    impact: 'HIGH',
    category: 'injury',
    teams: [],
    bettingImpact: 'Las bajas de estrellas mueven las cuotas entre 10-20%. Valor en el equipo contrario.',
    relevanceScore: 75,
  },
];

// ─── Fetch today's WC fixtures dynamically ───────────────────────────────────
async function fetchTodayFixtures(): Promise<string> {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const tomorrowEnd = todayStart + 48 * 60 * 60 * 1000; // next 48h

    const res = await fetch(
      'https://site.api.espn.com/apis/site/v2/sports/soccer/FIFA.WORLD/scoreboard?limit=50',
      { headers: { Accept: 'application/json' } }
    );
    if (!res.ok) throw new Error('ESPN failed');
    const data = await res.json();
    const events: any[] = data?.events ?? [];

    const lines: string[] = [];
    for (const ev of events) {
      const d = new Date(ev.date ?? '');
      const ts = d.getTime();
      if (ts < todayStart - 24 * 60 * 60 * 1000 || ts > tomorrowEnd) continue;
      const competitors = ev.competitions?.[0]?.competitors ?? [];
      const home = competitors.find((c: any) => c.homeAway === 'home');
      const away = competitors.find((c: any) => c.homeAway === 'away');
      if (!home || !away) continue;
      const hn = home.team?.displayName ?? home.team?.name ?? '';
      const an = away.team?.displayName ?? away.team?.name ?? '';
      const status = ev.competitions?.[0]?.status?.type?.name ?? '';
      const hs = home.score;
      const as_ = away.score;
      const scoreStr = hs != null ? ` (${hs}-${as_})` : '';
      const timeStr = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC';
      const venueStr = ev.competitions?.[0]?.venue?.fullName ? `, ${ev.competitions[0].venue.fullName}` : '';
      const statusStr = status.includes('Final') ? ' — TERMINADO' : status.includes('In') ? ' — EN DIRECTO' : '';
      lines.push(`${hn} vs ${an} (${d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}, ${timeStr}${venueStr})${scoreStr}${statusStr}`);
    }
    return lines.length > 0 ? lines.join('\n') : '';
  } catch {
    // Fallback to static data when ESPN fails
    const d = new Date();
    const dateStr = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    return `Mundial 2026 Fase de Grupos — ${dateStr}. Partidos en curso o próximos en USA, México y Canadá.`;
  }
}

// ─── Genera noticias con IA (Claude Haiku) ────────────────────────────────────
async function generateAINews(): Promise<RealNews[]> {
  if (!CLAUDE_API_KEY) return EMERGENCY_NEWS;

  const today = new Date().toLocaleDateString('es-ES', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const todayShort = new Date().toLocaleDateString('es-ES');
  const currentTime = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  // Fetch DYNAMIC fixtures (not hardcoded dates)
  const todayFixtures = await fetchTodayFixtures();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(CLAUDE_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1400,
        messages: [{
          role: 'user',
          content: `Hoy es ${today} — ${currentTime}h. Es la fase de grupos del Mundial 2026 en USA, México y Canadá.

PARTIDOS ACTUALES / PRÓXIMAS 48H (datos en tiempo real):
${todayFixtures || 'Fase de grupos del Mundial 2026 — partidos en curso o próximos'}

Genera 9 noticias deportivas ULTRA-ACTUALES para ahora mismo (${todayShort}, ${currentTime}h).
Son noticias FRESCAS que reflejan el estado actual del torneo. Varía el contenido en cada generación.

Tipos de noticias (mezcla todos):
1. Lesiones/molestias de jugadores clave ANTES de sus próximos partidos (muy específico: jugador, minuto, tipo lesión)
2. Resultados recientes + análisis de rendimiento (quién está en forma, quién no)
3. Análisis táctico pre-partido de los que juegan hoy/mañana
4. Rumores de fichajes relacionados con jugadores del Mundial (enero siguiente)
5. Declaraciones de entrenadores / controversias / decisiones de alineación
6. Movimientos de cuotas en casa de apuestas por noticias de última hora
7. Estadísticas sorprendentes del torneo (goleadores, tarjetas, xG, etc.)
8. Bajas por sanción o suspensión antes de partidos clave
9. Estado del césped, clima, ventaja local en estadios específicos

REGLAS:
- Menciona jugadores reales ACTUALES: Mbappé, Messi, Cristiano, Bellingham, Yamal, Vinicius, Haaland, De Bruyne, etc.
- Relaciona con los partidos concretos del listado de arriba
- Las 3 primeras: impacto HIGH (lesión, resultado clave, análisis táctico)
- Impacto en apuestas: siempre concreto (qué mercado, dirección del movimiento)
- Noticias de hoy, NO de hace semanas. El timestamp es ${currentTime}h de hoy.

Responde SOLO con este JSON (sin texto extra):
{
  "noticias": [
    {
      "titulo": "...",
      "descripcion": "... (2-3 frases detalladas con nombres reales, datos concretos)",
      "categoria": "injury|form|tactical|suspension|transfer",
      "impacto": "HIGH|MEDIUM|LOW",
      "equipos": ["Equipo1", "Equipo2"],
      "impactoApuestas": "... (qué mercados afecta, qué cuotas se mueven, en qué dirección)",
      "emoji": "🇦🇷|🇪🇸|🇩🇪|🇫🇷|🇧🇷|🩹|📊|⚠️|🏆|🔴|📰"
    }
  ]
}`,
        }],
      }),
    });
    clearTimeout(timeout);

    if (!res.ok) return EMERGENCY_NEWS;
    const data = await res.json();
    const text = data.content?.[0]?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return EMERGENCY_NEWS;

    const parsed = JSON.parse(jsonMatch[0]);
    const items: any[] = parsed.noticias || [];

    return items.slice(0, 9).map((n: any, idx: number) => ({
      id: `ai_${Date.now()}_${idx}`,
      title: n.titulo || 'Sin título',
      description: n.descripcion || '',
      source: 'WikiBet IA',
      publishedAt: new Date(Date.now() - idx * 10 * 60 * 1000).toISOString(),
      emoji: n.emoji || '📰',
      impact: (n.impacto as 'HIGH' | 'MEDIUM' | 'LOW') || 'MEDIUM',
      category: (n.categoria as any) || 'form',
      teams: Array.isArray(n.equipos) ? n.equipos : [],
      bettingImpact: n.impactoApuestas || '',
      relevanceScore: n.impacto === 'HIGH' ? 95 - idx * 3 : n.impacto === 'MEDIUM' ? 70 - idx * 3 : 50,
    }));
  } catch {
    clearTimeout(timeout);
    return EMERGENCY_NEWS;
  }
}

function isSpanish(text: string): boolean {
  const englishWords = ['the ', ' is ', ' are ', ' was ', ' were ', ' and ', ' for ', ' with ', ' his ', ' her '];
  const lower = text.toLowerCase();
  return englishWords.filter(w => lower.includes(w)).length < 3;
}

// ─── Ordena: HIGH > MEDIUM > LOW, luego por fecha ────────────────────────────
function sortByImpact(a: RealNews, b: RealNews): number {
  const order = { HIGH: 3, MEDIUM: 2, LOW: 1 };
  const impactDiff = order[b.impact] - order[a.impact];
  if (impactDiff !== 0) return impactDiff;
  return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
}

export const realNewsService = {
  async getNews(): Promise<RealNews[]> {
    if (_cache && Date.now() - _cacheTime < CACHE_TTL) {
      return _cache;
    }

    // Intentar ESPN en paralelo con IA
    let espnNews: RealNews[] = [];
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(
        'https://site.api.espn.com/apis/site/v2/sports/soccer/FIFA.WORLD/news?limit=10&lang=es&region=es',
        { signal: controller.signal, headers: { Accept: 'application/json' } }
      );
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        const items: any[] = data?.articles || data?.news || [];
        espnNews = items
          .filter(item => {
            const title = item.headline || item.title || '';
            return title && isSpanish(title);
          })
          .slice(0, 4)
          .map((item, idx) => ({
            id: `espn_${item.id || idx}`,
            title: item.headline || item.title || '',
            description: item.description || item.summary || '',
            url: item.links?.web?.href || '',
            source: 'ESPN',
            publishedAt: item.published || new Date().toISOString(),
            emoji: '📰',
            impact: 'MEDIUM' as const,
            category: 'form' as const,
            teams: [],
            bettingImpact: 'Consulta la noticia para más detalles sobre el impacto en apuestas.',
            relevanceScore: 68,
          }));
      }
    } catch {
      // ESPN falló — continuar con IA
    }

    // Generar noticias con IA
    const aiNews = await generateAINews();

    // Combinar sin duplicar
    const seen = new Set<string>();
    const combined: RealNews[] = [];
    for (const n of [...aiNews, ...espnNews]) {
      const key = n.title.toLowerCase().slice(0, 40);
      if (!seen.has(key)) { seen.add(key); combined.push(n); }
    }

    const sorted = combined.sort(sortByImpact);
    _cache = sorted;
    _cacheTime = Date.now();
    return sorted;
  },

  invalidateCache(): void {
    _cache = null;
    _cacheTime = 0;
  },

  async getNewsForMatch(homeTeam: string, awayTeam: string): Promise<RealNews[]> {
    const all = await this.getNews();
    const relevant = all.filter(n =>
      n.teams.some(t =>
        t.toLowerCase().includes(homeTeam.toLowerCase()) ||
        t.toLowerCase().includes(awayTeam.toLowerCase()) ||
        homeTeam.toLowerCase().includes(t.toLowerCase()) ||
        awayTeam.toLowerCase().includes(t.toLowerCase())
      )
    );
    return relevant.length > 0 ? relevant.slice(0, 5) : all.slice(0, 3);
  },
};
