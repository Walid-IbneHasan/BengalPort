import { z } from "zod";
// Plain wording for checks that carry no message of their own.
import "./zod-messages.js";
export const enquirySchema = z.object({
  type: z.enum(["GENERAL", "BUSINESS", "EDUCATION", "HEALTHCARE", "UMRAH"]),
  name: z.string().min(2).max(120),
  phone: z.string().min(7).max(30),
  email: z.string().email().max(160).optional().or(z.literal("")),
  message: z.string().min(5).max(5000),
  details: z
    .record(z.string(), z.unknown())
    .refine((details) => JSON.stringify(details).length <= 2000, "These details are too long")
    .optional(),
});
export const requiredApplicationFields: Record<
  "BUSINESS" | "EDUCATION" | "HEALTHCARE" | "UMRAH",
  string[]
> = {
  UMRAH: [
    "packageTypes",
    "preferredTravelDate",
    "stayDuration",
    "numberOfPilgrims",
    "departureCity",
    "fullName",
    "dateOfBirth",
    "gender",
    "nationality",
    "phone",
    "email",
    "currentAddress",
    "passportNumber",
    "passportExpiryDate",
    "passportPlaceOfIssue",
    "previousUmrahOrHajj",
    "travelGroup",
    "emergencyName",
    "emergencyRelationship",
    "emergencyPhone",
    "makkahHotel",
    "madinahHotel",
    "roomType",
    "flightPreference",
    "groundTransport",
    "ziyaratRequired",
    "specialAssistance",
    "budgetPerPerson",
    "truthDeclaration",
    "contactConsent",
    "visaAcknowledgement",
    "signature",
    "signatureDate",
  ],
  BUSINESS: [
    "applicationTypes",
    "preferredCountry",
    "preferredCities",
    "preferredTravelDate",
    "expectedDuration",
    "numberOfTravelers",
    "travelingWithBusinessPartner",
    "fullName",
    "dateOfBirth",
    "gender",
    "nationality",
    "phone",
    "email",
    "currentAddress",
    "permanentAddress",
    "passportNumber",
    "passportType",
    "passportIssueDate",
    "passportExpiryDate",
    "passportPlaceOfIssue",
    "internationalTravelHistory",
    "previousVisaRefusal",
    "employmentStatus",
    "position",
    "companyName",
    "industry",
    "experienceYears",
    "companyAddress",
    "registrationNumber",
    "businessPurposes",
    "businessObjective",
    "hotelPreference",
    "travelClass",
    "airportPickup",
    "localTransport",
    "interpreterRequired",
    "meetingArrangement",
    "truthDeclaration",
    "contactConsent",
    "visaAcknowledgement",
    "signature",
    "signatureDate",
  ],
  EDUCATION: [
    "applicationPurposes",
    "preferredCountries",
    "preferredProgram",
    "intakeDate",
    "studyLevel",
    "fullName",
    "dateOfBirth",
    "gender",
    "nationality",
    "phone",
    "email",
    "currentAddress",
    "permanentAddress",
    "passportNumber",
    "passportExpiryDate",
    "passportIssueCountry",
    "previousPassport",
    "previousVisaRefusal",
    "latestQualification",
    "institutionName",
    "passingYear",
    "latestResult",
    "previousQualification",
    "previousInstitution",
    "previousResult",
    "instructionMedium",
    "englishTest",
    "englishScore",
    "preferredCourse",
    "offerLetterReceived",
    "preferredBudget",
    "fatherDetails",
    "motherDetails",
    "maritalStatus",
    "financialSponsor",
    "sponsorProfession",
    "sponsorRelationship",
    "educationBudget",
    "employmentStatus",
    "studyAbroadReason",
    "careerGoals",
    "truthDeclaration",
    "useConsent",
    "decisionAcknowledgement",
    "signature",
    "signatureDate",
  ],
  HEALTHCARE: [
    "treatmentRequests",
    "preferredCountries",
    "preferredDate",
    "estimatedDays",
    "fullName",
    "dateOfBirth",
    "gender",
    "nationality",
    "phone",
    "email",
    "currentAddress",
    "permanentAddress",
    "passportNumber",
    "passportExpiryDate",
    "passportIssuePlace",
    "previousVisaRefusal",
    "diagnosis",
    "diagnosisDate",
    "symptoms",
    "currentDoctor",
    "requestedTreatment",
    "surgeryRecommended",
    "medicalHistory",
    "medicationsAllergies",
    "emergencyName",
    "emergencyRelationship",
    "emergencyPhone",
    "emergencyEmail",
    "companionTraveling",
    "fundingSource",
    "sponsorRelationship",
    "sponsorProfession",
    "treatmentBudget",
    "financialArrangement",
    "costEstimateSupport",
    "truthDeclaration",
    "sharingConsent",
    "medicalAdviceAcknowledgement",
    "outcomeAcknowledgement",
    "signature",
    "signatureDate",
  ],
};
// The answers as written, with the spaces around each one removed: phone
// keyboards finish a word with a space, and that must never fail a check.
const trimmedAnswers = z
  .record(z.string(), z.unknown())
  .transform((details) => Object.fromEntries(Object.entries(details).map(([key, value]) => [key, typeof value === "string" ? value.trim() : value])));
