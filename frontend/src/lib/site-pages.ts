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
  button: string;
  groups: Record<"business" | "education" | "healthcare" | "umrah", ServiceGroup>;
};

export type ContactContent = {
  hero: Heading;
  hours: string;
  card: { title: string; description: string; button: string };
  labels: { call: string; email: string; office: string; hours: string };
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
  button: "EXPLORE SERVICE",
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
  labels: { call: "Call", email: "Email", office: "Office", hours: "Hours" },
};

// Pages whose built-in wording lives only here: the API serves an empty page
// until the administrator saves one, and whatever is missing comes from these.
export type OpportunitiesContent = {
  hero: Heading;
  list: { searchPlaceholder: string; allCategories: string; search: string; applyBy: string; viewDetails: string; noMatch: string; empty: string };
  detail: { back: string; about: string; enquire: string; fullApplication: string; note: string };
};

export const defaultOpportunitiesContent: OpportunitiesContent = {
  hero: {
    eyebrow: "OPPORTUNITIES",
    title: "Find your next opening.",
    description: "Current business, education, healthcare, visit, scholarship and event opportunities.",
  },
  list: {
    searchPlaceholder: "Search opportunities",
    allCategories: "All categories",
    search: "SEARCH",
    applyBy: "Apply by",
    viewDetails: "VIEW DETAILS →",
    noMatch: "No opportunities match your filters.",
    empty: "No opportunities are open right now. Please check back soon.",
  },
  detail: {
    back: "All opportunities",
    about: "About this opportunity",
    enquire: "ENQUIRE ABOUT THIS",
    fullApplication: "Start a full application",
    note: "Enquiries are free and need no account. Our team replies with requirements, costs and next steps.",
  },
};

type EnquiryHeading = { eyebrow: string; title: string; text: string };
export type ApplyContent = {
  hero: Heading;
  tabs: { general: string; business: string; education: string; healthcare: string; umrah: string };
  modes: { enquiry: string; application: string };
  enquiry: { general: EnquiryHeading; business: EnquiryHeading; education: EnquiryHeading; healthcare: EnquiryHeading; umrah: EnquiryHeading };
  form: { submit: string; agreement: string; privacyLink: string };
  sent: { title: string; another: string; home: string };
};

export const defaultApplyContent: ApplyContent = {
  hero: {
    eyebrow: "APPLY / ENQUIRY",
    title: "Ask a question or start an application.",
    description: "Questions are welcome without an account. Choose a division to send a quick enquiry, or complete its detailed application form when you are ready.",
  },
  tabs: { general: "General enquiry", business: "Business", education: "Education", healthcare: "Healthcare", umrah: "Umrah" },
  modes: { enquiry: "Quick enquiry", application: "Full application" },
  enquiry: {
    general: { eyebrow: "QUICK ENQUIRY", title: "Ask a question without registering.", text: "Only the essentials are required. Login is optional." },
    business: { eyebrow: "BUSINESS ENQUIRY", title: "Tell us what you are looking for.", text: "Sourcing, supplier connections, factory visits or a quotation. No account is required." },
    education: { eyebrow: "EDUCATION ENQUIRY", title: "Ask about studying abroad.", text: "Programmes, institutions, admission requirements or costs. No account is required." },
    healthcare: { eyebrow: "HEALTHCARE ENQUIRY", title: "Ask about treatment abroad.", text: "Hospitals, treatment options, estimates or travel support. No account is required." },
    umrah: { eyebrow: "UMRAH ENQUIRY", title: "Plan your sacred journey.", text: "Share your preferred travel period, traveller count and priorities. No account is required." },
  },
  form: { submit: "SUBMIT ENQUIRY", agreement: "By submitting you agree to our", privacyLink: "Privacy Policy" },
  sent: { title: "Enquiry sent successfully", another: "SEND ANOTHER ENQUIRY", home: "Back to home" },
};

export type PayContent = {
  hero: { eyebrow: string; title: string; payWith: string; findFirst: string; members: string; dashboard: string };
  card: { title: string; description: string; submit: string };
};

export const defaultPayContent: PayContent = {
  hero: {
    eyebrow: "PAY ONLINE",
    title: "Pay for your application.",
    payWith: "Pay in full or in part with",
    findFirst: "Find your application to see what is due.",
    members: "Members can also pay from their",
    dashboard: "dashboard",
  },
  card: {
    title: "Find your application",
    description: "Your reference number was shown when you applied and sent to your email. It starts with BP-.",
    submit: "CONTINUE",
  },
};

export type LoginContent = {
  story: { eyebrow: string; titleLine1: string; titleLine2: string; description: string; points: string[] };
  intro: string;
  withoutAccount: string;
};

export const defaultLoginContent: LoginContent = {
  story: {
    eyebrow: "OPTIONAL MEMBER ACCOUNT",
    titleLine1: "Your global journey,",
    titleLine2: "kept in one secure place.",
    description: "Track applications, enquiries, payments and receipts. You can still browse and enquire without creating an account.",
    points: ["Email-verified access", "Optional two-factor protection", "One profile across all four services"],
  },
  intro: "Registration is optional and enquiries remain open to everyone.",
  withoutAccount: "Continue without an account",
};

// The body of a section is plain text with a few marks, read by legal-text.ts.
export type LegalContent = {
  eyebrow: string;
  title: string;
  updatedLabel: string;
  updated: string;
  sections: Array<{ heading: string; body: string }>;
};

