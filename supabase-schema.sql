-- ─── WikiBet Database Schema ────────────────────────────────────────────────
-- Ejecutar en Supabase Dashboard → SQL Editor → New Query

-- 1. Tabla profiles
create table if not exists public.profiles (
  id            uuid references auth.users on delete cascade primary key,
  email         text,
  full_name     text,
  avatar_url    text,
  is_premium    boolean not null default false,
  premium_until timestamptz,
  stripe_customer_id text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 2. Tabla uso diario
create table if not exists public.daily_usage (
  id            bigserial primary key,
  user_id       uuid references public.profiles(id) on delete cascade not null,
  date          date not null default current_date,
  ai_analyses   int not null default 0,
  chat_messages int not null default 0,
  created_at    timestamptz not null default now(),
  unique (user_id, date)
);

-- 3. Tabla apuestas (bankroll tracker)
create table if not exists public.bets (
  id          bigserial primary key,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  match       text not null,          -- "Argentina vs México"
  league      text,                   -- "Mundial 2026"
  market      text not null,          -- "1X2 - Local gana"
  odds        numeric(6,2) not null,  -- 1.85
  stake       numeric(10,2) not null, -- 10.00 €
  result      text not null default 'pending',  -- 'pending' | 'won' | 'lost' | 'void'
  profit      numeric(10,2),          -- calculado: won→stake*(odds-1), lost→-stake, void→0
  notes       text,
  match_date  date,
  created_at  timestamptz not null default now()
);

-- 4. Row Level Security
alter table public.profiles    enable row level security;
alter table public.daily_usage enable row level security;
alter table public.bets        enable row level security;

-- Profiles
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- Daily usage
create policy "daily_usage_select_own" on public.daily_usage
  for select using (auth.uid() = user_id);
create policy "daily_usage_insert_own" on public.daily_usage
  for insert with check (auth.uid() = user_id);
create policy "daily_usage_update_own" on public.daily_usage
  for update using (auth.uid() = user_id);

-- Bets
create policy "bets_select_own" on public.bets
  for select using (auth.uid() = user_id);
create policy "bets_insert_own" on public.bets
  for insert with check (auth.uid() = user_id);
create policy "bets_update_own" on public.bets
  for update using (auth.uid() = user_id);
create policy "bets_delete_own" on public.bets
  for delete using (auth.uid() = user_id);

-- 5. Trigger: crear perfil automáticamente al registrarse
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
