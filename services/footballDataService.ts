// Servicio usando football-data.org - API REAL con todos los partidos

export interface Team {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest: string;
}

export interface Match {
  id: number;
  utcDate: string;
  status: 'TIMED' | 'LIVE' | 'IN_PLAY' | 'PAUSED' | 'FINISHED' | 'POSTPONED' | 'CANCELLED' | 'SUSPENDED';
  stage: string;
  lastUpdated: string;
  homeTeam: Team;
  awayTeam: Team;
  score: {
    winner: 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null;
    duration: string;
    fullTime: { home: number | null; away: number | null };
    halfTime: { home: number | null; away: number | null };
    extraTime: { home: number | null; away: number | null };
    penalties: { home: number | null; away: number | null };
  };
  odds: {
    msg: string;
  };
  referees: Array<{
    id: number;
    name: string;
    role: string;
    nationality: string;
  }>;
  season: {
    id: number;
    startDate: string;
    endDate: string;
    currentMatchday: number;
  };
  competition: {
    id: number;
    name: string;
    code: string;
    type: string;
    emblem: string;
  };
}

export interface Standings {
  filters: Record<string, any>;
  competition: {
    id: number;
    name: string;
    code: string;
    emblem: string;
  };
  season: {
    id: number;
    startDate: string;
    endDate: string;
    currentMatchday: number;
  };
  standings: Array<{
    stage: string;
    type: string;
    group: string | null;
    table: Array<{
      position: number;
      team: Team;
      playedGames: number;
      form: string;
      won: number;
      draw: number;
      lost: number;
      points: number;
      goalsFor: number;
      goalsAgainst: number;
      goalDifference: number;
    }>;
  }>;
}

export interface Player {
  id: number;
  name: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  nationality: string;
  section: string;
  position: string;
  shirtNumber: number | null;
  contract: {
    start: string;
    until: string;
  };
}

export interface TeamDetail {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest: string;
  address: string;
  website: string;
  email: string;
  phone: string;
  founded: number;
  clubColors: string;
  venue: string;
  lastUpdated: string;
  squad: Player[];
  coach: any;
}

const FOOTBALL_DATA_BASE = 'https://api.football-data.org/v4';

