/**
 * apiFootballService.ts — API-Football (api-sports.io) integration.
 *
 * This is the MOST DETAILED free football data source: it returns corners, fouls,
 * yellow/red cards, shots, possession, lineups and live events per match.
 *
 * It activates automatically when EXPO_PUBLIC_API_FOOTBALL_KEY is set (free tier:
 * 100 requests/day at https://www.api-football.com/). Without a key it returns null
 * and the app falls back to ESPN + TheSportsDB.
 */

const API_FOOTBALL_KEY  = process.env.EXPO_PUBLIC_API_FOOTBALL_KEY;
const API_FOOTBALL_HOST = 'https://v3.football.api-sports.io';

export interface ApiFootballStats {
  corners:     { home: number; away: number; total: number };
  yellowCards: { home: number; away: number; total: number };
  redCards:    { home: number; away: number; total: number };
  fouls:       { home: number; away: number; total: number };
  shots:       { home: number; away: number; total: number };
  shotsOnTarget: { home: number; away: number; total: number };
  possession:  { home: number; away: number };
  totalCards:  number;
  hasData:     boolean;
}

// Spanish → English names for the API (national teams + common clubs)
const ES_EN: Record<string, string> = {
  'España':'Spain','Alemania':'Germany','Francia':'France','Inglaterra':'England',
  'Brasil':'Brazil','Países Bajos':'Netherlands','Holanda':'Netherlands','Bélgica':'Belgium',
  'Croacia':'Croatia','Suiza':'Switzerland','Marruecos':'Morocco','México':'Mexico',
  'Estados Unidos':'USA','Canadá':'Canada','Corea del Sur':'South-Korea','Rep. Checa':'Czech-Republic',
  'Sudáfrica':'South-Africa','Túnez':'Tunisia','Japón':'Japan','Catar':'Qatar','Catar ':'Qatar',
  'Arabia Saudita':'Saudi-Arabia','Cabo Verde':'Cape-Verde','Uruguay':'Uruguay','Bosnia':'Bosnia-and-Herzegovina',
  'Turquía':'Turkey','Australia':'Australia','Paraguay':'Paraguay','Ecuador':'Ecuador','Curazao':'Curacao',
  'Costa de Marfil':'Ivory-Coast','Colombia':'Colombia','Uzbekistán':'Uzbekistan','R.D. Congo':'DR-Congo',
  'Portugal':'Portugal','Senegal':'Senegal','Noruega':'Norway','Irak':'Iraq','Argentina':'Argentina',
  'Argelia':'Algeria','Austria':'Austria','Jordania':'Jordan','Escocia':'Scotland','Haití':'Haiti',
  'Suecia':'Sweden','Irán':'Iran','Egipto':'Egypt','Nueva Zelanda':'New-Zealand','Panamá':'Panama',
  'Ghana':'Ghana','Italia':'Italy',
};
const en = (name: string) => ES_EN[name] ?? name;

async function af<T>(path: string): Promise<T | null> {
  if (!API_FOOTBALL_KEY) return null;
  try {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), 7000);
    const res = await fetch(`${API_FOOTBALL_HOST}${path}`, {
      signal: ctrl.signal,
      headers: { 'x-apisports-key': API_FOOTBALL_KEY },
    });
    clearTimeout(id);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const apiFootballService = {
  isEnabled(): boolean { return !!API_FOOTBALL_KEY; },

  // Resolve a fixture id by team name + date (±1 day window)
  async resolveFixtureId(homeTeam: string, awayTeam: string, dateISO: string): Promise<number | null> {
    if (!API_FOOTBALL_KEY) return null;
    const day = (dateISO || '').slice(0, 10);
    if (!day) return null;
    // Find the home team id, then list its fixtures on that date
    const teamData = await af<any>(`/teams?search=${encodeURIComponent(en(homeTeam))}`);
    const teamId = teamData?.response?.[0]?.team?.id;
    if (!teamId) return null;
    const season = parseInt(day.slice(0, 4), 10);
    const fx = await af<any>(`/fixtures?team=${teamId}&season=${season}&date=${day}`);
    const list: any[] = fx?.response ?? [];
    const awayEn = en(awayTeam).toLowerCase().replace(/-/g, ' ');
    const match = list.find(f => {
      const h = (f.teams?.home?.name ?? '').toLowerCase();
      const a = (f.teams?.away?.name ?? '').toLowerCase();
      return a.includes(awayEn) || awayEn.includes(a) || h.includes(en(homeTeam).toLowerCase());
    }) ?? list[0];
    return match?.fixture?.id ?? null;
  },

  // Fetch detailed statistics for a match (resolved by teams + date)
  async getMatchStats(homeTeam: string, awayTeam: string, dateISO: string): Promise<ApiFootballStats | null> {
    if (!API_FOOTBALL_KEY) return null;
    const fixtureId = await this.resolveFixtureId(homeTeam, awayTeam, dateISO);
    if (!fixtureId) return null;

    const data = await af<any>(`/fixtures/statistics?fixture=${fixtureId}`);
    const teams: any[] = data?.response ?? [];
    if (teams.length < 2) return null;

    const num = (v: any) => {
      if (v == null) return 0;
      const n = parseInt(String(v).replace('%', ''), 10);
      return isNaN(n) ? 0 : n;
    };
    const pick = (statsArr: any[], ...names: string[]): number => {
      for (const name of names) {
        const s = statsArr.find((x: any) => (x.type ?? '').toLowerCase() === name.toLowerCase());
        if (s) return num(s.value);
      }
      return 0;
    };

    const hs: any[] = teams[0]?.statistics ?? [];
    const as_: any[] = teams[1]?.statistics ?? [];

    const result: ApiFootballStats = {
      corners:       { home: pick(hs, 'Corner Kicks'), away: pick(as_, 'Corner Kicks'), total: 0 },
      yellowCards:   { home: pick(hs, 'Yellow Cards'), away: pick(as_, 'Yellow Cards'), total: 0 },
      redCards:      { home: pick(hs, 'Red Cards'),    away: pick(as_, 'Red Cards'),    total: 0 },
      fouls:         { home: pick(hs, 'Fouls'),        away: pick(as_, 'Fouls'),        total: 0 },
      shots:         { home: pick(hs, 'Total Shots'),  away: pick(as_, 'Total Shots'),  total: 0 },
      shotsOnTarget: { home: pick(hs, 'Shots on Goal'),away: pick(as_, 'Shots on Goal'),total: 0 },
      possession:    { home: pick(hs, 'Ball Possession'), away: pick(as_, 'Ball Possession') },
      totalCards:    0,
      hasData:       true,
    };
    result.corners.total       = result.corners.home + result.corners.away;
    result.yellowCards.total   = result.yellowCards.home + result.yellowCards.away;
    result.redCards.total      = result.redCards.home + result.redCards.away;
    result.fouls.total         = result.fouls.home + result.fouls.away;
    result.shots.total         = result.shots.home + result.shots.away;
    result.shotsOnTarget.total = result.shotsOnTarget.home + result.shotsOnTarget.away;
    result.totalCards          = result.yellowCards.total + result.redCards.total;
    return result;
  },
};
