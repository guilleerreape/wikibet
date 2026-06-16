const RAPIDAPI_KEY = process.env.EXPO_PUBLIC_RAPIDAPI_KEY;
const RAPIDAPI_HOST = process.env.EXPO_PUBLIC_RAPIDAPI_HOST;
const API_BASE = 'https://sportapi7.p.rapidapi.com'; // SportAPI

interface ApiResponse<T> {
  get: string;
  parameters: Record<string, any>;
  errors: string[];
  results: number;
  paging: {
    current: number;
    total: number;
  };
  response: T[];
}

export interface Fixture {
  id: number;
  referee: string | null;
  timezone: string;
  date: string;
  timestamp: number;
  periods: {
    first: number | null;
    second: number | null;
  };
  venue: {
    id: number;
    name: string;
    city: string;
  };
  status: {
    long: string;
    short: string;
    elapsed: number | null;
  };
}

export interface Team {
  id: number;
  name: string;
  logo: string;
}

export interface FixtureResponse {
  fixture: Fixture;
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
    flag: string;
    season: number;
    round: string;
  };
  teams: {
    home: Team & { winner: boolean | null };
    away: Team & { winner: boolean | null };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
  score: {
    halftime: { home: number | null; away: number | null };
    fulltime: { home: number | null; away: number | null };
    extratime: { home: number | null; away: number | null };
    penalty: { home: number | null; away: number | null };
  };
  events: any[];
  lineups: any[];
  statistics: any[];
}

export interface PlayerStats {
  player: {
    id: number;
    name: string;
    firstname: string;
    lastname: string;
    age: number;
    birth: { date: string; country: string; city: string };
    nationality: string;
    height: string;
    weight: string;
    injured: boolean;
    photo: string;
  };
  statistics: Array<{
    team: Team;
    league: { id: number; name: string; country: string; logo: string };
    season: number;
    games: { appearences: number; lineups: number; minutes: number };
    offsides: number;
    shots: { total: number; on: number };
    goals: { total: number; conceded: number; assists: number };
    passes: { total: number; key: number; accuracy: number };
    tackles: { total: number; blocks: number; interceptions: number };
    duels: { total: number; won: number };
    dribbles: { attempts: number; success: number; past: number };
    fouls: { drawn: number; committed: number };
    cards: { yellow: number; yellowred: number; red: number };
    penalty: { won: number; commited: number; scored: number; missed: number };
  }>;
}

export interface TeamStats {
  team: {
    id: number;
    name: string;
    logo: string;
  };
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
    season: number;
    standings: Array<{
      rank: number;
      point: number;
      goalsDiff: number;
      group: string;
      form: string;
      status: string;
      description: string;
      all: { played: number; win: number; draw: number; lose: number; goals: { for: number; against: number } };
      home: { played: number; win: number; draw: number; lose: number; goals: { for: number; against: number } };
      away: { played: number; win: number; draw: number; lose: number; goals: { for: number; against: number } };
    }>;
  };
}

async function fetchFromApi<T>(endpoint: string, params: Record<string, any> = {}): Promise<T[]> {
  if (!RAPIDAPI_KEY || !RAPIDAPI_HOST) {
    console.error('❌ RapidAPI Key or Host not configured');
    console.log('RAPIDAPI_KEY:', RAPIDAPI_KEY ? '✓ Set' : '✗ Missing');
    console.log('RAPIDAPI_HOST:', RAPIDAPI_HOST);
    return [];
  }

  try {
    const url = new URL(`${API_BASE}${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });

    console.log('📡 API Call:', endpoint, 'URL:', url.toString());

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': RAPIDAPI_HOST,
      },
    });

    console.log('📊 Response Status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API Error ${response.status}:`, errorText);
      return [];
    }

    const data: any = await response.json();

    console.log('📦 Response data keys:', Object.keys(data));

    // Detectar si es SportAPI (tiene "events") o API-Football (tiene "response")
    let responseArray = data.response || data.events || [];

    console.log('📦 Response data:', {
      get: data.get,
      results: data.results,
      responseLength: responseArray?.length || 0,
      errors: data.errors,
    });

    if (data.errors && Object.keys(data.errors).length > 0) {
      console.error('❌ API returned errors:', data.errors);
      return [];
    }

    console.log(`✅ API Success: ${endpoint}`, responseArray?.length, 'items');
    return Array.isArray(responseArray) ? responseArray : [responseArray];
  } catch (error) {
    console.error('❌ Football API Error:', error);
    return [];
  }
}

