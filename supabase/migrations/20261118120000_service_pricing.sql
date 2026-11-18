-- ---------------------------------------------------------------------
-- Leistungskatalog: Berechnungsart, Preis je Menge und Bausteine
--   calc_type:  pauschal | stueck | menge | stunde | flaeche | laenge
--   price_per:  Preis gilt je … Einheiten (z. B. 1000 bei Visitenkarten)
--   components: Standard-Bausteine (andere Katalogleistungen), die beim
--               Hinzufügen automatisch mit übernommen werden
-- ---------------------------------------------------------------------
alter table public.service_catalog
  add column if not exists calc_type text not null default 'stueck',
  add column if not exists price_per integer not null default 1,
  add column if not exists components uuid[] not null default '{}';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'service_catalog_calc_type_check') then
    alter table public.service_catalog
      add constraint service_catalog_calc_type_check check (calc_type in ('pauschal', 'stueck', 'menge', 'stunde', 'flaeche', 'laenge'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'service_catalog_price_per_check') then
    alter table public.service_catalog
      add constraint service_catalog_price_per_check check (price_per between 1 and 100000);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'service_catalog_components_check') then
    alter table public.service_catalog
      add constraint service_catalog_components_check check (cardinality(components) <= 30);
  end if;
end $$;

-- Bestehende Leistungen: Berechnungsart aus der Einheit ableiten
update public.service_catalog
set calc_type = case unit
  when 'Pauschal' then 'pauschal'
  when 'Std.' then 'stunde'
  when 'm²' then 'flaeche'
  when 'lfm' then 'laenge'
  else 'stueck'
end
where calc_type = 'stueck';

-- Beispiel-Materialien für die Werbetechnik (Preise in der Verwaltung eintragen)
insert into public.service_catalog (name, description, category, unit, calc_type, price_per, price_net, vat_rate, is_favorite, sort_order)
select v.name, v.description, v.category, v.unit, v.calc_type, v.price_per, 0, 19, v.is_favorite, v.sort_order
from (values
  ('Visitenkarten-Druck', '350 g Bilderdruck, 4/4-farbig', 'Druck', 'Stk.', 'menge', 1000, true, 25),
  ('Alu-Dibond-Platte 3 mm', null, 'Werbetechnik', 'm²', 'flaeche', 1, true, 61),
  ('Digitaldruck auf Folie', null, 'Werbetechnik', 'm²', 'flaeche', 1, true, 62),
  ('Laminat (UV-Schutz)', null, 'Werbetechnik', 'm²', 'flaeche', 1, false, 63),
  ('Folienplott', null, 'Werbetechnik', 'm²', 'flaeche', 1, false, 64)
) as v(name, description, category, unit, calc_type, price_per, is_favorite, sort_order)
where not exists (select 1 from public.service_catalog s where lower(s.name) = lower(v.name));

-- "Schild / Werbetafel" als Vorlage: Platte + Druck + Laminat
update public.service_catalog s
set calc_type = 'flaeche',
    unit = 'm²',
    components = array(
      select c.id from public.service_catalog c
      where c.name in ('Alu-Dibond-Platte 3 mm', 'Digitaldruck auf Folie', 'Laminat (UV-Schutz)')
      order by c.sort_order
    )
where s.name = 'Schild / Werbetafel' and s.price_net = 0 and cardinality(s.components) = 0 and s.usage_count = 0;
