// Helpers for the admin's "correct this application" form.
import { applicationForms, type ApplicationDivision, type ApplicationStep } from "./application-forms";
import { fieldError } from "./application-validation";

type Application = { type: string; fullName: string; email: string; phone: string; details?: Record<string, unknown> | null };
type Values = Record<string, any>;

// The form's steps without the declarations: those were ticked by the
// applicant and are not staff's to change.
export function editSteps(type: string): ApplicationStep[] {
  const form = applicationForms[type as ApplicationDivision];
  if (!form) return [];
  return form.steps
    .map((step) => ({ ...step, fields: step.fields.filter((field) => field.type !== "checkbox") }))
    .filter((step) => step.fields.length > 0);
}

export function editValues(application: Application): Values {
  return {
    ...structuredClone(application.details ?? {}),
    fullName: application.fullName,
    email: application.email,
    phone: application.phone,
  };
}

const contact = ["fullName", "email", "phone"];

// Why the correction cannot be saved, or "". Staff may leave questions
// unanswered; only the applicant's name, email and phone are required.
export function editProblem(type: string, values: Values): string {
  for (const step of editSteps(type))
    for (const field of step.fields)
      if (contact.includes(field.key)) {
        const problem = fieldError({ ...field, required: true }, values[field.key]);
        if (problem) return problem;
      }
  if (String(values.fullName ?? "").trim().length < 2) return "Enter the applicant's full name.";
  return "";
}

export function editBody(application: Application, values: Values): { fullName: string; email: string; phone: string; details: Values } {
  const text = (key: string) => String(values[key] ?? "").trim();
  const [fullName, email, phone] = contact.map(text);
  return {
    fullName,
    email,
    phone,
    details: { ...(application.details ?? {}), ...values, fullName, email, phone },
  };
}
