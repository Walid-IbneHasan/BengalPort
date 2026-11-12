-- The MODERATOR role is added by the migration before this one, alone in its
-- file: PostgreSQL 10 and older refuse ADD VALUE beside other statements.
-- Hisab Kitab entries can name the customer's account and application, and
-- the payment or refund they record.
ALTER TABLE "FinancialTransaction" ADD COLUMN     "applicationId" TEXT,
ADD COLUMN     "paymentId" TEXT,
ADD COLUMN     "refundId" TEXT,
ADD COLUMN     "userId" TEXT;

-- More photos for hospitals and institutions, and the Education pages an
-- institution is listed on.
ALTER TABLE "Hospital" ADD COLUMN     "gallery" TEXT[] DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "Institution" ADD COLUMN     "fields" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "gallery" TEXT[] DEFAULT ARRAY[]::TEXT[];

CREATE UNIQUE INDEX "FinancialTransaction_paymentId_key" ON "FinancialTransaction"("paymentId");

CREATE UNIQUE INDEX "FinancialTransaction_refundId_key" ON "FinancialTransaction"("refundId");

CREATE INDEX "FinancialTransaction_date_idx" ON "FinancialTransaction"("date");

CREATE INDEX "FinancialTransaction_userId_idx" ON "FinancialTransaction"("userId");

ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_refundId_fkey" FOREIGN KEY ("refundId") REFERENCES "Refund"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- The Healthcare page's destinations: Delhi in place of Chennai, Beijing in
-- place of Istanbul, also in a page the administrator has already saved.
UPDATE "PageContent"
SET "content" = replace(replace("content"::text, 'Chennai, India', 'Delhi, India'), 'Istanbul, Turkey', 'Beijing, China')::jsonb
WHERE "slug" = 'healthcare';