export const applicationSchema = z
  .object({
    type: z.enum(["BUSINESS", "EDUCATION", "HEALTHCARE", "UMRAH"]),
    fullName: z.string().trim().min(2).max(160),
    email: z.string().trim().email().max(160),
    phone: z.string().trim().min(7).max(30),
    details: trimmedAnswers.refine((details) => JSON.stringify(details).length <= 100_000, "These answers are too long"),
  })
  .superRefine((value, ctx) => {
    for (const key of requiredApplicationFields[value.type]) {
      const field = value.details[key];
      const missing =
        field === undefined ||
        field === null ||
        field === "" ||
        field === false ||
        (Array.isArray(field) && field.length === 0);
      if (missing)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["details", key],
          message: "Required field",
        });
    }
    if (value.details.fullName !== value.fullName)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fullName"],
        message: "Full name does not match application details",
      });
    if (value.details.email !== value.email)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["email"],
        message: "Email does not match application details",
      });
    if (value.details.phone !== value.phone)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["phone"],
        message: "Phone does not match application details",
      });
  });
// A correction made by staff. Unlike a new application it may leave
// questions unanswered: staff often complete one over the phone.
export const applicationEditSchema = z.object({
  fullName: z.string().trim().min(2),
  email: z.string().email(),
  phone: z.string().trim().min(7),
  details: z.record(z.string(), z.unknown()),
});
export const noteSchema = z.object({ body: z.string().trim().min(1).max(2000) });
export const newUserSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().max(254),
  phone: z.string().trim().min(7).max(30).optional(),
  role: z.enum(["USER", "MODERATOR", "ADMIN", "MANAGER", "ACCOUNTANT", "EMPLOYEE"]),
});
export const blockUserSchema = z.object({ blocked: z.boolean() });
// A customer's review: a rating, the name to show, an optional line about
// the service ("MBBS, Malaysia") and their own words.
const reviewDivision = z.enum(["BUSINESS", "EDUCATION", "HEALTHCARE", "UMRAH"]);
// The picture shown with a review: a local path or an HTTP(S) address, and
// null to show none. Left out, it is not changed.
const reviewPhoto = z
  .union([
    z.string().trim().max(500).regex(/^(\/|https?:\/\/)/, "Use a local path or an HTTP(S) address"),
    z.null(),
  ])
  .optional();
export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  name: z.string().trim().min(2).max(80),
  detail: z
    .string()
    .trim()
    .max(80)
    .nullish()
    .transform((value) => value || null),
  body: z.string().trim().min(1).max(1500),
  // Whether the member wants their account photo shown with the review.
  showPhoto: z.boolean().optional(),
});
export const adminReviewSchema = reviewSchema
  .omit({ showPhoto: true })
  .extend({ division: reviewDivision, photoUrl: reviewPhoto });
// The team changes a review's status, its photo, or both.
export const reviewChangeSchema = z
  .object({ status: z.enum(["PENDING", "APPROVED", "HIDDEN"]).optional(), photoUrl: reviewPhoto })
  .refine((change) => change.status !== undefined || change.photoUrl !== undefined, "Nothing to change");
