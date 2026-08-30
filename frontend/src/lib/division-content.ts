export type DivisionContent = {
  hero: {
    eyebrow: string;
    title: string;
    tagline: string;
    description: string;
    image: string;
    primary: string;
    secondary: string;
  };
  shortcuts: Array<{
    icon: string;
    title: string;
    subtitle: string;
    href: string;
  }>;
  services: {
    eyebrow: string;
    title: string;
    description: string;
    items: Array<{
      icon: string;
      title: string;
      description: string;
      href: string;
    }>;
  };
  stats: Array<{ value: string; label: string; icon: string }>;
  feature: {
    eyebrow: string;
    title: string;
    description: string;
    points: Array<{ title: string; description: string }>;
  };
  directory: { eyebrow: string; title: string; description: string };
  process: {
    eyebrow: string;
    title: string;
    description: string;
    steps: Array<{ number: string; title: string; description: string }>;
  };
  closing: {
    title: string;
    description: string;
    primary: string;
    secondary: string;
  };
};
export const defaultEducationContent: DivisionContent = {
  hero: {
    eyebrow: "GLOBAL EDUCATION",
    title: "Study beyond borders.",
    tagline: "Choose clearly. Apply confidently.",
    description:
      "Explore trusted institutions, relevant programs and international study destinations with practical guidance from shortlist to admission.",
      image: "/images/global-education.webp",
    primary: "Start education enquiry",
    secondary: "Explore programs",
  },
  shortcuts: [
    {
      icon: "map",
      title: "Study Destinations",
      subtitle: "Compare countries",
      href: "#directory",
    },
    {
      icon: "building",
      title: "Universities",
      subtitle: "Trusted institutions",
      href: "#directory",
    },
    {
      icon: "book",
      title: "Programs",
      subtitle: "Find the right course",
      href: "#services",
    },
    {
      icon: "stethoscope",
      title: "MBBS Pathways",
      subtitle: "Medical education",
      href: "#directory",
    },
    {
      icon: "award",
      title: "Scholarships",
      subtitle: "Funding opportunities",
      href: "/opportunities",
    },
  ],
  services: {
    eyebrow: "EDUCATION SUPPORT",
    title: "A clearer international study pathway",
    description:
      "Relevant advice and coordinated support at every important decision.",
    items: [
      {
        icon: "compass",
        title: "Destination guidance",
        description:
          "Compare countries by program quality, entry requirements, budget and student experience.",
        href: "#directory",
      },
      {
        icon: "search",
        title: "Program selection",
        description:
          "Shortlist programs aligned with your academic background and long-term goals.",
        href: "#directory",
      },
      {
        icon: "file",
        title: "Admission support",
        description:
          "Prepare applications, documents and submission timelines with clear guidance.",
        href: "/apply?tab=education",
      },
      {
        icon: "stethoscope",
        title: "MBBS opportunities",
        description:
          "Review international medical programs, eligibility and application pathways.",
        href: "#directory",
      },
      {
        icon: "briefcase",
        title: "Business programs",
        description:
          "Discover undergraduate and postgraduate business pathways worldwide.",
        href: "#directory",
      },
      {
        icon: "settings",
        title: "Engineering programs",
        description:
          "Explore relevant technical and engineering programs at partner institutions.",
        href: "#directory",
      },
    ],
  },
  stats: [
    { value: "12+", label: "Study destinations", icon: "map" },
    { value: "50+", label: "Partner institutions", icon: "building" },
    { value: "120+", label: "Programs", icon: "book" },
    { value: "95%", label: "Guided applications", icon: "file" },
  ],
  feature: {
    eyebrow: "CHOOSE WITH CONFIDENCE",
    title: "The right program matters more than the longest list.",
    description:
      "We help students compare realistic options and understand what each decision means before submitting an application.",
    points: [
      {
        title: "Profile-led shortlisting",
        description:
          "Recommendations shaped around academic history, budget and career direction.",
      },
      {
        title: "Transparent requirements",
        description:
          "Clear eligibility, document and deadline information before you proceed.",
      },
      {
        title: "Human application support",
        description:
          "A coordinator remains available through admission and preparation.",
      },
    ],
  },
  directory: {
    eyebrow: "LIVE EDUCATION NETWORK",
    title: "Institutions and programs",
    description:
      "Search current institution and program records maintained by Bengal Port.",
  },
  process: {
    eyebrow: "YOUR APPLICATION JOURNEY",
    title: "From ambition to admission.",
    description:
      "A transparent process makes international education decisions easier.",
    steps: [
      {
        number: "01",
        title: "Share your profile",
        description:
          "Tell us your education, destination preferences and intended subject.",
      },
      {
        number: "02",
        title: "Build a shortlist",
        description:
          "Compare suitable institutions, programs, costs and entry requirements.",
      },
      {
        number: "03",
        title: "Prepare and apply",
        description:
          "Complete documents and applications with coordinated support.",
      },
      {
        number: "04",
        title: "Plan your next move",
        description:
          "Receive guidance for offer acceptance and pre-departure preparation.",
      },
    ],
  },
  closing: {
    title: "Ready to find your international study path?",
    description:
      "Start with your goals. We will help you identify the clearest realistic options.",
    primary: "Start education enquiry",
    secondary: "Speak with an adviser",
  },
};
export const defaultHealthcareContent: DivisionContent = {
  hero: {
    eyebrow: "GLOBAL HEALTHCARE",
    title: "Care, connected globally.",
    tagline: "Trusted direction. Human support.",
    description:
      "Connect with international hospitals, specialists and treatment pathways while Bengal Port coordinates the practical details around your care.",
      image: "/images/global-healthcare.webp",
    primary: "Request healthcare support",
    secondary: "Explore hospitals",
  },
  shortcuts: [
    {
      icon: "hospital",
      title: "Partner Hospitals",
      subtitle: "Trusted facilities",
      href: "#directory",
    },
    {
      icon: "heart",
      title: "Health Checkups",
      subtitle: "Preventive screening",
      href: "#services",
    },
    {
      icon: "stethoscope",
      title: "Specialists",
      subtitle: "Clinical direction",
      href: "#directory",
    },
    {
      icon: "activity",
      title: "Surgery Support",
      subtitle: "Coordinated treatment",
      href: "#services",
    },
    {
      icon: "plane",
      title: "Patient Assistance",
      subtitle: "Travel-ready support",
      href: "#process",
    },
  ],
  services: {
    eyebrow: "PATIENT SERVICES",
    title: "International care with local coordination",
    description:
      "A supportive pathway before, during and after international treatment.",
    items: [
      {
        icon: "heart",
        title: "Health checkups",
        description:
          "Compare comprehensive and executive screening options at partner hospitals.",
        href: "#directory",
      },
      {
        icon: "stethoscope",
        title: "Specialist treatment",
        description:
          "Identify appropriate hospitals and clinical specialties for your needs.",
        href: "#directory",
      },
      {
        icon: "activity",
        title: "Surgery coordination",
        description:
          "Support for medical review, appointments, scheduling and preparation.",
        href: "/apply?tab=healthcare",
      },
      {
        icon: "file",
        title: "Medical records",
        description:
          "Organize reports and relevant information for hospital review.",
        href: "/apply?tab=healthcare",
      },
      {
        icon: "plane",
        title: "Travel planning",
        description:
          "Practical international patient guidance around appointments and travel.",
        href: "#process",
      },
      {
        icon: "headset",
        title: "Patient support",
        description:
          "A clear point of contact throughout the coordination journey.",
        href: "/contact",
      },
    ],
  },
  stats: [
    { value: "8+", label: "Healthcare destinations", icon: "map" },
    { value: "30+", label: "Partner hospitals", icon: "hospital" },
    { value: "20+", label: "Treatment categories", icon: "heart" },
    { value: "24/7", label: "Patient coordination", icon: "headset" },
  ],
  feature: {
    eyebrow: "CARE WITH CLARITY",
    title: "Important health decisions deserve a calm, accountable process.",
    description:
      "Bengal Port does not replace medical advice. We help patients reach suitable providers and understand the coordination pathway.",
    points: [
      {
        title: "Needs-led hospital direction",
        description:
          "Options considered around specialty, destination and patient preference.",
      },
      {
        title: "Clear pre-arrival coordination",
        description:
          "Appointments and information organized before international travel.",
      },
      {
        title: "Family-aware support",
        description:
          "Practical communication for patients and accompanying family members.",
      },
    ],
  },
  directory: {
    eyebrow: "LIVE HEALTHCARE NETWORK",
    title: "Partner hospitals and services",
    description:
      "Browse hospital and service records maintained by Bengal Port.",
  },
  process: {
    eyebrow: "PATIENT JOURNEY",
    title: "A supported route to international care.",
    description: "Every step remains understandable and coordinated.",
    steps: [
      {
        number: "01",
        title: "Share the care need",
        description:
          "Provide contact details, treatment category and available medical information.",
      },
      {
        number: "02",
        title: "Review suitable options",
        description:
          "Receive hospital or service directions aligned with the stated need.",
      },
      {
        number: "03",
        title: "Coordinate appointments",
        description:
          "Confirm provider review, estimated timing and appointment arrangements.",
      },
      {
        number: "04",
        title: "Prepare for treatment",
        description:
          "Organize practical pre-arrival information and ongoing support.",
      },
    ],
  },
  closing: {
    title: "Need help finding the right care pathway?",
    description:
      "Tell us what support you need and our healthcare coordination team will respond.",
    primary: "Request healthcare support",
    secondary: "Contact patient support",
  },
};
