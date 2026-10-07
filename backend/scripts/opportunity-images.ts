// Points the three seeded opportunities at their own pictures (October 2026),
// for a database seeded before those pictures existed. Safe to run again.
import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";

const pictures: Record<string, string> = {
  "china-sourcing-tour": "/images/opp-china-sourcing.webp",
  "international-mbbs-2026": "/images/opp-mbbs-admissions.webp",
  "executive-health-check": "/images/opp-health-checkup.webp",
};

for (const [slug, image] of Object.entries(pictures)) {
  const result = await prisma.opportunity.updateMany({ where: { slug }, data: { image } });
  console.log(slug, result.count ? "updated" : "not found");
}
await prisma.$disconnect();
