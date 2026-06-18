const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer';

const TEAM_ES: Record<string, string> = {
  // Selecciones
  'United States': 'Estados Unidos', 'USA': 'Estados Unidos',
  'France': 'Francia', 'Germany': 'Alemania', 'Netherlands': 'Holanda',
  'England': 'Inglaterra', 'Brazil': 'Brasil', 'Spain': 'España',
  'Morocco': 'Marruecos', 'Japan': 'Japón', 'South Korea': 'Corea del Sur',
  'Korea Republic': 'Corea del Sur', 'Saudi Arabia': 'Arabia Saudita',
  'Switzerland': 'Suiza', 'Croatia': 'Croacia', 'Denmark': 'Dinamarca',
  'Poland': 'Polonia', 'Belgium': 'Bélgica', 'Turkey': 'Turquía', 'Türkiye': 'Turquía',
  'Mexico': 'México', 'Canada': 'Canadá', 'Iran': 'Irán',
  'Ecuador': 'Ecuador', 'Colombia': 'Colombia', 'Uruguay': 'Uruguay',
  'Portugal': 'Portugal', 'Serbia': 'Serbia', 'Nigeria': 'Nigeria',
  'Senegal': 'Senegal', 'Australia': 'Australia', 'Argentina': 'Argentina',
  'Ivory Coast': 'Costa de Marfil', "Côte d'Ivoire": 'Costa de Marfil',
  'Cameroon': 'Camerún', 'Ghana': 'Ghana', 'Algeria': 'Argelia',
  'Egypt': 'Egipto', 'Chile': 'Chile', 'Paraguay': 'Paraguay',
  'Panama': 'Panamá', 'Costa Rica': 'Costa Rica', 'Honduras': 'Honduras',
  'Jamaica': 'Jamaica', 'New Zealand': 'Nueva Zelanda',
  'Uzbekistan': 'Uzbekistán', 'Jordan': 'Jordania', 'Iraq': 'Irak',
  'Qatar': 'Catar', 'Scotland': 'Escocia', 'Austria': 'Austria',
  'Norway': 'Noruega', 'Sweden': 'Suecia', 'Tunisia': 'Túnez',
  'Czech Republic': 'Rep. Checa', 'Czechia': 'Rep. Checa',
  'South Africa': 'Sudáfrica', 'Bosnia-Herzegovina': 'Bosnia',
  'Cape Verde': 'Cabo Verde', 'Haiti': 'Haití',
  'Curaçao': 'Curazao', 'Congo DR': 'R.D. Congo', 'DR Congo': 'R.D. Congo',
  'Congo, DR': 'R.D. Congo',
  // Clubes
  'Atletico Madrid': 'Atletico Madrid', 'Atlético de Madrid': 'Atletico Madrid',
  'Borussia Dortmund': 'Borussia Dortmund', 'Bayer Leverkusen': 'Bayer Leverkusen',
  'Manchester City': 'Manchester City', 'Manchester United': 'Manchester United',
  'Newcastle United': 'Newcastle United', 'Aston Villa': 'Aston Villa',
};

function t(name: string): string {
  return TEAM_ES[name] || name;
}

async function fetchWithTimeout(url: string, ms = 8000): Promise<Response> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(id);
    return r;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

export interface CompetitionMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  date: string;
  status: 'upcoming' | 'live' | 'finished';
  league: string;
  leagueId: string;
  venue?: string;
}

export interface Competition {
  id: string;
  name: string;
  shortName: string;
  emoji: string;
  espnSlug: string;
}

export interface StandingEntry {
  pos: number;
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
  group?: string; // "A", "B", ... "L" para Mundial
}

