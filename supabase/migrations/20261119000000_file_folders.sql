-- Ordner für Dateien (relativer Pfad, z. B. „Bäckerei Sonnenschein/Druckdaten“; '' = oberste Ebene)
alter table public.files add column if not exists folder text not null default '' check (char_length(folder) <= 500);
create index if not exists files_folder_idx on public.files (folder) where complete;

create or replace view public.file_folder_stats
with (security_invoker = true) as
select folder, count(*)::int as file_count, coalesce(sum(size), 0)::bigint as total_size, max(created_at) as last_upload
from public.files
where complete
group by folder;
revoke all on public.file_folder_stats from anon, authenticated;