// ?division=education, in either case; none means every service.
export const reviewDivisionSchema = z.object({
  division: z.preprocess(
    (value) => (typeof value === "string" ? value.toUpperCase() : value),
    reviewDivision.optional(),
  ),
});
export const categorySchema = z.object({
  name: z.string().trim().min(2).max(60),
  type: z.enum(["INCOME", "EXPENSE"]),
});
export const opportunityCategorySchema = z.object({
  label: z.string().trim().min(2).max(60),
});
export const opportunitySchema = z.object({
  slug: z.string().min(3),
  category: z.string().trim().min(1).max(200),
  title: z.string().min(3),
  description: z.string().trim().min(1),
  country: z.string().min(2),
  location: z.string().min(2),
  deadline: z.coerce.date().nullable().optional(),
  image: z.string(),
  published: z.boolean().default(true),
});
const optionalPositiveNumber = z.preprocess(
  (v) => (v === "" || v === null ? undefined : v),
  z.coerce.number().positive().optional(),
);
export const transactionSchema = z
  .object({
    type: z.enum(["INCOME", "EXPENSE"]),
    date: z.coerce.date(),
    description: z.string().trim().min(2),
    notes: z.string().trim().optional(),
    customer: z.string().trim().optional(),
    quantity: optionalPositiveNumber,
    unitPrice: optionalPositiveNumber,
    total: optionalPositiveNumber,
    paymentStatus: z
      .enum(["PAID", "PARTIALLY_PAID", "DUE", "PENDING", "FAILED", "REFUNDED"])
      .optional(),
    categoryId: z.string(),
    // The customer's account and application, when the entry is about one.
    // Income for an application is also recorded as a payment on it, made
    // the way `paymentMethod` says (cash unless told otherwise).
    userId: z.string().trim().min(1).nullish().transform((value) => value || null),
    applicationId: z.string().trim().min(1).nullish().transform((value) => value || null),
    paymentMethod: z.string().trim().max(60).nullish().transform((value) => value || "Cash"),
    // The cash, bank or mobile wallet account the money went into or came
    // out of (its id or code). Left out: cash in hand.
    moneyAccount: z.string().trim().max(60).nullish().transform((value) => value || null),
  })
  .refine(
    (v) =>
      v.total !== undefined ||
      (v.quantity !== undefined && v.unitPrice !== undefined),
    { message: "Enter a total amount, or both quantity and unit price" },
  );

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => value || null);

export const invoiceSchema = z.object({
  issuedAt: z.coerce.date(),
  dueAt: z.coerce.date().nullish().transform((value) => value ?? null),
  customerName: z.string().trim().min(2).max(160),
  customerPhone: optionalText(40),
  customerEmail: optionalText(160),
  customerAddress: optionalText(300),
  items: z
    .array(
      z.object({
        description: z.string().trim().min(1).max(300),
        quantity: z.coerce.number().positive().max(1_000_000),
        unitPrice: z.coerce.number().min(0).max(9_999_999_999),
      }),
    )
    .min(1)
    .max(50),
  paid: z.coerce.number().min(0).default(0),
  notes: optionalText(2000),
  applicationId: z.string().nullish(),
  transactionId: z.string().nullish(),
  // The office workflow: the CRM customer and deal, the currency and its
  // rate in taka, the work's timeline, what each side commits to, and terms.
  customerId: z.string().trim().min(1).nullish().transform((value) => value || null),
  dealId: z.string().trim().min(1).nullish().transform((value) => value || null),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "Use a three-letter currency code such as BDT or USD").default("BDT"),
  exchangeRate: z.coerce.number().positive().max(100000).default(1),
  startDate: z.preprocess((value) => (value === "" ? null : value), z.coerce.date().nullish()).transform((value) => value ?? null),
  endDate: z.preprocess((value) => (value === "" ? null : value), z.coerce.date().nullish()).transform((value) => value ?? null),
  companyCommitments: optionalText(4000),
  clientCommitments: optionalText(4000),
  terms: optionalText(6000),
  // Issue it at once instead of keeping a draft.
  issue: z.boolean().optional(),
});

const text = z.string().trim().min(1).max(500);
const paragraph = z.string().trim().min(1).max(2000);
const link = z
  .string()
  .trim()
  .regex(/^(\/|https?:\/\/)/, "Use a local path or an HTTP(S) media URL");
const label = z.string().trim().min(1).max(200);
const image = (fallback: string) =>
  z.preprocess((v) => v || undefined, link.default(fallback));
