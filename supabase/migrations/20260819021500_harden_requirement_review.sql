alter function public.review_product_requirement(uuid, uuid, text) security invoker;

create index if not exists audit_events_user_idx
  on public.audit_events (user_id)
  where user_id is not null;

create index if not exists documents_uploaded_by_idx
  on public.documents (uploaded_by);

create index if not exists organizations_created_by_idx
  on public.organizations (created_by);

create index if not exists product_requirements_checked_by_idx
  on public.product_requirements (checked_by)
  where checked_by is not null;

create index if not exists product_requirements_requirement_idx
  on public.product_requirements (requirement_id);

create index if not exists products_created_by_idx
  on public.products (created_by);
