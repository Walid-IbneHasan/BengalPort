export type ApplicationDivision =
  | "BUSINESS"
  | "EDUCATION"
  | "HEALTHCARE"
  | "UMRAH";
export type ApplicationField = {
  key: string;
  label: string;
  type?:
    | "text"
    | "date"
    | "email"
    | "tel"
    | "number"
    | "url"
    | "textarea"
    | "select"
    | "multi"
    | "checkbox";
  required?: boolean;
  options?: string[];
  hint?: string;
  // Set on the field that opens a group of related fields; the form shows it
  // as a sub-heading. Groups hold at most six fields.
  section?: string;
};
export type ApplicationStep = {
  title: string;
  description: string;
  // Why the step asks for sensitive details, shown under its heading.
  note?: string;
  fields: ApplicationField[];
};

const yesNo = ["Yes", "No"];

export const applicationForms: Record<
  ApplicationDivision,
  { title: string; intro: string; minutes: number; steps: ApplicationStep[] }
> = {
  BUSINESS: {
    title: "Business Tour & Global Business Application",
    intro:
      "For business tours, trade fairs, factory visits, supplier meetings and global market exploration.",
    minutes: 12,
    steps: [
      {
        title: "Travel request",
        description: "Tell us what kind of business visit you are planning.",
        fields: [
          {
            key: "applicationTypes",
            section: "Your visit",
            label: "Application type",
            type: "multi",
            required: true,
            options: [
              "Business Tour / Delegation",
              "Trade Fair Visit",
              "Factory / Supplier Visit",
              "Market Research Tour",
              "Business Meeting Arrangement",
              "Customized Business Tour",
            ],
          },
          {
            key: "preferredCountry",
            label: "Preferred destination country",
            required: true,
          },
          {
            key: "preferredCities",
            label: "Preferred city / cities",
            required: true,
          },
          {
            key: "preferredTravelDate",
            label: "Preferred travel date",
            type: "date",
            required: true,
          },
          {
            key: "expectedDuration",
            section: "Travellers",
            label: "Expected duration of stay",
            required: true,
          },
          {
            key: "numberOfTravelers",
            label: "Number of travelers",
            type: "number",
            required: true,
          },
          {
            key: "travelingWithBusinessPartner",
            label: "Traveling with business partner?",
            type: "select",
            required: true,
            options: yesNo,
          },
          {
            key: "fullName",
            section: "About you",
            label: "Full name (as per passport)",
            required: true,
          },
          {
            key: "dateOfBirth",
            label: "Date of birth",
            type: "date",
            required: true,
          },
          {
            key: "gender",
            label: "Gender",
            type: "select",
            required: true,
            options: ["Male", "Female", "Other", "Prefer not to say"],
          },
          { key: "nationality", label: "Nationality", required: true },
          {
            key: "phone",
            label: "Mobile / WhatsApp",
            type: "tel",
            required: true,
          },
          {
            key: "email",
            label: "Email address",
            type: "email",
            required: true,
          },
          {
            key: "currentAddress",
            section: "Addresses",
            label: "Current address",
            type: "textarea",
            required: true,
          },
          {
            key: "permanentAddress",
            label: "Permanent address",
            type: "textarea",
            required: true,
          },
        ],
      },
      {
        title: "Passport & business profile",
        note:
          "Why we ask: visa applications and supplier introductions need your passport and company details. They are used only to arrange your visit and are handled as described in our Privacy Policy.",
        description: "Provide travel-document and professional information.",
        fields: [
          { key: "passportNumber", section: "Passport", label: "Passport number", required: true },
          { key: "passportType", label: "Passport type", required: true },
          {
            key: "passportIssueDate",
            label: "Date of issue",
            type: "date",
            required: true,
          },
          {
            key: "passportExpiryDate",
            label: "Date of expiry",
            type: "date",
            required: true,
          },
          {
            key: "passportPlaceOfIssue",
            label: "Place of issue",
            required: true,
          },
          {
            key: "currentVisaStatus",
            label: "Current visa status (if applicable)",
          },
          {
            key: "internationalTravelHistory",
            section: "Travel history",
            label: "International travel history",
            type: "textarea",
            required: true,
          },
          {
            key: "previousVisaRefusal",
            label: "Previous visa refusal?",
            type: "select",
            required: true,
            options: yesNo,
          },
          {
            key: "employmentStatus",
            section: "Your business",
            label: "Employment status / profession",
            required: true,
          },
          {
            key: "position",
            label: "Current position / job title",
            required: true,
          },
          {
            key: "companyName",
            label: "Company / business name",
            required: true,
          },
          {
            key: "industry",
            label: "Industry / business sector",
            required: true,
          },
          {
            key: "companyWebsite",
            label: "Company website / social link",
            type: "url",
          },
          {
            key: "experienceYears",
            label: "Years of business / work experience",
            type: "number",
            required: true,
          },
          {
            key: "companyAddress",
            section: "Company details",
            label: "Company address",
            type: "textarea",
            required: true,
          },
          {
            key: "registrationNumber",
            label: "Business registration / trade license no.",
            required: true,
          },
        ],
      },
      {
        title: "Purpose & arrangements",
        description:
          "Define the intended outcomes and travel support required.",
        fields: [
          {
            key: "businessPurposes",
            section: "Purpose",
            label: "Business purpose",
            type: "multi",
            required: true,
            options: [
              "Meet Suppliers",
              "Visit Factories",
              "Attend Trade Fair",
              "Product Sourcing",
              "Business Partnership",
              "Import / Export Research",
              "Market Research",
              "Other",
            ],
          },
          {
            key: "businessObjective",
            label:
              "Business objective, products / industries of interest and expected outcomes",
            type: "textarea",
            required: true,
          },
          {
            key: "hotelPreference",
            section: "Arrangements",
            label: "Preferred hotel standard / budget",
            required: true,
          },
          {
            key: "travelClass",
            label: "Preferred flight / travel class",
            required: true,
          },
          {
            key: "airportPickup",
            label: "Airport pickup required?",
            type: "select",
            required: true,
            options: yesNo,
          },
          {
            key: "localTransport",
            label: "Local transport required?",
            type: "select",
            required: true,
            options: yesNo,
          },
          {
            key: "interpreterRequired",
            label: "Interpreter / translator required?",
            type: "select",
            required: true,
            options: yesNo,
          },
          {
            key: "meetingArrangement",
            label: "Factory / meeting arrangement required?",
            type: "select",
            required: true,
            options: yesNo,
          },
        ],
      },
      {
        title: "Documents & consent",
        description:
          "Confirm available supporting documents and accept the declarations.",
        fields: [
          {
            key: "documents",
            section: "Documents",
            label: "Documents available",
            type: "multi",
            options: [
              "Passport Bio Page",
              "Recent Photograph",
              "Business Card / Company ID",
              "Trade License / Company Registration",
              "Company Profile",
              "Financial Documents (if required)",
              "Previous Visa Copies",
              "Other Supporting Documents",
            ],
          },
          {
            key: "truthDeclaration",
            section: "Declarations",
            label:
              "I confirm that the information provided is true and complete to the best of my knowledge.",
            type: "checkbox",
            required: true,
          },
          {
            key: "contactConsent",
            label:
              "I authorize Bengal Port to contact me regarding my requested business travel services.",
            type: "checkbox",
            required: true,
          },
          {
            key: "visaAcknowledgement",
            label:
              "I understand that visa decisions are made solely by the relevant embassy or consulate and are not guaranteed by Bengal Port.",
            type: "checkbox",
            required: true,
          },
          {
            key: "signature",
            section: "Signature",
            label: "Applicant signature (type full name)",
            required: true,
          },
          { key: "signatureDate", label: "Date", type: "date", required: true },
        ],
      },
    ],
  },
  EDUCATION: {
    title: "Global Education Application",
    intro:
      "For university admission, scholarship guidance and international study planning.",
    minutes: 15,
    steps: [
      {
        title: "Study plan & personal details",
        description: "Share your intended study pathway and identity details.",
        fields: [
          {
            key: "applicationPurposes",
            section: "Your study plan",
            label: "Application purpose",
            type: "multi",
            required: true,
            options: [
              "University Admission",
              "Scholarship Guidance",
              "MBBS / Medical Admission",
              "Bachelor Program",
              "Master Program",
              "PhD / Research Program",
              "Transfer / Credit Transfer",
              "Other Education Service",
            ],
          },
          {
            key: "preferredCountries",
            label: "Preferred country / countries",
            required: true,
          },
          {
            key: "preferredProgram",
            label: "Preferred university / program",
            required: true,
          },
          {
            key: "intakeDate",
            label: "Intake / expected start date",
            type: "date",
            required: true,
          },
          { key: "studyLevel", label: "Study level", required: true },
          {
            key: "fullName",
            section: "About you",
            label: "Full name (as per passport)",
            required: true,
          },
          {
            key: "dateOfBirth",
            label: "Date of birth",
            type: "date",
            required: true,
          },
          {
            key: "gender",
            label: "Gender",
            type: "select",
            required: true,
            options: ["Male", "Female", "Other", "Prefer not to say"],
          },
          { key: "nationality", label: "Nationality", required: true },
          {
            key: "phone",
            label: "Mobile / WhatsApp",
            type: "tel",
            required: true,
          },
          {
            key: "email",
            label: "Email address",
            type: "email",
            required: true,
          },
          {
            key: "currentAddress",
            section: "Addresses",
            label: "Current address",
            type: "textarea",
            required: true,
          },
          {
            key: "permanentAddress",
            label: "Permanent address",
            type: "textarea",
            required: true,
          },
        ],
      },
      {
        title: "Passport & academics",
        note:
          "Why we ask: universities and visa offices need your passport and academic details to assess an application. They are used only for your admission and are handled as described in our Privacy Policy.",
        description: "Add your travel identity and complete academic history.",
        fields: [
          { key: "passportNumber", section: "Passport", label: "Passport number", required: true },
          {
            key: "passportExpiryDate",
            label: "Date of expiry",
            type: "date",
            required: true,
          },
          {
            key: "nationalId",
            label: "National ID / birth registration (if applicable)",
          },
          {
            key: "passportIssueCountry",
            label: "Country of passport issue",
            required: true,
          },
          {
            key: "previousPassport",
            label: "Previous passport?",
            type: "select",
            required: true,
            options: yesNo,
          },
          {
            key: "previousVisaRefusal",
            label: "Previous visa refusal?",
            type: "select",
            required: true,
            options: yesNo,
          },
          {
            key: "latestQualification",
            section: "Latest qualification",
            label: "Latest qualification",
            required: true,
          },
          { key: "institutionName", label: "Institution name", required: true },
          {
            key: "passingYear",
            label: "Passing year",
            type: "number",
            required: true,
          },
          { key: "latestResult", label: "Result / GPA / CGPA", required: true },
          {
            key: "previousQualification",
            section: "Earlier qualification",
            label: "Previous qualification",
            required: true,
          },
          {
            key: "previousInstitution",
            label: "Previous institution",
            required: true,
          },
          {
            key: "previousResult",
            label: "Previous result / GPA / CGPA",
            required: true,
          },
          {
            key: "instructionMedium",
            label: "Medium of instruction",
            required: true,
          },
          {
            key: "additionalAcademics",
            label:
              "Additional qualifications, study gaps, transfers or achievements",
            type: "textarea",
          },
        ],
      },
      {
        title: "Admission, family & career",
        note:
          "Why we ask: visa offices ask for family and sponsor details to confirm who supports your studies. They are used only for your application and are handled as described in our Privacy Policy.",
        description:
          "Help us understand language readiness, funding and career goals.",
        fields: [
          {
            key: "englishTest",
            section: "Admission",
            label: "English test (IELTS / TOEFL / PTE / Other)",
            required: true,
          },
          { key: "englishScore", label: "Score / test date", required: true },
          { key: "otherLanguages", label: "Other language ability" },
          {
            key: "preferredCourse",
            label: "Preferred course / major",
            required: true,
          },
          {
            key: "offerLetterReceived",
            label: "Offer letter received?",
            type: "select",
            required: true,
            options: yesNo,
          },
          { key: "preferredBudget", label: "Preferred budget", required: true },
          {
            key: "fatherDetails",
            section: "Family",
            label: "Father's full name & profession",
            required: true,
          },
          {
            key: "motherDetails",
            label: "Mother's full name & profession",
            required: true,
          },
          { key: "maritalStatus", label: "Marital status", required: true },
          { key: "spouseDetails", label: "Spouse details (if applicable)" },
          {
            key: "financialSponsor",
            section: "Sponsor",
            label: "Primary financial sponsor",
            required: true,
          },
          {
            key: "sponsorProfession",
            label: "Sponsor's profession / business",
            required: true,
          },
          {
            key: "sponsorRelationship",
            label: "Relationship with applicant",
            required: true,
          },
          {
            key: "educationBudget",
            label: "Estimated education budget",
            required: true,
          },
          {
            key: "employmentStatus",
            section: "Work",
            label: "Current employment status",
            required: true,
          },
          { key: "organizationName", label: "Company / organization name" },
          { key: "jobTitle", label: "Job title / position" },
          {
            key: "experienceYears",
            label: "Years of experience",
            type: "number",
          },
          {
            key: "certifications",
            label: "Professional certifications / achievements",
            type: "textarea",
          },
          {
            key: "studyAbroadReason",
            section: "Your goals",
            label: "Reason for study abroad",
            type: "textarea",
            required: true,
          },
          {
            key: "careerGoals",
            label:
              "Academic goals, career plan and reasons for choosing the intended program / country",
            type: "textarea",
            required: true,
          },
        ],
      },
      {
        title: "Documents & consent",
        description: "Confirm supporting documents and application consent.",
        fields: [
          {
            key: "documents",
            section: "Documents",
            label: "Documents available",
            type: "multi",
            options: [
              "Passport Bio Page",
              "Academic Certificates",
              "Academic Transcripts",
              "Recent Photograph",
              "English Test Certificate",
              "CV / Resume",
              "Recommendation Letter",
              "Statement of Purpose / Motivation Letter",
              "Financial Documents (if required)",
              "Other Supporting Documents",
            ],
          },
          {
            key: "truthDeclaration",
            section: "Declarations",
            label:
              "I confirm that all information and documents provided are accurate and genuine.",
            type: "checkbox",
            required: true,
          },
          {
            key: "useConsent",
            label:
              "I authorize Bengal Port to use my information for admission, education consulting and related application support requested by me.",
            type: "checkbox",
            required: true,
          },
          {
            key: "decisionAcknowledgement",
            label:
              "I understand that admission, scholarship and visa decisions are made by the relevant institutions and authorities.",
            type: "checkbox",
            required: true,
          },
          {
            key: "signature",
            section: "Signature",
            label: "Applicant signature (type full name)",
            required: true,
          },
          { key: "signatureDate", label: "Date", type: "date", required: true },
        ],
      },
    ],
  },
  HEALTHCARE: {
    title: "Global Healthcare & Treatment Application",
    intro:
      "For international hospital referral, medical consultation, treatment coordination and medical travel support.",
    minutes: 12,
    steps: [
      {
        title: "Treatment request & patient",
        description: "Tell us what care is needed and who requires it.",
        fields: [
          {
            key: "treatmentRequests",
            section: "Treatment request",
            label: "Treatment request",
            type: "multi",
            required: true,
            options: [
              "Medical Consultation",
              "Specialist Hospital Referral",
              "Diagnosis Review",
              "Surgery / Procedure",
              "Cancer Treatment",
              "Cardiac Care",
              "Orthopedic Treatment",
              "Health Check-up",
              "Other Medical Treatment",
            ],
          },
          {
            key: "preferredCountries",
            label: "Preferred treatment country / countries",
            required: true,
          },
          {
            key: "preferredHospital",
            label: "Preferred hospital / doctor (if any)",
          },
          {
            key: "preferredDate",
            label: "Preferred travel / consultation date",
            type: "date",
            required: true,
          },
          {
            key: "estimatedDays",
            label: "Estimated number of days required",
            type: "number",
            required: true,
          },
          {
            key: "fullName",
            section: "The patient",
            label: "Patient full name (as per passport)",
            required: true,
          },
          {
            key: "dateOfBirth",
            label: "Date of birth",
            type: "date",
            required: true,
          },
          {
            key: "gender",
            label: "Gender",
            type: "select",
            required: true,
            options: ["Male", "Female", "Other", "Prefer not to say"],
          },
          { key: "nationality", label: "Nationality", required: true },
          {
            key: "phone",
            label: "Mobile / WhatsApp",
            type: "tel",
            required: true,
          },
          {
            key: "email",
            label: "Email address",
            type: "email",
            required: true,
          },
          {
            key: "currentAddress",
            section: "Addresses",
            label: "Current address",
            type: "textarea",
            required: true,
          },
          {
            key: "permanentAddress",
            label: "Permanent address",
            type: "textarea",
            required: true,
          },
        ],
      },
      {
        title: "Passport & medical summary",
        note:
          "Why we ask: hospitals need your passport and medical details to review your case and give an estimate. They are used only to arrange your treatment and are handled as described in our Privacy Policy.",
        description: "Provide travel details and a concise clinical history.",
        fields: [
          { key: "passportNumber", section: "Passport", label: "Passport number", required: true },
          {
            key: "passportExpiryDate",
            label: "Date of expiry",
            type: "date",
            required: true,
          },
          {
            key: "passportIssuePlace",
            label: "Place / country of issue",
            required: true,
          },
          {
            key: "medicalTravelHistory",
            label: "International medical travel history",
            type: "textarea",
          },
          { key: "currentVisaStatus", label: "Current visa status" },
          {
            key: "previousVisaRefusal",
            label: "Previous visa refusal?",
            type: "select",
            required: true,
            options: yesNo,
          },
          {
            key: "diagnosis",
            section: "Diagnosis",
            label: "Primary medical condition / diagnosis",
            required: true,
          },
          {
            key: "diagnosisDate",
            label: "Date of diagnosis",
            type: "date",
            required: true,
          },
          {
            key: "symptoms",
            label: "Main symptoms / current complaints",
            type: "textarea",
            required: true,
          },
          {
            key: "currentDoctor",
            label: "Current treating doctor / hospital",
            required: true,
          },
          {
            key: "requestedTreatment",
            label: "Requested treatment / service",
            required: true,
          },
          {
            key: "surgeryRecommended",
            label: "Major treatment / surgery recommended?",
            type: "select",
            required: true,
            options: yesNo,
          },
          {
            key: "medicalHistory",
            section: "Medical history",
            label:
              "Medical history, current condition and reason for seeking treatment abroad",
            type: "textarea",
            required: true,
          },
          {
            key: "medicalConditions",
            label: "Current medical information",
            type: "multi",
            options: [
              "Currently taking regular medication",
              "History of surgery",
              "Known allergies",
              "Diabetes",
              "Heart condition",
              "High blood pressure",
              "Cancer history",
              "Pregnancy (if applicable)",
              "Other relevant medical condition",
            ],
          },
          {
            key: "medicationsAllergies",
            label:
              "Current medications, known allergies and other important medical information",
            type: "textarea",
            required: true,
          },
        ],
      },
      {
        title: "Companion & finance",
        note:
          "Why we ask: hospitals and visa offices ask who travels with you and who pays, so that estimates and visa letters are right. These details are used only for your application and are handled as described in our Privacy Policy.",
        description: "Add emergency, travel companion and funding information.",
        fields: [
          {
            key: "emergencyName",
            section: "Emergency contact",
            label: "Emergency contact full name",
            required: true,
          },
          {
            key: "emergencyRelationship",
            label: "Relationship with patient",
            required: true,
          },
          {
            key: "emergencyPhone",
            label: "Emergency contact phone",
            type: "tel",
            required: true,
          },
          {
            key: "emergencyEmail",
            label: "Emergency contact email",
            type: "email",
            required: true,
          },
          {
            key: "companionTraveling",
            section: "Companion",
            label: "Companion traveling?",
            type: "select",
            required: true,
            options: yesNo,
          },
          {
            key: "companionName",
            label: "Companion full name (if applicable)",
          },
          {
            key: "companionPassport",
            label: "Companion passport number (if applicable)",
          },
          {
            key: "companionRelationship",
            label: "Companion relationship with patient",
          },
          {
            key: "fundingSource",
            section: "Finance",
            label: "Who will fund treatment and travel?",
            required: true,
          },
          {
            key: "sponsorRelationship",
            label: "Sponsor's relationship with patient",
            required: true,
          },
          {
            key: "sponsorProfession",
            label: "Sponsor's profession / business",
            required: true,
          },
          {
            key: "treatmentBudget",
            label: "Estimated treatment budget",
            required: true,
          },
          {
            key: "financialArrangement",
            label: "Preferred financial arrangement",
            required: true,
          },
          {
            key: "costEstimateSupport",
            label: "Cost estimate support required?",
            type: "select",
            required: true,
            options: yesNo,
          },
        ],
      },
      {
        title: "Documents & consent",
        description: "Confirm medical documents and informed consent.",
        fields: [
          {
            key: "documents",
            section: "Documents",
            label: "Medical documents available",
            type: "multi",
            options: [
              "Passport Bio Page",
              "Recent Photograph",
              "Medical Reports",
              "Doctor's Prescription",
              "Diagnosis / Discharge Summary",
              "Lab Test Results",
              "Imaging Reports",
              "Previous Treatment Records",
              "Pathology / Biopsy Report (if applicable)",
              "Other Medical Documents",
            ],
          },
          {
            key: "truthDeclaration",
            section: "Declarations",
            label:
              "I confirm that the medical and personal information provided is accurate to the best of my knowledge.",
            type: "checkbox",
            required: true,
          },
          {
            key: "sharingConsent",
            label:
              "I authorize Bengal Port to share necessary information and documents for medical opinions, quotations, appointments and requested travel support.",
            type: "checkbox",
            required: true,
          },
          {
            key: "medicalAdviceAcknowledgement",
            label:
              "I understand that Bengal Port is not the treating physician or hospital and does not replace professional medical advice, diagnosis or emergency care.",
            type: "checkbox",
            required: true,
          },
          {
            key: "outcomeAcknowledgement",
            label:
              "I understand that treatment decisions, eligibility, costs and outcomes are determined by licensed medical professionals and healthcare providers.",
            type: "checkbox",
            required: true,
          },
          {
            key: "signature",
            section: "Signature",
            label: "Patient / legal representative signature (type full name)",
            required: true,
          },
          { key: "signatureDate", label: "Date", type: "date", required: true },
        ],
      },
    ],
  },
  UMRAH: {
    title: "Global Umrah Application",
    intro:
      "For individual, family and group Umrah journeys, including visa, flights, accommodation and ground support.",
    minutes: 8,
    steps: [
      {
        title: "Journey plan & lead pilgrim",
        description: "Tell us when you plan to travel and who is applying.",
        fields: [
          {
            key: "packageTypes",
            section: "Your journey",
            label: "Type of Umrah journey",
            type: "multi",
            required: true,
            options: [
              "Individual Umrah",
              "Family Umrah",
              "Group Umrah",
              "Ramadan Umrah",
              "Umrah with Ziyarat",
              "Customized Package",
            ],
          },
          {
            key: "preferredTravelDate",
            label: "Preferred travel date",
            type: "date",
            required: true,
          },
          {
            key: "stayDuration",
            label: "Length of stay",
            type: "select",
            required: true,
            options: [
              "7 days",
              "10 days",
              "14 days",
              "15 to 21 days",
              "Custom duration",
            ],
          },
          {
            key: "numberOfPilgrims",
            label: "Number of pilgrims",
            type: "number",
            required: true,
          },
          {
            key: "departureCity",
            label: "Departure city / airport",
            required: true,
          },
          {
            key: "fullName",
            section: "Lead pilgrim",
            label: "Full name (as per passport)",
            required: true,
          },
          {
            key: "dateOfBirth",
            label: "Date of birth",
            type: "date",
            required: true,
          },
          {
            key: "gender",
            label: "Gender",
            type: "select",
            required: true,
            options: ["Male", "Female"],
          },
          { key: "nationality", label: "Nationality", required: true },
          {
            key: "phone",
            section: "Contact",
            label: "Mobile / WhatsApp",
            type: "tel",
            required: true,
          },
          {
            key: "email",
            label: "Email address",
            type: "email",
            required: true,
          },
          {
            key: "currentAddress",
            label: "Current address",
            type: "textarea",
            required: true,
          },
        ],
      },
      {
        title: "Passport & travel group",
        note:
          "Why we ask: the Umrah visa and hotel bookings need every pilgrim's passport details. They are used only to arrange your journey and are handled as described in our Privacy Policy.",
        description: "Passport details and the people travelling with you.",
        fields: [
          { key: "passportNumber", section: "Passport", label: "Passport number", required: true },
          {
            key: "passportExpiryDate",
            label: "Passport expiry date",
            type: "date",
            required: true,
            hint: "Should be valid for at least six months from the travel date.",
          },
          {
            key: "passportPlaceOfIssue",
            label: "Place of issue",
            required: true,
          },
          {
            key: "previousUmrahOrHajj",
            label: "Have you performed Umrah or Hajj before?",
            type: "select",
            required: true,
            options: yesNo,
          },
          {
            key: "travelGroup",
            section: "Travel group",
            label: "Pilgrims travelling with you",
            type: "textarea",
            required: true,
            hint: "List the name, age and relationship of each person, or write “Travelling alone”.",
          },
          {
            key: "emergencyName",
            section: "Emergency contact",
            label: "Emergency contact name",
            required: true,
          },
          {
            key: "emergencyRelationship",
            label: "Relationship to you",
            required: true,
          },
          {
            key: "emergencyPhone",
            label: "Emergency contact phone",
            type: "tel",
            required: true,
          },
        ],
      },
      {
        title: "Stay & services",
        description: "Accommodation, flights and support on the ground.",
        fields: [
          {
            key: "makkahHotel",
            section: "Stay",
            label: "Hotel preference in Makkah",
            type: "select",
            required: true,
            options: [
              "Walking distance to Masjid al-Haram",
              "Standard hotel with shuttle",
              "Economy hotel",
              "No preference",
            ],
          },
          {
            key: "madinahHotel",
            label: "Hotel preference in Madinah",
            type: "select",
            required: true,
            options: [
              "Walking distance to Masjid an-Nabawi",
              "Standard hotel with shuttle",
              "Economy hotel",
              "No preference",
            ],
          },
          {
            key: "roomType",
            label: "Room type",
            type: "select",
            required: true,
            options: ["Double", "Triple", "Quad", "Family room", "No preference"],
          },
          {
            key: "flightPreference",
            section: "Travel",
            label: "Flight preference",
            type: "select",
            required: true,
            options: [
              "Direct flight",
              "Transit flight is fine",
              "I will arrange my own flight",
            ],
          },
          {
            key: "groundTransport",
            label: "Ground transport",
            type: "select",
            required: true,
            options: ["Private transfers", "Shared transfers", "No preference"],
          },
          {
            key: "ziyaratRequired",
            section: "Services",
            label: "Ziyarat tours required?",
            type: "select",
            required: true,
            options: yesNo,
          },
          {
            key: "specialAssistance",
            label: "Wheelchair or special assistance needed?",
            type: "select",
            required: true,
            options: yesNo,
          },
          {
            key: "budgetPerPerson",
            label: "Approximate budget per person",
            required: true,
          },
          {
            key: "specialRequests",
            label: "Health conditions or special requests",
            type: "textarea",
          },
        ],
      },
      {
        title: "Documents & consent",
        description: "Confirm available documents and your declaration.",
        fields: [
          {
            key: "documents",
            section: "Documents",
            label: "Documents available",
            type: "multi",
            options: [
              "Passport Bio Page",
              "Recent Photograph",
              "National ID / Birth Certificate",
              "Vaccination Certificate",
              "Previous Visa Copies",
              "Other Supporting Documents",
            ],
          },
          {
            key: "truthDeclaration",
            section: "Declarations",
            label:
              "I confirm that the information provided is accurate and matches my passport.",
            type: "checkbox",
            required: true,
          },
          {
            key: "contactConsent",
            label:
              "I authorize Bengal Port to contact me and use this information to arrange visa, travel and accommodation for this Umrah request.",
            type: "checkbox",
            required: true,
          },
          {
            key: "visaAcknowledgement",
            label:
              "I understand that visa approval, flight schedules and hotel availability are decided by the relevant authorities and providers.",
            type: "checkbox",
            required: true,
          },
          {
            key: "signature",
            section: "Signature",
            label: "Applicant signature (type full name)",
            required: true,
          },
          { key: "signatureDate", label: "Date", type: "date", required: true },
        ],
      },
    ],
  },
};
