create table if not exists public.lr_presence(player_id uuid primary key, first_seen timestamptz default now(), last_seen timestamptz default now());
create table if not exists public.lr_days(player_id uuid, day date, primary key(player_id, day));
alter table public.lr_presence enable row level security;
alter table public.lr_days enable row level security;
revoke all on public.lr_presence, public.lr_days from anon, authenticated;
create or replace function public.lr_ping(pid uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  insert into lr_presence(player_id) values (pid) on conflict (player_id) do update set last_seen = now();
  insert into lr_days(player_id, day) values (pid, (now() at time zone 'Africa/Lagos')::date) on conflict do nothing;
end $$;
create or replace function public.lr_stats() returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'online_now', (select count(*) from lr_presence where last_seen > now() - interval '2 minutes'),
    'today', (select count(distinct player_id) from lr_days where day = (now() at time zone 'Africa/Lagos')::date),
    'week', (select count(distinct player_id) from lr_days where day > (now() at time zone 'Africa/Lagos')::date - 7),
    'all_time', (select count(*) from lr_presence));
$$;
revoke all on function public.lr_ping(uuid), public.lr_stats() from public;
grant execute on function public.lr_ping(uuid), public.lr_stats() to anon, authenticated;
