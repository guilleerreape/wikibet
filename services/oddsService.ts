const ODDS_API_KEY = process.env.EXPO_PUBLIC_ODDS_API_KEY;
const ODDS_API_BASE = 'https://api.the-odds-api.com/v4';

export interface OddsMarket {
  key: string;
  lastUpdate: string;
  outcomes: Array<{
    name: string;
    price: number;
  }>;
}

export interface BookmakerOdds {
  key: string;
  title: string;
  lastUpdate: string;
  markets: OddsMarket[];
}

export interface MatchOdds {
  id: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: string;
  bookmakers: BookmakerOdds[];
  h2hOdds: {
    home: number;
    draw?: number;
    away: number;
  };
  totalsOdds?: {
    over2_5: number;
    under2_5: number;
  };
}

export const oddsService = {
  // Obtener cuotas en vivo
  async getLiveOdds(sport: string = 'soccer_international_cup'): Promise<MatchOdds[]> {
    if (!ODDS_API_KEY) {
      console.error('❌ Odds API Key no configurada');
      return [];
    }

    try {
      console.log('📊 Obteniendo cuotas en vivo...');

      const url = new URL(`${ODDS_API_BASE}/sports/${sport}/odds`);
      url.searchParams.append('apiKey', ODDS_API_KEY);
      url.searchParams.append('regions', 'eu');
      url.searchParams.append('markets', 'h2h,totals');
      url.searchParams.append('oddsFormat', 'decimal');

      const response = await fetch(url.toString());

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error de Odds API:', errorText);
        return [];
      }

      const data: any = await response.json();
      console.log(`✅ Cuotas obtenidas: ${data.data?.length || 0} partidos`);

      return data.data?.map((match: any) => ({
        id: match.id,
        homeTeam: match.home_team,
        awayTeam: match.away_team,
        commenceTime: match.commence_time,
        bookmakers: match.bookmakers?.map((bm: any) => ({
          key: bm.key,
          title: bm.title,
          lastUpdate: bm.last_update,
          markets: bm.markets,
        })) || [],
        h2hOdds: this.extractH2HOdds(match.bookmakers),
        totalsOdds: this.extractTotalsOdds(match.bookmakers),
      })) || [];
    } catch (error) {
      console.error('❌ Error obteniendo cuotas:', error);
      return [];
    }
  },

  // Obtener cuotas históricos
  async getHistoricalOdds(
    sport: string = 'soccer_international_cup',
    fromDate?: string,
    toDate?: string
  ): Promise<MatchOdds[]> {
    if (!ODDS_API_KEY) {
      console.error('❌ Odds API Key no configurada');
      return [];
    }

    try {
      console.log('📊 Obteniendo cuotas históricas...');

      const url = new URL(`${ODDS_API_BASE}/sports/${sport}/odds-history`);
      url.searchParams.append('apiKey', ODDS_API_KEY);
      url.searchParams.append('regions', 'eu');
      url.searchParams.append('markets', 'h2h');
      url.searchParams.append('oddsFormat', 'decimal');

      if (fromDate) url.searchParams.append('from', fromDate);
      if (toDate) url.searchParams.append('to', toDate);

      const response = await fetch(url.toString());

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error de Odds API histórico:', errorText);
        return [];
      }

      const data: any = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('❌ Error obteniendo cuotas históricas:', error);
      return [];
    }
  },

  // Extraer cuotas H2H (1X2)
  extractH2HOdds(bookmakers: any[]): { home: number; draw?: number; away: number } {
    if (!bookmakers || bookmakers.length === 0) {
      return { home: 2.0, draw: 3.0, away: 2.0 };
    }

    // Obtener promedio de las mejores casas
    const bestBookmaker = bookmakers.find((bm) =>
      ['draftkings', 'betmgm', 'pinnacle'].includes(bm.key)
    ) || bookmakers[0];

    const h2hMarket = bestBookmaker?.markets?.find((m: any) => m.key === 'h2h');
    if (!h2hMarket) {
      return { home: 2.0, draw: 3.0, away: 2.0 };
    }

    const outcomes = h2hMarket.outcomes;
    return {
      home: outcomes.find((o: any) => o.name === 'Home')?.price || 2.0,
      draw: outcomes.find((o: any) => o.name === 'Draw')?.price,
      away: outcomes.find((o: any) => o.name === 'Away')?.price || 2.0,
    };
  },

  // Extraer cuotas de Totales
  extractTotalsOdds(bookmakers: any[]): { over2_5: number; under2_5: number } | undefined {
    if (!bookmakers || bookmakers.length === 0) return undefined;

    const bestBookmaker = bookmakers[0];
    const totalsMarket = bestBookmaker?.markets?.find((m: any) => m.key === 'totals');

    if (!totalsMarket) return undefined;

    const outcomes = totalsMarket.outcomes;
    return {
      over2_5: outcomes.find((o: any) => o.name.includes('Over'))?.price || 1.9,
      under2_5: outcomes.find((o: any) => o.name.includes('Under'))?.price || 1.9,
    };
  },

  // Obtener mejores cuotas para un partido
  async getBestOdds(homeTeam: string, awayTeam: string): Promise<MatchOdds | null> {
    const allOdds = await this.getLiveOdds();
    return (
      allOdds.find(
        (o) =>
          o.homeTeam.toLowerCase() === homeTeam.toLowerCase() &&
          o.awayTeam.toLowerCase() === awayTeam.toLowerCase()
      ) || null
    );
  },

  // Calcular probabilidad implícita desde cuota
  calculateImpliedProbability(odds: number): number {
    return Math.round((1 / odds) * 100);
  },

  // Encontrar arbitraje entre bookmakers
  findArbitrage(matchOdds: MatchOdds): boolean {
    if (!matchOdds.bookmakers || matchOdds.bookmakers.length < 2) return false;

    let maxImpliedProb = 0;
    matchOdds.bookmakers.forEach((bm) => {
      const h2hMarket = bm.markets.find((m) => m.key === 'h2h');
      if (h2hMarket) {
        const sumInverseOdds = h2hMarket.outcomes.reduce((sum: number, outcome: any) => {
          return sum + 1 / outcome.price;
        }, 0);
        maxImpliedProb = Math.max(maxImpliedProb, sumInverseOdds);
      }
    });

    return maxImpliedProb < 1.0;
  },

  // Deporte y mercados disponibles
  async getAvailableSports(): Promise<
    Array<{ key: string; title: string; active: boolean; group: string }>
  > {
    if (!ODDS_API_KEY) return [];

    try {
      const url = new URL(`${ODDS_API_BASE}/sports`);
      url.searchParams.append('apiKey', ODDS_API_KEY);

      const response = await fetch(url.toString());
      if (!response.ok) return [];

      const data: any = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error obteniendo deportes disponibles:', error);
      return [];
    }
  },
};
