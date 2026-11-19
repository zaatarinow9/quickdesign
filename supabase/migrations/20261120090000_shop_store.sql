-- Shop-Verwaltung: gesamter Katalog, Angebote und Einstellungen als ein validiertes JSON-Dokument
create table if not exists public.shop_store (
  id smallint primary key default 1 check (id = 1),
  data jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by text
);
create table if not exists public.shop_store_history (
  id bigint generated always as identity primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  created_by text
);
alter table public.shop_store enable row level security;
alter table public.shop_store_history enable row level security;
-- Zugriff nur über den Server (Service-Rolle); keine öffentlichen Policies.

-- Öffentlicher Speicher für Produktbilder
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('shop', 'shop', true, 15728640, array['image/webp', 'image/jpeg', 'image/png', 'image/avif'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
