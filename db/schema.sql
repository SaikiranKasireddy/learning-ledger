-- Reference copy. The app runs this automatically on first request,
-- so you do not need to apply it by hand (but you can, in the Neon SQL editor).
create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  platform text not null default '',
  kind text not null default 'Course',
  domain text not null default '',
  total integer not null default 0,
  done integer not null default 0,
  due date,
  every_days integer not null default 7,
  next_step text not null default '',
  url text not null default '',
  status text not null default 'queued' check (status in ('queued', 'active', 'paused', 'done')),
  last_touched date,
  created date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
