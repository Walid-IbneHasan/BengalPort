UPDATE "PageContent"
SET "content" = replace(
  replace(
    replace(
      replace("content"::text, '/images/business-hero-port-v2.png', '/images/business-hero-port-v2.webp'),
      '/images/global-business.png', '/images/global-business.webp'
    ),
    '/images/global-education.png', '/images/global-education.webp'
  ),
  '/images/global-healthcare.png', '/images/global-healthcare.webp'
)::jsonb;

UPDATE "Opportunity" SET "image" = replace("image", '.png', '.webp') WHERE "image" IN ('/images/global-business.png','/images/global-education.png','/images/global-healthcare.png');
UPDATE "Supplier" SET "image" = '/images/global-business.webp' WHERE "image" = '/images/global-business.png';
UPDATE "Factory" SET "image" = '/images/global-business.webp' WHERE "image" = '/images/global-business.png';
UPDATE "Institution" SET "image" = '/images/global-education.webp' WHERE "image" = '/images/global-education.png';
UPDATE "Hospital" SET "image" = '/images/global-healthcare.webp' WHERE "image" = '/images/global-healthcare.png';
