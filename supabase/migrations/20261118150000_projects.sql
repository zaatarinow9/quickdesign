-- ---------------------------------------------------------------------
-- Aufträge / Projekte: entstehen aus angenommenen Angeboten
--   Phasen: angenommen → in_arbeit → fertig → abgeschlossen
--   Termin: Montage, Lieferung oder Abholung mit Ort, Ansprechpartner,
--           Hinweisen für das Team und Betrag, der vor Ort zu kassieren ist
-- ---------------------------------------------------------------------
create or replace function public.next_document_number(p_kind text, p_date date)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  y integer := extract(year from coalesce(p_date, (now() at time zone 'Europe/Berlin')::date));
  v integer;
  prefix text := case p_kind when 'rechnung' then 'RE' when 'gutschrift' then 'GS' when 'auftrag' then 'AU' else 'AN' end;
begin
  insert into public.document_counters as c (kind, year, last_value)
  values (p_kind, y, 1)
  on conflict (kind, year) do update set last_value = c.last_value + 1
  returning last_value into v;
  return prefix || '-' || y::text || '-' || lpad(v::text, 4, '0');
end;
$$;
revoke execute on function public.next_document_number(text, date) from public, anon, authenticated;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  number text unique,
  offer_id uuid unique references public.documents (id) on delete set null,
  customer_id uuid references public.customers (id) on delete set null,
  title text not null check (char_length(title) between 1 and 200),
  customer_name text not null check (char_length(customer_name) <= 160),
  company_name text check (char_length(company_name) <= 160),
  email text check (char_length(email) <= 254),
  phone text check (char_length(phone) <= 60),
  status text not null default 'angenommen' check (status in ('angenommen', 'in_arbeit', 'fertig', 'abgeschlossen')),
  value_gross numeric(12, 2) not null default 0,
  -- Termin (Ortszeit Europe/Berlin)
  appointment_type text check (appointment_type in ('montage', 'lieferung', 'abholung')),
  appointment_date date,
  appointment_time time,
  duration_hours numeric(5, 2) check (duration_hours is null or duration_hours between 0 and 240),
  -- Einsatzort
  site_street text check (char_length(site_street) <= 160),
  site_postal_code text check (char_length(site_postal_code) <= 12),
  site_city text check (char_length(site_city) <= 80),
  site_maps_url text check (char_length(site_maps_url) <= 1000),
  site_contact_name text check (char_length(site_contact_name) <= 160),
  site_contact_phone text check (char_length(site_contact_phone) <= 60),
  -- Für das Team
  crew_notes text check (char_length(crew_notes) <= 4000),
  collect_amount numeric(12, 2) check (collect_amount is null or collect_amount between 0 and 1000000),
  internal_notes text check (char_length(internal_notes) <= 10000),
  -- Zeitstempel der Phasen
  accepted_at timestamptz not null default now(),
  started_at timestamptz,
  ready_at timestamptz,
  completed_at timestamptz,
  appointment_notified_at timestamptz,
  customer_reminder_sent_for date,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists projects_status_idx on public.projects (status, updated_at desc);
create index if not exists projects_appointment_idx on public.projects (appointment_date) where appointment_date is not null;
create index if not exists projects_customer_idx on public.projects (customer_id);
create or replace function public.projects_set_number()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.number is null or new.number = '' then
    new.number := public.next_document_number('auftrag', (coalesce(new.accepted_at, now()) at time zone 'Europe/Berlin')::date);
  end if;
  return new;
end;
$$;
revoke execute on function public.projects_set_number() from public, anon, authenticated;
drop trigger if exists projects_number on public.projects;
create trigger projects_number before insert on public.projects for each row execute function public.projects_set_number();

drop trigger if exists projects_touch on public.projects;
create trigger projects_touch before update on public.projects for each row execute function public.touch_updated_at();

create table if not exists public.project_events (
  id bigint generated always as identity primary key,
  project_id uuid not null references public.projects (id) on delete cascade,
  type text not null check (char_length(type) <= 40),
  note text check (char_length(note) <= 1000),
  actor text,
  created_at timestamptz not null default now()
);
create index if not exists project_events_project_idx on public.project_events (project_id, created_at desc);

alter table public.projects enable row level security;
alter table public.project_events enable row level security;
revoke all on public.projects, public.project_events from anon, authenticated;

-- Bereits angenommene Angebote als Aufträge übernehmen
insert into public.projects (offer_id, customer_id, title, customer_name, company_name, email, phone, value_gross,
                             site_street, site_postal_code, site_city, accepted_at, created_by)
select d.id, d.customer_id, d.title, d.customer_name,
       d.company_name, d.email, d.phone, d.gross_total, d.street, d.postal_code, d.city, coalesce(d.accepted_at, d.updated_at), 'Übernahme'
from public.documents d
where d.kind = 'angebot' and d.status = 'angenommen'
  and not exists (select 1 from public.projects p where p.offer_id = d.id)
order by coalesce(d.accepted_at, d.updated_at);
