-- =====================================================================
-- QuickDesign – Verwaltung, Kunden (CRM), Angebote & Rechnungen, Marketing
-- Alle Tabellen: RLS aktiv OHNE öffentliche Policies. Zugriff erfolgt
-- ausschließlich serverseitig mit dem Secret Key (nach Admin-Prüfung).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Hilfsfunktionen
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.random_token()
returns text
language sql
volatile
set search_path = ''
as $$
  select encode(extensions.gen_random_bytes(32), 'hex');
$$;

-- ---------------------------------------------------------------------
-- Rate-Limits (Spam-/Brute-Force-Schutz)
-- ---------------------------------------------------------------------
create table if not exists public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (key, window_start)
);

create or replace function public.check_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  w timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  c integer;
begin
  insert into public.rate_limits as r (key, window_start, count)
  values (p_key, w, 1)
  on conflict (key, window_start) do update set count = r.count + 1
  returning count into c;
  -- gelegentlich alte Fenster aufräumen
  if random() < 0.02 then
    delete from public.rate_limits where window_start < now() - interval '2 days';
  end if;
  return c <= p_limit;
end;
$$;

-- ---------------------------------------------------------------------
-- Zugänge: Inhaber (ADMIN_EMAILS) + Mitarbeiter (admin_users)
-- ---------------------------------------------------------------------
create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email) and char_length(email) <= 254),
  full_name text check (char_length(full_name) <= 120),
  role text not null default 'manager' check (role in ('admin', 'manager')),
  active boolean not null default true,
  auth_user_id uuid unique,
  accepted_at timestamptz,
  invited_by text,
  created_at timestamptz not null default now()
);

create table if not exists public.auth_allowlist (
  email text primary key check (email = lower(email)),
  note text,
  created_at timestamptz not null default now()
);

-- Keine öffentliche Registrierung: Auth-Konten nur für hinterlegte Adressen
create or replace function public.guard_auth_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is null
     or (not exists (select 1 from public.admin_users a where a.email = lower(new.email))
         and not exists (select 1 from public.auth_allowlist w where w.email = lower(new.email))) then
    raise exception 'Registrierung nicht erlaubt' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_auth_signup on auth.users;
create trigger guard_auth_signup
  before insert on auth.users
  for each row execute function public.guard_auth_signup();

-- ---------------------------------------------------------------------
-- Einstellungen (Firmendaten, Bank, Standardtexte …)
-- ---------------------------------------------------------------------
create table if not exists public.settings (
  key text primary key check (char_length(key) <= 60),
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by text
);

-- ---------------------------------------------------------------------
-- Kunden (CRM)
-- ---------------------------------------------------------------------
create sequence if not exists public.customer_number_seq start 1001;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  customer_number text not null unique default ('KD-' || nextval('public.customer_number_seq')::text),
  kind text not null default 'privat' check (kind in ('privat', 'firma')),
  status text not null default 'lead' check (status in ('lead', 'kunde', 'inaktiv')),
  salutation text check (salutation is null or salutation in ('Herr', 'Frau', 'Divers')),
  name text not null check (char_length(name) between 1 and 160),
  company_name text check (char_length(company_name) <= 160),
  email text check (email is null or (email = lower(email) and char_length(email) <= 254)),
  phone text check (char_length(phone) <= 60),
  street text check (char_length(street) <= 160),
  postal_code text check (char_length(postal_code) <= 12),
  city text check (char_length(city) <= 80),
  country text not null default 'Deutschland' check (char_length(country) <= 60),
  vat_id text check (char_length(vat_id) <= 40),
  website text check (char_length(website) <= 200),
  birthday date,
  tags text[] not null default '{}',
  notes text check (char_length(notes) <= 10000),
  source text not null default 'manuell' check (char_length(source) <= 40),
  -- Herkunft für Marketing-Auswertung (nur mit Einwilligung erfasst)
  utm jsonb not null default '{}'::jsonb,
  -- E-Mail-Werbung: nur mit ausdrücklicher Einwilligung + Double-Opt-in (UWG § 7, Art. 6 Abs. 1 lit. a DSGVO)
  marketing_status text not null default 'keine' check (marketing_status in ('keine', 'ausstehend', 'bestaetigt', 'abgemeldet')),
  marketing_consent_at timestamptz,
  marketing_confirmed_at timestamptz,
  marketing_revoked_at timestamptz,
  doi_token text unique,
  doi_sent_at timestamptz,
  unsubscribe_token text not null unique default public.random_token(),
  last_contact_at timestamptz,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists customers_email_uidx on public.customers (email) where email is not null;
