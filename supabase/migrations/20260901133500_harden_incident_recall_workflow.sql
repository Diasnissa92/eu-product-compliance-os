-- Keep recall state coherent and prevent closure of serious incidents without
-- a completed corrective action.

alter table public.product_incidents drop constraint if exists product_incidents_recall_status_check;
alter table public.product_incidents add constraint product_incidents_recall_status_check
  check (status <> 'recall' or recall_required = true);

alter table public.product_incidents drop constraint if exists product_incidents_countries_check;
alter table public.product_incidents add constraint product_incidents_countries_check
  check (cardinality(countries) <= 30 and octet_length(array_to_string(countries, ',')) <= 5000);

create or replace function private.guard_incident_close()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'closed' then
    if exists (
      select 1 from public.corrective_actions
      where incident_id = new.id and status not in ('done', 'cancelled')
    ) then
      raise exception 'Toutes les actions correctives doivent être terminées ou annulées avant la clôture';
    end if;

    if (new.recall_required = true or new.severity in ('high','critical'))
      and not exists (
        select 1 from public.corrective_actions
        where incident_id = new.id and status = 'done'
      ) then
      raise exception 'Au moins une action corrective terminée est requise avant de clôturer un incident élevé, critique ou avec rappel';
    end if;
  end if;
  return new;
end;
$$;
