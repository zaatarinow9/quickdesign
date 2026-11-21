-- ---------------------------------------------------------------------
-- Mitarbeiter-App: Geräte, Benachrichtigungen, Sofort-Push über Expo
--   staff_devices        Push-Token je Gerät (nur über /api/app registriert)
--   staff_notifications  Verlauf aller Hinweise (Glocke in der App)
--   staff_read_state     bis wann jemand gelesen hat
-- Push wird direkt aus der Datenbank verschickt (pg_net → Expo Push API),
-- damit jede Quelle (Website, Verwaltung, Stripe, App) gleich behandelt wird.
-- ---------------------------------------------------------------------
create extension if not exists pg_net with schema extensions;

create table if not exists public.staff_devices (
  id uuid primary key default gen_random_uuid(),
  user_email text not null check (char_length(user_email) between 3 and 254),
  auth_user_id uuid,
  token text not null unique check (char_length(token) <= 300),
  platform text check (platform in ('ios', 'android')),
  lang text not null default 'de' check (lang in ('de', 'ar')),
  categories text[] not null default array['anfrage', 'shop', 'datei', 'projekt', 'dokument'],
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index if not exists staff_devices_user_idx on public.staff_devices (user_email);
alter table public.staff_devices enable row level security;
revoke all on public.staff_devices from anon, authenticated;

create table if not exists public.staff_notifications (
  id bigint generated always as identity primary key,
  category text not null check (category in ('anfrage', 'shop', 'datei', 'projekt', 'dokument', 'system')),
  title_de text not null check (char_length(title_de) <= 200),
  body_de text check (char_length(body_de) <= 600),
  title_ar text not null check (char_length(title_ar) <= 200),
  body_ar text check (char_length(body_ar) <= 600),
  link text check (char_length(link) <= 300),
  target_email text,
  created_at timestamptz not null default now()
);
create index if not exists staff_notifications_created_idx on public.staff_notifications (created_at desc);
alter table public.staff_notifications enable row level security;
revoke all on public.staff_notifications from anon, authenticated;

create table if not exists public.staff_read_state (
  user_email text primary key,
  last_read_at timestamptz not null default now()
);
alter table public.staff_read_state enable row level security;
revoke all on public.staff_read_state from anon, authenticated;

-- ------------------------------------------------------------- Versand
create or replace function public.staff_push_send()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  msgs jsonb;
  chunk jsonb;
  i integer := 0;
begin
  select coalesce(jsonb_agg(jsonb_build_object(
           'to', d.token,
           'title', case when d.lang = 'ar' then new.title_ar else new.title_de end,
           'body', coalesce(case when d.lang = 'ar' then new.body_ar else new.body_de end, ''),
           'sound', 'default',
           'priority', 'high',
           'channelId', 'default',
           'data', jsonb_build_object('id', new.id, 'link', new.link, 'category', new.category)
         )), '[]'::jsonb)
    into msgs
    from public.staff_devices d
   where (new.target_email is null or d.user_email = new.target_email)
     and new.category = any (d.categories || array['system']);

  -- Expo nimmt höchstens 100 Nachrichten je Anfrage
  while i < jsonb_array_length(msgs) loop
    select coalesce(jsonb_agg(m), '[]'::jsonb) into chunk
      from (select value as m from jsonb_array_elements(msgs) with ordinality as t(value, ord) where ord > i and ord <= i + 100) s;
    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      body := chunk,
      headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb
    );
    i := i + 100;
  end loop;
  return new;
exception when others then
  raise warning 'staff push: %', sqlerrm;
  return new;
end;
$$;
revoke execute on function public.staff_push_send() from public, anon, authenticated;

drop trigger if exists staff_notifications_push on public.staff_notifications;
create trigger staff_notifications_push
  after insert on public.staff_notifications
  for each row execute function public.staff_push_send();

-- kleiner Helfer für die Ereignis-Auslöser
create or replace function public.staff_notify(
  p_category text, p_title_de text, p_body_de text, p_title_ar text, p_body_ar text, p_link text, p_target text default null
) returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.staff_notifications (category, title_de, body_de, title_ar, body_ar, link, target_email)
  values (p_category, left(p_title_de, 200), left(p_body_de, 600), left(p_title_ar, 200), left(p_body_ar, 600), p_link, p_target);
$$;
revoke execute on function public.staff_notify(text, text, text, text, text, text, text) from public, anon, authenticated;

