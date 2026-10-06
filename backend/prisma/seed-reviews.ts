import type { PrismaClient } from "../generated/prisma/index.js";

// Sample student reviews for the Education page's testimonials. They are
// demo data: invented names and words, with illustrated portraits that stand
// in for profile photos. Each has a fixed id, so seeding again neither
// duplicates them nor undoes a change the team has made to one.
const daysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(10, 30, 0, 0);
  return date;
};

export const educationReviews = [
  {
    id: "seed-review-education-1",
    name: "Tanvir Ahmed",
    detail: "MBBS, Malaysia",
    rating: 5,
    body: "Bengal Port compared three universities for me with the real costs side by side. I knew exactly what I was signing up for before I paid anything.",
    photoUrl: "/images/reviews/tanvir-ahmed.webp",
    createdAt: daysAgo(6),
  },
  {
    id: "seed-review-education-2",
    name: "Nusrat Jahan",
    detail: "BSc Computer Science, UK",
    rating: 5,
    body: "They checked my documents twice and told me what the visa interview would ask. My offer letter arrived within six weeks.",
    photoUrl: "/images/reviews/nusrat-jahan.webp",
    createdAt: daysAgo(19),
  },
  {
    id: "seed-review-education-3",
    name: "Mehedi Hasan",
    detail: "Mechanical Engineering, China",
    rating: 4,
    body: "Honest advice about which programs were worth it and which were not. The scholarship they found covers half of my tuition.",
    photoUrl: "/images/reviews/mehedi-hasan.webp",
    createdAt: daysAgo(33),
  },
  {
    id: "seed-review-education-4",
    name: "Farhana Islam",
    detail: "MBA, Canada",
    rating: 5,
    body: "From the shortlist to the airport, one coordinator stayed with me. Every deadline was in my hands weeks before it mattered.",
    photoUrl: "/images/reviews/farhana-islam.webp",
    createdAt: daysAgo(47),
  },
  {
    id: "seed-review-education-5",
    name: "Sakib Rahman",
    detail: "Dentistry (BDS), Australia",
    rating: 5,
    body: "I had almost given up after two refusals elsewhere. Bengal Port rebuilt my application and the admission came through.",
    photoUrl: "/images/reviews/sakib-rahman.webp",
    createdAt: daysAgo(61),
  },
];

export async function seedEducationReviews(prisma: PrismaClient) {
  for (const review of educationReviews)
    await prisma.review.upsert({
      where: { id: review.id },
      update: {},
      create: { ...review, division: "EDUCATION", status: "APPROVED" },
    });
}
