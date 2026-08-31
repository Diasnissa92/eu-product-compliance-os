-- Include the selected official category in matching and bound search payloads.

update public.safety_gate_watches
set keywords = array_append(keywords, btrim(category)), updated_at = now()
where nullif(btrim(category), '') is not null
  and char_length(btrim(category)) between 3 and 120
  and cardinality(keywords) < 20
  and not exists (
    select 1 from unnest(safety_gate_watches.keywords) keyword
    where lower(btrim(keyword)) = lower(btrim(safety_gate_watches.category))
  );

alter table public.safety_gate_watches drop constraint if exists safety_gate_watches_keywords_size_check;
alter table public.safety_gate_watches add constraint safety_gate_watches_keywords_size_check
  check (octet_length(array_to_string(keywords, ',')) between 3 and 4000);
