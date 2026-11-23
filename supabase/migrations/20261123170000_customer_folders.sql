-- Kundenakte: eigener Ordner je Kunde + Kategorien mit Farbe
alter table public.customers add column if not exists folder_path text;

create table if not exists public.customer_categories (
  name text primary key check (char_length(name) between 1 and 40),
  color text not null default '#64748b',
  sort int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.customer_categories enable row level security;

insert into public.customer_categories (name, color, sort) values
  ('Firma', '#2563eb', 10),
  ('Privat', '#64748b', 20),
  ('Gastronomie', '#ea580c', 30),
  ('Einzelhandel', '#7c3aed', 40),
  ('Stammkunde', '#059669', 50),
  ('VIP', '#d97706', 60)
on conflict (name) do nothing;

-- vorhandene Schlagwörter als Kategorien übernehmen
insert into public.customer_categories (name, sort)
select distinct t, 100 from public.customers, unnest(coalesce(tags, '{}')) t
where char_length(t) between 1 and 40
on conflict (name) do nothing;

-- Live-Signal auch für Kategorien
drop trigger if exists admin_live_ping on public.customer_categories;
create trigger admin_live_ping after insert or update or delete on public.customer_categories for each statement execute function public.admin_live_ping();
