-- 1) Datei-Ablauf vereinfacht: neu → bearbeitung (In Arbeit) → erledigt (Fertig)
alter table public.files drop constraint if exists files_status_check;
update public.files set status = 'bearbeitung' where status in ('freigabe', 'druckfertig', 'im_druck');
alter table public.files add constraint files_status_check check (status in ('neu', 'bearbeitung', 'erledigt'));

create or replace function public.staff_file_status_de(s text) returns text language sql immutable set search_path = '' as $$
  select case s when 'neu' then 'Neu' when 'bearbeitung' then 'In Arbeit' when 'erledigt' then 'Fertig' else s end $$;
create or replace function public.staff_file_status_ar(s text) returns text language sql immutable set search_path = '' as $$
  select case s when 'neu' then 'جديد' when 'bearbeitung' then 'قيد العمل' when 'erledigt' then 'منتهي' else s end $$;

-- 2) Papierkorb: gelöschte Einträge 30 Tage wiederherstellbar (Momentaufnahme als JSON)
create table if not exists public.trash_items (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('dateien', 'ordner', 'kunde', 'auftrag', 'anfrage', 'dokument')),
  label text not null,
  detail text,
  snapshot jsonb not null,
  -- Speicherobjekte (R2), die erst beim endgültigen Löschen entfernt werden
  object_keys text[] not null default '{}',
  deleted_by text,
  deleted_at timestamptz not null default now()
);
create index if not exists trash_items_deleted_at on public.trash_items (deleted_at desc);
alter table public.trash_items enable row level security;
-- nur Server (service role) – keine Policies für anon/authenticated
