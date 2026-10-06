import { fillMissing } from "./content-fields.js";

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
// One of the Education page's three fields of study.
export type StudyFieldContent = {
  title: string;
  tagline: string;
  heading: string;
  description: string;
  points: string[];
  subjects: string[];
  cta: string;
  // The picture on the option at the top of the page, and the photo in the
  // section it leads to.
  image: string;
  photo: string;
};
// The Education page has its own layout: four options (three fields of study
// and the student reviews) in place of the shortcuts row. The reviews
// themselves are written by customers; this is the section's wording.
export type EducationContent = Omit<DivisionContent, "shortcuts"> & {
  // `shortDescription` is the lede phones show in place of the description.
  hero: DivisionContent["hero"] & { shortDescription: string };
  fields: Record<"medical" | "engineering" | "general", StudyFieldContent>;
  reviews: {
    title: string;
    tagline: string;
    eyebrow: string;
    heading: string;
    description: string;
    invite: string;
    cta: string;
    image: string;
    photo: string;
  };
  destinations: { eyebrow: string; title: string; description: string };
};
// The Healthcare page: the hero names the specialties and shows a three-step
// pathway, the treatments index replaces the service cards, and the chips
// around the title are destinations from the live hospitals, topped up from
// `hero.cities`.
export type HealthcareContent = Omit<DivisionContent, "shortcuts" | "services"> & {
  hero: DivisionContent["hero"] & {
    specialties: string[];
    pathway: Array<{ icon: string; title: string; description: string }>;
    cities: string[];
  };
  treatmentsHeading: { eyebrow: string; title: string; description: string };
  treatments: Array<{ title: string; image: string; description: string; procedures: string[]; cta: string }>;
  reviews: { eyebrow: string; heading: string; description: string; invite: string; cta: string; photo: string };
};
// The Umrah page: the hero names the kind of journey and lists the next
// group departures; packages and the four stages of the journey replace the
// service cards. A package with a tag is the highlighted one.
export type UmrahContent = Omit<DivisionContent, "services" | "directory"> & {
  hero: DivisionContent["hero"] & { journeys: string[]; departures: Array<{ date: string; label: string }> };
  packagesHeading: { eyebrow: string; title: string; description: string };
  packages: Array<{
    name: string;
    tag: string;
    nights: string;
    makkahHotel: string;
    madinahHotel: string;
    distance: string;
    price: string;
    inclusions: string[];
    cta: string;
  }>;
  stagesHeading: { eyebrow: string; title: string; description: string };
  stages: Array<{ title: string; subtitle: string; image: string; points: string[] }>;
  reviews: { eyebrow: string; heading: string; description: string; invite: string; cta: string; photo: string };
};
export const defaultEducationContent: EducationContent = {
  hero: {
    eyebrow: "GLOBAL EDUCATION",
    title: "Study beyond borders.",
    tagline: "Choose clearly. Apply confidently.",
    description:
      "Explore trusted institutions, relevant programs and international study destinations with practical guidance from shortlist to admission.",
    shortDescription: "Trusted institutions and programs abroad, with guidance from shortlist to admission.",
    image: "/images/edu-hero.webp",
    primary: "Start education enquiry",
    secondary: "Explore programs",
  },
  fields: {
    medical: {
      title: "Medical",
      tagline: "MBBS, dentistry, nursing, pharmacy",
      heading: "Study medicine abroad",
      description:
        "For students who want to become doctors, dentists, nurses or pharmacists. We explain entry requirements, total cost and how each degree is recognised before you choose where to apply.",
      points: [
        "Your results checked against each university's entry requirements",
        "Tuition, living cost and course length compared side by side",
        "Help with the application, documents and admission interview",
      ],
      subjects: ["MBBS", "Dentistry (BDS)", "Nursing", "Pharmacy", "Public Health"],
      cta: "Apply for medical admission",
      image: "/images/icon-medical.webp",
      photo: "/images/edu-card-medical.webp",
    },
    engineering: {
      title: "Engineering",
      tagline: "Engineering, computing, technology",
      heading: "Study engineering and technology abroad",
      description:
        "For students aiming at engineering, computing or applied technology. We help you match your results and budget to programs at bachelor's and master's level.",
      points: [
        "Programs shortlisted by subject, country and budget",
        "Entry requirements and language tests explained early",
        "Scholarship options and intake dates set out clearly",
      ],
      subjects: ["Civil", "Mechanical", "Electrical and Electronic", "Computer Science", "Software Engineering"],
      cta: "Apply for engineering admission",
      image: "/images/icon-engineering.webp",
      photo: "/images/edu-card-engineering.webp",
    },
    general: {
      title: "General Subjects",
      tagline: "Business, arts, science and more",
      heading: "Business, arts and science degrees",
      description:
        "For every other subject, from business and economics to the sciences, humanities and language courses. Tell us what you want to study and we will find suitable programs.",
      points: [
        "Foundation, bachelor's and master's routes",
        "Subject and university choices explained in plain terms",
        "Support from application to pre-departure",
      ],
      subjects: [
        "Business and Management",
        "Economics and Finance",
        "Natural Sciences",
        "Arts and Humanities",
        "Social Sciences",
        "Language and Foundation",
      ],
      cta: "Apply for admission",
      image: "/images/icon-general.webp",
      photo: "/images/edu-card-general.webp",
    },
  },
  reviews: {
    title: "Student Reviews",
    tagline: "What our students say",
    eyebrow: "STUDENT REVIEWS",
    heading: "Students' experience with Bengal Port",
    description:
      "What students say about choosing a program, applying and preparing to travel with our team.",
    invite:
      "Used our service? Sign in, open your application in your dashboard and write a review. It appears here once our team has approved it.",
    cta: "Write a review",
    image: "/images/icon-reviews.webp",
    photo: "/images/edu-card-reviews.webp",
  },
  destinations: {
    eyebrow: "STUDY DESTINATIONS",
    title: "Where you can study",
    description:
      "Countries where Bengal Port currently lists institutions. Choose one to see what is on offer there.",
  },
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
        href: "#medical",
      },
      {
        icon: "briefcase",
        title: "Business programs",
        description:
          "Discover undergraduate and postgraduate business pathways worldwide.",
        href: "#general",
      },
      {
        icon: "settings",
        title: "Engineering programs",
        description:
          "Explore relevant technical and engineering programs at partner institutions.",
        href: "#engineering",
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
export const defaultHealthcareContent: HealthcareContent = {
  hero: {
    eyebrow: "GLOBAL HEALTHCARE",
    title: "Treatment abroad for",
    specialties: [
      "Cardiology",
      "Oncology",
      "Orthopaedics",
      "Fertility",
      "Dental care",
      "Health check-ups"
    ],
    tagline: "Trusted direction. Human support.",
    description: "Connect with international hospitals, specialists and treatment pathways while Bengal Port coordinates the practical details around your care.",
    image: "/images/global-healthcare.webp",
    primary: "Request healthcare support",
    secondary: "See partner hospitals",
    pathway: [
      {
        icon: "file",
        title: "Diagnosis review",
        description: "Your reports read and your options explained."
      },
      {
        icon: "hospital",
        title: "Hospital match",
        description: "Suitable hospitals and specialists, with costs."
      },
      {
        icon: "plane",
        title: "Travel and care",
        description: "Appointments, travel and a coordinator throughout."
      }
    ],
    cities: [
      "Bangkok, Thailand",
      "Kuala Lumpur, Malaysia",
      "Chennai, India",
      "Istanbul, Turkey",
      "Singapore"
    ]
  },
  treatmentsHeading: {
    eyebrow: "TREATMENTS",
    title: "Treatments we coordinate",
    description: "Choose a specialty to see what we arrange, the usual procedures and the partner hospitals that offer it."
  },
  treatments: [
    {
      title: "Cardiology",
      image: "/images/divisions/care-cardiology.webp",
      description: "Heart care at hospitals with dedicated international patient teams. We help you compare procedures, surgeons and costs before you decide where to go.",
      procedures: [
        "Angiography",
        "Bypass surgery",
        "Valve repair",
        "Pacemaker"
      ],
      cta: "Ask about cardiology"
    },
    {
      title: "Oncology",
      image: "/images/divisions/care-oncology.webp",
      description: "Cancer diagnosis, second opinions and treatment plans from oncology centres abroad, with the practical details handled around you and your family.",
      procedures: [
        "Second opinion",
        "Chemotherapy",
        "Radiotherapy",
        "Cancer surgery"
      ],
      cta: "Ask about oncology"
    },
    {
      title: "Orthopaedics",
      image: "/images/divisions/care-orthopaedics.webp",
      description: "Joint replacement, spine care and sports injuries, with rehabilitation planned before you travel.",
      procedures: [
        "Knee replacement",
        "Hip replacement",
        "Spine surgery",
        "Rehabilitation"
      ],
      cta: "Ask about orthopaedics"
    },
    {
      title: "Fertility",
      image: "/images/divisions/care-fertility.webp",
      description: "Fertility assessment and treatment at clinics with clear success data, timed around your cycle and your travel.",
      procedures: [
        "IVF",
        "ICSI",
        "Fertility assessment",
        "Egg freezing"
      ],
      cta: "Ask about fertility care"
    },
    {
      title: "Dental care",
      image: "/images/divisions/care-dental.webp",
      description: "Implants, crowns and full-mouth treatment at modern dental clinics, often completed within a single trip.",
      procedures: [
        "Implants",
        "Crowns and veneers",
        "Orthodontics",
        "Full-mouth restoration"
      ],
      cta: "Ask about dental care"
    },
    {
      title: "Health check-ups",
      image: "/images/divisions/care-checkups.webp",
      description: "Comprehensive and executive screening packages at partner hospitals, with the results explained in plain language.",
      procedures: [
        "Executive screening",
        "Cardiac screening",
        "Cancer screening",
        "Women's health"
      ],
      cta: "Ask about check-ups"
    }
  ],
  stats: [
    {
      value: "8+",
      label: "Healthcare destinations",
      icon: "map"
    },
    {
      value: "30+",
      label: "Partner hospitals",
      icon: "hospital"
    },
    {
      value: "20+",
      label: "Treatment categories",
      icon: "heart"
    },
    {
      value: "24/7",
      label: "Patient coordination",
      icon: "headset"
    }
  ],
  feature: {
    eyebrow: "CARE WITH CLARITY",
    title: "Important health decisions deserve a calm, accountable process.",
    description: "Bengal Port does not replace medical advice. We help patients reach suitable providers and understand the coordination pathway.",
    points: [
      {
        title: "Needs-led hospital direction",
        description: "Options considered around specialty, destination and patient preference."
      },
      {
        title: "Clear pre-arrival coordination",
        description: "Appointments and information organized before international travel."
      },
      {
        title: "Family-aware support",
        description: "Practical communication for patients and accompanying family members."
      }
    ]
  },
  directory: {
    eyebrow: "LIVE HEALTHCARE NETWORK",
    title: "Partner hospitals and services",
    description: "Browse hospital and service records maintained by Bengal Port."
  },
  process: {
    eyebrow: "PATIENT JOURNEY",
    title: "A supported route to international care.",
    description: "Every step remains understandable and coordinated.",
    steps: [
      {
        number: "01",
        title: "Share the care need",
        description: "Provide contact details, treatment category and available medical information."
      },
      {
        number: "02",
        title: "Review suitable options",
        description: "Receive hospital or service directions aligned with the stated need."
      },
      {
        number: "03",
        title: "Coordinate appointments",
        description: "Confirm provider review, estimated timing and appointment arrangements."
      },
      {
        number: "04",
        title: "Prepare for treatment",
        description: "Organize practical pre-arrival information and ongoing support."
      }
    ]
  },
  reviews: {
    eyebrow: "PATIENT STORIES",
    heading: "What our patients say",
    description: "What patients and their families say about treatment abroad with our coordination.",
    invite: "Used our service? Sign in, open your application in your dashboard and write a review. It appears here once our team has approved it.",
    cta: "Write a review",
    photo: "/images/divisions/care-reviews.webp"
  },
  closing: {
    title: "Ready to plan treatment abroad?",
    description: "Tell us what support you need and our healthcare coordination team will respond.",
    primary: "Request healthcare support",
    secondary: "Contact patient support"
  }
};
export const defaultUmrahContent: UmrahContent = {
  hero: {
    eyebrow: "GLOBAL UMRAH",
    title: "Your Umrah,",
    journeys: [
      "in Ramadan",
      "with family",
      "in a group",
      "with Ziyarat"
    ],
    tagline: "Transparent guidance. Human support.",
    description: "Thoughtful visa, flight, accommodation and on-ground support for your sacred journey to Makkah and Madinah.",
    image: "/images/global-umrah.webp",
    primary: "Plan your Umrah",
    secondary: "See packages",
    departures: [
      {
        date: "2026-11-14",
        label: "November group · 20 seats"
      },
      {
        date: "2026-12-19",
        label: "Winter family group"
      },
      {
        date: "2027-02-20",
        label: "Ramadan group · early booking"
      }
    ]
  },
  shortcuts: [
    { icon: "hotel", title: "Packages", subtitle: "Economy to Premium", href: "#packages" },
    { icon: "calendar", title: "Group departures", subtitle: "Dates, seats and booking", href: "/apply?tab=umrah" },
    { icon: "route", title: "The journey", subtitle: "Before you fly to Ziyarat", href: "#journey" },
    { icon: "headset", title: "Speak to our team", subtitle: "Questions answered", href: "/contact" },
  ],
  packagesHeading: {
    eyebrow: "PACKAGES",
    title: "Packages for every pilgrim",
    description: "Three ways to travel. Every package can be shaped around your dates, your room and your budget."
  },
  packages: [
    {
      name: "Economy",
      tag: "",
      nights: "7 nights · 4 in Makkah, 3 in Madinah",
      makkahHotel: "3-star hotel, Ibrahim Al Khalil area",
      madinahHotel: "3-star hotel near the Markaziya",
      distance: "Hotels 800 to 1,200 m from the Haram",
      price: "From ৳ 1,45,000",
      inclusions: [
        "Umrah visa and insurance",
        "Return flights from Dhaka",
        "Shared room for four",
        "Airport and intercity transfers",
        "Group guide throughout"
      ],
      cta: "Enquire about Economy"
    },
    {
      name: "Standard",
      tag: "Most chosen",
      nights: "10 nights · 6 in Makkah, 4 in Madinah",
      makkahHotel: "4-star hotel, Ajyad area",
      madinahHotel: "4-star hotel by the Haram courtyard",
      distance: "Hotels 300 to 600 m from the Haram",
      price: "From ৳ 1,95,000",
      inclusions: [
        "Umrah visa and insurance",
        "Return flights from Dhaka",
        "Shared room for three",
        "Private transfers",
        "Guided Ziyarat in both cities",
        "Daily breakfast"
      ],
      cta: "Enquire about Standard"
    },
    {
      name: "Premium",
      tag: "",
      nights: "12 nights · 7 in Makkah, 5 in Madinah",
      makkahHotel: "5-star hotel with a Haram view",
      madinahHotel: "5-star hotel facing the Prophet's Mosque",
      distance: "Hotels within 150 m of the Haram",
      price: "From ৳ 3,20,000",
      inclusions: [
        "Umrah visa and insurance",
        "Return flights, business class on request",
        "Private room",
        "Private car and driver",
        "Dedicated coordinator",
        "Half board"
      ],
      cta: "Enquire about Premium"
    }
  ],
  stagesHeading: {
    eyebrow: "THE JOURNEY",
    title: "The journey, stage by stage",
    description: "What we handle before you fly, on arrival, in Makkah and in Madinah."
  },
  stages: [
    {
      title: "Before you fly",
      subtitle: "Visa, flights and preparation",
      image: "/images/divisions/umrah-before.webp",
      points: [
        "Umrah visa and travel insurance arranged",
        "Flights chosen around your dates",
        "A briefing on the rites, packing and health"
      ]
    },
    {
      title: "On arrival",
      subtitle: "Jeddah or Madinah airport",
      image: "/images/divisions/umrah-ziyarat.webp",
      points: [
        "Met at the airport by our ground team",
        "Transfer to your hotel with your group",
        "A local SIM and guidance on the first day"
      ]
    },
    {
      title: "In Makkah",
      subtitle: "Steps from the Haram",
      image: "/images/divisions/umrah-makkah.webp",
      points: [
        "A hotel chosen for its distance to the Haram",
        "Guided Umrah for first-time pilgrims",
        "Help with prayer times, meals and rest"
      ]
    },
    {
      title: "In Madinah and Ziyarat",
      subtitle: "The Prophet's Mosque and the holy sites",
      image: "/images/divisions/umrah-madinah.webp",
      points: [
        "Transfer by train or coach",
        "Guided visits to Quba, Uhud and Qiblatain",
        "Support until your flight home"
      ]
    }
  ],
  stats: [
    {
      value: "100%",
      label: "Guided assistance",
      icon: "shield"
    },
    {
      value: "24/7",
      label: "On-ground support",
      icon: "headset"
    },
    {
      value: "5+",
      label: "Trusted hotel partners",
      icon: "building"
    },
    {
      value: "3+",
      label: "Transport options",
      icon: "bus"
    }
  ],
  feature: {
    eyebrow: "FLEXIBLE PLANNING",
    title: "For individuals, families and groups",
    description: "Tell us your preferred dates, number of travellers and accommodation priorities. Our team will prepare a clear, relevant plan without overwhelming you with unnecessary choices.",
    points: [
      {
        title: "Flexible departure planning",
        description: "Travel on dates that work for you and your family."
      },
      {
        title: "Room and proximity preferences",
        description: "Accommodations selected based on your comfort and distance requirements."
      },
      {
        title: "Coordinated local movement",
        description: "Reliable transport for seamless travel between holy sites."
      }
    ]
  },
  process: {
    eyebrow: "YOUR JOURNEY",
    title: "Begin with a simple enquiry.",
    description: "No account is required. Share the essentials and an Umrah coordinator will contact you.",
    steps: [
      {
        number: "01",
        title: "Share your preferences",
        description: "Provide travel dates, number of pilgrims, and basic requirements."
      },
      {
        number: "02",
        title: "Review your plan",
        description: "Receive a coordinated itinerary covering flights, hotels, and transport."
      },
      {
        number: "03",
        title: "Confirm and prepare",
        description: "Finalize details while we process your visa and bookings."
      },
      {
        number: "04",
        title: "Travel with peace of mind",
        description: "Focus on your pilgrimage with our on-ground support ready."
      }
    ]
  },
  reviews: {
    eyebrow: "PILGRIM REVIEWS",
    heading: "What our pilgrims say",
    description: "What pilgrims and their families say about travelling with our team.",
    invite: "Used our service? Sign in, open your application in your dashboard and write a review. It appears here once our team has approved it.",
    cta: "Write a review",
    photo: "/images/divisions/umrah-reviews.webp"
  },
  closing: {
    title: "Ready to plan your sacred journey?",
    description: "Start with a simple enquiry. Our coordinators will handle the rest.",
    primary: "Start Umrah Enquiry",
    secondary: "Speak to our team"
  }
};

// The Healthcare page as it should be shown or edited, from whatever was
// saved: what is missing gets the built-in wording. A page saved before the
// redesign (its hero has no specialties) was written for the old layout, so
// the built-in page replaces it whole and the team edits on from there.
export function healthcareContentFrom(saved: unknown): HealthcareContent {
  const hero = (saved as { hero?: { specialties?: unknown } } | null | undefined)?.hero;
  if (!Array.isArray(hero?.specialties)) return structuredClone(defaultHealthcareContent);
  return fillMissing(defaultHealthcareContent, saved);
}

// The Umrah page as it should be shown or edited, from whatever was saved:
// what is missing gets the built-in wording. A page saved before the redesign
// (its hero has no journeys) was written for the old layout, so the built-in
// page replaces it whole and the team edits on from there.
export function umrahContentFrom(saved: unknown): UmrahContent {
  const hero = (saved as { hero?: { journeys?: unknown } } | null | undefined)?.hero;
  if (!Array.isArray(hero?.journeys)) return structuredClone(defaultUmrahContent);
  return fillMissing(defaultUmrahContent, saved);
}
