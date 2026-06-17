import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'implicit',
  },
});

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  is_premium: boolean;
  premium_until: string | null;
  stripe_customer_id: string | null;
};

export type DailyUsage = {
  ai_analyses: number;
  chat_messages: number;
};

export const FREE_LIMITS = {
  ai_analyses: 3,
  chat_messages: 5,
};

// ─── Helpers de perfil ────────────────────────────────────────────────────────
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) return null;
  return data as Profile;
}

// ─── Helpers de uso diario ────────────────────────────────────────────────────
export async function getDailyUsage(userId: string): Promise<DailyUsage> {
  const today = new Date().toISOString().split('T')[0];
  const { data } = await supabase
    .from('daily_usage')
    .select('ai_analyses, chat_messages')
    .eq('user_id', userId)
    .eq('date', today)
    .single();
  return { ai_analyses: data?.ai_analyses ?? 0, chat_messages: data?.chat_messages ?? 0 };
}

export async function incrementUsage(
  userId: string,
  field: 'ai_analyses' | 'chat_messages'
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  // Upsert: si no existe la fila de hoy, la crea
  const { data: existing } = await supabase
    .from('daily_usage')
    .select('id, ai_analyses, chat_messages')
    .eq('user_id', userId)
    .eq('date', today)
    .single();

  if (existing) {
    await supabase
      .from('daily_usage')
      .update({ [field]: (existing[field] ?? 0) + 1 })
      .eq('id', existing.id);
  } else {
    await supabase
      .from('daily_usage')
      .insert({ user_id: userId, date: today, [field]: 1 });
  }
}
