UPDATE "PageContent"
SET "content" = jsonb_set(
  jsonb_set(
    "content",
    '{utility,message}',
    to_jsonb('Your Global Partner for Business • Education • Healthcare • Umrah'::text),
    true
  ),
  '{hero,description1}',
  to_jsonb('Your trusted partner in international trade, global education, healthcare and Umrah services.'::text),
  true
)
WHERE "slug" = 'home';
