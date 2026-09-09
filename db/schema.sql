-- time_part schema. Run with: npm run db:migrate
-- 1 piece ("조각") = 30 minutes. Multi-user: every row is scoped by user_id
-- (the signed-in user's lowercased Google email).

create table if not exists user_settings (
  user_id      text primary key,
  total_pieces integer not null default 0,
  updated_at   timestamptz not null default now()
);

create table if not exists categories (
  id         serial primary key,
  user_id    text,
  name       text not null,
  pieces     integer not null default 0,   -- planned pieces per week for this category
  color      text not null default '#6b7280',
  sort_order integer not null default 0,
  archived   boolean not null default false,
  created_at timestamptz not null default now()
);
alter table categories add column if not exists user_id text;

create table if not exists slots (
  id          serial primary key,
  user_id     text,
  week_start  date not null,               -- Monday of the week
  weekday     integer not null check (weekday between 0 and 6), -- 0=Mon .. 6=Sun
  category_id integer not null references categories(id) on delete cascade,
  checked     boolean not null default false,
  created_at  timestamptz not null default now()
);
alter table slots add column if not exists user_id text;

create index if not exists categories_user_idx on categories (user_id);
create index if not exists slots_user_idx on slots (user_id);
create index if not exists slots_week_idx on slots (week_start);
create index if not exists slots_user_week_idx on slots (user_id, week_start, weekday, category_id);