create index if not exists customers_created_idx on public.customers (created_at desc);
create index if not exists customers_marketing_idx on public.customers (marketing_status);
create index if not exists customers_tags_idx on public.customers using gin (tags);
drop trigger if exists customers_touch on public.customers;
create trigger customers_touch before update on public.customers for each row execute function public.touch_updated_at();

-- Nachweis jeder Einwilligung / jedes Widerrufs (Art. 7 Abs. 1 DSGVO – Nachweispflicht)
create table if not exists public.consent_events (
  id bigint generated always as identity primary key,
  customer_id uuid references public.customers (id) on delete cascade,
  email text,
  kind text not null default 'email_marketing' check (kind in ('email_marketing')),
  action text not null check (action in ('angefragt', 'bestaetigt', 'widerrufen', 'manuell_erfasst', 'manuell_entfernt')),
  source text check (char_length(source) <= 80),
  consent_text text check (char_length(consent_text) <= 2000),
  text_version text check (char_length(text_version) <= 20),
  ip_hash text,
  user_agent text check (char_length(user_agent) <= 300),
  actor text,
  created_at timestamptz not null default now()
);
create index if not exists consent_events_customer_idx on public.consent_events (customer_id, created_at desc);

-- ---------------------------------------------------------------------
-- Anfragen (Kontaktformular)
-- ---------------------------------------------------------------------
create sequence if not exists public.inquiry_number_seq start 1;

create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default ('QD-' || lpad(nextval('public.inquiry_number_seq')::text, 6, '0')),
  status text not null default 'neu' check (status in ('neu', 'in_bearbeitung', 'erledigt', 'archiviert')),
  name text not null check (char_length(name) between 1 and 160),
  company_name text check (char_length(company_name) <= 160),
  email text not null check (char_length(email) <= 254),
  phone text check (char_length(phone) <= 60),
  message text not null check (char_length(message) <= 6000),
  interests text[] not null default '{}',
  customer_id uuid references public.customers (id) on delete set null,
  utm jsonb not null default '{}'::jsonb,
  landing_page text check (char_length(landing_page) <= 300),
  referrer text check (char_length(referrer) <= 300),
  marketing_opt_in boolean not null default false,
  internal_notes text check (char_length(internal_notes) <= 6000),
  email_delivered boolean not null default false,
  ip_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists inquiries_created_idx on public.inquiries (created_at desc);
create index if not exists inquiries_status_idx on public.inquiries (status);
drop trigger if exists inquiries_touch on public.inquiries;
create trigger inquiries_touch before update on public.inquiries for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- Leistungskatalog (vordefinierte Positionen mit Netto-/Bruttopreis)
-- ---------------------------------------------------------------------
create table if not exists public.service_catalog (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 200),
  description text check (char_length(description) <= 1500),
  category text check (char_length(category) <= 60),
  unit text not null default 'Stk.' check (char_length(unit) <= 20),
  price_net numeric(12, 2) not null default 0 check (price_net between -1000000 and 1000000),
  vat_rate numeric(4, 2) not null default 19 check (vat_rate in (0, 7, 19)),
  is_favorite boolean not null default false,
  active boolean not null default true,
  usage_count integer not null default 0,
  last_used_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists service_catalog_usage_idx on public.service_catalog (is_favorite desc, usage_count desc);
drop trigger if exists service_catalog_touch on public.service_catalog;
create trigger service_catalog_touch before update on public.service_catalog for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- Dokumente: Angebote (AN-JJJJ-0001) und Rechnungen (RE-JJJJ-0001)
-- Rechnungsnummern werden erst beim Festschreiben vergeben (lückenlos).
-- ---------------------------------------------------------------------
create table if not exists public.document_counters (
  kind text not null,
  year integer not null,
  last_value integer not null default 0,
  primary key (kind, year)
);

create or replace function public.next_document_number(p_kind text, p_date date)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  y integer := extract(year from coalesce(p_date, (now() at time zone 'Europe/Berlin')::date));
  v integer;
  prefix text := case p_kind when 'rechnung' then 'RE' when 'gutschrift' then 'GS' else 'AN' end;
begin
  insert into public.document_counters as c (kind, year, last_value)
  values (p_kind, y, 1)
  on conflict (kind, year) do update set last_value = c.last_value + 1
  returning last_value into v;
  return prefix || '-' || y::text || '-' || lpad(v::text, 4, '0');
