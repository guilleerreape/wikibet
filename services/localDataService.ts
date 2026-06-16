// Servicio que carga datos LOCALES (JSON) en lugar de APIs
// Esto hace WikiBet FUNCIONAL sin depender de APIs limitadas

import teamsData from '@/data/teams.json';
import playersData from '@/data/players.json';
import matchesData from '@/data/matches.json';

export interface LocalMatch {
  id: number;
  homeTeam: string;
  awayTeam: string;
  date: string;
  league: string;
  homeGoals: number | null;
  awayGoals: number | null;
  status: 'upcoming' | 'live' | 'finished';
}

export interface LocalTeam {
  id: number;
  name: string;
  country: string;
  league: string;
  founded: number;
  stadium: string;
  coach: string;
  logo: string;
  formation?: string;
  avgGoals: number;
  avgConceded: number;
  possession: number;
  winRate: number;
}

export interface LocalPlayer {
  id: number;
  name: string;
  team: string;       // club actual
  club: string;       // igual que team (alias explícito)
  league: string;     // liga del club
  position: string;
  age: number;
  nationality: string;
  nationalTeam: string; // selección nacional
  number: number;
  // Estadísticas de carrera en clubes
  goals: number;
  assists: number;
  matches: number;
  // Estadísticas internacionales
  intlGoals: number;
  intlAssists: number;
  intlMatches: number;
}

export const localDataService = {
  // Obtener todos los partidos
  getAllMatches(): LocalMatch[] {
    return matchesData as LocalMatch[];
  },

  // Obtener partidos próximos
  getUpcomingMatches(days: number = 7): LocalMatch[] {
    const now = new Date();
    const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    return (matchesData as LocalMatch[])
      .filter((match) => {
        const matchDate = new Date(match.date);
        return matchDate >= now && matchDate <= future && match.status === 'upcoming';
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  },

  // Obtener todos los equipos
  getAllTeams(): LocalTeam[] {
    return teamsData as LocalTeam[];
  },

  // Obtener equipo por nombre
  getTeamByName(name: string): LocalTeam | undefined {
    return (teamsData as LocalTeam[]).find((team) =>
      team.name.toLowerCase().includes(name.toLowerCase())
    );
  },

  // Obtener todos los jugadores
  getAllPlayers(): LocalPlayer[] {
    return playersData as LocalPlayer[];
  },

  // Obtener jugadores por equipo (club O selección nacional)
  getPlayersByTeam(teamName: string): LocalPlayer[] {
    const lower = teamName.toLowerCase();
    return (playersData as LocalPlayer[]).filter((p) =>
      p.team.toLowerCase().includes(lower) ||
      (p.nationalTeam || '').toLowerCase().includes(lower) ||
      (p.club || '').toLowerCase().includes(lower)
    );
  },

  // Buscar jugador por nombre
  searchPlayers(searchTerm: string): LocalPlayer[] {
    const term = searchTerm.toLowerCase();
    return (playersData as LocalPlayer[]).filter(
      (player) =>
        player.name.toLowerCase().includes(term) ||
        player.team.toLowerCase().includes(term) ||
        player.nationality.toLowerCase().includes(term)
    );
  },

  // Obtener Top scorers
  getTopScorers(limit: number = 10): LocalPlayer[] {
    return (playersData as LocalPlayer[])
      .sort((a, b) => b.goals - a.goals)
      .slice(0, limit);
  },

  // Obtener partidos entre dos equipos
  getMatchBetweenTeams(team1: string, team2: string): LocalMatch | undefined {
    return (matchesData as LocalMatch[]).find(
      (match) =>
        (match.homeTeam.toLowerCase() === team1.toLowerCase() &&
          match.awayTeam.toLowerCase() === team2.toLowerCase()) ||
        (match.homeTeam.toLowerCase() === team2.toLowerCase() &&
          match.awayTeam.toLowerCase() === team1.toLowerCase())
    );
  },

  // Obtener próximo partido de un equipo
  getTeamNextMatch(teamName: string): LocalMatch | undefined {
    const upcoming = this.getUpcomingMatches();
    return upcoming.find(
      (match) =>
        match.homeTeam.toLowerCase().includes(teamName.toLowerCase()) ||
        match.awayTeam.toLowerCase().includes(teamName.toLowerCase())
    );
  },

  // Obtener todos los partidos de un equipo
  getTeamMatches(teamName: string): LocalMatch[] {
    return (matchesData as LocalMatch[]).filter(
      (match) =>
        match.homeTeam.toLowerCase().includes(teamName.toLowerCase()) ||
        match.awayTeam.toLowerCase().includes(teamName.toLowerCase())
    );
  },

  // Obtener ligas únicas
  getUniqueLegues(): string[] {
    const leagues = new Set((matchesData as LocalMatch[]).map((m) => m.league));
    return Array.from(leagues);
  },

  // Obtener partidos por liga
  getMatchesByLeague(league: string): LocalMatch[] {
    return (matchesData as LocalMatch[])
      .filter((match) => match.league.toLowerCase() === league.toLowerCase())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  },

  // Simular resultado de un partido (para Value Scanner)
  predictMatch(homeTeam: string, awayTeam: string) {
    const home = this.getTeamByName(homeTeam);
    const away = this.getTeamByName(awayTeam);

    if (!home || !away) return null;

    // Simulación realista basada en "fuerza" del equipo (número de jugadores famosos)
    const homeStrength = this.getPlayersByTeam(homeTeam).length;
    const awayStrength = this.getPlayersByTeam(awayTeam).length;

    const totalStrength = homeStrength + awayStrength;
    const homeProbability = (homeStrength / totalStrength) * 100;
    const awayProbability = (awayStrength / totalStrength) * 100;
    const drawProbability = 100 - homeProbability - awayProbability + 15;

    return {
      homeTeam: homeTeam,
      awayTeam: awayTeam,
      homeWinProbability: Math.round(homeProbability),
      drawProbability: Math.round(Math.max(20, drawProbability)),
      awayWinProbability: Math.round(awayProbability),
      homeOdds: (100 / (homeProbability || 1) * 0.95).toFixed(2),
      drawOdds: (3.2).toFixed(2),
      awayOdds: (100 / (awayProbability || 1) * 0.95).toFixed(2),
      predictedGoals: {
        home: Math.floor(Math.random() * 3) + 1,
        away: Math.floor(Math.random() * 3),
      },
    };
  },
};