export const footballDataService = {
  // Obtener todos los partidos próximos (7 días)
  async getUpcomingMatches(days: number = 7): Promise<Match[]> {
    try {
      console.log('📊 Cargando partidos próximos de football-data.org...');

      // Obtener múltiples competiciones
      const competitions = [
        'WC',      // Copa Mundial
        'PL',      // Premier League
        'PD',      // La Liga
        'SA',      // Serie A
        'BL1',     // Bundesliga
        'FL1',     // Ligue 1
        'CL',      // Champions League
      ];

      let allMatches: Match[] = [];

      for (const comp of competitions) {
        try {
          const url = new URL(`${FOOTBALL_DATA_BASE}/competitions/${comp}/matches`);
          url.searchParams.append('status', 'SCHEDULED');

          const response = await fetch(url.toString(), {
            headers: {
              'X-Auth-Token': 'demo', // API pública - puede necesitar token real
            },
          });

          if (response.ok) {
            const data: any = await response.json();
            allMatches = [...allMatches, ...(data.matches || [])];
          }
        } catch (err) {
          console.log(`⚠️ No se pudieron cargar partidos de ${comp}`);
        }
      }

      // Filtrar por fecha próxima
      const now = new Date();
      const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

      const filtered = allMatches
        .filter((m) => {
          const matchDate = new Date(m.utcDate);
          return matchDate >= now && matchDate <= futureDate;
        })
        .sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime());

      console.log(`✅ ${filtered.length} partidos próximos encontrados`);
      return filtered;
    } catch (error) {
      console.error('❌ Error cargando partidos:', error);
      return [];
    }
  },

  // Obtener clasificación de una competición
  async getStandings(competitionCode: string): Promise<Standings | null> {
    try {
      console.log(`📊 Cargando clasificación de ${competitionCode}...`);

      const url = new URL(`${FOOTBALL_DATA_BASE}/competitions/${competitionCode}/standings`);

      const response = await fetch(url.toString(), {
        headers: {
          'X-Auth-Token': 'demo',
        },
      });

      if (!response.ok) return null;

      const data: any = await response.json();
      console.log(`✅ Clasificación de ${competitionCode} cargada`);
      return data;
    } catch (error) {
      console.error('❌ Error cargando clasificación:', error);
      return null;
    }
  },

  // Obtener detalles de un equipo con jugadores
  async getTeamDetail(teamId: number): Promise<TeamDetail | null> {
    try {
      console.log(`📊 Cargando equipo ${teamId}...`);

      const url = new URL(`${FOOTBALL_DATA_BASE}/teams/${teamId}`);

      const response = await fetch(url.toString(), {
        headers: {
          'X-Auth-Token': 'demo',
        },
      });

      if (!response.ok) return null;

      const data: any = await response.json();
      console.log(`✅ Equipo ${data.name} cargado con ${data.squad?.length || 0} jugadores`);
      return data;
    } catch (error) {
      console.error('❌ Error cargando equipo:', error);
      return null;
    }
  },

  // Obtener jugadores de un equipo
  async getTeamPlayers(teamId: number): Promise<Player[]> {
    try {
      const team = await this.getTeamDetail(teamId);
      return team?.squad || [];
    } catch (error) {
      console.error('❌ Error cargando jugadores:', error);
      return [];
    }
  },

  // Obtener resultados de partidos (últimos días)
  async getRecentMatches(days: number = 7): Promise<Match[]> {
    try {
      console.log(`📊 Cargando partidos de los últimos ${days} días...`);

      const url = new URL(`${FOOTBALL_DATA_BASE}/matches`);
      url.searchParams.append('status', 'FINISHED');

      const response = await fetch(url.toString(), {
        headers: {
          'X-Auth-Token': 'demo',
        },
      });

      if (!response.ok) return [];

      const data: any = await response.json();
      const now = new Date();
      const pastDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

      const filtered = (data.matches || [])
        .filter((m: Match) => {
          const matchDate = new Date(m.utcDate);
          return matchDate >= pastDate && matchDate <= now;
        })
        .sort((a: Match, b: Match) => new Date(b.utcDate).getTime() - new Date(a.utcDate).getTime());

      console.log(`✅ ${filtered.length} partidos recientes encontrados`);
      return filtered;
    } catch (error) {
      console.error('❌ Error cargando partidos recientes:', error);
      return [];
    }
  },

  // Obtener detalles de un partido específico
  async getMatchDetail(matchId: number): Promise<Match | null> {
    try {
      const url = new URL(`${FOOTBALL_DATA_BASE}/matches/${matchId}`);

      const response = await fetch(url.toString(), {
        headers: {
          'X-Auth-Token': 'demo',
        },
      });

      if (!response.ok) return null;

      const data: any = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Error cargando detalle de partido:', error);
      return null;
    }
  },

  // Buscar partidos por equipos
  async findMatchBetweenTeams(homeTeamId: number, awayTeamId: number): Promise<Match | null> {
    try {
      const matches = await this.getUpcomingMatches(30);
      return (
        matches.find(
          (m) =>
            (m.homeTeam.id === homeTeamId && m.awayTeam.id === awayTeamId) ||
            (m.homeTeam.id === awayTeamId && m.awayTeam.id === homeTeamId)
        ) || null
      );
    } catch (error) {
      console.error('❌ Error buscando partido:', error);
      return null;
    }
  },

  // Obtener competiciones disponibles
  async getAvailableCompetitions(): Promise<
    Array<{ id: number; name: string; code: string; type: string; emblem: string }>
  > {
    try {
      const url = new URL(`${FOOTBALL_DATA_BASE}/competitions`);

      const response = await fetch(url.toString(), {
        headers: {
          'X-Auth-Token': 'demo',
        },
      });

      if (!response.ok) return [];

      const data: any = await response.json();
      return data.competitions || [];
    } catch (error) {
      console.error('❌ Error cargando competiciones:', error);
      return [];
    }
  },

  // Convertir estado de partido a español
  translateMatchStatus(status: string): string {
    const translations: Record<string, string> = {
      TIMED: 'Programado',
      LIVE: 'En vivo',
      IN_PLAY: 'En juego',
      PAUSED: 'Pausado',
      FINISHED: 'Finalizado',
      POSTPONED: 'Pospuesto',
      CANCELLED: 'Cancelado',
      SUSPENDED: 'Suspendido',
    };
    return translations[status] || status;
  },
};
