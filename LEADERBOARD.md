# Youth-group leaderboard (optional online mode)

Out of the box the leaderboard runs in **demo mode**: rooms and scores are saved on each phone only.
To share one board across the whole youth group, connect a free Supabase project (no card needed).

## One-time setup (about 5 minutes)
1. Sign in at https://supabase.com (GitHub sign-in works) and create a new free project.
2. Open **SQL Editor** and run the SQL below.
3. Open **Project Settings → API** and copy the **Project URL** and the **anon public** key.
4. Edit `js/lb-config.js`:
   ```js
   window.LR_LEADERBOARD = { url: 'https://YOUR-PROJECT.supabase.co', anonKey: 'YOUR-ANON-PUBLIC-KEY' };
   ```
   The anon key is designed to be public; the policies below only let players add rows and read boards.

## SQL
```sql
create table if not exists lr_rooms (
  code text primary key check (char_length(code) between 4 and 8),
  name text not null check (char_length(name) <= 40),
  created_at timestamptz default now()
);
create table if not exists lr_scores (
  id bigint generated always as identity primary key,
  room text not null references lr_rooms(code) on delete cascade,
  name text not null check (char_length(name) <= 24),
  km numeric not null check (km >= 0 and km <= 46),
  score integer not null check (score >= 0 and score < 10000000),
  week text not null check (char_length(week) <= 10),
  created_at timestamptz default now()
);
create index if not exists lr_scores_board on lr_scores (room, week, km desc, score desc);

alter table lr_rooms enable row level security;
alter table lr_scores enable row level security;
create policy "read rooms"  on lr_rooms  for select to anon using (true);
create policy "add rooms"   on lr_rooms  for insert to anon with check (true);
create policy "read scores" on lr_scores for select to anon using (true);
create policy "add scores"  on lr_scores for insert to anon with check (true);
```

Nobody can edit or delete rows with the anon key. To reset a week, delete rows from the Supabase dashboard.
Note: like any open game leaderboard, a determined player could post a fake score; the checks above keep values in range.