const money = z.coerce.number().min(0).max(99_999_999).multipleOf(0.01);
// What each division charges and the smallest part payment it accepts.
export const feeSettingsSchema = z.object({
  fees: z
    .array(
      z
        .object({
          division: z.enum(["BUSINESS", "EDUCATION", "HEALTHCARE", "UMRAH"]),
          label: z.string().trim().min(1).max(80),
          amount: money,
          minimumPayment: money,
        })
        .refine((fee) => fee.minimumPayment <= fee.amount, {
          message: "The smallest part payment cannot be more than the fee",
        }),
    )
    .min(1)
    .max(4),
});
export const amountDueSchema = money.nullable();
export const partnerSchema = z.object({
  name: label,
  country: label,
  industry: label,
  product: label,
  description: z.string().trim().min(1).max(2000),
  image: image("/images/global-business.webp"),
  featured: z.boolean().default(false),
});
// More photos of a place, shown after its main one as a slideshow.
const gallery = z.array(link).max(12).default([]);
export const institutionSchema = z.object({
  name: label,
  country: label,
  description: z.string().trim().min(1).max(2000),
  image: image("/images/global-education.webp"),
  gallery: gallery,
  // The Education pages it appears on; none means worked out from its programmes.
  fields: z.array(z.enum(["medical", "engineering", "general"])).max(3).default([]),
  programs: z
    .array(
      z.object({
        title: label,
        level: label,
        discipline: label,
        deadline: z.preprocess(
          (v) => (v === "" ? null : v),
          z.coerce.date().nullable().optional(),
        ),
      }),
    )
    .max(100)
    .default([]),
});
export const hospitalSchema = z.object({
  name: label,
  country: label,
  city: label,
  description: z.string().trim().min(1).max(2000),
  image: image("/images/global-healthcare.webp"),
  gallery: gallery,
  services: z
    .array(z.object({ title: label, category: label, description: paragraph }))
    .max(100)
    .default([]),
});
// Optional: blank hides the icon. Content saved before these existed has none.
const socialLink = z
  .string()
  .trim()
  .max(300)
  .regex(/^https?:\/\//, "Use a full web address starting with https://")
  .or(z.literal(""))
  .default("");
export const homeContentSchema = z.object({
  brand: z.object({ name: text, tagline: text, logo: link }),
  navigation: z.object({
    home: text,
    about: text,
    services: text,
    opportunities: text,
    contact: text,
    apply: text,
    applyShort: text,
    menuHeading: text,
    menuViewAll: text,
    business: z.object({ title: text, text }),
    education: z.object({ title: text, text }),
    healthcare: z.object({ title: text, text }),
    umrah: z.object({ title: text, text }),
  }),
  // A blank number keeps the one the website is configured with.
  whatsapp: z.object({
    number: z.string().trim().max(30).regex(/^\+?[\d\s-]*$/, "Use digits only, for example 8801711991035"),
    label: text,
    callToAction: text,
  }),
  utility: z.object({
    message: text,
    email: z.string().email(),
    phone: text,
    facebook: socialLink,
    linkedin: socialLink,
    youtube: socialLink,
  }),
  hero: z.object({
    title: text,
    tagline: text,
    description1: paragraph,
    description2: paragraph,
    backgroundImage: link,
    mobileImage: link,
    mobileLine1: text,
    mobileLine2: text,
    mobileLine3: text,
    servicesHeading: text,
  }),
  divisions: z
    .array(
      z.object({
        key: z.enum(["business", "education", "health", "umrah"]),
        title: text,
        subtitle: text,
        cta: text,
        href: link,
        image: link,
      }),
    )
    .length(4),
  stats: z
    .array(
      z.object({
        value: text,
        label: text,
        icon: z.enum(["globe", "users", "package", "briefcase", "smile", "handshake"]),
      }),
    )
    .min(1)
    .max(8),
  intro: z.object({
    eyebrow: text,
    title: text,
    description: paragraph,
    cta: text,
    href: link,
  }),
  promises: z
    .array(
      z.object({
        icon: z.enum(["shield", "handshake", "map"]),
        title: text,
        description: paragraph,
      }),
    )
    .min(1)
    .max(6),
  pathways: z.object({
    eyebrow: text,
    title: text,
    description: paragraph,
    items: z
      .array(
        z.object({
          icon: z.enum(["factory", "education", "healthcare", "umrah"]),
          label: text,
          title: text,
          description: paragraph,
          href: link,
          cta: text,
        }),
      )
      .min(1)
      .max(6),
  }),
  process: z.object({
    eyebrow: text,
    title: text,
    description: paragraph,
    cta: text,
    href: link,
    steps: z
      .array(z.object({ number: text, title: text, description: paragraph }))
      .min(1)
      .max(6),
  }),
  featured: z.object({
    eyebrow: text,
    title: text,
    description: paragraph,
    items: z
      .array(
        z.object({
          theme: z.enum(["business", "education", "health", "umrah"]),
          label: text,
          title: text,
          description: paragraph,
          href: link,
          cta: text,
          image: link,
        }),
      )
      .min(1)
      .max(6),
  }),
  closing: z.object({
    eyebrow: text,
    title: text,
    description: paragraph,
    cta: text,
    href: link,
  }),
  footer: z.object({
    description: paragraph,
    address: text,
    copyright: text,
    exploreHeading: text,
    divisionsHeading: text,
    contactHeading: text,
    aboutLink: text,
    servicesLink: text,
    opportunitiesLink: text,
    contactLink: text,
    applyLink: text,
    payLink: text,
    businessLink: text,
    educationLink: text,
    healthcareLink: text,
    umrahLink: text,
    privacyLink: text,
    termsLink: text,
  }),
});
// A list of short texts, such as the markets a hero names.
const stringList = (max: number) => z.array(text).min(1).max(max);
// The reviews section of a division page: the wording around the customer
// reviews, which are written by customers and approved by the team.
const reviewsSection = z.object({
  eyebrow: text,
  heading: text,
  description: paragraph,
  invite: paragraph,
  cta: text,
  photo: link,
});
const processSection = z.object({
  eyebrow: text,
  title: text,
  description: paragraph,
  steps: z.array(z.object({ number: text, title: text, description: paragraph })).min(1).max(8),
});
// The quick links across the lower edge of a hero: an icon name, a title,
// a line under it and where it leads.
const shortcuts = z
  .array(z.object({ icon: text, title: text, subtitle: text, href: z.string().trim().min(1) }))
  .min(2)
  .max(4);
// The Global Business page: a hero that names the markets it sources from,
// six photo tiles, the engagement steps, the partner list's wording, the
// trust points with the stats, the reviews and the closing panel.
export const businessContentSchema = z.object({
  hero: z.object({
    eyebrow: text,
    // The words before the rotating market name.
    lead: text,
    markets: stringList(8),
    categories: stringList(6),
    tagline: text,
    description: paragraph,
    primary: text,
    secondary: text,
  }),
  shortcuts,
  services: z.object({
    eyebrow: text,
    title: text,
    description: paragraph,
    items: z
      .array(z.object({ image: link, title: text, description: paragraph, cta: text, href: z.string().trim().min(1) }))
      .min(1)
      .max(6),
  }),
  process: processSection,
  partners: z.object({ eyebrow: text, title: text, description: paragraph, empty: paragraph }),
  labels: z.object({ allPartners: text, suppliers: text, factories: text, all: text, featured: text, supplier: text, factory: text, requestConnection: text, noMatches: text, askAboutSourcing: text, unavailable: text }),
  trust: z.object({
    eyebrow: text,
    title: text,
    description: paragraph,
    items: z.array(z.object({ icon: text, title: text, description: paragraph })).min(1).max(8),
  }),
  stats: z.array(z.object({ value: text, label: text, icon: text })).min(1).max(8),
  reviews: reviewsSection,
  closing: z.object({
    title: text,
    description: paragraph,
    primary: text,
    primaryHref: link,
    secondary: text,
    secondaryHref: link,
  }),
});
export const pageContentUpdateSchema = z.object({
  content: homeContentSchema,
  published: z.boolean().default(true),
  revision: z.number().int().nonnegative(),
});
export const businessContentUpdateSchema = z.object({
  content: businessContentSchema,
  published: z.boolean().default(true),
  revision: z.number().int().nonnegative(),
});
export const divisionContentSchema = z.object({
  hero: z.object({
    eyebrow: text,
    title: text,
    tagline: text,
    description: paragraph,
    image: link,
    primary: text,
    secondary: text,
  }),
  shortcuts: z
    .array(
      z.object({
        icon: text,
        title: text,
        subtitle: text,
        href: z.string().min(1),
      }),
    )
    .min(1)
    .max(8),
  services: z.object({
    eyebrow: text,
    title: text,
    description: paragraph,
    items: z
      .array(
        z.object({
          icon: text,
          title: text,
          description: paragraph,
          href: z.string().min(1),
        }),
      )
      .min(1)
      .max(10),
  }),
  stats: z
    .array(z.object({ value: text, label: text, icon: text }))
    .min(1)
    .max(8),
  feature: z.object({
    eyebrow: text,
    title: text,
    description: paragraph,
    points: z
      .array(z.object({ title: text, description: paragraph }))
      .min(1)
      .max(8),
  }),
  directory: z.object({ eyebrow: text, title: text, description: paragraph }),
  process: z.object({
    eyebrow: text,
    title: text,
    description: paragraph,
    steps: z
      .array(z.object({ number: text, title: text, description: paragraph }))
      .min(1)
      .max(8),
  }),
  closing: z.object({
    title: text,
    description: paragraph,
    primary: text,
    secondary: text,
  }),
});
const heading = z.object({ eyebrow: text, title: text, description: paragraph });
// The Education page: four options (three fields of study and the student
// reviews) in place of the shortcuts row. The reviews themselves are written
// by customers; the page holds only the section's wording.
// `image` is the picture on the option at the top of the page, `photo` the
// one in the section it leads to.
const studyField = z.object({
  title: text,
  tagline: text,
  image: link,
  photo: link,
  heading: text,
  description: paragraph,
  points: z.array(text).min(1).max(8),
  subjects: z.array(text).min(1).max(12),
  cta: text,
  // The field's own page: facts such as entry requirements and costs.
  info: z.array(z.object({ title: text, body: paragraph })).max(8),
});
export const educationContentSchema = divisionContentSchema
  .omit({ shortcuts: true })
  .extend({
    // Phones show `shortDescription` under the options in place of the
    // description, which runs to three lines there.
    hero: divisionContentSchema.shape.hero.extend({ shortDescription: paragraph }),
    fields: z.object({
      medical: studyField,
      engineering: studyField,
      general: studyField,
    }),
    reviews: z.object({
      title: text,
      tagline: text,
      image: link,
      photo: link,
      eyebrow: text,
      heading: text,
      description: paragraph,
      invite: paragraph,
      cta: text,
    }),
    destinations: heading,
    labels: z.object({ askQuestion: text, popularSubjects: text, inDirectory: text, seeInstitutions: text, reviewsEmpty: text, explore: text, allFields: text, all: text, searchPlaceholder: text, institution: text, viewPrograms: text, noMatches: text, listUpdating: text, askAboutInstitutions: text }),
  });
// The Healthcare page: a hero that names the specialties and the three-step
// pathway, the treatments index with photos, the live hospital directory's
// wording, the process, the clarity points with the stats, the reviews and
// the closing panel. The destination chips come from the live hospitals and
// fall back to `hero.cities`.
export const healthcareContentSchema = divisionContentSchema
  .omit({ shortcuts: true, services: true })
  .extend({
    // The hero shows only the destinations, each with its flag.
    hero: divisionContentSchema.shape.hero.extend({
      cities: stringList(8),
    }),
    labels: z.object({ usualProcedures: text, availableAt: text, searchPlaceholder: text, all: text, requestConnection: text, noMatches: text, listUpdating: text, askAboutHospitals: text }),
    treatmentsHeading: heading,
    treatments: z
      .array(z.object({ title: text, image: link, description: paragraph, procedures: stringList(8), cta: text }))
      .min(1)
      .max(8),
    reviews: reviewsSection,
  });
// The Umrah page: a hero that names the kind of journey and the next group
// departures, the packages, the four stages of the journey with photos, the
// points for families and groups with the stats, the process, the reviews
// and the closing panel. A package with a tag is the highlighted one.
export const umrahContentSchema = divisionContentSchema
  .omit({ shortcuts: true, services: true, directory: true })
  .extend({
    hero: divisionContentSchema.shape.hero.extend({
      journeys: stringList(6),
      departures: z
        .array(z.object({ date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Write the date as year-month-day"), label: text }))
        .max(3),
      // Photos that take turns on both sides of the hero.
      sideImages: z.array(link).max(12),
    }),
    shortcuts,
    labels: z.object({ nextDepartures: text, makkah: text, madinah: text }),
    packagesHeading: heading,
    packages: z
      .array(
        z.object({
          name: text,
          tag: z.string().trim().max(40),
          nights: text,
          makkahHotel: text,
          madinahHotel: text,
          distance: text,
          price: text,
          inclusions: stringList(10),
          cta: text,
        }),
      )
      .min(1)
      .max(3),
    stagesHeading: heading,
    stages: z.array(z.object({ title: text, subtitle: text, image: link, points: stringList(5) })).length(4),
    reviews: reviewsSection,
  });
// The About, Services and Contact pages.
export const aboutContentSchema = z.object({
  hero: heading,
  intro: heading,
  values: z
    .array(z.object({ title: text, description: paragraph }))
    .min(1)
    .max(6),
  work: z.object({
    eyebrow: text,
    title: text,
    description: paragraph,
    button: text,
    points: z.array(text).min(1).max(6),
  }),
});
const serviceGroup = z.object({
  title: text,
  image: link,
  items: z.array(text).min(1).max(10),
});
export const servicesContentSchema = z.object({
  hero: heading,
  button: text,
  groups: z.object({
    business: serviceGroup,
    education: serviceGroup,
    healthcare: serviceGroup,
    umrah: serviceGroup,
  }),
});
export const contactContentSchema = z.object({
  hero: heading,
  hours: text,
  card: z.object({ title: text, description: paragraph, button: text }),
  labels: z.object({ call: text, email: text, office: text, hours: text }),
});
// Pages whose built-in wording lives only in the website's code. The API
// serves an empty page until the administrator saves one.
export const opportunitiesContentSchema = z.object({
  hero: heading,
  list: z.object({ searchPlaceholder: text, allCategories: text, search: text, applyBy: text, viewDetails: text, noMatch: text, empty: text }),
  detail: z.object({ back: text, about: text, enquire: text, fullApplication: text, note: paragraph }),
});
const enquiryHeading = z.object({ eyebrow: text, title: text, text: paragraph });
export const applyContentSchema = z.object({
  hero: heading,
  tabs: z.object({ general: text, business: text, education: text, healthcare: text, umrah: text }),
  modes: z.object({ enquiry: text, application: text }),
  enquiry: z.object({
    general: enquiryHeading,
    business: enquiryHeading,
    education: enquiryHeading,
    healthcare: enquiryHeading,
    umrah: enquiryHeading,
  }),
  form: z.object({ submit: text, agreement: text, privacyLink: text }),
  sent: z.object({ title: text, another: text, home: text }),
});
export const payContentSchema = z.object({
  hero: z.object({ eyebrow: text, title: text, payWith: text, findFirst: text, members: text, dashboard: text }),
  card: z.object({ title: text, description: paragraph, submit: text }),
});
export const loginContentSchema = z.object({
  story: z.object({
    eyebrow: text,
    titleLine1: text,
    titleLine2: text,
    description: paragraph,
    points: z.array(text).min(1).max(6),
  }),
  intro: paragraph,
  withoutAccount: text,
});
// Every printed document and PDF: the letterhead it is printed on, and the
// signatures at the foot (the customer's on the left, the owner's on the
// right). The owner's signature picture is optional.
export const documentsContentSchema = z.object({
  // An empty picture means Bengal Port's own drawn letterhead.
  letterhead: z.object({
    backgroundImage: z.union([link, z.literal("")]),
    subtitle: text,
    tagline: text,
    website: z.string().trim().max(120),
  }),
  signatures: z.object({
    customerLabel: text,
    ownerLabel: text,
    ownerName: z.string().trim().max(120),
    ownerTitle: z.string().trim().max(120),
    signatureImage: z.union([link, z.literal("")]),
  }),
  closing: z.object({ thanks: text }),
});
export const legalContentSchema = z.object({
  eyebrow: text,
  title: text,
  updatedLabel: text,
  updated: text,
  sections: z
    .array(z.object({ heading: text, body: z.string().trim().min(1).max(10000) }))
    .min(1)
    .max(40),
});
