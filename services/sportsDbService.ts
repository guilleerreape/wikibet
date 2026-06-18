const SPORTSDB_BASE = 'https://www.thesportsdb.com/api/v1/json/3';

async function fetchSDB<T>(endpoint: string): Promise<T | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(`${SPORTSDB_BASE}${endpoint}`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

const TEAM_IDS: Record<string, string> = {
  // National teams — Spanish names first
  'Portugal': '133908',
  'Inglaterra': '133914', 'England': '133914',
  'España': '133909', 'Spain': '133909',
  'Argentina': '134509',
  'Francia': '133913', 'France': '133913',
  'Alemania': '133907', 'Germany': '133907',
  'Brasil': '134496', 'Brazil': '134496',
  'Marruecos': '136139', 'Morocco': '136139',
  'Holanda': '133905', 'Netherlands': '133905',
  'Colombia': '134501',
  'México': '134497', 'Mexico': '134497',
  'Croacia': '133912', 'Croatia': '133912',
  'Uruguay': '134504',
  'Japón': '134503', 'Japan': '134503',
  'Senegal': '136143',
  'Noruega': '136516', 'Norway': '136516',
  'Argelia': '134516', 'Algeria': '134516',
  'Austria': '135986',
  'Canadá': '140073', 'Canada': '140073',
  'Suiza': '134506', 'Switzerland': '134506',
  'Ghana': '134513',
  'Panamá': '136141', 'Panama': '136141',
  'Ecuador': '134507',
  'Suecia': '133916', 'Sweden': '133916',
  'Bélgica': '134515', 'Belgium': '134515',
  'Irán': '134511', 'Iran': '134511',
  'Australia': '134500',
  'Turquía': '135985', 'Turkey': '135985',
  'Paraguay': '136471',
  'Escocia': '136450', 'Scotland': '136450',
  'Haití': '140175', 'Haiti': '140175',
  'Túnez': '136142', 'Tunisia': '136142',
  'Irak': '140148', 'Iraq': '140148',
  'Uzbekistán': '140151', 'Uzbekistan': '140151',
  'Jordania': '151748', 'Jordan': '151748',
  'Curazao': '140271', 'Curaçao': '140271',
  // Additional WC 2026 teams
  'R.D. Congo': '136140', 'RD Congo': '136140', 'Rep. Dem. Congo': '136140', 'DR Congo': '136140',
  'Cabo Verde': '140180', 'Cape Verde': '140180',
  'Sudáfrica': '136138', 'South Africa': '136138', 'Sudafrica': '136138',
  'Nueva Zelanda': '134499', 'New Zealand': '134499',
  'Venezuela': '134508',
  'Chile': '134502',
  'Bolivia': '134510',
  'Perú': '136472', 'Peru': '136472',
  'Costa Rica': '140156',
  'Honduras': '136142',
  'Jamaica': '140162',
  'Islandia': '136516', 'Iceland': '136516',
  'Serbia': '135986',
  'Polonia': '133910', 'Poland': '133910',
  'Dinamarca': '133911', 'Denmark': '133911',
  'Hungría': '133917', 'Hungary': '133917',
  'Eslovenia': '133918', 'Slovenia': '133918',
  'Rumania': '133919', 'Romania': '133919',
  'Egipto': '136137', 'Egypt': '136137',
  'Nigeria': '136136', 'Níger': '136136',
  'Camerún': '136135', 'Cameroon': '136135',
  'Costa de Marfil': '136134', 'Ivory Coast': '136134',
  'Mali': '136133', 'Malí': '136133',
  'Tanzania': '136144',
  'Kenia': '136145', 'Kenya': '136145',
};

const WC_EVENT_IDS: Record<string, string> = {
  'wc_a1': '2391728',   // Mexico vs South Africa (2-0)
  'wc_c1': '2391730',   // Brazil vs Morocco (1-1)
  'wc_e1': '2391733',   // Germany vs Curaçao (7-1)
  'wc_f1': '2391735',   // Netherlands vs Japan (2-2)
  'wc_h1': '2391736',   // Belgium vs Egypt (1-1)
  'wc_g1': '2391739',   // Spain vs Cape Verde (0-0)
  'wc_i1': '2391742',   // France vs Senegal (3-1 real, 2-0 in static)
  'wc_l1': '2391743',   // England vs Croatia (upcoming)
  'wc_k2': '2391745',   // Uzbekistan vs Colombia (upcoming)
  'wc_k1': '2461108',   // Portugal vs DR Congo (upcoming)
  'wc_j1': '2464804',   // Argentina vs Algeria/Iceland (3-0)
};

export interface SDBPlayer {
  name: string;
  number: number;
  position: string;
  team?: string;
  cutout?: string;  // image URL
}

export interface SDBMatchLineup {
  homePlayers: SDBPlayer[];
  awayPlayers: SDBPlayer[];
  homeFormation?: string;
  awayFormation?: string;
}

export interface SDBMatchEvent {
  minute: number;
  type: 'goal' | 'yellow' | 'red' | 'sub' | 'penalty' | 'owngoal' | 'foul' | 'offside';
  player: string;
  team: 'home' | 'away';
  detail?: string;
}

export interface SDBTeamForm {
  recentResults: string[];  // ["W 2-1 vs Brazil", "D 1-1 vs Morocco", ...]
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
}

export interface SDBSquadPlayer {
  name: string;
  position: string;
  number?: number;
}

export const sportsDbService = {
  getTeamId(teamName: string): string | null {
    return TEAM_IDS[teamName] ?? null;
  },

  getSDBEventId(staticMatchId: string): string | null {
    return WC_EVENT_IDS[staticMatchId] ?? null;
  },

  async getTeamSquad(teamName: string): Promise<SDBSquadPlayer[]> {
    const teamId = this.getTeamId(teamName);
    if (!teamId) return [];
    const data = await fetchSDB<any>(`/lookup_all_players.php?id=${teamId}`);
    const players: any[] = data?.player ?? [];
    return players.slice(0, 23).map(p => ({
      name: p.strPlayer ?? '',
      position: p.strPosition ?? '',
      number: p.intSoccerNumber ? parseInt(p.intSoccerNumber) : undefined,
    }));
  },

  async getTeamRecentForm(teamName: string): Promise<SDBTeamForm> {
    const teamId = this.getTeamId(teamName);
    const empty: SDBTeamForm = { recentResults: [], wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 };
    if (!teamId) return empty;
    const data = await fetchSDB<any>(`/eventslast.php?id=${teamId}`);
    const events: any[] = data?.results ?? [];
    let wins = 0, draws = 0, losses = 0, gf = 0, ga = 0;
    const results: string[] = [];
    for (const e of events.slice(0, 5)) {
      const hs = parseInt(e.intHomeScore ?? '0');
      const as_ = parseInt(e.intAwayScore ?? '0');
      const isHome = e.idHomeTeam === teamId;
      const scored = isHome ? hs : as_;
      const conceded = isHome ? as_ : hs;
      gf += scored; ga += conceded;
      let outcome = '';
      if (scored > conceded) { wins++; outcome = 'V'; }
      else if (scored === conceded) { draws++; outcome = 'E'; }
      else { losses++; outcome = 'D'; }
      const opponent = isHome ? e.strAwayTeam : e.strHomeTeam;
      results.push(`${outcome} ${scored}-${conceded} vs ${opponent} (${e.dateEvent})`);
    }
    return { recentResults: results, wins, draws, losses, goalsFor: gf, goalsAgainst: ga };
  },

  async getMatchLineup(staticMatchId: string, homeTeam: string, awayTeam: string): Promise<SDBMatchLineup | null> {
    const eventId = this.getSDBEventId(staticMatchId);
    if (!eventId) return null;
    const data = await fetchSDB<any>(`/lookuplineup.php?id=${eventId}`);
    const lineup: any[] = data?.lineup ?? [];
    if (lineup.length === 0) return null;

    // Spanish → English team name aliases for matching TheSportsDB data
    const ALIASES: Record<string, string> = {
      'españa': 'spain', 'alemania': 'germany', 'holanda': 'netherlands',
      'países bajos': 'netherlands', 'argelia': 'algeria', 'marruecos': 'morocco',
      'francia': 'france', 'suiza': 'switzerland', 'bélgica': 'belgium',
      'croacia': 'croatia', 'suecia': 'sweden', 'noruega': 'norway',
      'canadá': 'canada', 'japón': 'japan', 'irán': 'iran', 'turquía': 'turkey',
      'cabo verde': 'cape verde', 'r.d. congo': 'dr congo', 'rep. dem. congo': 'dr congo',
      'estados unidos': 'usa', 'méxico': 'mexico', 'panamá': 'panama',
      'curazao': 'curacao', 'haití': 'haiti', 'túnez': 'tunisia',
      'sudáfrica': 'south africa', 'irak': 'iraq', 'uzbekistán': 'uzbekistan',
      'jordania': 'jordan', 'escocia': 'scotland', 'brasil': 'brazil',
      'portugal': 'portugal', 'argentina': 'argentina', 'colombia': 'colombia',
      'inglaterra': 'england', 'austria': 'austria', 'senegal': 'senegal',
      'ghana': 'ghana', 'ecuador': 'ecuador', 'uruguay': 'uruguay',
      'paraguay': 'paraguay', 'dinamarca': 'denmark', 'bélgica': 'belgium',
    };

    function normalizeTeamName(name: string): string {
      const lower = name.toLowerCase().replace(/[^\w\s]/g, '').trim();
      return ALIASES[lower] ?? lower;
    }

    const homeNorm = normalizeTeamName(homeTeam);
    const awayNorm = normalizeTeamName(awayTeam);

    const homePlayers: SDBPlayer[] = [];
    const awayPlayers: SDBPlayer[] = [];
    for (const p of lineup) {
      const player: SDBPlayer = {
        name: p.strPlayer ?? '',
        number: p.intSquadNumber ? parseInt(p.intSquadNumber) : 0,
        position: p.strPosition ?? '',
        team: p.strTeam,
        cutout: p.strCutout,
      };
      const teamNorm = normalizeTeamName(p.strTeam ?? '');
      // Improved matching: check normalized names and key words
      const matchesHome = teamNorm.includes(homeNorm.split(' ')[0]) || homeNorm.includes(teamNorm.split(' ')[0]);
      const matchesAway = teamNorm.includes(awayNorm.split(' ')[0]) || awayNorm.includes(teamNorm.split(' ')[0]);
      if (matchesHome && !matchesAway) {
        homePlayers.push(player);
      } else if (matchesAway && !matchesHome) {
        awayPlayers.push(player);
      } else if (matchesHome) {
        // Tie-break: check which is a closer match
        homePlayers.push(player);
      } else {
        // Default: assign to away (ensures all players are accounted for)
        awayPlayers.push(player);
      }
    }

    // Only return if we have a meaningful lineup (at least 3 players for one team)
    if (homePlayers.length < 3 && awayPlayers.length < 3) return null;
    return { homePlayers: homePlayers.slice(0, 11), awayPlayers: awayPlayers.slice(0, 11) };
  },

  async getMatchEvents(staticMatchId: string, homeTeam: string, awayTeam: string): Promise<SDBMatchEvent[]> {
    const eventId = this.getSDBEventId(staticMatchId);
    if (!eventId) return [];
    const data = await fetchSDB<any>(`/lookuptimeline.php?id=${eventId}`);
    const timeline: any[] = data?.timeline ?? [];
    const events: SDBMatchEvent[] = [];
    for (const t of timeline) {
      const typeStr = (t.strTimeline ?? '').toLowerCase();
      const detail = (t.strTimelineDetail ?? '').toLowerCase();
      let type: SDBMatchEvent['type'];
      // TheSportsDB can return many variants: "Goal", "Penalty Goal", "penalty", "Own Goal", etc.
      const isGoalEvent = typeStr.includes('goal') || typeStr === 'penalty';
      const isPenaltyGoal = typeStr.includes('penalty') || detail.includes('penalty');
      const isOwnGoal = typeStr.includes('own') || detail.includes('own');
      if (isGoalEvent) {
        type = isOwnGoal ? 'owngoal' : isPenaltyGoal ? 'penalty' : 'goal';
      } else if (typeStr === 'card') {
        type = detail.includes('red') ? 'red' : 'yellow';
      } else if (typeStr === 'subst') {
        const minute = parseInt(t.intTime ?? '0');
        const isHome = (t.strHome ?? 'No') === 'Yes';
        // strPlayer = player going OFF, strAssist or strComment = player coming ON
        const playerOn = t.strAssist ?? t.strComment ?? '';
        events.push({
          minute,
          type: 'sub',
          player: t.strPlayer ?? '',
          team: isHome ? 'home' : 'away',
          detail: playerOn ? `${t.strPlayer ?? '?'}→${playerOn}` : t.strComment,
        });
        continue;
      } else if (typeStr === 'foul') {
        type = 'foul';
      } else if (typeStr === 'offside') {
        type = 'offside';
      } else continue;

      const minute = parseInt(t.intTime ?? '0');
      const isHome = (t.strHome ?? 'No') === 'Yes';
      events.push({
        minute,
        type,
        player: t.strPlayer ?? '',
        team: isHome ? 'home' : 'away',
        detail: t.strComment,
      });
    }
    return events.sort((a, b) => a.minute - b.minute);
  },

  // Fetch live/current score and status for a match
  async getLiveMatchScore(staticMatchId: string): Promise<{
    homeScore: number | null;
    awayScore: number | null;
    status: 'upcoming' | 'live' | 'finished';
    minute?: number;
    rawStatus?: 'HT' | '1H' | '2H' | 'ET';
  } | null> {
    const eventId = this.getSDBEventId(staticMatchId);
    if (!eventId) return null;
    const data = await fetchSDB<any>(`/lookupevent.php?id=${eventId}`);
    const ev = data?.events?.[0];
    if (!ev) return null;

    const hs = ev.intHomeScore != null && ev.intHomeScore !== '' ? parseInt(ev.intHomeScore) : null;
    const as_ = ev.intAwayScore != null && ev.intAwayScore !== '' ? parseInt(ev.intAwayScore) : null;

    // Use strStatus as the authoritative status field; strProgress may contain a number
    const strStatus = (ev.strStatus ?? '').toLowerCase().trim();
    const strProgressLower = (ev.strProgress ?? '').toLowerCase().trim();
    const combinedStatus = strStatus || strProgressLower;

    const LIVE_STATUSES = ['1h', '2h', 'ht', 'et', 'live', 'in progress', 'pens', '1st half', '2nd half', 'half time', 'halftime'];
    const FINISHED_STATUSES = ['ft', 'finished', 'match finished', 'aet', 'full time', 'post'];

    let status: 'upcoming' | 'live' | 'finished' = 'upcoming';
    if (FINISHED_STATUSES.some(s => combinedStatus.includes(s))) {
      status = 'finished';
    } else if (LIVE_STATUSES.some(s => combinedStatus.includes(s)) || (hs !== null && as_ !== null)) {
      status = 'live';
    }

    // Detect halftime — must use REAL API status, never computed elapsed time
    const isHTStatus = combinedStatus === 'ht' || combinedStatus.includes('half time') || combinedStatus.includes('halftime');
    const is1H = combinedStatus === '1h' || combinedStatus.includes('1st half');
    const is2H = combinedStatus === '2h' || combinedStatus.includes('2nd half');
    const isET = combinedStatus === 'et' || combinedStatus.includes('extra time');

    let rawStatus: 'HT' | '1H' | '2H' | 'ET' | undefined;
    if (isHTStatus) rawStatus = 'HT';
    else if (is2H) rawStatus = '2H';
    else if (is1H) rawStatus = '1H';
    else if (isET) rawStatus = 'ET';

    // Parse actual match minute — strProgress is "67", "45+2", "HT" etc.
    const progressStr = (ev.strProgress ?? '').trim();
    const isHTFromProgress = progressStr.toLowerCase() === 'ht';
    const isHT = isHTStatus || isHTFromProgress;
    const minuteFromProgress = parseInt(progressStr);  // NaN if "HT"
    const minuteFromInt = parseInt(ev.intMinute ?? '');
    const apiMinute = !isNaN(minuteFromProgress) ? minuteFromProgress : (!isNaN(minuteFromInt) ? minuteFromInt : undefined);
    const minute = isHT ? 45 : apiMinute;

    return { homeScore: hs, awayScore: as_, status, minute, rawStatus };
  },

  // Fetch squad + form concurrently for AI enrichment
  async getMatchContext(homeTeam: string, awayTeam: string, matchId: string): Promise<{
    homeSquad: SDBSquadPlayer[];
    awaySquad: SDBSquadPlayer[];
    homeForm: SDBTeamForm;
    awayForm: SDBTeamForm;
  }> {
    const [homeSquad, awaySquad, homeForm, awayForm] = await Promise.all([
      this.getTeamSquad(homeTeam),
      this.getTeamSquad(awayTeam),
      this.getTeamRecentForm(homeTeam),
      this.getTeamRecentForm(awayTeam),
    ]);
    return { homeSquad, awaySquad, homeForm, awayForm };
  },
};
