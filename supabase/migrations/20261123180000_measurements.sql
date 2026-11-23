-- Aufmaß: Messungen beim Kunden mit Fotos, Breite × Höhe (cm) und Pfeilen auf dem Foto
create table if not exists public.measurements (
  id uuid primary key default gen_random_uuid(),
  number text unique,
  customer_id uuid references public.customers (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  title text not null default '',
  site_address text,
  measured_at date not null default (now() at time zone 'Europe/Berlin')::date,
  status text not null default 'offen' check (status in ('offen', 'fertig')),
  notes text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists measurements_customer on public.measurements (customer_id);
create index if not exists measurements_created on public.measurements (created_at desc);

create table if not exists public.measurement_items (
  id uuid primary key default gen_random_uuid(),
  measurement_id uuid not null references public.measurements (id) on delete cascade,
  position int not null default 1,
  label text not null default '',
  width_cm numeric(10, 1),
  height_cm numeric(10, 1),
  quantity int not null default 1 check (quantity between 1 and 10000),
  material text,
  notes text,
  photo_key text,
  photo_width int,
  photo_height int,
  -- Pfeile in Prozent des Fotos: {"w": {"x1":..,"y1":..,"x2":..,"y2":..}, "h": {...}}
  arrows jsonb,
  -- Foto mit eingezeichneten Maßen (auch im Kundenordner abgelegt)
  marked_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists measurement_items_parent on public.measurement_items (measurement_id, position);

alter table public.measurements enable row level security;
alter table public.measurement_items enable row level security;

-- fortlaufende Nummer AM-JJJJ-0001
create or replace function public.next_measurement_number() returns text language plpgsql security definer set search_path = '' as $$
declare y text := to_char(now() at time zone 'Europe/Berlin', 'YYYY'); n int;
begin
  select coalesce(max(split_part(number, '-', 3)::int), 0) + 1 into n from public.measurements where number like 'AM-' || y || '-%';
  return 'AM-' || y || '-' || lpad(n::text, 4, '0');
end $$;
revoke all on function public.next_measurement_number() from public, anon, authenticated;

-- Papierkorb kennt Aufmaße
alter table public.trash_items drop constraint if exists trash_items_kind_check;
alter table public.trash_items add constraint trash_items_kind_check check (kind in ('dateien', 'ordner', 'kunde', 'auftrag', 'anfrage', 'dokument', 'aufmass'));

-- Live-Signal
drop trigger if exists admin_live_ping on public.measurements;
create trigger admin_live_ping after insert or update or delete on public.measurements for each statement execute function public.admin_live_ping();
drop trigger if exists admin_live_ping on public.measurement_items;
create trigger admin_live_ping after insert or update or delete on public.measurement_items for each statement execute function public.admin_live_ping();
