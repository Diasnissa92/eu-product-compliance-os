-- Supplier evidence must be reviewed before a collection request can be closed.

create or replace function private.guard_supplier_response_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
begin
  if new.status in ('accepted','rejected') and new.status is distinct from old.status then
    if actor_id is null then raise exception 'Authentication required'; end if;
    if not private.has_org_role(new.org_id, actor_id, array['owner','admin','editor','reviewer']) then raise exception 'Insufficient permissions'; end if;
    new.reviewed_by := actor_id;
    new.reviewed_at := now();
  elsif new.status = 'submitted' and new.status is distinct from old.status then
    new.reviewed_by := null;
    new.reviewed_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_supplier_response_review_trigger on public.supplier_responses;
create trigger guard_supplier_response_review_trigger
before update of status on public.supplier_responses
for each row execute function private.guard_supplier_response_review();

create or replace function private.guard_supplier_request_close()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    if exists (select 1 from public.supplier_responses where request_id = new.id and org_id = new.org_id and status = 'submitted') then
      raise exception 'Toutes les pièces reçues doivent être examinées avant la clôture';
    end if;
    if not exists (select 1 from public.supplier_responses where request_id = new.id and org_id = new.org_id and status = 'accepted') then
      raise exception 'Au moins une pièce doit être acceptée avant la clôture';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_supplier_request_close_trigger on public.supplier_requests;
create trigger guard_supplier_request_close_trigger
before update of status on public.supplier_requests
for each row execute function private.guard_supplier_request_close();
