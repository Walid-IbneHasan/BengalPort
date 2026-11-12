-- Opportunity categories become a list the administrator can add to.
ALTER TABLE "Opportunity" ALTER COLUMN "category" TYPE TEXT USING "category"::TEXT;
DROP TYPE "OpportunityCategory";

CREATE TABLE "OpportunityCategory" (
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpportunityCategory_pkey" PRIMARY KEY ("value")
);

CREATE UNIQUE INDEX "OpportunityCategory_label_key" ON "OpportunityCategory"("label");

-- The original eight, dated in the order they have always been listed.
INSERT INTO "OpportunityCategory" ("value", "label", "createdAt") VALUES
    ('BUSINESS', 'Business', '2026-01-01 00:00:01'),
    ('EDUCATION', 'Education', '2026-01-01 00:00:02'),
    ('HEALTHCARE', 'Healthcare', '2026-01-01 00:00:03'),
    ('UMRAH', 'Umrah', '2026-01-01 00:00:04'),
    ('FACTORY_VISIT', 'Factory visit', '2026-01-01 00:00:05'),
    ('BUSINESS_TOUR', 'Business tour', '2026-01-01 00:00:06'),
    ('SCHOLARSHIP', 'Scholarship', '2026-01-01 00:00:07'),
    ('EVENT', 'Event', '2026-01-01 00:00:08');