end;
$$;

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('angebot', 'rechnung')),
  number text unique,
  status text not null default 'entwurf',
  customer_id uuid references public.customers (id) on delete set null,
  source_document_id uuid references public.documents (id) on delete set null,
  inquiry_id uuid references public.inquiries (id) on delete set null,
  title text not null default 'Angebot' check (char_length(title) <= 200),
  -- Empfänger (Kopie – bleibt auf dem Dokument unverändert erhalten)
  customer_salutation text check (char_length(customer_salutation) <= 20),
  customer_name text not null check (char_length(customer_name) between 1 and 160),
  company_name text check (char_length(company_name) <= 160),
  street text check (char_length(street) <= 160),
  postal_code text check (char_length(postal_code) <= 12),
  city text check (char_length(city) <= 80),
  country text check (char_length(country) <= 60),
  email text check (char_length(email) <= 254),
  phone text check (char_length(phone) <= 60),
  customer_vat_id text check (char_length(customer_vat_id) <= 40),
  -- Inhalt
  doc_date date not null default (now() at time zone 'Europe/Berlin')::date,
  valid_until date,
  due_date date,
  service_period text check (char_length(service_period) <= 120),
  reference text check (char_length(reference) <= 120),
  intro text check (char_length(intro) <= 4000),
  items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) <= 100),
  discount_percent numeric(5, 2) not null default 0 check (discount_percent between 0 and 100),
  notes text check (char_length(notes) <= 4000),
  payment_terms text check (char_length(payment_terms) <= 1500),
  closing text check (char_length(closing) <= 1500),
  -- Summen (serverseitig berechnet)
  net_total numeric(12, 2) not null default 0,
  vat_total numeric(12, 2) not null default 0,
  gross_total numeric(12, 2) not null default 0,
  paid_amount numeric(12, 2) not null default 0,
  paid_at timestamptz,
  finalized_at timestamptz,
  -- Online-Ansicht & Annahme
  share_token text not null unique default public.random_token(),
  share_enabled boolean not null default true,
  first_viewed_at timestamptz,
  last_viewed_at timestamptz,
  view_count integer not null default 0,
  accepted_at timestamptz,
  accepted_name text check (char_length(accepted_name) <= 160),
  accepted_ip_hash text,
  declined_at timestamptz,
  decline_reason text check (char_length(decline_reason) <= 1000),
  -- Versand
  last_sent_at timestamptz,
  last_sent_to text check (char_length(last_sent_to) <= 254),
  send_count integer not null default 0,
  reminder_count integer not null default 0,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint documents_status_chk check (
    (kind = 'angebot' and status in ('entwurf', 'versendet', 'angenommen', 'abgelehnt'))
    or (kind = 'rechnung' and status in ('entwurf', 'offen', 'teilbezahlt', 'bezahlt', 'storniert'))
  )
);
create index if not exists documents_kind_created_idx on public.documents (kind, created_at desc);
create index if not exists documents_customer_idx on public.documents (customer_id);
create index if not exists documents_status_idx on public.documents (kind, status);
create index if not exists documents_source_idx on public.documents (source_document_id);
drop trigger if exists documents_touch on public.documents;
create trigger documents_touch before update on public.documents for each row execute function public.touch_updated_at();

-- Angebote erhalten ihre Nummer sofort
create or replace function public.documents_assign_offer_number()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.kind = 'angebot' and new.number is null then
    new.number := public.next_document_number('angebot', new.doc_date);
  end if;
  return new;
end;
$$;
drop trigger if exists documents_offer_number on public.documents;
create trigger documents_offer_number before insert on public.documents for each row execute function public.documents_assign_offer_number();

-- Rechnung festschreiben: Nummer vergeben, Status „offen“ (atomar, nur einmal)
create or replace function public.finalize_invoice(p_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.documents;
  n text;
begin
  select * into d from public.documents where id = p_id and kind = 'rechnung' for update;
  if not found then
    raise exception 'Rechnung nicht gefunden';
  end if;
  if d.number is not null then
    return d.number;
  end if;
  n := public.next_document_number('rechnung', d.doc_date);
  update public.documents
     set number = n, status = 'offen', finalized_at = now()
   where id = p_id;
  return n;
end;
$$;

-- Zeitachse je Dokument
create table if not exists public.document_events (
  id bigint generated always as identity primary key,
  document_id uuid not null references public.documents (id) on delete cascade,
  type text not null check (char_length(type) <= 40),
  note text check (char_length(note) <= 1000),
  actor text,
  created_at timestamptz not null default now()
);
create index if not exists document_events_doc_idx on public.document_events (document_id, created_at desc);

-- ---------------------------------------------------------------------
-- Marketing-Kampagnen (nur an bestätigte Empfänger)
-- ---------------------------------------------------------------------
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 160),
  subject text not null check (char_length(subject) between 1 and 200),
  body text not null check (char_length(body) <= 20000),
  status text not null default 'entwurf' check (status in ('entwurf', 'wird_gesendet', 'gesendet')),
  audience_tag text check (char_length(audience_tag) <= 60),
  recipients_total integer not null default 0,
  sent_count integer not null default 0,
  failed_count integer not null default 0,
  started_at timestamptz,
  finished_at timestamptz,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists campaigns_touch on public.campaigns;
