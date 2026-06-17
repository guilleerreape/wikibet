import { supabase } from './supabase';

export type BetResult = 'pending' | 'won' | 'lost' | 'void';

export interface Bet {
  id: number;
  user_id: string;
  match: string;
  league: string;
  market: string;
  odds: number;
  stake: number;
  result: BetResult;
  profit: number | null;
  notes: string | null;
  match_date: string | null;
  created_at: string;
}

export interface BetStats {
  totalBets: number;
  won: number;
  lost: number;
  pending: number;
  winRate: number;
  totalStaked: number;
  totalProfit: number;
  roi: number;           // profit / staked * 100
  bestBet: Bet | null;
  worstBet: Bet | null;
  currentStreak: number; // positivo = racha ganadora, negativo = perdedora
  avgOdds: number;
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────
export async function getBets(userId: string): Promise<Bet[]> {
  const { data, error } = await supabase
    .from('bets')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Bet[];
}

export async function addBet(userId: string, bet: {
  match: string;
  league: string;
  market: string;
  odds: number;
  stake: number;
  notes?: string;
  match_date?: string;
}): Promise<Bet> {
  const { data, error } = await supabase
    .from('bets')
    .insert({ ...bet, user_id: userId, result: 'pending', profit: null })
    .select()
    .single();
  if (error) throw error;
  return data as Bet;
}

export async function updateBetResult(
  betId: number,
  result: BetResult,
  odds: number,
  stake: number
): Promise<void> {
  let profit: number | null = null;
  if (result === 'won')  profit = parseFloat((stake * (odds - 1)).toFixed(2));
  if (result === 'lost') profit = -stake;
  if (result === 'void') profit = 0;

  const { error } = await supabase
    .from('bets')
    .update({ result, profit })
    .eq('id', betId);
  if (error) throw error;
}

export async function deleteBet(betId: number): Promise<void> {
  const { error } = await supabase.from('bets').delete().eq('id', betId);
  if (error) throw error;
}

// ─── Estadísticas ─────────────────────────────────────────────────────────────
export function calcStats(bets: Bet[]): BetStats {
  const settled = bets.filter(b => b.result !== 'pending' && b.result !== 'void');
  const won     = settled.filter(b => b.result === 'won');
  const lost    = settled.filter(b => b.result === 'lost');
  const pending = bets.filter(b => b.result === 'pending');

  const totalStaked = settled.reduce((s, b) => s + b.stake, 0);
  const totalProfit = settled.reduce((s, b) => s + (b.profit ?? 0), 0);
  const roi = totalStaked > 0 ? (totalProfit / totalStaked) * 100 : 0;
  const winRate = settled.length > 0 ? (won.length / settled.length) * 100 : 0;
  const avgOdds = settled.length > 0
    ? settled.reduce((s, b) => s + b.odds, 0) / settled.length
    : 0;

  // Mejor y peor apuesta
  const bestBet  = settled.reduce<Bet | null>((best, b) =>
    !best || (b.profit ?? -Infinity) > (best.profit ?? -Infinity) ? b : best, null);
  const worstBet = settled.reduce<Bet | null>((worst, b) =>
    !worst || (b.profit ?? Infinity) < (worst.profit ?? Infinity) ? b : worst, null);

  // Racha actual (desde la última apuesta hacia atrás)
  let streak = 0;
  for (const b of settled) {
    if (b.result === 'won') {
      if (streak >= 0) streak++; else break;
    } else if (b.result === 'lost') {
      if (streak <= 0) streak--; else break;
    }
  }

  return {
    totalBets: bets.length,
    won: won.length,
    lost: lost.length,
    pending: pending.length,
    winRate,
    totalStaked,
    totalProfit,
    roi,
    bestBet,
    worstBet,
    currentStreak: streak,
    avgOdds,
  };
}
