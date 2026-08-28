create index document_analyses_document_scope_idx
  on public.document_analyses (document_id, org_id, product_id);

create index document_analyses_product_idx
  on public.document_analyses (product_id);

create index document_analyses_requested_by_idx
  on public.document_analyses (requested_by);
