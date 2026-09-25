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
  "BUSINESS" | "EDUCATION" | "HEALTHCARE",
  string[]
> = {
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
    type: z.enum(["BUSINESS", "EDUCATION", "HEALTHCARE"]),
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
export const homeContentSchema = z.object({
  utility: z.object({ message: text, email: z.string().email(), phone: text }),
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
export const businessContentSchema = z.object({
  hero: z.object({
    eyebrow: text,
    title: text,
    tagline: text,
    description: paragraph,
    image: link,
  }),
  shortcuts: z
    .array(
      z.object({
        icon: text,
        title: text,
        subtitle: text,
        href: z.string().trim().min(1),
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
          cta: text,
          href: z.string().trim().min(1),
        }),
      )
      .min(1)
      .max(10),
  }),
  stats: z
    .array(z.object({ value: text, label: text, icon: text }))
    .min(1)
    .max(8),
  trust: z.object({
    eyebrow: text,
    title: text,
    description: paragraph,
    items: z
      .array(z.object({ icon: text, title: text, description: paragraph }))
      .min(1)
      .max(8),
  }),
  partners: z.object({ eyebrow: text, title: text, description: paragraph }),
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
export const divisionContentUpdateSchema = z.object({
  content: divisionContentSchema,
  published: z.boolean().default(true),
  revision: z.number().int().nonnegative(),
});
