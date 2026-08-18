insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'compliance-documents',
  'compliance-documents',
  false,
  26214400,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "compliance_documents_select_member" on storage.objects;
create policy "compliance_documents_select_member"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'compliance-documents'
  and private.is_org_member(
    case
      when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then (storage.foldername(name))[1]::uuid
      else null
    end,
    (select auth.uid())
  )
);

drop policy if exists "compliance_documents_insert_editor" on storage.objects;
create policy "compliance_documents_insert_editor"
on storage.objects
for insert
to authenticated
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
with check (bucket_id = 'compliance-documents');

drop policy if exists "compliance_documents_delete_editor" on storage.objects;
create policy "compliance_documents_delete_editor"
on storage.objects
for delete
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
);
