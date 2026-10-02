-- CreateTable
CREATE TABLE "StaffNote" (
    "id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "applicationId" TEXT,
    "enquiryId" TEXT,
    "authorId" TEXT,
    "authorName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StaffNote_applicationId_idx" ON "StaffNote"("applicationId");

-- CreateIndex
CREATE INDEX "StaffNote_enquiryId_idx" ON "StaffNote"("enquiryId");

-- AddForeignKey
ALTER TABLE "StaffNote" ADD CONSTRAINT "StaffNote_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffNote" ADD CONSTRAINT "StaffNote_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "Enquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffNote" ADD CONSTRAINT "StaffNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

