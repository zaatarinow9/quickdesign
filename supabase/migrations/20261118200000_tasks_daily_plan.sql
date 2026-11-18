-- ---------------------------------------------------------------------
-- Freie Termine (ohne Angebot) und Tagesplan-Protokoll
--   kind:  auftrag (aus Angebot) | aufgabe (freier Termin, z. B. Material holen)
--   neue Terminarten: besorgung (Material/Einkauf holen), sonstiges
--   daily_plan_runs: verhindert doppelten Versand des Tagesplans
-- ---------------------------------------------------------------------
alter table public.projects add column if not exists kind text not null default 'auftrag';
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'projects_kind_check') then
    alter table public.projects add constraint projects_kind_check check (kind in ('auftrag', 'aufgabe'));
  end if;
end $$;

alter table public.projects drop constraint if exists projects_appointment_type_check;
alter table public.projects add constraint projects_appointment_type_check
  check (appointment_type in ('montage', 'lieferung', 'abholung', 'besorgung', 'sonstiges'));

create or replace function public.projects_set_number()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.number is null or new.number = '' then
    new.number := public.next_document_number(case when new.kind = 'aufgabe' then 'termin' else 'auftrag' end,
                                              (coalesce(new.accepted_at, now()) at time zone 'Europe/Berlin')::date);
  end if;
  return new;
end;
$$;
revoke execute on function public.projects_set_number() from public, anon, authenticated;

create or replace function public.next_document_number(p_kind text, p_date date)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  y integer := extract(year from coalesce(p_date, (now() at time zone 'Europe/Berlin')::date));
  v integer;
  prefix text := case p_kind when 'rechnung' then 'RE' when 'gutschrift' then 'GS' when 'auftrag' then 'AU' when 'termin' then 'TE' else 'AN' end;
begin
  insert into public.document_counters as c (kind, year, last_value)
  values (p_kind, y, 1)
  on conflict (kind, year) do update set last_value = c.last_value + 1
  returning last_value into v;
  return prefix || '-' || y::text || '-' || lpad(v::text, 4, '0');
end;
$$;
revoke execute on function public.next_document_number(text, date) from public, anon, authenticated;

create table if not exists public.daily_plan_runs (
  plan_date date primary key,
  sent_at timestamptz not null default now(),
  recipients text,
  task_count integer not null default 0
);
alter table public.daily_plan_runs enable row level security;
revoke all on public.daily_plan_runs from anon, authenticated;
