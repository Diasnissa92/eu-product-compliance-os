drop policy if exists requirements_read on public.requirements;
create policy requirements_read
on public.requirements
for select
to authenticated
using (
  applicability_status = 'active'
  and (effective_from is null or effective_from <= current_date)
  and (effective_to is null or effective_to >= current_date)
);
