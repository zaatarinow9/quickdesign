-- ---------------------------------------------------------------------
-- Dateien (Cloudflare R2, Bucket „quickdesign-dateien“, EU)
-- Die Datei selbst liegt in R2, hier nur Metadaten.
-- ---------------------------------------------------------------------
create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  object_key text not null unique check (char_length(object_key) <= 600),
  name text not null check (char_length(name) between 1 and 255),
  size bigint not null default 0 check (size >= 0),
  content_type text check (char_length(content_type) <= 200),
  project_id uuid references public.projects (id) on delete set null,
  customer_id uuid references public.customers (id) on delete set null,
  message text check (char_length(message) <= 4000),
  status text not null default 'bearbeitung' check (status in ('bearbeitung', 'druckfertig', 'erledigt')),
  assigned_to text check (char_length(assigned_to) <= 254),
  uploaded_by text,
  complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists files_created_idx on public.files (created_at desc) where complete;
create index if not exists files_project_idx on public.files (project_id);
create index if not exists files_status_idx on public.files (status);
drop trigger if exists files_touch on public.files;
create trigger files_touch before update on public.files for each row execute function public.touch_updated_at();
alter table public.files enable row level security;
revoke all on public.files from anon, authenticated;
