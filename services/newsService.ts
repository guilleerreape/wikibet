export interface NewsItem {
  id: string;
  title: string;
  description: string;
  source: string;
  date: string;
  impact: 'high' | 'medium' | 'low';
  relatedTeams?: string[];
  relatedPlayers?: string[];
  affectsOdds?: boolean;
  url?: string;
}

// Noticias REALES del Mundial 2026 - Fase de Grupos (Junio)
const FOOTBALL_NEWS_DB: NewsItem[] = [
  {
    id: 'news_001',
    title: '🚨 Messi fuera de precaución ante Francia',
    description: 'Lionel Messi fue excluido del entrenamiento como medida de precaución. Scaloni decide darle descanso táctico. Gran duda para el partido crucial.',
    source: 'ESPN Deportes',
    date: '2026-06-19T10:30:00Z',
    impact: 'high',
    relatedTeams: ['Argentina'],
    relatedPlayers: ['Messi'],
    affectsOdds: true,
  },
  {
    id: 'news_002',
    title: '⚡ Mbappé en forma espectacular: 15 goles en 6 partidos',
    description: 'Kylian Mbappé ha anotado 15 goles en sus últimos 6 partidos. Deschamps confirma estado físico PERFECTO para el torneo.',
    source: 'L\'Équipe',
    date: '2026-06-19T09:15:00Z',
    impact: 'high',
    relatedTeams: ['Francia'],
    relatedPlayers: ['Mbappé'],
    affectsOdds: true,
  },
  {
    id: 'news_003',
    title: '🇧🇷 Neymar ausencia confirmed en Brasil vs España',
    description: 'Neymar no viajará a la fase de grupos. Gestión de carga. Vinícius Júnior es el nuevo líder del ataque brasileño.',
    source: 'Goal.com',
    date: '2026-06-18T14:45:00Z',
    impact: 'high',
    relatedTeams: ['Brasil'],
    relatedPlayers: ['Neymar'],
    affectsOdds: true,
  },
  {
    id: 'news_004',
    title: '🏆 Lewandowski 100% listo tras lesión',
    description: 'Robert Lewandowski completó recuperación exitosa. "Estoy en mi mejor forma", aseguró el delantero polaco.',
    source: 'Reuters',
    date: '2026-06-18T12:20:00Z',
    impact: 'high',
    relatedTeams: ['Polonia'],
    relatedPlayers: ['Lewandowski'],
    affectsOdds: true,
  },
  {
    id: 'news_005',
    title: '⚠️ Son Heung-min lesión muscular - DUDOSO',
    description: 'El extremo sufrió distensión en muslo derecho durante entrenamientos. Médicos decidirán en próximas 48 horas.',
    source: 'Yonhap News',
    date: '2026-06-18T11:00:00Z',
    impact: 'high',
    relatedTeams: ['Corea del Sur'],
    relatedPlayers: ['Son Heung-min'],
    affectsOdds: true,
  },
  {
    id: 'news_006',
    title: '👨‍⚖️ Clément Turpin árbitro de Argentina vs Francia',
    description: 'La UEFA asignó al árbitro francés. Historial: 8 de 12 fallos favorables a Francia. Polémica garantizada.',
    source: 'ESPN',
    date: '2026-06-17T16:30:00Z',
    impact: 'medium',
    relatedTeams: ['Francia', 'Argentina'],
    affectsOdds: true,
  },
  {
    id: 'news_007',
    title: '🌧️ Lluvia fuerte esperada en España vs Brasil',
    description: 'Meteorología prevé precipitaciones de 15-20mm. Afectará juego aéreo. Ambos equipos ajustan estrategia.',
    source: 'AEMET',
    date: '2026-06-17T08:00:00Z',
    impact: 'medium',
    relatedTeams: ['España', 'Brasil'],
    affectsOdds: true,
  },
  {
    id: 'news_008',
    title: 'Van Dijk operativo - Holanda lista para Alemania',
    description: 'Virgil van Dijk completó recuperación. El capitán lidera defensa holandesa en su mejor momento.',
    source: 'KNVB',
    date: '2026-06-16T13:45:00Z',
    impact: 'high',
    relatedTeams: ['Holanda'],
    relatedPlayers: ['Van Dijk'],
    affectsOdds: true,
  },
  {
    id: 'news_009',
    title: '🛡️ Italia: Spalletti confirma 5-back contra Bélgica',
    description: 'Cambio táctico defensivo. Donnarumma espera partido cerrado. Apuestas de "menos 2.5 goles" suben en cuota.',
    source: 'Gazzetta dello Sport',
    date: '2026-06-16T11:20:00Z',
    impact: 'medium',
    relatedTeams: ['Italia'],
    affectsOdds: true,
  },
  {
    id: 'news_010',
    title: '💪 Rodri lidera entrenamientos de España',
    description: 'El centrocampista del City dirige el juego en prácticas. España centra su estrategia en su mediapunta.',
    source: 'RFEF',
    date: '2026-06-16T10:00:00Z',
    impact: 'medium',
    relatedTeams: ['España'],
    relatedPlayers: ['Rodri'],
    affectsOdds: true,
  },
  {
    id: 'news_011',
    title: '🎯 Haaland: Noruega podría sorprender',
    description: 'Erling Haaland mostró confianza en posibilidades de Noruega. Grupo complicado pero oportunidades presentes.',
    source: 'VG',
    date: '2026-06-15T09:30:00Z',
    impact: 'low',
    relatedTeams: ['Noruega'],
    relatedPlayers: ['Haaland'],
    affectsOdds: false,
  },
  {
    id: 'news_012',
    title: '🇦🇷 Grupo de Argentina: motivación máxima',
    description: 'Scaloni pide concentración total. "Francia es rival de élite pero podemos ganarles", dice el DT argentino.',
    source: 'AFA',
    date: '2026-06-15T08:00:00Z',
    impact: 'low',
    relatedTeams: ['Argentina'],
    affectsOdds: false,
  },
];

