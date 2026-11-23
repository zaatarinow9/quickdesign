-- Live-Aktualisierung der Verwaltung: nach jeder Änderung ein kurzes Signal (ohne Inhalte)
-- über Supabase Realtime Broadcast. Die Oberfläche lädt daraufhin die Daten neu.
create or replace function public.admin_live_ping()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  begin
    perform realtime.send(jsonb_build_object('t', tg_table_name), 'changed', 'qd-admin-live', false);
  exception when others then
    -- niemals Geschäftsvorgänge blockieren
    null;
  end;
  return null;
end;
$$;

revoke all on function public.admin_live_ping() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['files','file_folders','projects','inquiries','documents','customers','shop_orders'] loop
    execute format('drop trigger if exists admin_live_ping on public.%I', t);
    execute format('create trigger admin_live_ping after insert or update or delete on public.%I for each statement execute function public.admin_live_ping()', t);
  end loop;
end $$;
