-- Zeiterfassung: Stoppuhr je Kunde mit Pausen
create table if not exists public.time_entries (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  task_id uuid references public.tasks (id) on delete set null,
  note text,
  user_email text not null,
  user_name text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  paused_at timestamptz,
  paused_seconds int not null default 0,
  duration_seconds int,
  created_at timestamptz not null default now()
);
create index if not exists time_entries_customer on public.time_entries (customer_id, started_at desc);
create index if not exists time_entries_started on public.time_entries (started_at desc);
create unique index if not exists time_entries_one_running on public.time_entries (user_email) where ended_at is null;
alter table public.time_entries enable row level security;
drop trigger if exists admin_live_ping on public.time_entries;
create trigger admin_live_ping after insert or update or delete on public.time_entries for each statement execute function public.admin_live_ping();
