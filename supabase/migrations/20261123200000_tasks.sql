-- Aufgaben (wie ClickUp): zuweisen, Fälligkeit, Priorität, Checkliste, Kommentare, Dateien, Verlauf
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 300),
  description text,
  status text not null default 'offen' check (status in ('offen', 'in_arbeit', 'erledigt')),
  priority text not null default 'normal' check (priority in ('niedrig', 'normal', 'hoch', 'dringend')),
  assignees text[] not null default '{}',
  due_date date,
  customer_id uuid references public.customers (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  folder text,
  position double precision not null default extract(epoch from now()),
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists tasks_status on public.tasks (status, position);
create index if not exists tasks_assignees on public.tasks using gin (assignees);
create index if not exists tasks_customer on public.tasks (customer_id);

create table if not exists public.task_checklist (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  text text not null check (char_length(text) between 1 and 300),
  done boolean not null default false,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists task_checklist_task on public.task_checklist (task_id, position);

create table if not exists public.task_comments (
  id bigint generated always as identity primary key,
  task_id uuid not null references public.tasks (id) on delete cascade,
  author text not null,
  body text not null check (char_length(body) between 1 and 6000),
  created_at timestamptz not null default now()
);
create index if not exists task_comments_task on public.task_comments (task_id, created_at);

create table if not exists public.task_events (
  id bigint generated always as identity primary key,
  task_id uuid not null references public.tasks (id) on delete cascade,
  actor text,
  type text not null,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists task_events_task on public.task_events (task_id, created_at);

alter table public.tasks enable row level security;
alter table public.task_checklist enable row level security;
alter table public.task_comments enable row level security;
alter table public.task_events enable row level security;

-- Papierkorb kennt Aufgaben
alter table public.trash_items drop constraint if exists trash_items_kind_check;
alter table public.trash_items add constraint trash_items_kind_check check (kind in ('dateien', 'ordner', 'kunde', 'auftrag', 'anfrage', 'dokument', 'aufmass', 'aufgabe'));

-- Live-Signal
do $$
declare t text;
begin
  foreach t in array array['tasks', 'task_checklist', 'task_comments'] loop
    execute format('drop trigger if exists admin_live_ping on public.%I', t);
    execute format('create trigger admin_live_ping after insert or update or delete on public.%I for each statement execute function public.admin_live_ping()', t);
  end loop;
end $$;
