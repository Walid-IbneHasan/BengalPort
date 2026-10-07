import { z } from "zod";
export const enquirySchema = z.object({
  type: z.enum(["GENERAL", "BUSINESS", "EDUCATION", "HEALTHCARE", "UMRAH"]),
  name: z.string().min(2),
  phone: z.string().min(7),
  email: z.string().email().optional().or(z.literal("")),
  message: z.string().min(5),
  details: z.record(z.unknown()).optional(),
});
const requiredApplicationFields: Record<
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
export const applicationSchema = z
  .object({
    type: z.enum(["BUSINESS", "EDUCATION", "HEALTHCARE", "UMRAH"]),
    fullName: z.string().trim().min(2),
    email: z.string().email(),
    phone: z.string().trim().min(7),
    details: z.record(z.unknown()),
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
  details: z.record(z.unknown()),
});
export const noteSchema = z.object({ body: z.string().trim().min(1).max(2000) });
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
  body: z.string().trim().min(10).max(1500),
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
export const opportunitySchema = z.object({
  slug: z.string().min(3),
  category: z.enum([
    "BUSINESS",
    "EDUCATION",
    "HEALTHCARE",
    "UMRAH",
    "FACTORY_VISIT",
    "BUSINESS_TOUR",
    "SCHOLARSHIP",
    "EVENT",
  ]),
  title: z.string().min(3),
  description: z.string().min(10),
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
  })
  .refine(
    (v) =>
      v.total !== undefined ||
      (v.quantity !== undefined && v.unitPrice !== undefined),
    { message: "Enter a total amount, or both quantity and unit price" },
  );

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
  description: z.string().trim().min(10).max(2000),
  image: image("/images/global-business.webp"),
  featured: z.boolean().default(false),
});
export const institutionSchema = z.object({
  name: label,
  country: label,
  description: z.string().trim().min(10).max(2000),
  image: image("/images/global-education.webp"),
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
  description: z.string().trim().min(10).max(2000),
  image: image("/images/global-healthcare.webp"),
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
        icon: z.enum(["globe", "users", "package", "briefcase", "smile"]),
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
          icon: z.enum(["factory", "education", "healthcare"]),
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
          theme: z.enum(["business", "education", "health"]),
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
  footer: z.object({ description: paragraph, address: text, copyright: text }),
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
  });
// The Healthcare page: a hero that names the specialties and the three-step
// pathway, the treatments index with photos, the live hospital directory's
// wording, the process, the clarity points with the stats, the reviews and
// the closing panel. The destination chips come from the live hospitals and
// fall back to `hero.cities`.
export const healthcareContentSchema = divisionContentSchema
  .omit({ shortcuts: true, services: true })
  .extend({
    hero: divisionContentSchema.shape.hero.extend({
      specialties: stringList(8),
      pathway: z.array(z.object({ icon: text, title: text, description: text })).length(3),
      cities: stringList(8),
    }),
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
    }),
    shortcuts,
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
});
