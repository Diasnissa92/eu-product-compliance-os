drop policy if exists "compliance_documents_update_editor" on storage.objects;
create policy "compliance_documents_update_editor"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'compliance-documents'
  and private.has_org_role(
    case
      when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then (storage.foldername(name))[1]::uuid
      else null
    end,
    (select auth.uid()),
    array['owner', 'admin', 'editor']
  )
)
with check (
  bucket_id = 'compliance-documents'
  and private.has_org_role(
    case
      when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then (storage.foldername(name))[1]::uuid
      else null
    end,
    (select auth.uid()),
    array['owner', 'admin', 'editor']
  )
);
