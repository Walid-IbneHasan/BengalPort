export type ApplicationDivision = "BUSINESS" | "EDUCATION" | "HEALTHCARE";
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
};
export type ApplicationStep = {
  title: string;
  description: string;
  fields: ApplicationField[];
};

const yesNo = ["Yes", "No"];

export const applicationForms: Record<
  ApplicationDivision,
  { title: string; intro: string; steps: ApplicationStep[] }
> = {
  BUSINESS: {
    title: "Business Tour & Global Business Application",
    intro:
      "For business tours, trade fairs, factory visits, supplier meetings and global market exploration.",
    steps: [
      {
        title: "Travel request",
        description: "Tell us what kind of business visit you are planning.",
        fields: [
          {
            key: "applicationTypes",
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
        description: "Provide travel-document and professional information.",
        fields: [
          { key: "passportNumber", label: "Passport number", required: true },
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
    steps: [
      {
        title: "Study plan & personal details",
        description: "Share your intended study pathway and identity details.",
        fields: [
          {
            key: "applicationPurposes",
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
        description: "Add your travel identity and complete academic history.",
        fields: [
          { key: "passportNumber", label: "Passport number", required: true },
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
        description:
          "Help us understand language readiness, funding and career goals.",
        fields: [
          {
            key: "englishTest",
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
    steps: [
      {
        title: "Treatment request & patient",
        description: "Tell us what care is needed and who requires it.",
        fields: [
          {
            key: "treatmentRequests",
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
        description: "Provide travel details and a concise clinical history.",
        fields: [
          { key: "passportNumber", label: "Passport number", required: true },
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
        description: "Add emergency, travel companion and funding information.",
        fields: [
          {
            key: "emergencyName",
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
            label: "Patient / legal representative signature (type full name)",
            required: true,
          },
          { key: "signatureDate", label: "Date", type: "date", required: true },
        ],
      },
    ],
  },
};
