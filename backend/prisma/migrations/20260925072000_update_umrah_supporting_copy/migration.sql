UPDATE "PageContent"
SET "content" = jsonb_set(
  "content",
  '{featured,description}',
  to_jsonb('Explore curated connections, visits, programs and services across our four service pathways.'::text),
  true
)
WHERE "slug" = 'home';
