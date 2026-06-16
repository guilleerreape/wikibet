import { useState, useEffect } from 'react';
import { footballApi, FixtureResponse } from '@/services/footballApi';

interface UseFixturesOptions {
  days?: number;
  leagueId?: number;
  season?: number;
}

export const useFixtures = (options: UseFixturesOptions = {}) => {
  const [fixtures, setFixtures] = useState<FixtureResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        let data: FixtureResponse[] = [];

        if (options.leagueId && options.season) {
          data = await footballApi.getFixturesByLeague(options.leagueId, options.season);
        } else {
          data = await footballApi.getUpcomingFixtures(options.days);
        }

        setFixtures(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error fetching fixtures');
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Revalidar cada 5 minutos
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [options.days, options.leagueId, options.season]);

  return { fixtures, loading, error, refetch: () => {} };
};
