-- ---------------------------------------------------------------------
-- Dateien: Vorschaubilder, Kategorien und eigene Ordner (auch leer, mit Farbe/Kunde)
-- ---------------------------------------------------------------------
alter table public.files
  add column if not exists thumb_key text check (char_length(thumb_key) <= 600),
  add column if not exists preview_key text check (char_length(preview_key) <= 600),
  add column if not exists width integer,
  add column if not exists height integer,
  add column if not exists pages integer,
  add column if not exists category text check (char_length(category) <= 60);
create index if not exists files_category_idx on public.files (category) where complete;

create table if not exists public.file_folders (
  path text primary key check (char_length(path) between 1 and 500),
  color text check (color is null or color ~ '^#[0-9a-f]{6}$'),
  customer_id uuid references public.customers (id) on delete set null,
  note text check (char_length(note) <= 1000),
  created_by text,
  created_at timestamptz not null default now()
);
alter table public.file_folders enable row level security;
revoke all on public.file_folders from anon, authenticated;

-- Bestehende Ordner aus den Dateien übernehmen (inkl. aller Elternordner)
insert into public.file_folders (path)
select distinct p from (
  select array_to_string((string_to_array(folder, '/'))[1:n], '/') as p
  from public.files, generate_series(1, array_length(string_to_array(folder, '/'), 1)) as n
  where folder <> ''
) x
on conflict do nothing;

-- Ordner umbenennen/verschieben: Pfad-Präfix in Dateien und Ordnern ersetzen
create or replace function public.rename_file_folder(p_old text, p_new text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare n integer;
begin
  if p_old = '' or p_new = '' or p_new = p_old or p_new like p_old || '/%' then
    raise exception 'ungültiger Zielordner';
  end if;
  update public.files set folder = p_new || substr(folder, char_length(p_old) + 1)
  where folder = p_old or left(folder, char_length(p_old) + 1) = p_old || '/';
  get diagnostics n = row_count;
  insert into public.file_folders (path, color, customer_id, note, created_by, created_at)
  select p_new || substr(path, char_length(p_old) + 1), color, customer_id, note, created_by, created_at
  from public.file_folders where path = p_old or left(path, char_length(p_old) + 1) = p_old || '/'
  on conflict (path) do nothing;
  delete from public.file_folders where path = p_old or left(path, char_length(p_old) + 1) = p_old || '/';
  return n;
end;
$$;
revoke execute on function public.rename_file_folder(text, text) from public, anon, authenticated;
grant execute on function public.rename_file_folder(text, text) to service_role;
