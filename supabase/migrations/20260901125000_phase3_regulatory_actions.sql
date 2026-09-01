begin;

-- Fix a Phase 2 tenant-integrity typo before adding new Phase 3 relations.
drop policy if exists product_regulatory_assessments_insert_collaborator on public.product_regulatory_assessments;
drop policy if exists product_regulatory_assessments_update_collaborator on public.product_regulatory_assessments;

create policy product_regulatory_assessments_insert_collaborator
on public.product_regulatory_assessments
for insert to authenticated
with check (
  private.has_org_role(org_id, (select auth.uid()), array['owner','admin','editor','reviewer'])
  and exists (
    select 1
    from public.products p
    where p.id = product_regulatory_assessments.product_id
      and p.org_id = product_regulatory_assessments.org_id
  )
  and (assessed_by is null or assessed_by = (select auth.uid()))
);

create policy product_regulatory_assessments_update_collaborator
on public.product_regulatory_assessments
for update to authenticated
using (private.has_org_role(org_id, (select auth.uid()), array['owner','admin','editor','reviewer']))
with check (
  private.has_org_role(org_id, (select auth.uid()), array['owner','admin','editor','reviewer'])
  and exists (
    select 1
    from public.products p
    where p.id = product_regulatory_assessments.product_id
      and p.org_id = product_regulatory_assessments.org_id
  )
  and (assessed_by is null or assessed_by = (select auth.uid()))
);

create table if not exists public.regulatory_action_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  regulation_code text not null,
  action_key text not null,
  title text not null,
  kind text not null,
  severity text not null,
  status text not null default 'open',
  rationale text not null,
  source_url text not null,
  source_reference text not null,
  engine_version text not null,
  assignee_id uuid null references public.profiles(id) on delete set null,
  due_date date null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint regulatory_action_items_kind_check check (kind in ('information','review','evidence')),
  constraint regulatory_action_items_severity_check check (severity in ('medium','high','blocking')),
  constraint regulatory_action_items_status_check check (status in ('open','in_progress','done','dismissed')),
  constraint regulatory_action_items_regulation_code_length check (char_length(regulation_code) between 1 and 80),
  constraint regulatory_action_items_action_key_length check (char_length(action_key) between 1 and 120),
  constraint regulatory_action_items_title_length check (char_length(title) between 1 and 500),
  constraint regulatory_action_items_rationale_length check (char_length(rationale) between 1 and 5000),
  constraint regulatory_action_items_source_url_check check (char_length(source_url) <= 2000 and source_url ~ '^https://[^[:space:]]+$'),
  constraint regulatory_action_items_source_reference_length check (char_length(source_reference) between 1 and 1000),
  constraint regulatory_action_items_engine_version_length check (char_length(engine_version) between 1 and 120),
  constraint regulatory_action_items_unique_version unique (product_id, action_key, engine_version)
);

create index if not exists regulatory_action_items_org_status_due_idx
  on public.regulatory_action_items (org_id, status, due_date);
create index if not exists regulatory_action_items_product_idx
  on public.regulatory_action_items (product_id, created_at desc);
create index if not exists regulatory_action_items_assignee_idx
  on public.regulatory_action_items (assignee_id)
  where assignee_id is not null;

alter table public.regulatory_action_items enable row level security;

create policy regulatory_action_items_select_member
on public.regulatory_action_items
for select to authenticated
using (private.is_org_member(org_id, (select auth.uid())));

create policy regulatory_action_items_insert_collaborator
on public.regulatory_action_items
for insert to authenticated
with check (
  created_by = (select auth.uid())
  and private.has_org_role(org_id, (select auth.uid()), array['owner','admin','editor','reviewer'])
  and exists (
    select 1 from public.products p
    where p.id = regulatory_action_items.product_id
      and p.org_id = regulatory_action_items.org_id
  )
);

create policy regulatory_action_items_update_collaborator
on public.regulatory_action_items
for update to authenticated
using (private.has_org_role(org_id, (select auth.uid()), array['owner','admin','editor','reviewer']))
with check (
  private.has_org_role(org_id, (select auth.uid()), array['owner','admin','editor','reviewer'])
  and exists (
    select 1 from public.products p
    where p.id = regulatory_action_items.product_id
      and p.org_id = regulatory_action_items.org_id
  )
);

create policy regulatory_action_items_delete_admin
on public.regulatory_action_items
for delete to authenticated
using (private.has_org_role(org_id, (select auth.uid()), array['owner','admin']));

create or replace function private.touch_regulatory_action_item()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.touch_regulatory_action_item() from public, anon, authenticated;

drop trigger if exists regulatory_action_items_touch_updated_at on public.regulatory_action_items;
create trigger regulatory_action_items_touch_updated_at
before update on public.regulatory_action_items
for each row execute function private.touch_regulatory_action_item();

-- Extend the official framework catalogue. These rows are references, not automatically-materialised obligations.
insert into public.regulations (code, title, jurisdiction, sector, source_url, effective_from, status, summary)
values
  ('2012/19/EU', 'Directive relative aux déchets d’équipements électriques et électroniques (DEEE/WEEE)', 'EU', 'cross-sector', 'https://eur-lex.europa.eu/eli/dir/2012/19/oj', date '2012-08-13', 'active', 'Cadre DEEE avec champ ouvert depuis le 15 août 2018, sous réserve des exclusions.'),
  ('EU 2023/1542', 'Règlement relatif aux batteries et aux déchets de batteries', 'EU', 'cross-sector', 'https://eur-lex.europa.eu/eli/reg/2023/1542/oj', date '2023-08-17', 'active', 'Couvre notamment les batteries incorporées ou ajoutées à des produits, avec obligations progressives selon la catégorie.'),
  ('EU 2025/40', 'Règlement relatif aux emballages et aux déchets d’emballages (PPWR)', 'EU', 'cross-sector', 'https://eur-lex.europa.eu/eli/reg/2025/40/oj', date '2026-08-12', 'active', 'S’applique à tous les emballages depuis le 12 août 2026, avec exigences et responsabilités selon le rôle de l’opérateur.'),
  ('EU 2024/1781', 'Règlement écoconception pour des produits durables (ESPR)', 'EU', 'cross-sector', 'https://eur-lex.europa.eu/eli/reg/2024/1781/oj', date '2024-07-18', 'active', 'Cadre permettant des exigences et passeports numériques par groupes de produits via actes délégués ; ne crée pas un DPP universel immédiat.'),
  ('EU 2025/2509', 'Règlement relatif à la sécurité des jouets', 'EU', 'consumer', 'https://eur-lex.europa.eu/eli/reg/2025/2509/oj', date '2030-08-01', 'upcoming', 'Remplacera le cadre principal de la directive 2009/48/CE à compter du 1er août 2030, sous réserve de dispositions déjà applicables avant cette date.')
on conflict (code) do update set
  title = excluded.title,
  jurisdiction = excluded.jurisdiction,
  sector = excluded.sector,
  source_url = excluded.source_url,
  effective_from = excluded.effective_from,
  status = excluded.status,
  summary = excluded.summary,
  updated_at = now();

commit;
