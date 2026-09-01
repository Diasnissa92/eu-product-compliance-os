begin;

update public.regulations
set effective_from = date '2024-02-18',
    summary = 'S’applique généralement depuis le 18 février 2024, avec des dates différées pour certaines dispositions. Couvre notamment les batteries incorporées ou ajoutées à des produits.',
    updated_at = now()
where code = 'EU 2023/1542';

commit;