-- ------------------------------------------------------------- Anfragen
create or replace function public.staff_on_inquiry()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.staff_notify('anfrage',
    'Neue Anfrage ' || new.reference || ' – ' || new.name,
    left(regexp_replace(new.message, '\s+', ' ', 'g'), 180),
    'استفسار جديد ' || new.reference || ' – ' || new.name,
    left(regexp_replace(new.message, '\s+', ' ', 'g'), 180),
    '/inquiries/' || new.id);
  return new;
exception when others then
  raise warning 'staff notify: %', sqlerrm;
  return new;
end; $$;
revoke execute on function public.staff_on_inquiry() from public, anon, authenticated;
drop trigger if exists staff_inquiry_notify on public.inquiries;
create trigger staff_inquiry_notify after insert on public.inquiries for each row execute function public.staff_on_inquiry();

-- ------------------------------------------------------------- Shop
create or replace function public.staff_on_shop_order()
returns trigger language plpgsql security definer set search_path = '' as $$
declare amount text := to_char(new.amount_total / 100.0, 'FM999G990D00') || ' €';
begin
  if tg_op = 'INSERT' then
    perform public.staff_notify('shop',
      'Neue Shop-Bestellung ' || coalesce(new.number, '') || ' · ' || amount,
      coalesce(new.name, '') || coalesce(' · ' || new.shipping_method, ''),
      'طلب جديد من المتجر ' || coalesce(new.number, '') || ' · ' || amount,
      coalesce(new.name, '') || coalesce(' · ' || new.shipping_method, ''),
      '/shop/' || new.id);
  end if;
  return new;
exception when others then
  raise warning 'staff notify: %', sqlerrm;
  return new;
end; $$;
revoke execute on function public.staff_on_shop_order() from public, anon, authenticated;
drop trigger if exists staff_shop_order_notify on public.shop_orders;
create trigger staff_shop_order_notify after insert on public.shop_orders for each row execute function public.staff_on_shop_order();

-- ------------------------------------------------------------- Dateien
create or replace function public.staff_file_status_de(s text) returns text language sql immutable set search_path = '' as $$
  select case s when 'neu' then 'Neu' when 'bearbeitung' then 'In Bearbeitung' when 'freigabe' then 'Zur Freigabe'
    when 'druckfertig' then 'Druckfertig' when 'im_druck' then 'Im Druck' when 'erledigt' then 'Erledigt' else s end $$;
create or replace function public.staff_file_status_ar(s text) returns text language sql immutable set search_path = '' as $$
  select case s when 'neu' then 'جديد' when 'bearbeitung' then 'قيد التصميم' when 'freigabe' then 'بانتظار الموافقة'
    when 'druckfertig' then 'جاهز للطباعة' when 'im_druck' then 'قيد الطباعة' when 'erledigt' then 'منتهي' else s end $$;

create or replace function public.staff_on_file()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- Hochladen abgeschlossen
  if new.complete and (tg_op = 'INSERT' or not old.complete) then
    perform public.staff_notify('datei',
      'Neue Datei: ' || new.name,
      coalesce(new.folder, '') || coalesce(' · ' || left(new.message, 120), ''),
      'ملف جديد: ' || new.name,
      coalesce(new.folder, '') || coalesce(' · ' || left(new.message, 120), ''),
      '/files/' || new.id);
  elsif tg_op = 'UPDATE' and new.complete then
    if new.status is distinct from old.status then
      perform public.staff_notify('datei',
        new.name || ' → ' || public.staff_file_status_de(new.status),
        coalesce(new.folder, ''),
        new.name || ' ← ' || public.staff_file_status_ar(new.status),
        coalesce(new.folder, ''),
        '/files/' || new.id);
    end if;
    if new.assigned_to is distinct from old.assigned_to and new.assigned_to is not null then
      perform public.staff_notify('datei',
        'Dir zugewiesen: ' || new.name,
        public.staff_file_status_de(new.status),
        'أُسند إليك: ' || new.name,
        public.staff_file_status_ar(new.status),
        '/files/' || new.id, lower(new.assigned_to));
    end if;
  end if;
  return new;
exception when others then
  raise warning 'staff notify: %', sqlerrm;
  return new;
end; $$;
revoke execute on function public.staff_on_file() from public, anon, authenticated;
drop trigger if exists staff_file_notify on public.files;
create trigger staff_file_notify after insert or update of complete, status, assigned_to on public.files for each row execute function public.staff_on_file();