export const defaultPrivacyContent: LegalContent = {
  eyebrow: "PRIVACY POLICY",
  title: "How we handle your information.",
  updatedLabel: "Last updated",
  updated: "2 October 2026",
  sections: [
    {
      heading: "Who we are",
      body: "Bengal Port, based at {address}, helps people and businesses with international business, education, healthcare and Umrah services. This policy explains what we collect through this website and how we use it.",
    },
    {
      heading: "Information we collect",
      body: [
        "- **Contact details** you give us in an enquiry: your name, phone number, email address and message.",
        "- **Application details** you enter in an application form. Depending on the service these include your date of birth, nationality, address, passport details, education and employment history, travel plans, family and sponsor information, and emergency contacts.",
        "- **Documents** you choose to attach to an application, such as a passport copy, photograph, certificates or medical reports.",
        "- **Health information** in healthcare applications, such as your diagnosis, symptoms, medical history and current treatment.",
        "- **Account details** if you create a member account: your name, email address, phone number and a protected (hashed) copy of your password, or your Google account identifier and profile picture if you sign in with Google.",
        "- **Payment records** for payments made or recorded against your application, and the receipts issued for them. Online payments are approved on bKash's or Nagad's own page: we receive the transaction ID and the wallet number that paid, never your PIN.",
        "- **Technical information** our servers record when you use the site, such as your IP address and the time of each request.",
        "",
        "This website does not use advertising or tracking cookies. If you sign in, your browser stores a sign-in token so that you stay signed in on that device.",
      ].join("\n"),
    },
    {
      heading: "How we use it",
      body: [
        "- To answer your enquiry and contact you about it.",
        "- To assess and process your application and arrange the service you asked for.",
        "- To record payments and issue receipts.",
        "- To send account emails such as verification codes and sign-in codes.",
        "- To keep the website secure and prevent misuse.",
        "- To meet legal and regulatory obligations.",
      ].join("\n"),
    },
    {
      heading: "Who we share it with",
      body: [
        "We share only what is needed to deliver the service you requested, with:",
        "- universities, colleges and admission offices, for education applications;",
        "- hospitals and doctors, for healthcare applications;",
        "- suppliers, factories and event organisers, for business visits;",
        "- airlines, hotels, transport providers, visa centres and government authorities, for travel and visas;",
        "- companies that host this website and deliver our email.",
        "",
        "We do not sell your information, and we do not share it for advertising.",
      ].join("\n"),
    },
    {
      heading: "Passport and health information",
      body: "Passport and health details are sensitive. We use them only for the application you submitted, and access is limited to the Bengal Port staff handling it. By submitting an application you agree to this use and to the sharing described above.",
    },
    {
      heading: "How long we keep it",
      body: "We keep enquiries, applications and payment records for as long as needed to provide the service, deal with follow-up requests and meet our legal and accounting obligations.",
    },
    {
      heading: "Your choices",
      body: "You can ask us for a copy of the information we hold about you, ask us to correct it, or ask us to delete it. We will delete it unless we are required to keep it by law or need it for an ongoing application or payment. To make a request, email {email}. Members can update their name, phone number and password on the [Account & security](/profile) page.",
    },
    {
      heading: "Security",
      body: "Access to submitted information is restricted to authorised administrators, and passwords are stored in hashed form. No website can guarantee absolute security, so please contact us immediately if you believe your account or information has been misused.",
    },
    {
      heading: "Children",
      body: "Applications for anyone under 18 must be completed by a parent or legal guardian.",
    },
    {
      heading: "Changes and contact",
      body: "We may update this policy; the date at the top shows the latest version. Questions about this policy can be sent to {email} or through our [contact page](/contact).",
    },
  ],
};

export const defaultTermsContent: LegalContent = {
  eyebrow: "TERMS OF USE",
  title: "Terms for using Bengal Port.",
  updatedLabel: "Last updated",
  updated: "2 October 2026",
  sections: [
    {
      heading: "Our role",
      body: "Bengal Port provides guidance, coordination and facilitation for international business, education, healthcare and Umrah services. We are not a university, hospital, airline, embassy or visa authority. Admission, treatment, visa and travel decisions are made by those organisations, and we cannot guarantee their outcome.",
    },
    {
      heading: "Information you give us",
      body: "You agree to provide information that is accurate, complete and your own to share, including passport, academic and medical details. Inaccurate information can delay or prevent your application, and we are not responsible for the consequences of incorrect information you supply.",
    },
    {
      heading: "Enquiries and applications",
      body: "Submitting an enquiry or application is a request for our service, not a confirmed booking, admission or appointment. A service is confirmed only when we confirm it to you in writing.",
    },
    {
      heading: "Fees and payments",
      body: "Fees are those stated in the quotation or agreement we give you for your service. Payments are recorded against your application and a receipt is issued for each one. Refunds and cancellations follow the terms of that quotation or agreement and the policies of the institutions, hospitals, airlines and other providers involved.",
    },
    {
      heading: "Member accounts",
      body: "You are responsible for keeping your password confidential and for activity under your account. Tell us promptly if you suspect unauthorised use.",
    },
    {
      heading: "Acceptable use",
      body: "Do not misuse the website: no false or automated submissions, no attempts to access other people's information, and no interference with how the site works.",
    },
    {
      heading: "Website content",
      body: "Information on this website, including opportunities, programmes, partner details and cost estimates, is general guidance and can change. Please confirm details with our team before making decisions or payments.",
    },
    {
      heading: "Liability",
      body: "To the extent permitted by law, Bengal Port is not liable for decisions, delays, cancellations or losses caused by third parties such as institutions, hospitals, carriers and authorities, or by events outside our control.",
    },
    {
      heading: "Privacy",
      body: "Our [Privacy Policy](/privacy) explains how we handle the information you give us.",
    },
    {
      heading: "Governing law and contact",
      body: "These terms are governed by the laws of Bangladesh. We may update them; the date at the top shows the latest version. Questions can be sent to {email}.",
    },
  ],
};
