ALTER TYPE "EnquiryType" ADD VALUE IF NOT EXISTS 'UMRAH';
ALTER TYPE "OpportunityCategory" ADD VALUE IF NOT EXISTS 'UMRAH';

UPDATE "PageContent"
SET "content" = jsonb_set(
  "content",
  '{divisions}',
  COALESCE("content"->'divisions', '[]'::jsonb) ||
  '[{"key":"umrah","title":"GLOBAL UMRAH","subtitle":"Visa. Travel. Stay. Ziyarat","cta":"EXPLORE UMRAH","href":"/umrah","image":"/images/global-umrah.webp"}]'::jsonb,
  true
)
WHERE "slug" = 'home'
  AND NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(COALESCE("content"->'divisions', '[]'::jsonb)) AS division
    WHERE division->>'key' = 'umrah'
  );
