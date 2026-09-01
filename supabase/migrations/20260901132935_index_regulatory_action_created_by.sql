begin;

create index if not exists regulatory_action_items_created_by_idx
  on public.regulatory_action_items (created_by);

commit;
