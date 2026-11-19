-- ---------------------------------------------------------------------
-- Shop-Bestellungen (Stripe Checkout). Eine Zeile je bezahlter Checkout-Session.
-- ---------------------------------------------------------------------
create or replace function public.next_document_number(p_kind text, p_date date)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  y integer := extract(year from coalesce(p_date, (now() at time zone 'Europe/Berlin')::date));
  v integer;
  prefix text := case p_kind when 'rechnung' then 'RE' when 'gutschrift' then 'GS' when 'auftrag' then 'AU' when 'termin' then 'TE' when 'shop' then 'SH' else 'AN' end;
begin
  insert into public.document_counters as c (kind, year, last_value)
  values (p_kind, y, 1)
  on conflict (kind, year) do update set last_value = c.last_value + 1
  returning last_value into v;
  return prefix || '-' || y::text || '-' || lpad(v::text, 4, '0');
end;
$$;
revoke execute on function public.next_document_number(text, date) from public, anon, authenticated;

create table if not exists public.shop_orders (
  id uuid primary key default gen_random_uuid(),
  number text unique,
  stripe_session_id text not null unique,
  stripe_payment_intent text,
  status text not null default 'bezahlt' check (status in ('bezahlt', 'in_produktion', 'versendet', 'abholbereit', 'abgeschlossen', 'storniert')),
  lang text not null default 'de',
  email text,
  name text,
  phone text,
  shipping_method text,
  shipping_address jsonb not null default '{}'::jsonb,
  items jsonb not null default '[]'::jsonb,
  amount_subtotal integer not null default 0,
  amount_shipping integer not null default 0,
  amount_total integer not null default 0,
  livemode boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists shop_orders_created_idx on public.shop_orders (created_at desc);

create or replace function public.shop_orders_set_number()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.number is null then
    new.number := public.next_document_number('shop', (now() at time zone 'Europe/Berlin')::date);
  end if;
  return new;
end;
$$;
revoke execute on function public.shop_orders_set_number() from public, anon, authenticated;
drop trigger if exists shop_orders_number on public.shop_orders;
create trigger shop_orders_number before insert on public.shop_orders for each row execute function public.shop_orders_set_number();
drop trigger if exists shop_orders_touch on public.shop_orders;
create trigger shop_orders_touch before update on public.shop_orders for each row execute function public.touch_updated_at();

alter table public.shop_orders enable row level security;
revoke all on public.shop_orders from anon, authenticated;
