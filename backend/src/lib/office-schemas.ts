// What the office (business management) screens may send.
import { z } from "zod";
import "./zod-messages.js";

const optional = (max: number) => z.string().trim().max(max).nullish().transform((value) => value || null);
const optionalDate = z.preprocess((value) => (value === "" ? null : value), z.coerce.date().nullish()).transform((value) => value ?? null);
const id = z.string().trim().min(1).nullish().transform((value) => value || null);
const money = z.coerce.number().min(0).max(9_999_999_999);
const currency = z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "Use a three-letter currency code such as BDT or USD").default("BDT");
const rate = z.coerce.number().positive().max(100000).default(1);

export const customerSchema = z.object({
  name: z.string().trim().min(2).max(160),
  phone: z.string().trim().min(7).max(30),
  whatsapp: optional(30),
  email: z.string().trim().toLowerCase().email().max(160).nullish().or(z.literal("")).transform((value) => value || null),
  address: optional(300),
  passportNumber: optional(40),
  passportCountry: optional(80),
  passportExpiry: optionalDate,
  category: optional(80),
  leadSource: optional(80),
  status: z.enum(["LEAD", "ACTIVE", "INACTIVE"]).default("LEAD"),
  notes: optional(4000),
  nextFollowUpAt: optionalDate,
  assignedToId: id,
  branchId: id,
  userId: id,
  // Save even though a customer with the same phone or email exists.
  force: z.boolean().optional(),
});

export const activitySchema = z.object({
  kind: z.enum(["CALL", "WHATSAPP", "EMAIL", "MEETING", "NOTE"]),
  summary: z.string().trim().min(1).max(2000),
  at: optionalDate,
});

export const taskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  notes: optional(2000),
  kind: z.enum(["TASK", "FOLLOW_UP", "DEADLINE"]).default("TASK"),
  status: z.enum(["OPEN", "DONE", "CANCELLED"]).default("OPEN"),
  dueAt: optionalDate,
  assigneeId: id,
  customerId: id,
  dealId: id,
});

const item = z.object({
  description: z.string().trim().min(1).max(300),
  serviceLine: optional(80),
  quantity: z.coerce.number().positive().max(1_000_000),
  unitPrice: money,
});
export const dealSchema = z.object({
  customerId: z.string().trim().min(1),
  title: z.string().trim().min(2).max(200),
  serviceLine: optional(80),
  description: optional(4000),
  currency,
  items: z.array(item).min(1).max(50),
  startDate: optionalDate,
  endDate: optionalDate,
  companyCommitments: optional(4000),
  clientCommitments: optional(4000),
  terms: optional(6000),
  assignedToId: id,
  branchId: id,
});

export const officePaymentSchema = z.object({
  customerId: z.string().trim().min(1),
  amount: z.coerce.number().positive().max(9_999_999_999),
  currency,
  exchangeRate: rate,
  method: z.string().trim().min(1).max(60).default("Cash"),
  // A money account id or code; worked out from the method when left out.
  moneyAccount: optional(60),
  reference: optional(100),
  date: optionalDate,
  notes: optional(500),
  allocations: z.array(z.object({ invoiceId: z.string().trim().min(1), amount: z.coerce.number().positive() })).max(50).default([]),
});
export const allocationSchema = z.object({
  allocations: z.array(z.object({ invoiceId: z.string().trim().min(1), amount: z.coerce.number().positive() })).min(1).max(50),
});
export const refundRequestSchema = z.object({
  amount: z.coerce.number().positive(),
  reason: z.string().trim().min(3).max(300),
  method: z.string().trim().min(1).max(60).default("Cash"),
});

export const accountSchema = z.object({
  code: z.string().trim().regex(/^\d{4}$/, "Use a four-digit code such as 5200"),
  name: z.string().trim().min(2).max(120),
  type: z.enum(["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"]),
  subtype: z.enum(["CASH", "BANK", "MOBILE", "RECEIVABLE", "PAYABLE", "ADVANCE", "DEFERRED", "REVENUE", "FX"]).nullish().transform((value) => value ?? null),
  currency,
  description: optional(300),
  active: z.boolean().default(true),
});
export const journalSchema = z.object({
  date: z.coerce.date(),
  memo: z.string().trim().min(2).max(300),
  branchId: id,
  lines: z
    .array(
      z.object({
        accountId: z.string().trim().min(1),
        debit: z.coerce.number().min(0).default(0),
        credit: z.coerce.number().min(0).default(0),
        currency,
        exchangeRate: rate,
        customerId: id,
        memo: optional(200),
      }),
    )
    .min(2)
    .max(40),
});
export const reversalSchema = z.object({ reason: z.string().trim().min(3).max(300) });
export const transferSchema = z.object({
  fromAccountId: z.string().trim().min(1),
  toAccountId: z.string().trim().min(1),
  amount: z.coerce.number().positive(),
  date: z.coerce.date(),
  memo: optional(200),
});
export const budgetSchema = z.object({
  name: z.string().trim().min(2).max(120),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  branchId: id,
  lines: z.array(z.object({ accountId: z.string().trim().min(1), amount: money })).min(1).max(100),
});
export const rateSchema = z.object({ currency, rate: z.coerce.number().positive().max(100000), date: z.coerce.date() });

export const documentMetaSchema = z.object({
  category: z.enum(["EMPLOYEE", "CLIENT", "VISA", "COMPANY"]),
  docType: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(200),
  number: optional(80),
  customerId: id,
  employeeId: id,
  issueDate: optionalDate,
  expiryDate: optionalDate,
  notes: optional(1000),
  restrictedTo: z.array(z.enum(["MANAGER", "ACCOUNTANT", "EMPLOYEE", "MODERATOR"])).max(4).default([]),
  branchId: id,
});
export const verificationSchema = z.object({ verification: z.enum(["PENDING", "VERIFIED", "REJECTED"]), notes: optional(1000) });

export const branchSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{2,12}$/, "Use 2 to 12 letters or digits, such as KHL"),
  name: z.string().trim().min(2).max(120),
  address: optional(300),
  phone: optional(40),
  active: z.boolean().default(true),
});
export const rolePermissionSchema = z.object({
  role: z.enum(["MANAGER", "ACCOUNTANT", "EMPLOYEE", "MODERATOR"]),
  permission: z.string().trim().min(3).max(60),
  allowed: z.boolean(),
});
export const staffSchema = z.object({
  role: z.enum(["USER", "ADMIN", "MODERATOR", "MANAGER", "ACCOUNTANT", "EMPLOYEE"]).optional(),
  branchId: id.optional(),
  allBranches: z.boolean().optional(),
});
export const settingsSchema = z.object({
  documentExpiryDays: z.array(z.coerce.number().int().min(0).max(365)).min(1).max(5).optional(),
  paymentReminderDays: z.array(z.coerce.number().int().min(0).max(90)).min(1).max(5).optional(),
  dealDeadlineDays: z.array(z.coerce.number().int().min(0).max(90)).min(1).max(5).optional(),
  invoiceTerms: z.string().trim().max(6000).optional(),
  currencies: z.array(z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/)).min(1).max(12).optional(),
});
export const preferenceSchema = z.object({
  preferences: z.array(z.object({ type: z.string().trim().min(3).max(40), inApp: z.boolean(), email: z.boolean() })).max(20),
});
export const decisionSchema = z.object({ approve: z.boolean(), note: optional(500) });
export const lookupSchema = z.object({ value: z.string().trim().min(1).max(80) });
