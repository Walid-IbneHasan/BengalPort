export type HomeContent = {
  utility: { message: string; email: string; phone: string };
  hero: {
    title: string;
    tagline: string;
    description1: string;
    description2: string;
    backgroundImage: string;
  };
  divisions: Array<{
    key: "business" | "education" | "health";
    title: string;
    subtitle: string;
    cta: string;
    href: string;
    image: string;
  }>;
  stats: Array<{
    value: string;
    label: string;
    icon: "globe" | "users" | "package" | "briefcase" | "smile";
  }>;
  intro: {
    eyebrow: string;
    title: string;
    description: string;
    cta: string;
    href: string;
  };
  promises: Array<{
    icon: "shield" | "handshake" | "map";
    title: string;
    description: string;
  }>;
  pathways: {
    eyebrow: string;
    title: string;
    description: string;
    items: Array<{
      icon: "factory" | "education" | "healthcare";
      label: string;
      title: string;
      description: string;
      href: string;
      cta: string;
    }>;
  };
  process: {
    eyebrow: string;
    title: string;
    description: string;
    cta: string;
    href: string;
    steps: Array<{ number: string; title: string; description: string }>;
  };
  featured: {
    eyebrow: string;
    title: string;
    description: string;
    items: Array<{
      theme: "business" | "education" | "health";
      label: string;
      title: string;
      description: string;
      href: string;
      cta: string;
      image: string;
    }>;
  };
  closing: {
    eyebrow: string;
    title: string;
    description: string;
    cta: string;
    href: string;
  };
  footer: { description: string; address: string; copyright: string };
};
export const defaultHomeContent: HomeContent = {
  utility: {
    message: "Your Global Partner for Business • Education • Healthcare",
    email: "info@bengalport.com",
    phone: "+8801711-991035",
  },
  hero: {
    title: "BENGAL PORT",
    tagline: "Connecting Bengal to the World",
    description1:
      "Your trusted partner in international trade, global education and healthcare services.",
    description2: "We connect people, opportunities and solutions worldwide.",
    backgroundImage: "/images/hero-global-background.svg",
  },
  divisions: [
    {
      key: "business",
      title: "GLOBAL BUSINESS",
      subtitle: "Trade. Source. Business. Tours",
      cta: "EXPLORE BUSINESS",
      href: "/business",
      image: "/images/global-business.webp",
    },
    {
      key: "education",
      title: "GLOBAL EDUCATION",
      subtitle: "Study Abroad. MBBS. Business. Engineering",
      cta: "EXPLORE EDUCATION",
      href: "/education",
      image: "/images/global-education.webp",
    },
    {
      key: "health",
      title: "GLOBAL HEALTHCARE",
      subtitle: "Treatment Abroad. Checkup. Surgery. Cancer Care",
      cta: "EXPLORE HEALTHCARE",
      href: "/healthcare",
      image: "/images/global-healthcare.webp",
    },
  ],
  stats: [
    { value: "10+", label: "Countries", icon: "globe" },
    { value: "500+", label: "Global Partners", icon: "users" },
    { value: "1000+", label: "Products", icon: "package" },
    { value: "100+", label: "Business Tours", icon: "briefcase" },
    { value: "500+", label: "Happy Clients", icon: "smile" },
  ],
  intro: {
    eyebrow: "ONE TRUSTED GLOBAL PARTNER",
    title: "Opportunity travels farther with the right connections.",
    description:
      "Bengal Port brings together verified business networks, international study pathways and trusted healthcare partners through one accountable team.",
    cta: "Discover Bengal Port",
    href: "/about",
  },
  promises: [
    {
      icon: "shield",
      title: "Trusted coordination",
      description:
        "One accountable team from first enquiry through every important milestone.",
    },
    {
      icon: "handshake",
      title: "Verified connections",
      description:
        "Carefully selected partners aligned with your business, study or treatment needs.",
    },
    {
      icon: "map",
      title: "Local insight, global reach",
      description:
        "Practical guidance that bridges Bengal with international opportunities.",
    },
  ],
  pathways: {
    eyebrow: "THREE PATHWAYS. ONE STANDARD.",
    title: "Global access, shaped around your goal",
    description:
      "Choose the path that fits your next move. Each division combines informed guidance with practical, end-to-end coordination.",
    items: [
      {
        icon: "factory",
        label: "For businesses",
        title: "Source, visit and grow with confidence",
        description:
          "Connect with suppliers, factories and trade opportunities supported by an experienced coordination team.",
        href: "/business",
        cta: "Explore business",
      },
      {
        icon: "education",
        label: "For students",
        title: "Choose the right international study path",
        description:
          "Compare destinations, programs and institutions with clear admission guidance at every step.",
        href: "/education",
        cta: "Explore education",
      },
      {
        icon: "healthcare",
        label: "For patients",
        title: "Access trusted care beyond borders",
        description:
          "Find hospitals and specialists, then coordinate appointments, treatment and international patient support.",
        href: "/healthcare",
        cta: "Explore healthcare",
      },
    ],
  },
  process: {
    eyebrow: "A CLEARER WAY FORWARD",
    title: "From first conversation to the next destination.",
    description:
      "Complex international decisions become easier when the process is transparent and the right people remain beside you.",
    cta: "See how we can help",
    href: "/services",
    steps: [
      {
        number: "01",
        title: "Tell us what you need",
        description:
          "Share your goal through a short enquiry. No registration is required.",
      },
      {
        number: "02",
        title: "Receive a clear pathway",
        description:
          "Our team reviews your needs and identifies the most suitable options.",
      },
      {
        number: "03",
        title: "Move forward together",
        description:
          "We coordinate the next steps and stay connected throughout the process.",
      },
    ],
  },
  featured: {
    eyebrow: "FEATURED OPPORTUNITIES",
    title: "Your next global move starts here",
    description:
      "Explore curated connections, visits, programs and services across our three divisions.",
    items: [
      {
        theme: "business",
        label: "Business tour",
        title: "Bangladesh–China Sourcing Delegation",
        description:
          "Meet verified manufacturers and visit production facilities with end-to-end coordination.",
        href: "/opportunities",
        cta: "View opportunity",
        image: "/images/global-business.webp",
      },
      {
        theme: "education",
        label: "Education",
        title: "International MBBS Admissions",
        description:
          "Compare recognized institutions, entry criteria and application timelines.",
        href: "/education",
        cta: "Explore programs",
        image: "/images/global-education.webp",
      },
      {
        theme: "health",
        label: "Healthcare",
        title: "Executive Health Checkups",
        description:
          "Access coordinated international checkups with trusted hospital partners.",
        href: "/healthcare",
        cta: "View services",
        image: "/images/global-healthcare.webp",
      },
    ],
  },
  closing: {
    eyebrow: "START WITH A CONVERSATION",
    title: "Where would you like to go next?",
    description:
      "Tell us what you are working toward. Our team will help you understand the clearest next step.",
    cta: "Apply / Enquiry",
    href: "/apply",
  },
  footer: {
    description:
      "Connecting Bengal to the world through trusted business, education and healthcare partnerships.",
    address: "Dhaka, Bangladesh",
    copyright: "Bengal Port. All rights reserved.",
  },
};