export const footballApi = {
  // Obtener partidos próximos o en vivo (SportAPI)
  async getUpcomingFixtures(days: number = 7) {
    const date = new Date().toISOString().split('T')[0];
    console.log('📡 Fetching FootBall events for date:', date);
    const results = await fetchFromApi<any>(`/api/v1/sport/football/scheduled-events/${date}`, {});
    console.log('📦 Raw Results:', JSON.stringify(results).substring(0, 200));
    console.log('✅ Results is Array?', Array.isArray(results));
    console.log('✅ Results length:', results?.length);

    // Obtener los eventos - pueden estar en results[0].events o directamente en results
    let events: any[] = [];
    if (Array.isArray(results)) {
      if (results[0]?.events) {
        events = results[0].events;
      } else if (results[0]?.homeTeam) {
        // Si results[0] es un evento directamente
        events = results;
      }
    }

    console.log('🎯 Found events:', events.length);

    // Transformar resultado de SportAPI al formato esperado
    if (events.length > 0) {
      return events.map((event: any) => {
        const statusObj = typeof event.status === 'string' ? event.status : event.status?.description || 'Not Started';
        return {
          fixture: {
            id: event.id,
            date: event.startTimestamp ? new Date(event.startTimestamp * 1000).toISOString() : '',
            status: {
              long: statusObj,
              short: typeof statusObj === 'string' ? statusObj.substring(0, 2) : 'NS',
              elapsed: null
            },
            referee: null,
            timezone: '',
            periods: { first: null, second: null },
            venue: { id: 0, name: event.venue?.name || 'Unknown', city: '' },
          },
          league: {
            id: event.tournament?.uniqueTournament?.id || 0,
            name: event.tournament?.name || 'Unknown',
            country: event.tournament?.category?.country?.name || '',
            logo: '',
            flag: '',
            season: new Date().getFullYear(),
            round: event.tournament?.groupName || '',
          },
          teams: {
            home: { id: event.homeTeam?.id || 0, name: event.homeTeam?.name || 'Home', logo: event.homeTeam?.logo || '', winner: null },
            away: { id: event.awayTeam?.id || 0, name: event.awayTeam?.name || 'Away', logo: event.awayTeam?.logo || '', winner: null },
          },
          goals: { home: event.homeScore?.current || null, away: event.awayScore?.current || null },
          score: { halftime: { home: null, away: null }, fulltime: { home: null, away: null }, extratime: { home: null, away: null }, penalty: { home: null, away: null } },
          events: [],
          lineups: [],
          statistics: [],
        };
      });
    }
    return [];
  },

  // Obtener partidos de una liga específica
  async getFixturesByLeague(leagueId: number, season: number) {
    const date = new Date().toISOString().split('T')[0];
    return this.getUpcomingFixtures(7);
  },

  // Obtener equipos de una liga
  async getTeamsByLeague(leagueId: number, season: number) {
    // SportAPI no tiene endpoint directo, retornar array vacío
    return [];
  },

  // Obtener standings/clasificación
  async getStandings(leagueId: number, season: number) {
    // SportAPI no tiene endpoint directo, retornar array vacío
    return [];
  },

  // Obtener jugadores de un equipo
  async getTeamPlayers(teamId: number, season: number) {
    // SportAPI no tiene endpoint directo, retornar array vacío
    return [];
  },

  // Obtener stats de un jugador
  async getPlayerStats(playerId: number, season: number) {
    return [];
  },

  // Obtener info de un partido
  async getFixtureById(fixtureId: number) {
    return null;
  },

  // Obtener ligas disponibles
  async getLeagues() {
    return [];
  },

  // Obtener partidos en vivo ahora
  async getLiveFixtures() {
    return this.getUpcomingFixtures(1);
  },
};