-- ------------------------------------------------------------- Aufträge / Termine
create or replace function public.staff_on_project()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  when_de text := coalesce(' · ' || to_char(new.appointment_date, 'DD.MM.YYYY') || coalesce(' ' || to_char(new.appointment_time, 'HH24:MI'), ''), '');
  st_de text := case new.status when 'angenommen' then 'Angenommen' when 'in_arbeit' then 'In Arbeit' when 'fertig' then 'Fertig' when 'abgeschlossen' then 'Abgeschlossen' else new.status end;
  st_ar text := case new.status when 'angenommen' then 'مقبول' when 'in_arbeit' then 'قيد التنفيذ' when 'fertig' then 'جاهز' when 'abgeschlossen' then 'مكتمل' else new.status end;
begin
  if tg_op = 'INSERT' then
    perform public.staff_notify('projekt',
      case when new.kind = 'aufgabe' then 'Neuer Termin: ' else 'Neuer Auftrag: ' end || new.title,
      new.customer_name || when_de,
      case when new.kind = 'aufgabe' then 'موعد جديد: ' else 'طلب عمل جديد: ' end || new.title,
      new.customer_name || when_de,
      '/projects/' || new.id);
  elsif new.status is distinct from old.status then
    perform public.staff_notify('projekt', new.title || ' → ' || st_de, new.customer_name, new.title || ' ← ' || st_ar, new.customer_name, '/projects/' || new.id);
  elsif new.appointment_date is distinct from old.appointment_date or new.appointment_time is distinct from old.appointment_time then
    perform public.staff_notify('projekt', 'Termin geändert: ' || new.title, new.customer_name || when_de, 'تغيّر الموعد: ' || new.title, new.customer_name || when_de, '/projects/' || new.id);
  end if;
  return new;
exception when others then
  raise warning 'staff notify: %', sqlerrm;
  return new;
end; $$;
revoke execute on function public.staff_on_project() from public, anon, authenticated;
drop trigger if exists staff_project_notify on public.projects;
create trigger staff_project_notify after insert or update of status, appointment_date, appointment_time on public.projects for each row execute function public.staff_on_project();

-- ------------------------------------------------------------- Angebote / Rechnungen
create or replace function public.staff_on_document()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  label_de text := case new.kind when 'rechnung' then 'Rechnung' else 'Angebot' end;
  label_ar text := case new.kind when 'rechnung' then 'الفاتورة' else 'العرض' end;
  nr text := coalesce(new.number, '');
begin
  if new.accepted_at is not null and old.accepted_at is null then
    perform public.staff_notify('dokument', label_de || ' ' || nr || ' angenommen ✓', new.customer_name, 'تم قبول ' || label_ar || ' ' || nr || ' ✓', new.customer_name, '/documents/' || new.id);
  elsif new.declined_at is not null and old.declined_at is null then
    perform public.staff_notify('dokument', label_de || ' ' || nr || ' abgelehnt', new.customer_name, 'تم رفض ' || label_ar || ' ' || nr, new.customer_name, '/documents/' || new.id);
  elsif new.first_viewed_at is not null and old.first_viewed_at is null then
    perform public.staff_notify('dokument', label_de || ' ' || nr || ' wurde geöffnet', new.customer_name, 'فتح الزبون ' || label_ar || ' ' || nr, new.customer_name, '/documents/' || new.id);
  elsif new.paid_at is not null and old.paid_at is null then
    perform public.staff_notify('dokument', label_de || ' ' || nr || ' bezahlt', new.customer_name, 'تم دفع ' || label_ar || ' ' || nr, new.customer_name, '/documents/' || new.id);
  end if;
  return new;
exception when others then
  raise warning 'staff notify: %', sqlerrm;
  return new;
end; $$;
revoke execute on function public.staff_on_document() from public, anon, authenticated;
drop trigger if exists staff_document_notify on public.documents;
create trigger staff_document_notify after update of accepted_at, declined_at, first_viewed_at, paid_at on public.documents for each row execute function public.staff_on_document();

-- ------------------------------------------------------------- Deaktivierte Mitarbeiter: Geräte entfernen
create or replace function public.staff_on_admin_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    delete from public.staff_devices where user_email = old.email;
    return old;
  end if;
  if not new.active then
    delete from public.staff_devices where user_email = new.email;
  end if;
  return new;
exception when others then
  raise warning 'staff notify: %', sqlerrm;
  return new;
end; $$;
revoke execute on function public.staff_on_admin_user() from public, anon, authenticated;
drop trigger if exists staff_admin_user_devices on public.admin_users;
create trigger staff_admin_user_devices after update of active or delete on public.admin_users for each row execute function public.staff_on_admin_user();
