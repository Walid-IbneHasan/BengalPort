// Built-in wording of the About, Services and Contact pages, served until an
// administrator saves their own. The phone number, email and office address
// shown on the Contact page belong to the homepage content (header and
// footer), so that they are edited in one place.

export const defaultAboutContent = {
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

export const defaultServicesContent = {
  hero: {
    eyebrow: "OUR SERVICES",
    title: "Global support, clearly coordinated.",
    description: "Practical guidance and accountable support across business, education, healthcare and Umrah.",
  },
  groups: {
    business: {
      title: "Global Business",
      image: "/images/global-business.webp",
      items: ["International Sourcing", "Supplier Connections", "Factory Visits", "Business Tours", "Trade Facilitation"],
    },
    education: {
      title: "Global Education",
      image: "/images/global-education.webp",
      items: ["Study Abroad", "University Information", "Admission Guidance", "MBBS Opportunities", "Engineering Programs"],
    },
    healthcare: {
      title: "Global Healthcare",
      image: "/images/global-healthcare.webp",
      items: ["Hospital Connections", "International Treatment", "Health Checkups", "Surgery Coordination", "Patient Support"],
    },
    umrah: {
      title: "Global Umrah",
      image: "/images/global-umrah.webp",
      items: ["Umrah Visa Support", "Flight Coordination", "Makkah and Madinah Stay", "Ground Transport", "Ziyarat Guidance"],
    },
  },
};

export const defaultContactContent = {
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
