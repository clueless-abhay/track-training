-- Run once in Supabase: SQL Editor > New query > paste > Run
create table public.user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create table public.push_subscriptions (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text unique not null,
  keys jsonb not null
);
alter table public.user_data enable row level security;
alter table public.push_subscriptions enable row level security;
create policy "own data" on public.user_data for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own subscriptions" on public.push_subscriptions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