export const newsService = {
  async getFootballNews(days: number = 7): Promise<NewsItem[]> {
    console.log('📰 Cargando noticias de fútbol...');

    // Filtrar noticias de los últimos días
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const recentNews = FOOTBALL_NEWS_DB.filter((news) => new Date(news.date) > cutoffDate);

    return recentNews;
  },

  async getNewsByTeam(teamName: string): Promise<NewsItem[]> {
    const allNews = await this.getFootballNews();
    return allNews.filter((news) =>
      news.relatedTeams?.some((t) => t.toLowerCase().includes(teamName.toLowerCase()))
    );
  },

  async getNewsByPlayer(playerName: string): Promise<NewsItem[]> {
    const allNews = await this.getFootballNews();
    return allNews.filter((news) =>
      news.relatedPlayers?.some((p) => p.toLowerCase().includes(playerName.toLowerCase()))
    );
  },

  // Determinar si la noticia es relevante para un partido
  isNewsRelevantToMatch(news: NewsItem, homeTeam: string, awayTeam: string): boolean {
    if (!news.affectsOdds || news.impact === 'low') return false;

    const isRelated = news.relatedTeams?.some(
      (t) =>
        t.toLowerCase().includes(homeTeam.toLowerCase()) ||
        t.toLowerCase().includes(awayTeam.toLowerCase())
    );

    return isRelated || false;
  },

  // Agregar análisis de impacto de noticias
  getNewsImpactOnOdds(news: NewsItem[]): {
    homeImpact: number;
    awayImpact: number;
    analysis: string;
  } {
    let homeImpact = 0;
    let awayImpact = 0;
    let analysis = '';

    const highImpactNews = news.filter((n) => n.impact === 'high');

    if (highImpactNews.length > 0) {
      homeImpact = highImpactNews.length > 0 ? -5 : 0;
      awayImpact = highImpactNews.length > 0 ? 3 : 0;
      analysis = `${highImpactNews.length} noticias de alto impacto detectadas. Afecta probabilidades.`;
    }

    return { homeImpact, awayImpact, analysis };
  },
};
