// The About, Services and Contact pages: what an administrator can edit, and
// the built-in wording shown until they do (or when the API is unreachable).
// The phone number, email and office address on the Contact page come from
// the homepage content, so that they are edited in one place.

type Heading = { eyebrow: string; title: string; description: string };

export type AboutContent = {
  hero: Heading;
  intro: Heading;
  values: Array<{ title: string; description: string }>;
  work: Heading & { button: string; points: string[] };
};

export type ServiceGroup = { title: string; image: string; items: string[] };
export type ServicesContent = {
  hero: Heading;
  groups: Record<"business" | "education" | "healthcare" | "umrah", ServiceGroup>;
};

export type ContactContent = {
  hero: Heading;
  hours: string;
  card: { title: string; description: string; button: string };
};

export const defaultAboutContent: AboutContent = {
  hero: {
    eyebrow: "ABOUT BENGAL PORT",
    title: "Connection with purpose.",
    description: "We help individuals and organisations move from ambition to a clear, supported international pathway.",
  },
  intro: {
    eyebrow: "WHO WE ARE",
    title: "One port. Four trusted pathways.",
    description:
      "Bengal Port is a multidisciplinary connection and coordination company serving business, education, healthcare and Umrah travel needs with local accountability.",
  },
  values: [
    { title: "Our Mission", description: "Make trusted international opportunities easier to understand, access and complete." },
    { title: "Our Vision", description: "A connected Bengal confidently participating in global business, education, healthcare and Umrah travel." },
    { title: "Global Network", description: "A growing network of suppliers, institutions, hospitals and service partners." },
  ],
  work: {
    eyebrow: "WHAT WE DO",
    title: "We coordinate the details that global opportunity demands.",
    description: "From verification and introductions to applications, visits and patient support, our team keeps every step visible and accountable.",
    button: "EXPLORE SERVICES",
    points: ["Verified partner direction", "Human support from enquiry to completion", "Cross-border knowledge and coordination"],
  },
};

export const defaultServicesContent: ServicesContent = {
  hero: {
    eyebrow: "OUR SERVICES",
    title: "Global support, clearly coordinated.",
    description: "Practical guidance and accountable support across business, education, healthcare and Umrah.",
  },
  groups: {
    business: {
      title: "Global Business",
      image: "/images/services-business.webp",
      items: ["International Sourcing", "Supplier Connections", "Factory Visits", "Business Tours", "Trade Facilitation"],
    },
    education: {
      title: "Global Education",
      image: "/images/services-education.webp",
      items: ["Study Abroad", "University Information", "Admission Guidance", "MBBS Opportunities", "Engineering Programs"],
    },
    healthcare: {
      title: "Global Healthcare",
      image: "/images/services-healthcare.webp",
      items: ["Hospital Connections", "International Treatment", "Health Checkups", "Surgery Coordination", "Patient Support"],
    },
    umrah: {
      title: "Global Umrah",
      image: "/images/services-umrah.webp",
      items: ["Umrah Visa Support", "Flight Coordination", "Makkah and Madinah Stay", "Ground Transport", "Ziyarat Guidance"],
    },
  },
};

export const defaultContactContent: ContactContent = {
  hero: {
    eyebrow: "CONTACT US",
    title: "Let’s start the conversation.",
    description: "Contact the Bengal Port team for business, education, healthcare or Umrah support.",
  },
  hours: "Saturday–Thursday, 9:00–18:00",
  card: {
    title: "Send an enquiry",
    description: "Use our enquiry form to route your request to the right division.",
    button: "APPLY / ENQUIRY",
  },
};
