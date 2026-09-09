-- time_part schema. Run with: npm run db:migrate
-- 1 piece ("조각") = 30 minutes.

create table if not exists settings (
  id           integer primary key default 1,
  total_pieces integer not null default 0,
  updated_at   timestamptz not null default now(),
  constraint settings_singleton check (id = 1)
);

insert into settings (id, total_pieces) values (1, 0)
on conflict (id) do nothing;

create table if not exists categories (
  id         serial primary key,
  name       text not null,
  pieces     integer not null default 0,   -- planned pieces per week for this category
  color      text not null default '#6b7280',
  sort_order integer not null default 0,
  archived   boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists slots (
  id          serial primary key,
  week_start  date not null,               -- Monday of the week
  weekday     integer not null check (weekday between 0 and 6), -- 0=Mon .. 6=Sun
  category_id integer not null references categories(id) on delete cascade,
  checked     boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists slots_week_idx on slots (week_start);
create index if not exists slots_week_cat_idx on slots (week_start, weekday, category_id);
