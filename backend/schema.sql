-- Trading Alert Platform — Supabase Schema
-- Run this in the Supabase SQL Editor

create table if not exists alerts (
  id uuid primary key default gen_random_uuid(),
  user_id text default 'default',
  symbol text not null,
  condition text not null,
  target_price float not null,
  triggered boolean default false,
  trigger_price float,
  triggered_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  subscription jsonb not null
);

-- Enable Row Level Security (optional — disable if using anon key freely)
-- alter table alerts enable row level security;
-- alter table push_subscriptions enable row level security;

-- Allow all operations for anon key (dev mode)
-- create policy "Allow all" on alerts for all using (true) with check (true);
-- create policy "Allow all" on push_subscriptions for all using (true) with check (true);