create trigger campaigns_touch before update on public.campaigns for each row execute function public.touch_updated_at();

create table if not exists public.campaign_recipients (
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  status text not null default 'ausstehend' check (status in ('ausstehend', 'gesendet', 'fehler')),
  error text,
  sent_at timestamptz,
  primary key (campaign_id, customer_id)
);

-- ---------------------------------------------------------------------
-- Website-Statistik (nur nach Einwilligung „Statistik“, ohne IP, ohne Cookies)
-- ---------------------------------------------------------------------
create table if not exists public.page_views (
  id bigint generated always as identity primary key,
  visitor_id text check (char_length(visitor_id) <= 40),
  path text not null check (char_length(path) <= 300),
  referrer_host text check (char_length(referrer_host) <= 200),
  utm_source text check (char_length(utm_source) <= 100),
  utm_medium text check (char_length(utm_medium) <= 100),
  utm_campaign text check (char_length(utm_campaign) <= 150),
  device text check (device in ('mobil', 'tablet', 'desktop')),
  created_at timestamptz not null default now()
);
create index if not exists page_views_created_idx on public.page_views (created_at desc);

-- ---------------------------------------------------------------------
-- Protokolle
-- ---------------------------------------------------------------------
create table if not exists public.activity_log (
  id bigint generated always as identity primary key,
  actor text,
  action text not null check (char_length(action) <= 60),
  entity text check (char_length(entity) <= 40),
  entity_id text,
  summary text check (char_length(summary) <= 500),
  created_at timestamptz not null default now()
);
create index if not exists activity_log_created_idx on public.activity_log (created_at desc);

create table if not exists public.email_log (
  id bigint generated always as identity primary key,
  recipient text not null,
  subject text,
  kind text check (char_length(kind) <= 40),
  related_id text,
  ok boolean not null,
  error text check (char_length(error) <= 1000),
  created_at timestamptz not null default now()
);
create index if not exists email_log_created_idx on public.email_log (created_at desc);

-- ---------------------------------------------------------------------
-- Sicherheit: RLS an, keinerlei Rechte für öffentliche Rollen
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'rate_limits', 'admin_users', 'auth_allowlist', 'settings', 'customers', 'consent_events', 'inquiries',
    'service_catalog', 'document_counters', 'documents', 'document_events', 'campaigns', 'campaign_recipients',
    'page_views', 'activity_log', 'email_log'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Startdaten: häufig genutzte Leistungen (Preise in der Verwaltung anpassen)
-- ---------------------------------------------------------------------
insert into public.service_catalog (name, description, category, unit, price_net, vat_rate, is_favorite, sort_order)
select * from (values
  ('Logo-Design', 'Entwicklung eines individuellen Logos inkl. 2 Korrekturschleifen und Übergabe aller Dateiformate', 'Grafikdesign', 'Pauschal', 0::numeric, 19::numeric, true, 10),
  ('Visitenkarten-Gestaltung', 'Layout Vorder- und Rückseite, druckfertige Daten', 'Grafikdesign', 'Pauschal', 0, 19, true, 20),
  ('Flyer-Gestaltung', 'Gestaltung inkl. druckfertiger Datenaufbereitung', 'Grafikdesign', 'Pauschal', 0, 19, true, 30),
  ('Grafikarbeiten nach Aufwand', null, 'Grafikdesign', 'Std.', 0, 19, true, 40),
  ('Fahrzeugbeschriftung', 'Folienplot inkl. Montage', 'Werbetechnik', 'Pauschal', 0, 19, true, 50),
  ('Schild / Werbetafel', 'Herstellung inkl. Druck und Kaschierung', 'Werbetechnik', 'Stk.', 0, 19, true, 60),
  ('3D-Buchstaben', 'Herstellung je Buchstabe', 'Werbetechnik', 'Stk.', 0, 19, false, 70),
  ('Montage vor Ort', null, 'Montage', 'Std.', 0, 19, true, 80),
  ('Anfahrt', null, 'Montage', 'Pauschal', 0, 19, false, 90),
  ('Druckdatenprüfung', null, 'Druck', 'Pauschal', 0, 19, false, 100)
) as v(name, description, category, unit, price_net, vat_rate, is_favorite, sort_order)
where not exists (select 1 from public.service_catalog);
