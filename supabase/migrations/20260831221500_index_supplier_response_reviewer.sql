create index if not exists supplier_responses_reviewed_by_idx
  on public.supplier_responses (reviewed_by) where reviewed_by is not null;
