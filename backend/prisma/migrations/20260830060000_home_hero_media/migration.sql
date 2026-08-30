UPDATE "PageContent"
SET "content" = jsonb_set("content", '{hero,backgroundImage}', '"/images/hero-global-background.svg"'::jsonb, true)
WHERE "slug" = 'home' AND NOT ("content"->'hero' ? 'backgroundImage');