export const COMPETITIONS: Competition[] = [
  { id: 'FIFA.WORLD',     name: 'FIFA World Cup 2026', shortName: 'Mundial',      emoji: '🏆', espnSlug: 'FIFA.WORLD' },
  { id: 'ESP.1',          name: 'LaLiga',               shortName: 'LaLiga',       emoji: '🇪🇸', espnSlug: 'ESP.1' },
  { id: 'ENG.1',          name: 'Premier League',       shortName: 'Premier',      emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', espnSlug: 'ENG.1' },
  { id: 'ITA.1',          name: 'Serie A',              shortName: 'Serie A',      emoji: '🇮🇹', espnSlug: 'ITA.1' },
  { id: 'FRA.1',          name: 'Ligue 1',              shortName: 'Ligue 1',      emoji: '🇫🇷', espnSlug: 'FRA.1' },
  { id: 'GER.1',          name: 'Bundesliga',           shortName: 'Bundesliga',   emoji: '🇩🇪', espnSlug: 'GER.1' },
  { id: 'ESP.2',          name: 'Liga Hypermotion',     shortName: 'Hypermotion',  emoji: '🟡', espnSlug: 'ESP.2' },
  { id: 'UEFA.CHAMPIONS', name: 'Champions League',     shortName: 'UCL',          emoji: '⭐', espnSlug: 'UEFA.CHAMPIONS' },
];

// ============================================================
// DATOS ESTÁTICOS — obtenidos de ESPN API el 16/06/2026
// Grupos REALES del Mundial 2026:
// A: México, Rep.Checa, Corea del Sur, Sudáfrica
// B: Canadá, Bosnia, Suiza, Catar
// C: Brasil, Escocia, Haití, Marruecos
// D: Paraguay, Turquía, Australia, EE.UU.
// E: Ecuador, Alemania, Costa de Marfil, Curazao
// F: Holanda, Suecia, Japón, Túnez
// G: Bélgica, Irán, Egipto, Nueva Zelanda
// H: España, Uruguay, Arabia Saudita, Cabo Verde
// I: Francia, Noruega, Senegal, Irak
// J: Argentina, Argelia, Austria, Jordania
// K: Colombia, Portugal, Uzbekistán, R.D. Congo
// L: Inglaterra, Croacia, Panamá, Ghana
// ============================================================
const STATIC: Record<string, CompetitionMatch[]> = {
  'FIFA.WORLD': [
    // ── JORNADA 1 JUGADOS ──────────────────────────────────
    { id:'wc_a1', homeTeam:'México',          awayTeam:'Sudáfrica',     homeScore:2, awayScore:0, date:'2026-06-11T18:00:00Z', status:'finished', league:'Mundial 2026 · Grupo A', leagueId:'FIFA.WORLD' },
    { id:'wc_a2', homeTeam:'Corea del Sur',   awayTeam:'Rep. Checa',    homeScore:2, awayScore:1, date:'2026-06-12T21:00:00Z', status:'finished', league:'Mundial 2026 · Grupo A', leagueId:'FIFA.WORLD' },
    { id:'wc_b1', homeTeam:'Canadá',          awayTeam:'Bosnia',        homeScore:1, awayScore:1, date:'2026-06-12T18:00:00Z', status:'finished', league:'Mundial 2026 · Grupo B', leagueId:'FIFA.WORLD' },
    { id:'wc_b2', homeTeam:'Catar',           awayTeam:'Suiza',         homeScore:1, awayScore:1, date:'2026-06-13T18:00:00Z', status:'finished', league:'Mundial 2026 · Grupo B', leagueId:'FIFA.WORLD' },
    { id:'wc_c1', homeTeam:'Brasil',          awayTeam:'Marruecos',     homeScore:1, awayScore:1, date:'2026-06-13T21:00:00Z', status:'finished', league:'Mundial 2026 · Grupo C', leagueId:'FIFA.WORLD' },
    { id:'wc_c2', homeTeam:'Haití',           awayTeam:'Escocia',       homeScore:0, awayScore:1, date:'2026-06-14T18:00:00Z', status:'finished', league:'Mundial 2026 · Grupo C', leagueId:'FIFA.WORLD' },
    { id:'wc_d1', homeTeam:'Estados Unidos',  awayTeam:'Paraguay',      homeScore:4, awayScore:1, date:'2026-06-13T00:00:00Z', status:'finished', league:'Mundial 2026 · Grupo D', leagueId:'FIFA.WORLD', venue:'MetLife Stadium, NJ' },
    { id:'wc_d2', homeTeam:'Australia',       awayTeam:'Turquía',       homeScore:2, awayScore:0, date:'2026-06-14T21:00:00Z', status:'finished', league:'Mundial 2026 · Grupo D', leagueId:'FIFA.WORLD' },
    { id:'wc_e1', homeTeam:'Alemania',        awayTeam:'Curazao',       homeScore:7, awayScore:1, date:'2026-06-14T20:00:00Z', status:'finished', league:'Mundial 2026 · Grupo E', leagueId:'FIFA.WORLD', venue:'AT&T Stadium, Dallas' },
    { id:'wc_e2', homeTeam:'Costa de Marfil', awayTeam:'Ecuador',       homeScore:1, awayScore:0, date:'2026-06-14T23:00:00Z', status:'finished', league:'Mundial 2026 · Grupo E', leagueId:'FIFA.WORLD' },
    { id:'wc_f1', homeTeam:'Holanda',         awayTeam:'Japón',         homeScore:2, awayScore:2, date:'2026-06-14T17:00:00Z', status:'finished', league:'Mundial 2026 · Grupo F', leagueId:'FIFA.WORLD' },
    { id:'wc_f2', homeTeam:'Suecia',          awayTeam:'Túnez',         homeScore:5, awayScore:1, date:'2026-06-15T21:00:00Z', status:'finished', league:'Mundial 2026 · Grupo F', leagueId:'FIFA.WORLD' },
    { id:'wc_g1', homeTeam:'España',          awayTeam:'Cabo Verde',    homeScore:0, awayScore:0, date:'2026-06-15T18:00:00Z', status:'finished', league:'Mundial 2026 · Grupo H', leagueId:'FIFA.WORLD', venue:'Rose Bowl, Los Ángeles' },
    { id:'wc_g2', homeTeam:'Arabia Saudita',  awayTeam:'Uruguay',       homeScore:1, awayScore:1, date:'2026-06-15T21:00:00Z', status:'finished', league:'Mundial 2026 · Grupo H', leagueId:'FIFA.WORLD' },
    { id:'wc_h1', homeTeam:'Bélgica',         awayTeam:'Egipto',        homeScore:1, awayScore:1, date:'2026-06-15T17:00:00Z', status:'finished', league:'Mundial 2026 · Grupo G', leagueId:'FIFA.WORLD' },
    { id:'wc_h2', homeTeam:'Irán',            awayTeam:'Nueva Zelanda', homeScore:2, awayScore:2, date:'2026-06-16T16:00:00Z', status:'finished', league:'Mundial 2026 · Grupo G', leagueId:'FIFA.WORLD' },
    // ── 16-17 JUNIO (JUGADOS) ──────────────────────────────
    { id:'wc_i1', homeTeam:'Francia',         awayTeam:'Senegal',       homeScore:2, awayScore:0, date:'2026-06-16T19:00:00Z', status:'finished', league:'Mundial 2026 · Grupo I', leagueId:'FIFA.WORLD', venue:'AT&T Stadium, Dallas' },
    { id:'wc_i2', homeTeam:'Irak',            awayTeam:'Noruega',       homeScore:1, awayScore:3, date:'2026-06-16T22:00:00Z', status:'finished', league:'Mundial 2026 · Grupo I', leagueId:'FIFA.WORLD', venue:'Levi\'s Stadium, San Francisco' },
    { id:'wc_j1', homeTeam:'Argentina',       awayTeam:'Argelia',       homeScore:3, awayScore:0, date:'2026-06-17T01:00:00Z', status:'finished', league:'Mundial 2026 · Grupo J', leagueId:'FIFA.WORLD', venue:'MetLife Stadium, New Jersey' },
    { id:'wc_j2', homeTeam:'Austria',         awayTeam:'Jordania',      homeScore:2, awayScore:1, date:'2026-06-17T04:00:00Z', status:'finished', league:'Mundial 2026 · Grupo J', leagueId:'FIFA.WORLD', venue:'SoFi Stadium, Los Ángeles' },
    // ── HOY 17 JUNIO (PENDIENTES) ─────────────────────────
    { id:'wc_k1', homeTeam:'Portugal',        awayTeam:'R.D. Congo',    homeScore:1, awayScore:1, date:'2026-06-17T17:00:00Z', status:'finished', league:'Mundial 2026 · Grupo K', leagueId:'FIFA.WORLD', venue:'Gillette Stadium, Boston' },
    { id:'wc_l1', homeTeam:'Inglaterra',      awayTeam:'Croacia',       homeScore:null, awayScore:null, date:'2026-06-17T20:00:00Z', status:'upcoming', league:'Mundial 2026 · Grupo L', leagueId:'FIFA.WORLD', venue:'Rose Bowl, Los Ángeles' },
    { id:'wc_l2', homeTeam:'Ghana',           awayTeam:'Panamá',        homeScore:null, awayScore:null, date:'2026-06-17T23:00:00Z', status:'upcoming', league:'Mundial 2026 · Grupo L', leagueId:'FIFA.WORLD', venue:'Hard Rock Stadium, Miami' },
    { id:'wc_k2', homeTeam:'Uzbekistán',      awayTeam:'Colombia',      homeScore:null, awayScore:null, date:'2026-06-18T02:00:00Z', status:'upcoming', league:'Mundial 2026 · Grupo K', leagueId:'FIFA.WORLD', venue:'Arrowhead Stadium, Kansas City' },
    // Jornada 2
    { id:'wc_a3', homeTeam:'Rep. Checa',      awayTeam:'Sudáfrica',     homeScore:null, awayScore:null, date:'2026-06-18T16:00:00Z', status:'upcoming', league:'Mundial 2026 · Grupo A', leagueId:'FIFA.WORLD' },
    { id:'wc_b3', homeTeam:'Suiza',           awayTeam:'Bosnia',        homeScore:null, awayScore:null, date:'2026-06-18T19:00:00Z', status:'upcoming', league:'Mundial 2026 · Grupo B', leagueId:'FIFA.WORLD' },
    { id:'wc_b4', homeTeam:'Canadá',          awayTeam:'Catar',         homeScore:null, awayScore:null, date:'2026-06-18T22:00:00Z', status:'upcoming', league:'Mundial 2026 · Grupo B', leagueId:'FIFA.WORLD' },
    { id:'wc_a4', homeTeam:'México',          awayTeam:'Corea del Sur', homeScore:null, awayScore:null, date:'2026-06-19T01:00:00Z', status:'upcoming', league:'Mundial 2026 · Grupo A', leagueId:'FIFA.WORLD' },
    { id:'wc_d3', homeTeam:'Estados Unidos',  awayTeam:'Australia',     homeScore:null, awayScore:null, date:'2026-06-19T19:00:00Z', status:'upcoming', league:'Mundial 2026 · Grupo D', leagueId:'FIFA.WORLD', venue:'Lumen Field, Seattle' },
    { id:'wc_c3', homeTeam:'Escocia',         awayTeam:'Marruecos',     homeScore:null, awayScore:null, date:'2026-06-19T22:00:00Z', status:'upcoming', league:'Mundial 2026 · Grupo C', leagueId:'FIFA.WORLD' },
    { id:'wc_c4', homeTeam:'Brasil',          awayTeam:'Haití',         homeScore:null, awayScore:null, date:'2026-06-20T00:30:00Z', status:'upcoming', league:'Mundial 2026 · Grupo C', leagueId:'FIFA.WORLD', venue:'Mercedes-Benz Stadium, Atlanta' },
    { id:'wc_d4', homeTeam:'Turquía',         awayTeam:'Paraguay',      homeScore:null, awayScore:null, date:'2026-06-20T03:00:00Z', status:'upcoming', league:'Mundial 2026 · Grupo D', leagueId:'FIFA.WORLD' },
    { id:'wc_f3', homeTeam:'Holanda',         awayTeam:'Suecia',        homeScore:null, awayScore:null, date:'2026-06-20T17:00:00Z', status:'upcoming', league:'Mundial 2026 · Grupo F', leagueId:'FIFA.WORLD' },
    { id:'wc_e3', homeTeam:'Alemania',        awayTeam:'Costa de Marfil',homeScore:null, awayScore:null, date:'2026-06-20T20:00:00Z', status:'upcoming', league:'Mundial 2026 · Grupo E', leagueId:'FIFA.WORLD', venue:'AT&T Stadium, Dallas' },
    { id:'wc_e4', homeTeam:'Ecuador',         awayTeam:'Curazao',       homeScore:null, awayScore:null, date:'2026-06-21T00:00:00Z', status:'upcoming', league:'Mundial 2026 · Grupo E', leagueId:'FIFA.WORLD' },
    { id:'wc_f4', homeTeam:'Túnez',           awayTeam:'Japón',         homeScore:null, awayScore:null, date:'2026-06-21T04:00:00Z', status:'upcoming', league:'Mundial 2026 · Grupo F', leagueId:'FIFA.WORLD' },
    { id:'wc_h3', homeTeam:'España',          awayTeam:'Arabia Saudita',homeScore:null, awayScore:null, date:'2026-06-21T16:00:00Z', status:'upcoming', league:'Mundial 2026 · Grupo H', leagueId:'FIFA.WORLD', venue:'Rose Bowl, Los Ángeles' },
    { id:'wc_g3', homeTeam:'Bélgica',         awayTeam:'Irán',          homeScore:null, awayScore:null, date:'2026-06-21T19:00:00Z', status:'upcoming', league:'Mundial 2026 · Grupo G', leagueId:'FIFA.WORLD' },
    { id:'wc_h4', homeTeam:'Uruguay',         awayTeam:'Cabo Verde',    homeScore:null, awayScore:null, date:'2026-06-21T22:00:00Z', status:'upcoming', league:'Mundial 2026 · Grupo H', leagueId:'FIFA.WORLD' },
    { id:'wc_g4', homeTeam:'Nueva Zelanda',   awayTeam:'Egipto',        homeScore:null, awayScore:null, date:'2026-06-22T01:00:00Z', status:'upcoming', league:'Mundial 2026 · Grupo G', leagueId:'FIFA.WORLD' },
    { id:'wc_j3', homeTeam:'Argentina',       awayTeam:'Austria',       homeScore:null, awayScore:null, date:'2026-06-22T17:00:00Z', status:'upcoming', league:'Mundial 2026 · Grupo J', leagueId:'FIFA.WORLD', venue:'MetLife Stadium, NJ' },
    { id:'wc_i3', homeTeam:'Francia',         awayTeam:'Irak',          homeScore:null, awayScore:null, date:'2026-06-22T21:00:00Z', status:'upcoming', league:'Mundial 2026 · Grupo I', leagueId:'FIFA.WORLD' },
    { id:'wc_i4', homeTeam:'Noruega',         awayTeam:'Senegal',       homeScore:null, awayScore:null, date:'2026-06-23T00:00:00Z', status:'upcoming', league:'Mundial 2026 · Grupo I', leagueId:'FIFA.WORLD' },
    { id:'wc_j4', homeTeam:'Jordania',        awayTeam:'Argelia',       homeScore:null, awayScore:null, date:'2026-06-23T03:00:00Z', status:'upcoming', league:'Mundial 2026 · Grupo J', leagueId:'FIFA.WORLD' },
    { id:'wc_k3', homeTeam:'Portugal',        awayTeam:'Uzbekistán',    homeScore:null, awayScore:null, date:'2026-06-23T17:00:00Z', status:'upcoming', league:'Mundial 2026 · Grupo K', leagueId:'FIFA.WORLD' },
    { id:'wc_l3', homeTeam:'Inglaterra',      awayTeam:'Ghana',         homeScore:null, awayScore:null, date:'2026-06-23T20:00:00Z', status:'upcoming', league:'Mundial 2026 · Grupo L', leagueId:'FIFA.WORLD' },
    { id:'wc_l4', homeTeam:'Panamá',          awayTeam:'Croacia',       homeScore:null, awayScore:null, date:'2026-06-23T23:00:00Z', status:'upcoming', league:'Mundial 2026 · Grupo L', leagueId:'FIFA.WORLD' },
    { id:'wc_k4', homeTeam:'Colombia',        awayTeam:'R.D. Congo',    homeScore:null, awayScore:null, date:'2026-06-24T02:00:00Z', status:'upcoming', league:'Mundial 2026 · Grupo K', leagueId:'FIFA.WORLD' },
    // Jornada 3
    { id:'wc_b5', homeTeam:'Bosnia',          awayTeam:'Catar',         homeScore:null, awayScore:null, date:'2026-06-24T19:00:00Z', status:'upcoming', league:'Mundial 2026 · Grupo B', leagueId:'FIFA.WORLD' },
    { id:'wc_b6', homeTeam:'Suiza',           awayTeam:'Canadá',        homeScore:null, awayScore:null, date:'2026-06-24T19:00:00Z', status:'upcoming', league:'Mundial 2026 · Grupo B', leagueId:'FIFA.WORLD' },
    { id:'wc_c5', homeTeam:'Marruecos',       awayTeam:'Haití',         homeScore:null, awayScore:null, date:'2026-06-24T22:00:00Z', status:'upcoming', league:'Mundial 2026 · Grupo C', leagueId:'FIFA.WORLD' },
    { id:'wc_c6', homeTeam:'Escocia',         awayTeam:'Brasil',        homeScore:null, awayScore:null, date:'2026-06-24T22:00:00Z', status:'upcoming', league:'Mundial 2026 · Grupo C', leagueId:'FIFA.WORLD' },
    { id:'wc_a5', homeTeam:'Rep. Checa',      awayTeam:'México',        homeScore:null, awayScore:null, date:'2026-06-25T01:00:00Z', status:'upcoming', league:'Mundial 2026 · Grupo A', leagueId:'FIFA.WORLD' },
    { id:'wc_a6', homeTeam:'Sudáfrica',       awayTeam:'Corea del Sur', homeScore:null, awayScore:null, date:'2026-06-25T01:00:00Z', status:'upcoming', league:'Mundial 2026 · Grupo A', leagueId:'FIFA.WORLD' },
    { id:'wc_e5', homeTeam:'Curazao',         awayTeam:'Costa de Marfil',homeScore:null, awayScore:null, date:'2026-06-25T20:00:00Z', status:'upcoming', league:'Mundial 2026 · Grupo E', leagueId:'FIFA.WORLD' },
    { id:'wc_e6', homeTeam:'Ecuador',         awayTeam:'Alemania',      homeScore:null, awayScore:null, date:'2026-06-25T20:00:00Z', status:'upcoming', league:'Mundial 2026 · Grupo E', leagueId:'FIFA.WORLD' },
    { id:'wc_f5', homeTeam:'Japón',           awayTeam:'Suecia',        homeScore:null, awayScore:null, date:'2026-06-25T23:00:00Z', status:'upcoming', league:'Mundial 2026 · Grupo F', leagueId:'FIFA.WORLD' },
    { id:'wc_f6', homeTeam:'Túnez',           awayTeam:'Holanda',       homeScore:null, awayScore:null, date:'2026-06-25T23:00:00Z', status:'upcoming', league:'Mundial 2026 · Grupo F', leagueId:'FIFA.WORLD' },
    { id:'wc_d5', homeTeam:'Paraguay',        awayTeam:'Australia',     homeScore:null, awayScore:null, date:'2026-06-26T02:00:00Z', status:'upcoming', league:'Mundial 2026 · Grupo D', leagueId:'FIFA.WORLD' },
    { id:'wc_d6', homeTeam:'Turquía',         awayTeam:'Estados Unidos',homeScore:null, awayScore:null, date:'2026-06-26T02:00:00Z', status:'upcoming', league:'Mundial 2026 · Grupo D', leagueId:'FIFA.WORLD' },
    { id:'wc_i5', homeTeam:'Noruega',         awayTeam:'Francia',       homeScore:null, awayScore:null, date:'2026-06-26T19:00:00Z', status:'upcoming', league:'Mundial 2026 · Grupo I', leagueId:'FIFA.WORLD' },
    { id:'wc_i6', homeTeam:'Senegal',         awayTeam:'Irak',          homeScore:null, awayScore:null, date:'2026-06-26T19:00:00Z', status:'upcoming', league:'Mundial 2026 · Grupo I', leagueId:'FIFA.WORLD' },
    { id:'wc_h5', homeTeam:'Cabo Verde',      awayTeam:'Arabia Saudita',homeScore:null, awayScore:null, date:'2026-06-27T00:00:00Z', status:'upcoming', league:'Mundial 2026 · Grupo H', leagueId:'FIFA.WORLD' },
    { id:'wc_h6', homeTeam:'Uruguay',         awayTeam:'España',        homeScore:null, awayScore:null, date:'2026-06-27T00:00:00Z', status:'upcoming', league:'Mundial 2026 · Grupo H', leagueId:'FIFA.WORLD' },
    { id:'wc_g5', homeTeam:'Egipto',          awayTeam:'Irán',          homeScore:null, awayScore:null, date:'2026-06-27T03:00:00Z', status:'upcoming', league:'Mundial 2026 · Grupo G', leagueId:'FIFA.WORLD' },
    { id:'wc_g6', homeTeam:'Nueva Zelanda',   awayTeam:'Bélgica',       homeScore:null, awayScore:null, date:'2026-06-27T03:00:00Z', status:'upcoming', league:'Mundial 2026 · Grupo G', leagueId:'FIFA.WORLD' },
    { id:'wc_l5', homeTeam:'Croacia',         awayTeam:'Ghana',         homeScore:null, awayScore:null, date:'2026-06-27T21:00:00Z', status:'upcoming', league:'Mundial 2026 · Grupo L', leagueId:'FIFA.WORLD' },
    { id:'wc_l6', homeTeam:'Panamá',          awayTeam:'Inglaterra',    homeScore:null, awayScore:null, date:'2026-06-27T21:00:00Z', status:'upcoming', league:'Mundial 2026 · Grupo L', leagueId:'FIFA.WORLD' },
    { id:'wc_k5', homeTeam:'Colombia',        awayTeam:'Portugal',      homeScore:null, awayScore:null, date:'2026-06-27T23:30:00Z', status:'upcoming', league:'Mundial 2026 · Grupo K', leagueId:'FIFA.WORLD' },
    { id:'wc_k6', homeTeam:'R.D. Congo',      awayTeam:'Uzbekistán',    homeScore:null, awayScore:null, date:'2026-06-27T23:30:00Z', status:'upcoming', league:'Mundial 2026 · Grupo K', leagueId:'FIFA.WORLD' },
    { id:'wc_j5', homeTeam:'Argelia',         awayTeam:'Austria',       homeScore:null, awayScore:null, date:'2026-06-28T02:00:00Z', status:'upcoming', league:'Mundial 2026 · Grupo J', leagueId:'FIFA.WORLD' },
    { id:'wc_j6', homeTeam:'Jordania',        awayTeam:'Argentina',     homeScore:null, awayScore:null, date:'2026-06-28T02:00:00Z', status:'upcoming', league:'Mundial 2026 · Grupo J', leagueId:'FIFA.WORLD' },
  ],
  'ESP.1': [
    { id:'esp1', homeTeam:'Real Madrid',     awayTeam:'Barcelona',        homeScore:3, awayScore:2, date:'2026-05-17T20:00:00Z', status:'finished', league:'La Liga 2025-26', leagueId:'ESP.1' },
    { id:'esp2', homeTeam:'Atletico Madrid', awayTeam:'Sevilla',          homeScore:2, awayScore:0, date:'2026-05-17T17:30:00Z', status:'finished', league:'La Liga 2025-26', leagueId:'ESP.1' },
    { id:'esp3', homeTeam:'Barcelona',       awayTeam:'Atletico Madrid',  homeScore:1, awayScore:1, date:'2026-05-10T20:00:00Z', status:'finished', league:'La Liga 2025-26', leagueId:'ESP.1' },
    { id:'esp4', homeTeam:'Villarreal',      awayTeam:'Real Betis',       homeScore:2, awayScore:1, date:'2026-05-10T17:30:00Z', status:'finished', league:'La Liga 2025-26', leagueId:'ESP.1' },
    { id:'esp5', homeTeam:'Real Sociedad',   awayTeam:'Athletic Club',    homeScore:1, awayScore:2, date:'2026-05-03T19:00:00Z', status:'finished', league:'La Liga 2025-26', leagueId:'ESP.1' },
    { id:'esp6', homeTeam:'Girona',          awayTeam:'Valencia',         homeScore:3, awayScore:0, date:'2026-05-03T17:00:00Z', status:'finished', league:'La Liga 2025-26', leagueId:'ESP.1' },
    { id:'esp7', homeTeam:'Elche',           awayTeam:'Sevilla',          homeScore:1, awayScore:3, date:'2026-04-26T17:00:00Z', status:'finished', league:'La Liga 2025-26', leagueId:'ESP.1' },
    { id:'esp8', homeTeam:'Real Madrid',     awayTeam:'Girona',           homeScore:4, awayScore:1, date:'2026-04-26T20:00:00Z', status:'finished', league:'La Liga 2025-26', leagueId:'ESP.1' },
    { id:'esp9', homeTeam:'Athletic Club',   awayTeam:'Barcelona',        homeScore:0, awayScore:2, date:'2026-04-19T17:00:00Z', status:'finished', league:'La Liga 2025-26', leagueId:'ESP.1' },
    { id:'esp10',homeTeam:'Valencia',        awayTeam:'Real Betis',       homeScore:1, awayScore:1, date:'2026-04-19T15:00:00Z', status:'finished', league:'La Liga 2025-26', leagueId:'ESP.1' },
  ],
  'ENG.1': [
    { id:'eng1', homeTeam:'Arsenal',          awayTeam:'Chelsea',           homeScore:2, awayScore:1, date:'2026-05-17T15:00:00Z', status:'finished', league:'Premier League 2025-26', leagueId:'ENG.1' },
    { id:'eng2', homeTeam:'Liverpool',         awayTeam:'Tottenham',         homeScore:3, awayScore:1, date:'2026-05-17T17:30:00Z', status:'finished', league:'Premier League 2025-26', leagueId:'ENG.1' },
    { id:'eng3', homeTeam:'Manchester City',   awayTeam:'Aston Villa',       homeScore:2, awayScore:0, date:'2026-05-10T15:00:00Z', status:'finished', league:'Premier League 2025-26', leagueId:'ENG.1' },
    { id:'eng4', homeTeam:'Newcastle United',  awayTeam:'Manchester United', homeScore:1, awayScore:0, date:'2026-05-10T17:30:00Z', status:'finished', league:'Premier League 2025-26', leagueId:'ENG.1' },
    { id:'eng5', homeTeam:'Chelsea',           awayTeam:'Manchester City',   homeScore:1, awayScore:2, date:'2026-05-03T15:00:00Z', status:'finished', league:'Premier League 2025-26', leagueId:'ENG.1' },
    { id:'eng6', homeTeam:'Tottenham',         awayTeam:'Arsenal',           homeScore:0, awayScore:1, date:'2026-04-26T15:00:00Z', status:'finished', league:'Premier League 2025-26', leagueId:'ENG.1' },
    { id:'eng7', homeTeam:'Liverpool',         awayTeam:'Arsenal',           homeScore:2, awayScore:2, date:'2026-04-19T15:00:00Z', status:'finished', league:'Premier League 2025-26', leagueId:'ENG.1' },
    { id:'eng8', homeTeam:'Manchester City',   awayTeam:'Liverpool',         homeScore:1, awayScore:3, date:'2026-04-05T15:00:00Z', status:'finished', league:'Premier League 2025-26', leagueId:'ENG.1' },
  ],
  'GER.1': [
    { id:'ger1', homeTeam:'Bayern Munich',     awayTeam:'Borussia Dortmund', homeScore:3, awayScore:1, date:'2026-05-09T17:30:00Z', status:'finished', league:'Bundesliga 2025-26', leagueId:'GER.1' },
    { id:'ger2', homeTeam:'Bayer Leverkusen',  awayTeam:'RB Leipzig',        homeScore:2, awayScore:1, date:'2026-05-09T14:30:00Z', status:'finished', league:'Bundesliga 2025-26', leagueId:'GER.1' },
    { id:'ger3', homeTeam:'Borussia Dortmund', awayTeam:'Eintracht Frankfurt',homeScore:2, awayScore:2, date:'2026-05-02T14:30:00Z', status:'finished', league:'Bundesliga 2025-26', leagueId:'GER.1' },
    { id:'ger4', homeTeam:'RB Leipzig',        awayTeam:'VfB Stuttgart',     homeScore:1, awayScore:0, date:'2026-04-25T14:30:00Z', status:'finished', league:'Bundesliga 2025-26', leagueId:'GER.1' },
    { id:'ger5', homeTeam:'Bayern Munich',     awayTeam:'Bayer Leverkusen',  homeScore:2, awayScore:1, date:'2026-04-18T17:30:00Z', status:'finished', league:'Bundesliga 2025-26', leagueId:'GER.1' },
  ],
  'FRA.1': [
    { id:'fra1', homeTeam:'PSG',       awayTeam:'Marseille',  homeScore:2, awayScore:0, date:'2026-05-16T20:00:00Z', status:'finished', league:'Ligue 1 2025-26', leagueId:'FRA.1' },
    { id:'fra2', homeTeam:'Monaco',    awayTeam:'Lyon',       homeScore:1, awayScore:1, date:'2026-05-16T17:00:00Z', status:'finished', league:'Ligue 1 2025-26', leagueId:'FRA.1' },
    { id:'fra3', homeTeam:'Lille',     awayTeam:'Rennes',     homeScore:2, awayScore:0, date:'2026-05-09T17:00:00Z', status:'finished', league:'Ligue 1 2025-26', leagueId:'FRA.1' },
    { id:'fra4', homeTeam:'Marseille', awayTeam:'Nice',       homeScore:1, awayScore:2, date:'2026-05-09T20:00:00Z', status:'finished', league:'Ligue 1 2025-26', leagueId:'FRA.1' },
    { id:'fra5', homeTeam:'PSG',       awayTeam:'Monaco',     homeScore:3, awayScore:1, date:'2026-04-26T20:00:00Z', status:'finished', league:'Ligue 1 2025-26', leagueId:'FRA.1' },
  ],
  'ITA.1': [
    { id:'ita1', homeTeam:'Inter Milan',  awayTeam:'Juventus',   homeScore:2, awayScore:1, date:'2026-05-16T19:45:00Z', status:'finished', league:'Serie A 2025-26', leagueId:'ITA.1' },
    { id:'ita2', homeTeam:'AC Milan',     awayTeam:'Napoli',     homeScore:1, awayScore:1, date:'2026-05-16T17:00:00Z', status:'finished', league:'Serie A 2025-26', leagueId:'ITA.1' },
    { id:'ita3', homeTeam:'Roma',         awayTeam:'Lazio',      homeScore:0, awayScore:1, date:'2026-05-09T17:00:00Z', status:'finished', league:'Serie A 2025-26', leagueId:'ITA.1' },
    { id:'ita4', homeTeam:'Napoli',       awayTeam:'Atalanta',   homeScore:2, awayScore:2, date:'2026-05-09T19:45:00Z', status:'finished', league:'Serie A 2025-26', leagueId:'ITA.1' },
    { id:'ita5', homeTeam:'Fiorentina',   awayTeam:'Bologna',    homeScore:2, awayScore:0, date:'2026-05-02T17:00:00Z', status:'finished', league:'Serie A 2025-26', leagueId:'ITA.1' },
  ],
  'UEFA.CHAMPIONS': [
    { id:'ucl1', homeTeam:'Real Madrid',     awayTeam:'Bayern Munich',     homeScore:2, awayScore:1, date:'2026-05-30T19:00:00Z', status:'finished', league:'Champions League 2025-26 · Final',   leagueId:'UEFA.CHAMPIONS', venue:'Wembley Stadium, Londres' },
    { id:'ucl2', homeTeam:'Arsenal',          awayTeam:'Barcelona',         homeScore:1, awayScore:2, date:'2026-04-29T19:00:00Z', status:'finished', league:'Champions League 2025-26 · Semis',   leagueId:'UEFA.CHAMPIONS' },
    { id:'ucl3', homeTeam:'Bayern Munich',    awayTeam:'PSG',               homeScore:3, awayScore:0, date:'2026-04-22T19:00:00Z', status:'finished', league:'Champions League 2025-26 · Semis',   leagueId:'UEFA.CHAMPIONS' },
    { id:'ucl4', homeTeam:'Real Madrid',      awayTeam:'Manchester City',   homeScore:2, awayScore:2, date:'2026-04-15T19:00:00Z', status:'finished', league:'Champions League 2025-26 · Cuartos', leagueId:'UEFA.CHAMPIONS' },
    { id:'ucl5', homeTeam:'Inter Milan',      awayTeam:'Liverpool',         homeScore:0, awayScore:1, date:'2026-04-08T19:00:00Z', status:'finished', league:'Champions League 2025-26 · Cuartos', leagueId:'UEFA.CHAMPIONS' },
  ],
  'ESP.2': [
    { id:'h2_1', homeTeam:'Levante',          awayTeam:'Deportivo LC',      homeScore:2, awayScore:0, date:'2026-05-17T19:00:00Z', status:'finished', league:'Liga Hypermotion 2025-26 · J42', leagueId:'ESP.2' },
    { id:'h2_2', homeTeam:'Racing Santander', awayTeam:'Valladolid',        homeScore:1, awayScore:1, date:'2026-05-17T19:00:00Z', status:'finished', league:'Liga Hypermotion 2025-26 · J42', leagueId:'ESP.2' },
    { id:'h2_3', homeTeam:'Espanyol',         awayTeam:'Almería',           homeScore:3, awayScore:1, date:'2026-05-10T19:00:00Z', status:'finished', league:'Liga Hypermotion 2025-26 · J41', leagueId:'ESP.2' },
    { id:'h2_4', homeTeam:'Huesca',           awayTeam:'Mirandés',          homeScore:2, awayScore:0, date:'2026-05-10T17:00:00Z', status:'finished', league:'Liga Hypermotion 2025-26 · J41', leagueId:'ESP.2' },
    { id:'h2_5', homeTeam:'Levante',          awayTeam:'Racing Santander',  homeScore:1, awayScore:0, date:'2026-05-03T19:00:00Z', status:'finished', league:'Liga Hypermotion 2025-26 · J40', leagueId:'ESP.2' },
    { id:'h2_6', homeTeam:'Valladolid',       awayTeam:'Espanyol',          homeScore:0, awayScore:2, date:'2026-04-26T17:00:00Z', status:'finished', league:'Liga Hypermotion 2025-26 · J39', leagueId:'ESP.2' },
  ],
};

// Clasificaciones reales obtenidas de ESPN el 16/06/2026
// WC_GROUPS_STATIC: 12 grupos con 4 equipos c/u, resultados reales J1
export const WC_GROUPS_STATIC: Record<string, StandingEntry[]> = {
  A: [
    { pos:1, team:'México',        played:1, won:1, drawn:0, lost:0, gf:2, ga:0, gd:2,  points:3, group:'A' },
    { pos:2, team:'Corea del Sur', played:1, won:1, drawn:0, lost:0, gf:2, ga:1, gd:1,  points:3, group:'A' },
    { pos:3, team:'Rep. Checa',    played:1, won:0, drawn:0, lost:1, gf:1, ga:2, gd:-1, points:0, group:'A' },
    { pos:4, team:'Sudáfrica',     played:1, won:0, drawn:0, lost:1, gf:0, ga:2, gd:-2, points:0, group:'A' },
  ],
  B: [
    { pos:1, team:'Canadá',  played:1, won:0, drawn:1, lost:0, gf:1, ga:1, gd:0, points:1, group:'B' },
    { pos:2, team:'Bosnia',  played:1, won:0, drawn:1, lost:0, gf:1, ga:1, gd:0, points:1, group:'B' },
    { pos:3, team:'Suiza',   played:1, won:0, drawn:1, lost:0, gf:1, ga:1, gd:0, points:1, group:'B' },
    { pos:4, team:'Catar',   played:1, won:0, drawn:1, lost:0, gf:1, ga:1, gd:0, points:1, group:'B' },
  ],
  C: [
    { pos:1, team:'Escocia',   played:1, won:1, drawn:0, lost:0, gf:1, ga:0, gd:1,  points:3, group:'C' },
    { pos:2, team:'Brasil',    played:1, won:0, drawn:1, lost:0, gf:1, ga:1, gd:0,  points:1, group:'C' },
    { pos:3, team:'Marruecos', played:1, won:0, drawn:1, lost:0, gf:1, ga:1, gd:0,  points:1, group:'C' },
    { pos:4, team:'Haití',     played:1, won:0, drawn:0, lost:1, gf:0, ga:1, gd:-1, points:0, group:'C' },
  ],
  D: [
    { pos:1, team:'Estados Unidos', played:1, won:1, drawn:0, lost:0, gf:4, ga:1, gd:3,  points:3, group:'D' },
    { pos:2, team:'Australia',      played:1, won:1, drawn:0, lost:0, gf:2, ga:0, gd:2,  points:3, group:'D' },
    { pos:3, team:'Turquía',        played:1, won:0, drawn:0, lost:1, gf:0, ga:2, gd:-2, points:0, group:'D' },
    { pos:4, team:'Paraguay',       played:1, won:0, drawn:0, lost:1, gf:1, ga:4, gd:-3, points:0, group:'D' },
  ],
  E: [
    { pos:1, team:'Alemania',        played:1, won:1, drawn:0, lost:0, gf:7, ga:1, gd:6,  points:3, group:'E' },
    { pos:2, team:'Costa de Marfil', played:1, won:1, drawn:0, lost:0, gf:1, ga:0, gd:1,  points:3, group:'E' },
    { pos:3, team:'Ecuador',         played:1, won:0, drawn:0, lost:1, gf:0, ga:1, gd:-1, points:0, group:'E' },
    { pos:4, team:'Curazao',         played:1, won:0, drawn:0, lost:1, gf:1, ga:7, gd:-6, points:0, group:'E' },
  ],
  F: [
    { pos:1, team:'Suecia',  played:1, won:1, drawn:0, lost:0, gf:5, ga:1, gd:4,  points:3, group:'F' },
    { pos:2, team:'Holanda', played:1, won:0, drawn:1, lost:0, gf:2, ga:2, gd:0,  points:1, group:'F' },
    { pos:3, team:'Japón',   played:1, won:0, drawn:1, lost:0, gf:2, ga:2, gd:0,  points:1, group:'F' },
    { pos:4, team:'Túnez',   played:1, won:0, drawn:0, lost:1, gf:1, ga:5, gd:-4, points:0, group:'F' },
  ],
  G: [
    { pos:1, team:'Bélgica',       played:1, won:0, drawn:1, lost:0, gf:1, ga:1, gd:0, points:1, group:'G' },
    { pos:2, team:'Irán',          played:1, won:0, drawn:1, lost:0, gf:2, ga:2, gd:0, points:1, group:'G' },
    { pos:3, team:'Egipto',        played:1, won:0, drawn:1, lost:0, gf:1, ga:1, gd:0, points:1, group:'G' },
    { pos:4, team:'Nueva Zelanda', played:1, won:0, drawn:1, lost:0, gf:2, ga:2, gd:0, points:1, group:'G' },
  ],
  H: [
    { pos:1, team:'España',         played:1, won:0, drawn:1, lost:0, gf:0, ga:0, gd:0, points:1, group:'H' },
    { pos:2, team:'Arabia Saudita', played:1, won:0, drawn:1, lost:0, gf:1, ga:1, gd:0, points:1, group:'H' },
    { pos:3, team:'Uruguay',        played:1, won:0, drawn:1, lost:0, gf:1, ga:1, gd:0, points:1, group:'H' },
    { pos:4, team:'Cabo Verde',     played:1, won:0, drawn:1, lost:0, gf:0, ga:0, gd:0, points:1, group:'H' },
  ],
  I: [
    { pos:1, team:'Francia',  played:1, won:1, drawn:0, lost:0, gf:2, ga:0, gd:2,  points:3, group:'I' },
    { pos:2, team:'Noruega',  played:1, won:1, drawn:0, lost:0, gf:3, ga:1, gd:2,  points:3, group:'I' },
    { pos:3, team:'Senegal',  played:1, won:0, drawn:0, lost:1, gf:0, ga:2, gd:-2, points:0, group:'I' },
    { pos:4, team:'Irak',     played:1, won:0, drawn:0, lost:1, gf:1, ga:3, gd:-2, points:0, group:'I' },
  ],
  J: [
    { pos:1, team:'Argentina', played:1, won:1, drawn:0, lost:0, gf:3, ga:0, gd:3,  points:3, group:'J' },
    { pos:2, team:'Austria',   played:1, won:1, drawn:0, lost:0, gf:2, ga:1, gd:1,  points:3, group:'J' },
    { pos:3, team:'Jordania',  played:1, won:0, drawn:0, lost:1, gf:1, ga:2, gd:-1, points:0, group:'J' },
    { pos:4, team:'Argelia',   played:1, won:0, drawn:0, lost:1, gf:0, ga:3, gd:-3, points:0, group:'J' },
  ],
  K: [
    { pos:1, team:'Colombia',    played:0, won:0, drawn:0, lost:0, gf:0, ga:0, gd:0, points:0, group:'K' },
    { pos:2, team:'Portugal',    played:0, won:0, drawn:0, lost:0, gf:0, ga:0, gd:0, points:0, group:'K' },
    { pos:3, team:'Uzbekistán',  played:0, won:0, drawn:0, lost:0, gf:0, ga:0, gd:0, points:0, group:'K' },
    { pos:4, team:'R.D. Congo',  played:0, won:0, drawn:0, lost:0, gf:0, ga:0, gd:0, points:0, group:'K' },
  ],
  L: [
    { pos:1, team:'Inglaterra', played:0, won:0, drawn:0, lost:0, gf:0, ga:0, gd:0, points:0, group:'L' },
    { pos:2, team:'Croacia',    played:0, won:0, drawn:0, lost:0, gf:0, ga:0, gd:0, points:0, group:'L' },
    { pos:3, team:'Panamá',     played:0, won:0, drawn:0, lost:0, gf:0, ga:0, gd:0, points:0, group:'L' },
    { pos:4, team:'Ghana',      played:0, won:0, drawn:0, lost:0, gf:0, ga:0, gd:0, points:0, group:'L' },
  ],
};

const STANDINGS_STATIC: Record<string, StandingEntry[]> = {
  'FIFA.WORLD': Object.values(WC_GROUPS_STATIC).flat(),
  'ESP.1': [
    { pos:1, team:'Real Madrid',     played:38, won:26, drawn:6,  lost:6,  gf:82, ga:38, gd:44, points:84 },
    { pos:2, team:'Barcelona',       played:38, won:24, drawn:8,  lost:6,  gf:78, ga:42, gd:36, points:80 },
    { pos:3, team:'Atletico Madrid', played:38, won:21, drawn:10, lost:7,  gf:65, ga:38, gd:27, points:73 },
    { pos:4, team:'Girona',          played:38, won:18, drawn:6,  lost:14, gf:71, ga:55, gd:16, points:60 },
    { pos:5, team:'Sevilla',         played:38, won:15, drawn:8,  lost:15, gf:54, ga:57, gd:-3, points:53 },
    { pos:6, team:'Villarreal',      played:38, won:15, drawn:7,  lost:16, gf:58, ga:58, gd:0,  points:52 },
    { pos:7, team:'Athletic Club',   played:38, won:15, drawn:6,  lost:17, gf:52, ga:58, gd:-6, points:51 },
    { pos:8, team:'Real Sociedad',   played:38, won:14, drawn:8,  lost:16, gf:50, ga:55, gd:-5, points:50 },
  ],
  'ENG.1': [
    { pos:1, team:'Arsenal',           played:38, won:27, drawn:8, lost:3,  gf:89, ga:32, gd:57, points:89 },
    { pos:2, team:'Liverpool',         played:38, won:26, drawn:7, lost:5,  gf:84, ga:38, gd:46, points:85 },
    { pos:3, team:'Manchester City',   played:38, won:24, drawn:8, lost:6,  gf:79, ga:38, gd:41, points:80 },
    { pos:4, team:'Chelsea',           played:38, won:19, drawn:6, lost:13, gf:68, ga:51, gd:17, points:63 },
    { pos:5, team:'Newcastle United',  played:38, won:18, drawn:8, lost:12, gf:62, ga:50, gd:12, points:62 },
    { pos:6, team:'Tottenham',         played:38, won:18, drawn:5, lost:15, gf:65, ga:59, gd:6,  points:59 },
    { pos:7, team:'Aston Villa',       played:38, won:17, drawn:7, lost:14, gf:64, ga:56, gd:8,  points:58 },
    { pos:8, team:'Manchester United', played:38, won:14, drawn:7, lost:17, gf:48, ga:64, gd:-16,points:49 },
  ],
  'GER.1': [
    { pos:1, team:'Bayern Munich',      played:34, won:23, drawn:9, lost:2,  gf:82, ga:36, gd:46, points:78 },
    { pos:2, team:'Bayer Leverkusen',   played:34, won:21, drawn:9, lost:4,  gf:74, ga:36, gd:38, points:72 },
    { pos:3, team:'Borussia Dortmund',  played:34, won:18, drawn:8, lost:8,  gf:67, ga:50, gd:17, points:62 },
    { pos:4, team:'RB Leipzig',         played:34, won:17, drawn:9, lost:8,  gf:61, ga:44, gd:17, points:60 },
    { pos:5, team:'VfB Stuttgart',      played:34, won:16, drawn:7, lost:11, gf:58, ga:50, gd:8,  points:55 },
    { pos:6, team:'Eintracht Frankfurt',played:34, won:14, drawn:6, lost:14, gf:52, ga:55, gd:-3, points:48 },
  ],
  'FRA.1': [
    { pos:1, team:'PSG',       played:34, won:28, drawn:7, lost:3,  gf:94, ga:28, gd:66, points:91 },
    { pos:2, team:'Monaco',    played:34, won:21, drawn:8, lost:5,  gf:70, ga:38, gd:32, points:71 },
    { pos:3, team:'Marseille', played:34, won:20, drawn:8, lost:6,  gf:65, ga:41, gd:24, points:68 },
    { pos:4, team:'Lille',     played:34, won:17, drawn:7, lost:10, gf:56, ga:42, gd:14, points:58 },
    { pos:5, team:'Lyon',      played:34, won:15, drawn:7, lost:12, gf:51, ga:50, gd:1,  points:52 },
    { pos:6, team:'Nice',      played:34, won:14, drawn:8, lost:12, gf:47, ga:47, gd:0,  points:50 },
  ],
  'ITA.1': [
    { pos:1, team:'Inter Milan',  played:38, won:28, drawn:6,  lost:4,  gf:85, ga:30, gd:55, points:90 },
    { pos:2, team:'Napoli',       played:38, won:23, drawn:9,  lost:6,  gf:72, ga:36, gd:36, points:78 },
    { pos:3, team:'Juventus',     played:38, won:21, drawn:10, lost:7,  gf:64, ga:38, gd:26, points:73 },
    { pos:4, team:'Atalanta',     played:38, won:20, drawn:8,  lost:10, gf:75, ga:50, gd:25, points:68 },
    { pos:5, team:'AC Milan',     played:38, won:18, drawn:8,  lost:12, gf:62, ga:51, gd:11, points:62 },
    { pos:6, team:'Roma',         played:38, won:16, drawn:8,  lost:14, gf:58, ga:56, gd:2,  points:56 },
  ],
  'UEFA.CHAMPIONS': [
    { pos:1, team:'Real Madrid',       played:8, won:6, drawn:1, lost:1, gf:18, ga:8,  gd:10, points:19 },
    { pos:2, team:'Bayern Munich',     played:8, won:5, drawn:1, lost:2, gf:16, ga:9,  gd:7,  points:16 },
    { pos:3, team:'Barcelona',         played:8, won:5, drawn:0, lost:3, gf:15, ga:11, gd:4,  points:15 },
    { pos:4, team:'Arsenal',           played:8, won:4, drawn:2, lost:2, gf:13, ga:9,  gd:4,  points:14 },
    { pos:5, team:'Liverpool',         played:8, won:4, drawn:1, lost:3, gf:12, ga:10, gd:2,  points:13 },
    { pos:6, team:'PSG',               played:8, won:3, drawn:2, lost:3, gf:10, ga:13, gd:-3, points:11 },
    { pos:7, team:'Inter Milan',       played:8, won:3, drawn:1, lost:4, gf:9,  ga:12, gd:-3, points:10 },
    { pos:8, team:'Borussia Dortmund', played:8, won:2, drawn:2, lost:4, gf:8,  ga:13, gd:-5, points:8  },
  ],
  'ESP.2': [
    { pos:1,  team:'Levante',           played:42, won:26, drawn:10, lost:6,  gf:78, ga:38, gd:40,  points:88 },
    { pos:2,  team:'Racing Santander',  played:42, won:24, drawn:8,  lost:10, gf:70, ga:42, gd:28,  points:80 },
    { pos:3,  team:'Espanyol',          played:42, won:22, drawn:10, lost:10, gf:66, ga:44, gd:22,  points:76 },
    { pos:4,  team:'Deportivo LC',      played:42, won:20, drawn:12, lost:10, gf:62, ga:48, gd:14,  points:72 },
    { pos:5,  team:'Huesca',            played:42, won:19, drawn:11, lost:12, gf:60, ga:50, gd:10,  points:68 },
    { pos:6,  team:'Valladolid',        played:42, won:18, drawn:10, lost:14, gf:57, ga:52, gd:5,   points:64 },
    { pos:7,  team:'Almería',           played:42, won:17, drawn:9,  lost:16, gf:54, ga:55, gd:-1,  points:60 },
    { pos:8,  team:'Mirandés',          played:42, won:15, drawn:12, lost:15, gf:50, ga:54, gd:-4,  points:57 },
    { pos:9,  team:'Eibar',             played:42, won:14, drawn:12, lost:16, gf:48, ga:56, gd:-8,  points:54 },
    { pos:10, team:'Burgos',            played:42, won:13, drawn:11, lost:18, gf:44, ga:58, gd:-14, points:50 },
  ],
};

// ─── Match events & lineups from ESPN summary API ────────────────────────────

export interface MatchEvent {
  minute: number;
  type: 'goal' | 'yellow' | 'red' | 'penalty' | 'owngoal' | 'sub' | 'foul' | 'offside';
  team: 'home' | 'away';
  player: string;
  detail?: string;
}

export interface MatchLineup {
  homeFormation: string;
  awayFormation: string;
  homePlayers: Array<{ name: string; number: number; position: string }>;
  awayPlayers: Array<{ name: string; number: number; position: string }>;
}

// Returns events and lineups from ESPN summary API
// Tries: https://site.api.espn.com/apis/site/v2/sports/soccer/{leagueId}/summary?event={espnId}
// For WC: leagueId = 'FIFA.WORLD'
// The espnId needs to come from the actual ESPN event ID (not our static IDs)
// So this will mostly fail for our static data and we should return empty arrays gracefully
export async function getMatchDetails(leagueId: string, matchId: string): Promise<{ events: MatchEvent[]; lineup: MatchLineup | null }> {
  try {
    // Only attempt for non-static IDs (our static IDs start with 'wc_', 'esp', etc.)
    // Real ESPN IDs are numeric strings
    if (!matchId.match(/^\d+$/)) return { events: [], lineup: null };

    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${leagueId}/summary?event=${matchId}`;
    const res = await fetchWithTimeout(url, 6000);
    if (!res.ok) return { events: [], lineup: null };
    const data = await res.json();

    // Parse events from data.plays or data.keyEvents
    const events: MatchEvent[] = [];
    const plays = data.plays ?? data.keyEvents ?? [];
    for (const play of plays) {
      const type = play.type?.text?.toLowerCase() ?? '';
      const team: 'home' | 'away' = play.homeAway === 'home' ? 'home' : 'away';
      const minute = play.clock?.value ? Math.floor(play.clock.value / 60) : 0;
      const player = play.participants?.[0]?.athlete?.shortName ?? play.participants?.[0]?.athlete?.displayName ?? '';

      if (type.includes('goal') && !type.includes('own')) events.push({ minute, type: 'goal', team, player });
      else if (type.includes('own')) events.push({ minute, type: 'owngoal', team, player });
      else if (type.includes('yellow')) events.push({ minute, type: 'yellow', team, player });
      else if (type.includes('red')) events.push({ minute, type: 'red', team, player });
      else if (type.includes('penalty')) events.push({ minute, type: 'penalty', team, player });
    }

    // Parse lineups
    let lineup: MatchLineup | null = null;
    const rosters = data.rosters ?? [];
    if (rosters.length >= 2) {
      const home = rosters.find((r: any) => r.homeAway === 'home') ?? rosters[0];
      const away = rosters.find((r: any) => r.homeAway === 'away') ?? rosters[1];
      lineup = {
        homeFormation: home.formation ?? '4-3-3',
        awayFormation: away.formation ?? '4-3-3',
        homePlayers: (home.athletes ?? []).filter((a: any) => a.starter).slice(0, 11).map((a: any) => ({
          name: a.athlete?.shortName ?? a.athlete?.displayName ?? '',
          number: a.jersey ? parseInt(a.jersey) : 0,
          position: a.position?.abbreviation ?? '',
        })),
        awayPlayers: (away.athletes ?? []).filter((a: any) => a.starter).slice(0, 11).map((a: any) => ({
          name: a.athlete?.shortName ?? a.athlete?.displayName ?? '',
          number: a.jersey ? parseInt(a.jersey) : 0,
          position: a.position?.abbreviation ?? '',
        })),
      };
    }

    return { events, lineup };
  } catch {
    return { events: [], lineup: null };
  }
}

// Calcula clasificación del Mundial dinámicamente de los partidos jugados en STATIC
function computeWCStandings(): StandingEntry[] {
  // Inicializar todos los equipos desde WC_GROUPS_STATIC (para tener el group label)
  const teamMap: Record<string, StandingEntry & { group: string }> = {};
  for (const [group, teams] of Object.entries(WC_GROUPS_STATIC)) {
    for (const t of teams) {
      teamMap[t.team] = { ...t, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, group };
    }
  }

  // Función de búsqueda fuzzy para emparejar nombre de equipo
  const findTeam = (name: string) => {
    const n = name.toLowerCase();
    return Object.values(teamMap).find(t => {
      const tn = t.team.toLowerCase();
      return tn === n || n.includes(tn) || tn.includes(n);
    });
  };

  // Procesar todos los partidos terminados del Mundial
  for (const match of (STATIC['FIFA.WORLD'] || [])) {
    if (match.status !== 'finished' || match.homeScore == null || match.awayScore == null) continue;
    const home = findTeam(match.homeTeam);
    const away = findTeam(match.awayTeam);
    if (!home || !away) continue;

    const hs = match.homeScore;
    const as_ = match.awayScore;

    home.played++; home.gf += hs; home.ga += as_;
    away.played++; away.gf += as_; away.ga += hs;

    if (hs > as_) {
      home.won++; home.points += 3; away.lost++;
    } else if (hs === as_) {
      home.drawn++; home.points += 1; away.drawn++; away.points += 1;
    } else {
      away.won++; away.points += 3; home.lost++;
    }
    home.gd = home.gf - home.ga;
    away.gd = away.gf - away.ga;
  }

  return Object.values(teamMap);
}

export const espnMatchService = {
  async getMatches(competitionId: string): Promise<CompetitionMatch[]> {
    const comp = COMPETITIONS.find(c => c.id === competitionId);
    if (!comp) return STATIC[competitionId] || [];

    try {
      const isWC = competitionId === 'FIFA.WORLD';
      const dateParam = isWC ? '?dates=20260616-20260731' : '';
      const url = `${ESPN_BASE}/${comp.espnSlug}/scoreboard${dateParam}`;
      const response = await fetchWithTimeout(url, 8000);
      if (!response.ok) return STATIC[competitionId] || [];

      const data = await response.json();
      const events: any[] = data.events || [];
      if (events.length === 0) return STATIC[competitionId] || [];

      const matches: CompetitionMatch[] = events.map((ev: any) => {
        const c = ev.competitions?.[0];
        const competitors: any[] = c?.competitors || [];
        const home = competitors.find((x: any) => x.homeAway === 'home');
        const away = competitors.find((x: any) => x.homeAway === 'away');
        const state = ev.status?.type?.state;
        const status: CompetitionMatch['status'] =
          state === 'pre' ? 'upcoming' : state === 'in' ? 'live' : 'finished';

        return {
          id: String(ev.id || Math.random()),
          homeTeam: t(home?.team?.displayName || home?.team?.name || 'Local'),
          awayTeam: t(away?.team?.displayName || away?.team?.name || 'Visitante'),
          homeScore: status !== 'upcoming' ? parseInt(home?.score ?? '0') : null,
          awayScore: status !== 'upcoming' ? parseInt(away?.score ?? '0') : null,
          date: ev.date || new Date().toISOString(),
          status,
          league: comp.name,
          leagueId: competitionId,
          venue: c?.venue?.fullName || '',
        };
      });

      const valid = matches.filter(m => m.homeTeam !== 'Local' && m.awayTeam !== 'Visitante');
      // Si ESPN devuelve datos, combinar con estático para tener ambos resultados y próximos
      if (valid.length >= 3) {
        const staticData = STATIC[competitionId] || [];
        const liveIds = new Set(valid.map(m => `${m.homeTeam}-${m.awayTeam}`));
        const staticOnly = staticData.filter(s => !liveIds.has(`${s.homeTeam}-${s.awayTeam}`));
        return [...valid, ...staticOnly].sort((a, b) =>
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );
      }
      return STATIC[competitionId] || [];
    } catch {
      return STATIC[competitionId] || [];
    }
  },

  async getStandings(competitionId: string): Promise<StandingEntry[]> {
    // Para el Mundial calcular clasificaciones dinámicamente de los partidos jugados
    if (competitionId === 'FIFA.WORLD') {
      return computeWCStandings();
    }

    try {
      const comp = COMPETITIONS.find(c => c.id === competitionId);
      if (!comp) return STANDINGS_STATIC[competitionId] || [];

      const url = `https://site.api.espn.com/apis/v2/sports/soccer/${comp.espnSlug}/standings`;
      const response = await fetchWithTimeout(url, 6000);
      if (!response.ok) return STANDINGS_STATIC[competitionId] || [];

      const data = await response.json();
      const allGroups: any[] = data.children || [];
      const entries: StandingEntry[] = [];

      for (const group of allGroups.slice(0, 4)) {
        const rawEntries: any[] = group?.standings?.entries || [];
        rawEntries.forEach((entry: any) => {
          const teamName = t(entry.team?.displayName || entry.team?.name || '');
          if (!teamName) return;
          const stats: any[] = entry.stats || [];
          const getStat = (abbrs: string[]) => {
            for (const abbr of abbrs) {
              const s = stats.find((x: any) => x.abbreviation === abbr || x.name === abbr);
              if (s) return parseInt(s.value || '0');
            }
            return 0;
          };
          entries.push({
            pos: entries.length + 1,
            team: teamName,
            played: getStat(['GP', 'gamesPlayed']),
            won:    getStat(['W', 'wins']),
            drawn:  getStat(['D', 'ties', 'draws']),
            lost:   getStat(['L', 'losses']),
            gf:     getStat(['F', 'pointsFor', 'GF', 'goalsFor']),
            ga:     getStat(['A', 'pointsAgainst', 'GA', 'goalsAgainst']),
            gd:     getStat(['GD', 'pointDifferential']),
            points: getStat(['PTS', 'points', 'pts']),
          });
        });
        if (entries.length >= 8) break;
      }

      entries.forEach(e => {
        if (e.points === 0 && e.won > 0) {
          e.points = e.won * 3 + e.drawn;
          e.gd = e.gf - e.ga;
        }
      });

      return entries.length >= 4 ? entries : STANDINGS_STATIC[competitionId] || [];
    } catch {
      return STANDINGS_STATIC[competitionId] || [];
    }
  },

  // Devuelve todos los partidos de todas las competiciones (para selector de apuestas)
  async getAllMatches(): Promise<CompetitionMatch[]> {
    const all: CompetitionMatch[] = [];
    for (const comp of COMPETITIONS) {
      try {
        const matches = await this.getMatches(comp.id);
        all.push(...matches);
      } catch { /* continuar con las demás */ }
    }
    return all;
  },
};
