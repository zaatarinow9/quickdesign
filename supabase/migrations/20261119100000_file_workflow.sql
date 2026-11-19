-- ---------------------------------------------------------------------
-- Datei-Ablauf: neu → bearbeitung → freigabe → druckfertig → im_druck → erledigt
-- plus Verlauf je Datei (wer hat wann was geändert)
-- ---------------------------------------------------------------------
alter table public.files drop constraint if exists files_status_check;
alter table public.files add constraint files_status_check
  check (status in ('neu', 'bearbeitung', 'freigabe', 'druckfertig', 'im_druck', 'erledigt'));
alter table public.files alter column status set default 'neu';
alter table public.files add column if not exists status_changed_at timestamptz;

create table if not exists public.file_events (
  id bigint generated always as identity primary key,
  file_id uuid not null references public.files (id) on delete cascade,
  type text not null check (char_length(type) <= 40),
  note text check (char_length(note) <= 1000),
  actor text,
  created_at timestamptz not null default now()
);
create index if not exists file_events_file_idx on public.file_events (file_id, created_at desc);
alter table public.file_events enable row level security;
revoke all on public.file_events from anon, authenticated;
