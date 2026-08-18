drop policy if exists "documents_insert_editor" on public.documents;
create policy "documents_insert_editor"
on public.documents
for insert
to authenticated
with check (
  private.has_org_role(
    org_id,
    (select auth.uid()),
    array['owner', 'admin', 'editor']
  )
  and uploaded_by = (select auth.uid())
  and exists (
    select 1
    from public.products
    where products.id = documents.product_id
      and products.org_id = documents.org_id
  )
);

drop policy if exists "documents_update_editor" on public.documents;
create policy "documents_update_editor"
on public.documents
for update
to authenticated
using (
  private.has_org_role(
    org_id,
    (select auth.uid()),
    array['owner', 'admin', 'editor']
  )
)
with check (
  private.has_org_role(
    org_id,
    (select auth.uid()),
    array['owner', 'admin', 'editor']
  )
  and exists (
    select 1
    from public.products
    where products.id = documents.product_id
      and products.org_id = documents.org_id
  )
);
