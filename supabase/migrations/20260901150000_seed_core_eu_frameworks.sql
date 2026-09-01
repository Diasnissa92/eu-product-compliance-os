insert into public.regulations (code, title, jurisdiction, sector, source_url, status, summary, effective_from)
values
  ('EU-2023-988', 'Règlement (UE) 2023/988 relatif à la sécurité générale des produits', 'EU', 'cross-sector', 'https://eur-lex.europa.eu/eli/reg/2023/988/oj', 'active', 'Cadre général de sécurité des produits. L’articulation avec les législations sectorielles et les exclusions doit être évaluée produit par produit.', '2024-12-13'),
  ('EU-2014-35', 'Directive 2014/35/UE relative au matériel électrique destiné à être employé dans certaines limites de tension', 'EU', 'consumer', 'https://eur-lex.europa.eu/eli/dir/2014/35/oj', 'active', 'Directive basse tension. La plage de tension, le champ et les exclusions doivent être vérifiés avant toute conclusion d’applicabilité.', '2016-04-20'),
  ('EU-2014-30', 'Directive 2014/30/UE relative à la compatibilité électromagnétique', 'EU', 'consumer', 'https://eur-lex.europa.eu/eli/dir/2014/30/oj', 'active', 'Cadre EMC. Le champ, les exclusions et les interactions avec d’autres législations doivent être vérifiés.', '2016-04-20'),
  ('EU-2011-65', 'Directive 2011/65/UE relative à la limitation de certaines substances dangereuses dans les EEE', 'EU', 'consumer', 'https://eur-lex.europa.eu/eli/dir/2011/65/oj', 'active', 'Cadre RoHS. La qualification EEE, les catégories, exclusions et exemptions doivent être vérifiées.', '2013-01-03'),
  ('EU-2014-53', 'Directive 2014/53/UE relative aux équipements radioélectriques', 'EU', 'consumer', 'https://eur-lex.europa.eu/eli/dir/2014/53/oj', 'active', 'Cadre RED pour les équipements radioélectriques. La définition, le champ et les exigences applicables doivent être vérifiés.', '2016-06-13'),
  ('EU-2009-48', 'Directive 2009/48/CE relative à la sécurité des jouets', 'EU', 'consumer', 'https://eur-lex.europa.eu/eli/dir/2009/48/oj', 'active', 'Cadre jouets. La qualification du produit, l’usage prévu, les utilisateurs et les exclusions doivent être vérifiés.', '2011-07-20'),
  ('EU-2016-425', 'Règlement (UE) 2016/425 relatif aux équipements de protection individuelle', 'EU', 'consumer', 'https://eur-lex.europa.eu/eli/reg/2016/425/oj', 'active', 'Cadre EPI. La définition, la catégorie de risque et les exclusions doivent être qualifiées.', '2018-04-21'),
  ('EU-2006-42', 'Directive 2006/42/CE relative aux machines', 'EU', 'cross-sector', 'https://eur-lex.europa.eu/eli/dir/2006/42/oj', 'active', 'Cadre Machines applicable avant l’application générale du règlement (UE) 2023/1230, sous réserve des dispositions de transition.', '2009-12-29'),
  ('EU-2023-1230', 'Règlement (UE) 2023/1230 sur les machines', 'EU', 'cross-sector', 'https://eur-lex.europa.eu/eli/reg/2023/1230/oj', 'upcoming', 'Règlement Machines en vigueur avec application générale à partir du 14 janvier 2027, sous réserve des dispositions dont les dates diffèrent.', '2027-01-14')
on conflict (code) do update set
  title = excluded.title,
  jurisdiction = excluded.jurisdiction,
  sector = excluded.sector,
  source_url = excluded.source_url,
  status = excluded.status,
  summary = excluded.summary,
  effective_from = excluded.effective_from,
  updated_at = now();
