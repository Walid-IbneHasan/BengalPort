// The Global Business page's wording and pictures, as the admin edits them.
// `hero.markets` are the places the hero's map draws trade routes to, and
// `hero.categories` the product chips that drift around the title.
export type BusinessContent = {
  hero: {
    eyebrow: string;
    title: string;
    markets: string[];
    categories: string[];
    tagline: string;
    description: string;
    primary: string;
    secondary: string;
  };
  services: {
    eyebrow: string;
    title: string;
    description: string;
    items: Array<{ image: string; title: string; description: string; cta: string; href: string }>;
  };
  process: {
    eyebrow: string;
    title: string;
    description: string;
    steps: Array<{ number: string; title: string; description: string }>;
  };
  calculator: { eyebrow: string; title: string; description: string; note: string; cta: string };
  partners: { eyebrow: string; title: string; description: string; empty: string };
  trust: {
    eyebrow: string;
    title: string;
    description: string;
    items: Array<{ icon: string; title: string; description: string }>;
  };
  stats: Array<{ value: string; label: string; icon: string }>;
  reviews: { eyebrow: string; heading: string; description: string; invite: string; cta: string; photo: string };
  closing: {
    title: string;
    description: string;
    primary: string;
    primaryHref: string;
    secondary: string;
    secondaryHref: string;
  };
};

export const defaultBusinessContent: BusinessContent = {
  hero: {
    eyebrow: "GLOBAL BUSINESS",
    title: "Sourcing from",
    markets: ["China", "Turkey", "Vietnam", "UAE", "India", "Malaysia"],
    categories: ["Textiles", "Machinery", "Electronics", "Packaging", "Agro products"],
    tagline: "Trade. Source. Explore. Grow.",
    description:
      "Your trusted partner in international trade, global sourcing, business tours and trade opportunities. We connect markets, build partnerships and grow together.",
    primary: "Start an enquiry",
    secondary: "Plan a business visit",
  },
  services: {
    eyebrow: "WHAT WE DO",
    title: "From the first product search to goods cleared at port",
    description: "Six ways we work with importers, exporters and buyers.",
    items: [
      {
        image: "/images/divisions/biz-sourcing.webp",
        title: "Global sourcing",
        description:
          "Verified manufacturers and suppliers across established markets, shortlisted around your specification and budget.",
        cta: "Find suppliers",
        href: "#partners",
      },
      {
        image: "/images/divisions/biz-import-export.webp",
        title: "Import and export",
        description: "Structured documentation and coordination for products moving in and out of Bangladesh.",
        cta: "Learn more",
        href: "/apply?tab=business",
      },
      {
        image: "/images/divisions/biz-tours.webp",
        title: "Business tours and factory visits",
        description: "Coordinated visits to markets, factories and international trade fairs.",
        cta: "Plan a visit",
        href: "/apply?tab=business&form=enquiry&about=Business+tour",
      },
      {
        image: "/images/divisions/biz-opportunities.webp",
        title: "Trade opportunities",
        description: "Current products, buying leads, visits and partnership openings.",
        cta: "View opportunities",
        href: "/opportunities",
      },
      {
        image: "/images/divisions/biz-costing.webp",
        title: "Landed-cost planning",
        description: "Product cost, shipping and duty estimated before you commit to a purchase.",
        cta: "Calculate now",
        href: "#calculator",
      },
      {
        image: "/images/divisions/biz-documents.webp",
        title: "Document support",
        description: "Guided import, export and visit documentation from our team.",
        cta: "Ask an expert",
        href: "/contact",
      },
    ],
  },
  process: {
    eyebrow: "HOW AN ENGAGEMENT RUNS",
    title: "Five steps from brief to delivery",
    description: "One coordinator, a clear sequence and no surprises at the port.",
    steps: [
      { number: "01", title: "Brief", description: "Tell us the product, volume, budget and timeline." },
      { number: "02", title: "Shortlist", description: "We propose verified suppliers or factories that fit." },
      { number: "03", title: "Verify and visit", description: "Samples, audits and, when useful, a coordinated factory visit." },
      { number: "04", title: "Negotiate and order", description: "Terms, contracts and payment steps agreed with you in the loop." },
      { number: "05", title: "Ship and clear", description: "Shipping, documents and customs handled through to delivery." },
    ],
  },
  calculator: {
    eyebrow: "TRADE PLANNING",
    title: "Know your landed cost before you commit",
    description: "A quick planning estimate. Our team prepares a detailed quotation for your actual shipment.",
    note: "Planning estimate only; taxes and fees may vary.",
    cta: "Request a detailed quote",
  },
  partners: {
    eyebrow: "BUSINESS NETWORK",
    title: "A verified network across markets",
    description:
      "Suppliers and factories maintained by the Bengal Port team. Ask us to open a conversation with any of them.",
    empty: "Our partner list is being updated. Tell us what you want to source and we will suggest suitable options.",
  },
  trust: {
    eyebrow: "WHY CHOOSE BENGAL PORT?",
    title: "Built for dependable global trade",
    description:
      "We combine verified relationships, experienced coordination and clear communication to help businesses move internationally with confidence.",
    items: [
      { icon: "network", title: "Trusted network", description: "Verified suppliers, factories and buyers across multiple markets." },
      { icon: "users", title: "Expert team", description: "Experienced professionals with practical trade knowledge." },
      { icon: "headset", title: "End-to-end support", description: "From sourcing and visits to documents and delivery." },
      { icon: "shield", title: "Secure and reliable", description: "A transparent, accountable and dependable process." },
    ],
  },
  stats: [
    { value: "10+", label: "Countries", icon: "globe" },
    { value: "500+", label: "Global partners", icon: "users" },
    { value: "1000+", label: "Products", icon: "package" },
    { value: "100+", label: "Business tours", icon: "briefcase" },
  ],
  reviews: {
    eyebrow: "CLIENT REVIEWS",
    heading: "What our clients say",
    description: "What importers, exporters and buyers say about working with our team.",
    invite:
      "Used our service? Sign in, open your application in your dashboard and write a review. It appears here once our team has approved it.",
    cta: "Write a review",
    photo: "/images/divisions/biz-reviews.webp",
  },
  closing: {
    title: "Ready to grow your business globally?",
    description: "Tell us what you need and receive a clear route to the right market, supplier or factory.",
    primary: "Start a business enquiry",
    primaryHref: "/apply?tab=business",
    secondary: "Contact our experts",
    secondaryHref: "/contact",
  },
};
