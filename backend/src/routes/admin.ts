import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../lib/prisma.js";
import {
  opportunitySchema,
  opportunityCategorySchema,
  partnerSchema,
  institutionSchema,
  hospitalSchema,
  transactionSchema,
  invoiceSchema,
  pageContentUpdateSchema,
  businessContentUpdateSchema,
  feeSettingsSchema,
  divisionContentSchema,
  educationContentSchema,
  healthcareContentSchema,
  umrahContentSchema,
  aboutContentSchema,
  servicesContentSchema,
  contactContentSchema,
  opportunitiesContentSchema,
  applyContentSchema,
  payContentSchema,
  loginContentSchema,
  legalContentSchema,
  documentsContentSchema,
  amountDueSchema,
  applicationEditSchema,
  categorySchema,
  noteSchema,
  adminReviewSchema,
  reviewChangeSchema,
  newUserSchema,
  blockUserSchema,
} from "../lib/schemas.js";
import { sendAccountCreated } from "../lib/email.js";
import { temporaryPassword } from "../lib/passwords.js";
import bcrypt from "bcryptjs";
import { defaultHomeContent } from "../lib/home-content.js";
import { defaultBusinessContent } from "../lib/business-content.js";
import {
  defaultEducationContent,
  defaultHealthcareContent,
  defaultUmrahContent,
} from "../lib/division-content.js";
import {
  defaultAboutContent,
  defaultContactContent,
  defaultServicesContent,
} from "../lib/site-pages.js";
import {
  MISSING_TOOL,
  backupFolder,
  dumpToolAvailable,
  lastBackup,
} from "../lib/backup.js";
import { z } from "zod";
import sharp from "sharp";
import { documentSummary } from "../lib/documents.js";
import { adminPermission, isStaff, refusal } from "../lib/permissions.js";
import { allowed, staffOf } from "../lib/access.js";
import { audit } from "../lib/audit.js";
import { cancelInvoice, invoiceFigures, issueInvoice, OfficeError, payBill, postCashbookEntry, reviseInvoice, unpostCashbookEntry } from "../lib/office-service.js";
import { PostingError, reverseJournal } from "../lib/accounting.js";
import { doOrAsk } from "../lib/approvals.js";
import { notify, staffWith } from "../lib/office-notifications.js";
import { SHARE_DAYS } from "./share.js";
import { siteUrl } from "../lib/email-layout.js";
import { balance, taka } from "../lib/payment-rules.js";
import { randomCode, receiptNumber } from "../lib/reference.js";
import { businessToday, dayWindow } from "../lib/ledger.js";
import {
  invoiceAmounts,
  invoiceNumber,
  serialFromSearch,
  type InvoiceLine,
} from "../lib/invoices.js";
import {
  notifyAmountDue,
  notifyApplicationStatus,
  teamAddresses,
} from "../lib/notifications.js";

// A photo straight from a camera fits comfortably; it is resized before storing.
const MAX_IMAGE_BYTES = 25 * 1024 * 1024;

// What the admin sees of an account. Never the password or sign-in codes.
const userFields = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  createdAt: true,
  blockedAt: true,
  mustChangePassword: true,
} as const;

// The start of today, the last seven days, this month or this year, by the
// calendar in Bangladesh whatever the server's own time zone is.
function rangeStart(period: string) {
  const today = businessToday();
  const start = dayWindow(today)!.start;
  if (period === "day") return start;
  if (period === "week") return new Date(start.getTime() - 6 * 24 * 60 * 60 * 1000);
  if (period === "year") return dayWindow(`${today.slice(0, 4)}-01-01`)!.start;
  return dayWindow(`${today.slice(0, 7)}-01`)!.start;
}

const admin: FastifyPluginAsync = async (app) => {
  // On arrival, so that nothing a visitor sends is read before they are checked.
  app.addHook("onRequest", app.authenticate);
  app.addHook("onRequest", async (req, reply) => {
    // The Super Admin may do everything; other staff what their role allows.
    const role = (req.user as any).role;
    if (role === "ADMIN") return;
    if (!isStaff(role)) return reply.forbidden("Admin access required");
    const path = req.url.split("?")[0].replace(/^\/api\/admin/, "");
    const permission = adminPermission(req.method, path);
    if (permission && (await allowed(role, permission))) return;
    return reply.forbidden(refusal(req.method));
  });

  app.post("/media", async (req, reply) => {
    const upload = await req.file({ limits: { fileSize: MAX_IMAGE_BYTES } });
    if (!upload) return reply.badRequest("Choose an image to upload");
    if (!upload.mimetype.startsWith("image/"))
      return reply.badRequest("The selected file is not a supported image");
    try {
      const original = await upload.toBuffer();
      const processor = sharp(original, { sequentialRead: true })
        .rotate()
        .resize({
          width: 2400,
          height: 2400,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 84, effort: 5, smartSubsample: true });
      const result = await processor.toBuffer({ resolveWithObject: true });
      const width = result.info.width;
      const height = result.info.height;
      const purpose =
        String((req.query as { purpose?: string }).purpose || "").slice(
          0,
          120,
        ) || null;
      const asset = await prisma.mediaAsset.create({
        data: {
          originalName: upload.filename.slice(0, 255),
          mimeType: "image/webp",
          format: "webp",
          data: result.data,
          width,
          height,
          byteSize: result.data.length,
          orientation:
            width > height * 1.12
              ? "landscape"
              : height > width * 1.12
                ? "portrait"
                : "square",
          purpose,
        },
      });
      return reply.code(201).send({
        data: {
          id: asset.id,
          url: `${process.env.API_PUBLIC_URL || `${req.protocol}://${req.host}`}/api/media/${asset.id}.webp`,
          width: asset.width,
          height: asset.height,
          byteSize: asset.byteSize,
          format: asset.format,
          orientation: asset.orientation,
          originalName: asset.originalName,
        },
      });
    } catch (error) {
      if ((error as { statusCode?: number }).statusCode === 413)
        return reply.code(413).send({ error: { code: "TOO_LARGE", message: `Choose an image under ${MAX_IMAGE_BYTES / 1024 / 1024} MB` } });
      req.log.warn({ error }, "Image processing failed");
      return reply.badRequest(
        "The selected file could not be decoded as an image",
      );
    }
  });

  app.get("/media", async () => ({
    data: await prisma.mediaAsset.findMany({
      select: {
        id: true,
        originalName: true,
        mimeType: true,
        format: true,
        width: true,
        height: true,
        byteSize: true,
        orientation: true,
        purpose: true,
        altText: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  }));

  app.delete("/media/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const asset = await prisma.mediaAsset.findUnique({
      where: { id },
      select: { id: true, format: true },
    });
    if (!asset) return reply.notFound("Image not found");
    const needle = `/api/media/${id}.${asset.format}`;
    const [
      pages,
      opportunities,
      suppliers,
      factories,
      institutions,
      hospitals,
    ] = await Promise.all([
      prisma.pageContent.findMany({ select: { content: true } }),
      prisma.opportunity.count({ where: { image: { contains: needle } } }),
      prisma.supplier.count({ where: { image: { contains: needle } } }),
      prisma.factory.count({ where: { image: { contains: needle } } }),
      prisma.institution.count({ where: { image: { contains: needle } } }),
      prisma.hospital.count({ where: { image: { contains: needle } } }),
    ]);
    const inUse =
      Number(
        pages.some((page) => JSON.stringify(page.content).includes(needle)),
      ) +
      opportunities +
      suppliers +
      factories +
      institutions +
      hospitals;
    if (inUse)
      return reply
        .code(409)
        .send({
          error: {
            code: "MEDIA_IN_USE",
            message:
              "This image is currently used by published or saved content and cannot be deleted.",
          },
        });
    await prisma.mediaAsset.delete({ where: { id } });
    return reply.code(204).send();
  });

  app.get("/dashboard", async () => {
    const today = rangeStart("day");
    const [enquiries, applications, payments, transactions, due, refunded] =
      await Promise.all([
        prisma.enquiry.count({ where: { status: "SUBMITTED" } }),
        prisma.application.count({
          where: { status: { in: ["SUBMITTED", "IN_REVIEW"] } },
        }),
        prisma.payment.aggregate({
          _sum: { amount: true },
          where: { status: { in: ["PAID", "PARTIALLY_PAID"] } },
        }),
        prisma.financialTransaction.findMany({
          where: { date: { gte: today } },
        }),
        prisma.receipt.aggregate({
          _sum: { remainingDue: true },
          where: { payment: { status: { in: ["DUE", "PARTIALLY_PAID"] } } },
        }),
        // Part refunds of payments that still count as received.
        prisma.refund.aggregate({
          _sum: { amount: true },
          where: {
            status: "COMPLETED",
            payment: { status: { in: ["PAID", "PARTIALLY_PAID"] } },
          },
        }),
      ]);
    const income = transactions
      .filter((x) => x.type === "INCOME")
      .reduce((s, x) => s + Number(x.total), 0);
    const expense = transactions
      .filter((x) => x.type === "EXPENSE")
      .reduce((s, x) => s + Number(x.total), 0);
    return {
      data: {
        newEnquiries: enquiries,
        activeApplications: applications,
        todayIncome: income,
        todayExpense: expense,
        todayProfit: income - expense,
        totalDue: Number(due._sum.remainingDue || 0),
        paymentsReceived:
          Number(payments._sum.amount || 0) - Number(refunded._sum.amount || 0),
      },
    };
  });

  // The kinds of opportunity, oldest first. The eight originals come with the
  // database; the administrator can add more.
  app.get("/opportunity-categories", async () => ({
    data: await prisma.opportunityCategory.findMany({
      orderBy: [{ createdAt: "asc" }, { label: "asc" }],
      select: { value: true, label: true },
    }),
  }));

  const opportunityCategoryTaken = (reply: any) =>
    reply.code(409).send({
      error: {
        code: "CATEGORY_EXISTS",
        message: "A category with this name already exists",
      },
    });

  app.post("/opportunity-categories", async (req, reply) => {
    const parsed = opportunityCategorySchema.safeParse(req.body);
    // Stored as letters and numbers of any language, joined by underscores,
    // because it travels in web addresses and is shown on the opportunity cards.
    const value = parsed.success
      ? parsed.data.label
          .replace(/[^\p{L}\p{M}\p{N}]+/gu, "_")
          .replace(/^_+|_+$/g, "")
          .toUpperCase()
      : "";
    if (!parsed.success || !value)
      return reply.badRequest("Give the category a name of 2 to 60 characters");
    const { label } = parsed.data;
    const taken = await prisma.opportunityCategory.count({
      where: { OR: [{ value }, { label: { equals: label, mode: "insensitive" } }] },
    });
    if (taken) return opportunityCategoryTaken(reply);
    try {
      return reply.code(201).send({
        data: await prisma.opportunityCategory.create({
          data: { value, label },
          select: { value: true, label: true },
        }),
      });
    } catch (error) {
      if (isUniqueViolation(error)) return opportunityCategoryTaken(reply);
      throw error;
    }
  });

  const knownOpportunityCategory = (value: string) =>
    prisma.opportunityCategory.count({ where: { value } });
  const unknownOpportunityCategory = (reply: any) =>
    reply.badRequest("Choose one of the listed categories");

  app.post("/opportunities", async (req, reply) => {
    const parsed = opportunitySchema.safeParse(req.body);
    if (!parsed.success)
      return reply
        .code(400)
        .send({
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid opportunity",
            details: parsed.error.flatten(),
          },
        });
    if (!(await knownOpportunityCategory(parsed.data.category)))
      return unknownOpportunityCategory(reply);
    try {
      const created = await prisma.opportunity.create({ data: parsed.data });
      return reply.code(201).send({ data: created });
    } catch (error) {
      if (isUniqueViolation(error)) return slugTaken(reply);
      throw error;
    }
  });

  // Lists for the admin tables. With ?page= the response is one page plus the
  // total; without it the whole list is returned.
  app.get("/resources/:resource", async (req, reply) => {
    const { resource } = req.params as { resource: string };
    const query = req.query as {
      search?: string;
      page?: string;
      pageSize?: string;
    };
    const search = String(query.search || "").trim();
    const matching = (...fields: string[]) =>
      search
        ? {
            OR: fields.map((field) => ({
              [field]: { contains: search, mode: "insensitive" as const },
            })),
          }
        : {};
    const person = { select: { name: true, email: true } };
    const application = { select: { reference: true, fullName: true } };
    const newest = [{ createdAt: "desc" }, { id: "desc" }];
    const featuredFirst = [{ featured: "desc" }, ...newest];
    const byName = [{ name: "asc" }, { id: "asc" }];
    const lists: Record<string, { table: any; args: Record<string, unknown> }> =
      {
        enquiries: {
          table: prisma.enquiry,
          args: {
            where: matching("name", "phone", "email", "message"),
            include: { user: person, _count: { select: { notes: true } } },
            orderBy: newest,
          },
        },
        applications: {
          table: prisma.application,
          args: {
            where: matching("reference", "fullName", "email", "phone"),
            include: {
              user: person,
              _count: { select: { payments: true, notes: true } },
              documents: { select: documentSummary },
              payments: {
                select: {
                  amount: true,
                  status: true,
                  refunds: { select: { amount: true, status: true } },
                },
              },
            },
            orderBy: newest,
          },
        },
        opportunities: {
          table: prisma.opportunity,
          args: {
            where: matching("title", "country", "location"),
            orderBy: newest,
          },
        },
        suppliers: {
          table: prisma.supplier,
          args: {
            where: matching("name", "country", "industry", "product"),
            orderBy: featuredFirst,
          },
        },
        factories: {
          table: prisma.factory,
          args: {
            where: matching("name", "country", "industry", "product"),
            orderBy: featuredFirst,
          },
        },
        education: {
          table: prisma.institution,
          args: {
            where: matching("name", "country"),
            include: { programs: true },
            orderBy: byName,
          },
        },
        healthcare: {
          table: prisma.hospital,
          args: {
            where: matching("name", "country", "city"),
            include: { services: true },
            orderBy: byName,
          },
        },
        users: {
          table: prisma.user,
          args: {
            where: matching("name", "email", "phone"),
            select: {
              ...userFields,
              _count: {
                select: { enquiries: true, applications: true, payments: true },
              },
            },
            orderBy: newest,
          },
        },
        payments: {
          table: prisma.payment,
          args: {
            omit: { gatewaySignature: true },
            where: matching("service", "transactionId", "method"),
            include: {
              user: person,
              application,
              receipt: true,
              refunds: { select: { amount: true, status: true } },
            },
            orderBy: newest,
          },
        },
        receipts: {
          table: prisma.receipt,
          args: {
            where: matching("receiptNumber"),
            include: { payment: { omit: { gatewaySignature: true }, include: { user: person, application } } },
            orderBy: newest,
          },
        },
      };
    const list = Object.hasOwn(lists, resource) ? lists[resource] : undefined;
    if (!list) return reply.notFound("Admin resource not found");
    if (query.page === undefined)
      return { data: await list.table.findMany(list.args) };
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 25));
    const page = Math.max(1, Number(query.page) || 1);
    const [data, total] = await Promise.all([
      list.table.findMany({
        ...list.args,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      list.table.count({ where: list.args.where }),
    ]);
    return { data, meta: { total, page, pageSize } };
  });

  // One application or enquiry, whole, for the page that prints it.
  app.get("/resources/:resource/:id", async (req, reply) => {
    const { resource, id } = req.params as { resource: string; id: string };
    const record =
      resource === "applications"
        ? await prisma.application.findUnique({
            where: { id },
            include: { documents: { select: documentSummary } },
          })
        : resource === "enquiries"
          ? await prisma.enquiry.findUnique({ where: { id } })
          : null;
    return record ? { data: record } : reply.notFound("Record not found");
  });

  app.patch("/resources/:resource/:id", async (req, reply) => {
    const { resource, id } = req.params as { resource: string; id: string };
    const body = (req.body ?? {}) as Record<string, unknown>;
    // What an application costs, set by staff after quoting the customer.
    if (resource === "applications" && body.amountDue !== undefined) {
      if (!(await allowed((req.user as any).role, "payments.update")))
        return reply.forbidden("Only an administrator or an accountant can set what an application costs.");
      const amountDue = amountDueSchema.safeParse(body.amountDue);
      if (!amountDue.success)
        return reply.badRequest("Enter the amount due as a positive number");
      const before = await prisma.application.findUnique({
        where: { id },
        select: { amountDue: true },
      });
      if (!before) return reply.notFound("Application not found");
      const updated = await prisma.application.update({
        where: { id },
        data: { amountDue: amountDue.data },
        include: {
          payments: {
            select: {
              amount: true,
              status: true,
              refunds: { select: { amount: true, status: true } },
            },
          },
        },
      });
      // The applicant hears about a new amount, not about one saved again.
      const previous = before.amountDue === null ? null : Number(before.amountDue);
      const { remaining } = balance(amountDue.data, updated.payments);
      if (amountDue.data !== null && amountDue.data !== previous && remaining)
        notifyAmountDue(app, updated, { amountDue: amountDue.data, remaining });
      if (body.status === undefined)
        return { data: await prisma.application.findUnique({ where: { id } }) };
    }
    if (resource === "enquiries" || resource === "applications") {
      const parsed = [
        "DRAFT",
        "SUBMITTED",
        "IN_REVIEW",
        "APPROVED",
        "REJECTED",
        "CANCELLED",
      ].includes(String(body.status));
      if (!parsed) return reply.badRequest("Invalid record status");
      if (resource === "enquiries")
        return {
          data: await prisma.enquiry.update({
            where: { id },
            data: { status: body.status as any },
          }),
        };
      const before = await prisma.application.findUnique({
        where: { id },
        select: { status: true },
      });
      if (!before) return reply.notFound("Application not found");
      const updated = await prisma.application.update({
        where: { id },
        data: { status: body.status as any },
      });
      if (updated.status !== before.status)
        notifyApplicationStatus(app, updated, updated.status);
      return { data: updated };
    }
    if (resource === "opportunities")
      return {
        data: await prisma.opportunity.update({
          where: { id },
          data: { published: Boolean(body.published) },
        }),
      };
    if (resource === "users") {
      if (!["USER", "MODERATOR", "MANAGER", "ACCOUNTANT", "EMPLOYEE", "ADMIN"].includes(String(body.role)))
        return reply.badRequest("Choose Member, Moderator, Employee, Accountant, Manager or Super Admin");
      const actor = await staffOf(req);
      const before = await prisma.user.findUnique({ where: { id }, select: { name: true, role: true } });
      if (!before) return reply.notFound("User not found");
      const changed = before.role !== body.role;
      if (changed && id === actor.id) return reply.badRequest("You cannot change your own role.");
      if (changed && (body.role === "ADMIN" || before.role === "ADMIN") && actor.role !== "ADMIN")
        return reply.forbidden("Only a Super Admin can make or unmake a Super Admin.");
      // A new role takes effect at once: the person signs in again.
      const user = await prisma.user.update({
        where: { id },
        data: { role: body.role as any, ...(changed ? { tokenVersion: { increment: 1 } } : {}) },
        select: userFields,
      });
      if (changed)
        await audit(req, { action: "user.role", entityType: "user", entityId: id, summary: `${before.name}: ${before.role} → ${body.role}`, changes: { role: { from: before.role, to: body.role } } });
      return { data: user };
    }
    return reply.badRequest("This resource cannot be updated here");
  });

  // An account made by staff. Its owner gets a temporary password by email,
  // which is not kept or shown here, and must replace it at first sign-in.
  app.post("/users", async (req, reply) => {
    const parsed = newUserSchema.safeParse(req.body);
    if (!parsed.success)
      return reply.code(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Enter the person's name, a valid email address and a phone number of at least 7 digits, or leave the phone empty.",
          details: parsed.error.flatten(),
        },
      });
    const developing =
      process.env.AUTH_DEV_CODES === "true" && process.env.NODE_ENV !== "production";
    if (!app.mailer.configured && !developing)
      return reply.serviceUnavailable("Email is not set up, so the temporary password cannot be sent.");
    if (await prisma.user.findUnique({ where: { email: parsed.data.email }, select: { id: true } }))
      return reply.conflict("An account with this email already exists.");
    // A staff role is given only by someone who may change roles; a Super
    // Admin only by a Super Admin.
    const actor = await staffOf(req);
    if (parsed.data.role !== "USER" && !(await allowed(actor.role, "roles.update")))
      return reply.forbidden("Only the Super Admin can give a staff role. Add the person as a member, and ask the Super Admin to change the role.");
    if (parsed.data.role === "ADMIN" && actor.role !== "ADMIN") return reply.forbidden("Only a Super Admin can make another Super Admin.");
    const password = temporaryPassword();
    const user = await prisma.user.create({
      data: {
        ...parsed.data,
        passwordHash: await bcrypt.hash(password, 12),
        // The emailed password is what proves they own this address.
        emailVerifiedAt: new Date(),
        mustChangePassword: true,
      },
      select: userFields,
    });
    let delivered = false;
    try {
      delivered = await sendAccountCreated(app.mailer, { to: user.email, name: user.name, password });
    } catch (error) {
      req.log.error(error);
      await prisma.user.delete({ where: { id: user.id } });
      return reply.serviceUnavailable("The email could not be sent, so the account was not created. Please try again in a few minutes.");
    }
    return reply.code(201).send({ data: { ...user, ...(delivered ? {} : { developmentPassword: password }) } });
  });

  // Blocking keeps everything the person has on record. Their open sessions
  // end for good: unblocking lets them sign in again, not resume.
  app.patch("/users/:id/block", async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = blockUserSchema.safeParse(req.body);
    if (!parsed.success) return reply.badRequest("Say whether to block or unblock this account");
    if (id === (req.user as any).sub) return reply.badRequest("You cannot block your own account");
    return {
      data: await prisma.user.update({
        where: { id },
        data: parsed.data.blocked ? { blockedAt: new Date(), tokenVersion: { increment: 1 } } : { blockedAt: null },
        select: userFields,
      }),
    };
  });

  // Records an admin can add, correct and remove: partners, the education
  // and hospital directories, and opportunities. Institutions and hospitals
  // are saved together with their programmes or services.
  const resourceSchemas = {
    opportunities: opportunitySchema,
    suppliers: partnerSchema,
    factories: partnerSchema,
    education: institutionSchema,
    healthcare: hospitalSchema,
  };
  type ManagedResource = keyof typeof resourceSchemas;
  const isManaged = (resource: string): resource is ManagedResource =>
    Object.hasOwn(resourceSchemas, resource);
  const invalid = (reply: any, error: { flatten(): unknown }) =>
    reply.code(400).send({
      error: {
        code: "VALIDATION_ERROR",
        message: "Complete all required fields",
        details: error.flatten(),
      },
    });
  const slugTaken = (reply: any) =>
    reply.code(409).send({
      error: {
        code: "SLUG_TAKEN",
        message: "Another opportunity already uses this link name",
      },
    });
  const isUniqueViolation = (error: unknown) =>
    (error as { code?: string })?.code === "P2002";

  app.post("/resources/:resource", async (req, reply) => {
    const { resource } = req.params as { resource: string };
    if (!isManaged(resource) || resource === "opportunities")
      return reply.badRequest("This resource cannot be created here");
    const parsed = resourceSchemas[resource].safeParse(req.body);
    if (!parsed.success) return invalid(reply, parsed.error);
    const data: any = parsed.data;
    const created =
      resource === "suppliers"
        ? await prisma.supplier.create({ data })
        : resource === "factories"
          ? await prisma.factory.create({ data })
          : resource === "education"
            ? await prisma.institution.create({
                data: { ...data, programs: { create: data.programs } },
                include: { programs: true },
              })
            : await prisma.hospital.create({
                data: { ...data, services: { create: data.services } },
                include: { services: true },
              });
    return reply.code(201).send({ data: created });
  });

  app.put("/resources/:resource/:id", async (req, reply) => {
    const { resource, id } = req.params as { resource: string; id: string };
    // Staff correct what an applicant told us. The reference, division,
    // status and amount due have their own controls and are not touched.
    if (resource === "applications") {
      const parsed = applicationEditSchema.safeParse(req.body);
      if (!parsed.success) return invalid(reply, parsed.error);
      if (!(await prisma.application.count({ where: { id } })))
        return reply.notFound("Application not found");
      const { fullName, email, phone, details } = parsed.data;
      return {
        data: await prisma.application.update({
          where: { id },
          data: {
            fullName,
            email,
            phone,
            details: { ...details, fullName, email, phone } as any,
          },
        }),
      };
    }
    if (!isManaged(resource))
      return reply.badRequest("This resource cannot be edited here");
    const parsed = resourceSchemas[resource].safeParse(req.body);
    if (!parsed.success) return invalid(reply, parsed.error);
    const data: any = parsed.data;
    const where = { id };
    try {
      if (resource === "opportunities") {
        if (!(await prisma.opportunity.count({ where })))
          return reply.notFound("Record not found");
        if (!(await knownOpportunityCategory(data.category)))
          return unknownOpportunityCategory(reply);
        return { data: await prisma.opportunity.update({ where, data }) };
      }
      if (resource === "suppliers" || resource === "factories") {
        const table: any =
          resource === "suppliers" ? prisma.supplier : prisma.factory;
        if (!(await table.count({ where })))
          return reply.notFound("Record not found");
        return { data: await table.update({ where, data }) };
      }
      if (resource === "education") {
        if (!(await prisma.institution.count({ where })))
          return reply.notFound("Record not found");
        const { programs, ...fields } = data;
        const [, , updated] = await prisma.$transaction([
          prisma.educationProgram.deleteMany({ where: { institutionId: id } }),
          prisma.institution.update({ where, data: fields }),
          prisma.institution.update({
            where,
            data: { programs: { create: programs } },
            include: { programs: true },
          }),
        ]);
        return { data: updated };
      }
      if (!(await prisma.hospital.count({ where })))
        return reply.notFound("Record not found");
      const { services, ...fields } = data;
      const [, , updated] = await prisma.$transaction([
        prisma.healthcareService.deleteMany({ where: { hospitalId: id } }),
        prisma.hospital.update({ where, data: fields }),
        prisma.hospital.update({
          where,
          data: { services: { create: services } },
          include: { services: true },
        }),
      ]);
      return { data: updated };
    } catch (error) {
      if (isUniqueViolation(error)) return slugTaken(reply);
      throw error;
    }
  });

  app.delete("/resources/:resource/:id", async (req, reply) => {
    const { resource, id } = req.params as { resource: string; id: string };
    const where = { id };
    let removed: number;
    // An application goes together with its documents and with payment
    // attempts that never went through. Once money has been received, or a
    // payment is still in progress, it is part of the accounts and is kept.
    if (resource === "applications") {
      const payments = await prisma.payment.findMany({
        where: { applicationId: id },
        select: { status: true },
      });
      if (payments.some((payment) => payment.status !== "FAILED"))
        return reply.code(409).send({
          error: {
            code: "HAS_PAYMENTS",
            message:
              "This application has payments, so it is kept for the accounts. Set its status to Cancelled instead.",
          },
        });
      [, { count: removed }] = await prisma.$transaction([
        prisma.payment.deleteMany({
          where: { applicationId: id, status: "FAILED" },
        }),
        prisma.application.deleteMany({ where }),
      ]);
    } else if (resource === "opportunities")
      removed = (await prisma.opportunity.deleteMany({ where })).count;
    else if (resource === "suppliers")
      removed = (await prisma.supplier.deleteMany({ where })).count;
    else if (resource === "factories")
      removed = (await prisma.factory.deleteMany({ where })).count;
    else if (resource === "enquiries")
      removed = (await prisma.enquiry.deleteMany({ where })).count;
    else if (resource === "education")
      [, { count: removed }] = await prisma.$transaction([
        prisma.educationProgram.deleteMany({ where: { institutionId: id } }),
        prisma.institution.deleteMany({ where }),
      ]);
    else if (resource === "healthcare")
      [, { count: removed }] = await prisma.$transaction([
        prisma.healthcareService.deleteMany({ where: { hospitalId: id } }),
        prisma.hospital.deleteMany({ where }),
      ]);
    else return reply.badRequest("This resource cannot be deleted here");
    return removed ? reply.code(204).send() : reply.notFound("Record not found");
  });

  app.get("/content/home", async () => {
    const page = await prisma.pageContent.findUnique({
      where: { slug: "home" },
    });
    return {
      data: page ?? {
        slug: "home",
        name: "Homepage",
        content: defaultHomeContent,
        published: true,
        revision: 0,
        updatedAt: null,
      },
    };
  });

  app.put("/content/home", async (req, reply) => {
    const parsed = pageContentUpdateSchema.safeParse(req.body);
    if (!parsed.success)
      return reply
        .code(400)
        .send({
          error: {
            code: "VALIDATION_ERROR",
            message: "Please correct the homepage content",
            details: parsed.error.flatten(),
          },
        });
    const existing = await prisma.pageContent.findUnique({
      where: { slug: "home" },
    });
    if (existing && existing.revision !== parsed.data.revision)
      return reply
        .code(409)
        .send({
          error: {
            code: "CONTENT_CONFLICT",
            message:
              "This page was updated in another session. Reload before saving again.",
          },
        });
    const page = existing
      ? await prisma.pageContent.update({
          where: { slug: "home" },
          data: {
            content: parsed.data.content as any,
            published: parsed.data.published,
            revision: { increment: 1 },
          },
        })
      : await prisma.pageContent.create({
          data: {
            slug: "home",
            name: "Homepage",
            content: parsed.data.content as any,
            published: parsed.data.published,
            revision: 1,
          },
        });
    return { data: page };
  });

  app.get("/content/business", async () => {
    const page = await prisma.pageContent.findUnique({
      where: { slug: "business" },
    });
    return {
      data: page ?? {
        slug: "business",
        name: "Global Business",
        content: defaultBusinessContent,
        published: true,
        revision: 0,
        updatedAt: null,
      },
    };
  });

  app.put("/content/business", async (req, reply) => {
    const parsed = businessContentUpdateSchema.safeParse(req.body);
    if (!parsed.success)
      return reply
        .code(400)
        .send({
          error: {
            code: "VALIDATION_ERROR",
            message: "Please correct the Global Business content",
            details: parsed.error.flatten(),
          },
        });
    const existing = await prisma.pageContent.findUnique({
      where: { slug: "business" },
    });
    if (existing && existing.revision !== parsed.data.revision)
      return reply
        .code(409)
        .send({
          error: {
            code: "CONTENT_CONFLICT",
            message:
              "This page was updated in another session. Reload before saving again.",
          },
        });
    const page = existing
      ? await prisma.pageContent.update({
          where: { slug: "business" },
          data: {
            content: parsed.data.content as any,
            published: parsed.data.published,
            revision: { increment: 1 },
          },
        })
      : await prisma.pageContent.create({
          data: {
            slug: "business",
            name: "Global Business",
            content: parsed.data.content as any,
            published: parsed.data.published,
            revision: 1,
          },
        });
    return { data: page };
  });

  // Pages edited as one document each: the division portals and the About,
  // Services and Contact pages.
  const editablePages = {
    education: {
      name: "Global Education",
      fallback: defaultEducationContent,
      schema: educationContentSchema,
    },
    healthcare: {
      name: "Global Healthcare",
      fallback: defaultHealthcareContent,
      schema: healthcareContentSchema,
    },
    umrah: {
      name: "Global Umrah",
      fallback: defaultUmrahContent,
      schema: umrahContentSchema,
    },
    about: {
      name: "About Us",
      fallback: defaultAboutContent,
      schema: aboutContentSchema,
    },
    services: {
      name: "Services",
      fallback: defaultServicesContent,
      schema: servicesContentSchema,
    },
    contact: {
      name: "Contact",
      fallback: defaultContactContent,
      schema: contactContentSchema,
    },
    // Empty until saved: the website holds these pages' built-in wording.
    opportunities: { name: "Opportunities", fallback: {}, schema: opportunitiesContentSchema },
    apply: { name: "Apply / Enquiry", fallback: {}, schema: applyContentSchema },
    pay: { name: "Pay online", fallback: {}, schema: payContentSchema },
    login: { name: "Sign-in", fallback: {}, schema: loginContentSchema },
    privacy: { name: "Privacy Policy", fallback: {}, schema: legalContentSchema },
    terms: { name: "Terms of Use", fallback: {}, schema: legalContentSchema },
    documents: { name: "Documents and PDFs", fallback: {}, schema: documentsContentSchema },
  };
  for (const [division, { name, fallback, schema }] of Object.entries(
    editablePages,
  )) {
    const updateSchema = z.object({
      content: schema as z.ZodTypeAny,
      published: z.boolean().default(true),
      revision: z.number().int().nonnegative(),
    });
    app.get(`/content/${division}`, async () => {
      const page = await prisma.pageContent.findUnique({
        where: { slug: division },
      });
      return {
        data: page ?? {
          slug: division,
          name,
          content: fallback,
          published: true,
          revision: 0,
          updatedAt: null,
        },
      };
    });
    app.put(`/content/${division}`, async (req, reply) => {
      const parsed = updateSchema.safeParse(req.body);
      if (!parsed.success)
        return reply
          .code(400)
          .send({
            error: {
              code: "VALIDATION_ERROR",
              message: `Please correct the ${name} content. Every field needs some text, and an image needs a path or a web address.`,
              details: parsed.error.flatten(),
            },
          });
      const existing = await prisma.pageContent.findUnique({
        where: { slug: division },
      });
      if (existing && existing.revision !== parsed.data.revision)
        return reply
          .code(409)
          .send({
            error: {
              code: "CONTENT_CONFLICT",
              message:
                "This page was updated in another session. Reload before saving again.",
            },
          });
      const page = existing
        ? await prisma.pageContent.update({
            where: { slug: division },
            data: {
              content: parsed.data.content as any,
              published: parsed.data.published,
              revision: { increment: 1 },
            },
          })
        : await prisma.pageContent.create({
            data: {
              slug: division,
              name,
              content: parsed.data.content as any,
              published: parsed.data.published,
              revision: 1,
            },
          });
      return { data: page };
    });
  }

  // Service fees: what each division charges when an application is
  // submitted, and the smallest part payment accepted online.
  const feeSettings = async () => {
    const saved = await prisma.serviceFee.findMany();
    return (["BUSINESS", "EDUCATION", "HEALTHCARE", "UMRAH"] as const).map(
      (division) => {
        const fee = saved.find((item) => item.division === division);
        return {
          division,
          label: fee?.label ?? "Service fee",
          amount: Number(fee?.amount ?? 0),
          minimumPayment: Number(fee?.minimumPayment ?? 0),
        };
      },
    );
  };

  app.get("/payment-settings", async () => ({
    data: { onlinePayment: Object.values(app.gateways).some((gateway) => gateway.configured), payments: { bkash: app.gateways.bkash.configured, nagad: app.gateways.nagad.configured }, fees: await feeSettings() },
  }));

  app.put("/payment-settings", async (req, reply) => {
    const parsed = feeSettingsSchema.safeParse(req.body);
    if (!parsed.success)
      return reply.code(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message:
            "Check the fees. The smallest part payment cannot be more than the fee.",
          details: parsed.error.flatten(),
        },
      });
    for (const { division, ...fee } of parsed.data.fees)
      await prisma.serviceFee.upsert({
        where: { division },
        update: fee,
        create: { division, ...fee },
      });
    return {
      data: { onlinePayment: Object.values(app.gateways).some((gateway) => gateway.configured), payments: { bkash: app.gateways.bkash.configured, nagad: app.gateways.nagad.configured }, fees: await feeSettings() },
    };
  });

  // Notes staff leave for each other on an application or an enquiry. They
  // are only ever served here, under the admin-only routes.
  const noted = { applications: "applicationId", enquiries: "enquiryId" } as const;
  const notedRecord = async (resource: string, id: string) => {
    if (resource !== "applications" && resource !== "enquiries") return null;
    const exists =
      resource === "applications"
        ? await prisma.application.count({ where: { id } })
        : await prisma.enquiry.count({ where: { id } });
    return exists ? { [noted[resource]]: id } : null;
  };
  const noteFields = { id: true, body: true, authorName: true, createdAt: true };

  app.get("/resources/:resource/:id/notes", async (req, reply) => {
    const { resource, id } = req.params as { resource: string; id: string };
    const where = await notedRecord(resource, id);
    if (!where) return reply.notFound("Record not found");
    return {
      data: await prisma.staffNote.findMany({
        where,
        select: noteFields,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      }),
    };
  });

  app.post("/resources/:resource/:id/notes", async (req, reply) => {
    const { resource, id } = req.params as { resource: string; id: string };
    const where = await notedRecord(resource, id);
    if (!where) return reply.notFound("Record not found");
    const staffId = (req.user as { sub: string }).sub;
    const parsed = noteSchema.safeParse(req.body);
    if (!parsed.success)
      return reply.badRequest("Write a note of up to 2,000 characters");
    const author = await prisma.user.findUnique({
      where: { id: staffId },
      select: { name: true },
    });
    return reply.code(201).send({
      data: await prisma.staffNote.create({
        data: {
          ...where,
          body: parsed.data.body,
          authorId: staffId,
          authorName: author?.name ?? "Staff",
        },
        select: noteFields,
      }),
    });
  });

  app.delete("/notes/:id", async (req, reply) => {
    const { count } = await prisma.staffNote.deleteMany({
      where: { id: (req.params as { id: string }).id },
    });
    return count ? reply.code(204).send() : reply.notFound("Note not found");
  });

  // Customer reviews: the ones waiting for approval first, each with the
  // application and the account it came from.
  const reviewFields = {
    id: true,
    division: true,
    name: true,
    detail: true,
    rating: true,
    body: true,
    photoUrl: true,
    status: true,
    createdAt: true,
    application: { select: { reference: true } },
    user: { select: { name: true, email: true } },
  };
  app.get("/reviews", async () => {
    const reviews = await prisma.review.findMany({
      select: reviewFields,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 300,
    });
    return {
      data: [
        ...reviews.filter((review) => review.status === "PENDING"),
        ...reviews.filter((review) => review.status !== "PENDING"),
      ],
    };
  });

  // A review the team received outside the website. It is shown at once.
  app.post("/reviews", async (req, reply) => {
    const parsed = adminReviewSchema.safeParse(req.body);
    if (!parsed.success)
      return reply.badRequest(
        "Choose the service and a rating from 1 to 5, give the name to show, and write the review.",
      );
    return reply.code(201).send({
      data: await prisma.review.create({
        data: { ...parsed.data, status: "APPROVED" },
        select: reviewFields,
      }),
    });
  });

  // The team approves or hides a review, and sets or removes its photo.
  app.patch("/reviews/:id", async (req, reply) => {
    const parsed = reviewChangeSchema.safeParse(req.body);
    if (!parsed.success)
      return reply.badRequest("Give a new status, a photo to show (a local path or an HTTP(S) address), or null to remove the photo");
    const { id } = req.params as { id: string };
    if (!(await prisma.review.count({ where: { id } })))
      return reply.notFound("Review not found");
    return {
      data: await prisma.review.update({
        where: { id },
        data: parsed.data,
        select: reviewFields,
      }),
    };
  });

  app.delete("/reviews/:id", async (req, reply) => {
    const { count } = await prisma.review.deleteMany({
      where: { id: (req.params as { id: string }).id },
    });
    return count ? reply.code(204).send() : reply.notFound("Review not found");
  });

  // What the settings page shows about the running system.
  app.get("/status", async () => {
    const database = await prisma.$queryRaw`SELECT 1`.then(
      () => true,
      () => false,
    );
    const backup = lastBackup(backupFolder(process.env));
    return {
      data: {
        database,
        // Whether a backup can be downloaded here, and when the server's
        // scheduled backup last ran.
        backupTool: await dumpToolAvailable(),
        lastBackup: backup && { madeAt: backup.madeAt, bytes: backup.bytes },
        email: app.mailer.configured,
        onlinePayment: Object.values(app.gateways).some((gateway) => gateway.configured), payments: { bkash: app.gateways.bkash.configured, nagad: app.gateways.nagad.configured },
        teamInbox: teamAddresses().length > 0,
        formProtection: app.spamCheck.siteKey !== null,
      },
    };
  });

  // A link, valid for two minutes, with which the admin's browser downloads
  // a fresh backup of the database (see routes/backup.ts).
  app.get("/backup-link", async (req, reply) => {
    if (!(await dumpToolAvailable()))
      return reply
        .code(503)
        .send({ error: { code: "PG_DUMP_MISSING", message: MISSING_TOOL } });
    const id = (req.user as { sub: string }).sub;
    const account = await prisma.user.findUniqueOrThrow({
      where: { id },
      select: { tokenVersion: true },
    });
    const key = app.jwt.sign(
      { sub: id, purpose: "backup", v: account.tokenVersion },
      { expiresIn: "2m" },
    );
    const api =
      process.env.API_PUBLIC_URL || `${req.protocol}://${req.host}`;
    return { data: { url: `${api}/api/backup/download?key=${key}` } };
  });

  // Ledger categories, each with the number of entries recorded under it.
  app.get("/accounts/categories", async () => {
    const categories = await prisma.financialCategory.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { transactions: true } } },
    });
    return {
      data: categories.map(({ _count, ...category }) => ({
        ...category,
        entries: _count.transactions,
      })),
    };
  });

  const categoryNameTaken = (reply: any) =>
    reply.code(409).send({
      error: {
        code: "CATEGORY_EXISTS",
        message: "A category with this name already exists",
      },
    });

  // "Visa Fees" and "visa fees" would be the same category twice.
  const categoryNamed = (name: string, notId?: string) =>
    prisma.financialCategory.count({
      where: {
        name: { equals: name, mode: "insensitive" },
        ...(notId ? { id: { not: notId } } : {}),
      },
    });

  app.post("/accounts/categories", async (req, reply) => {
    const parsed = categorySchema.safeParse(req.body);
    if (!parsed.success)
      return reply.badRequest(
        "Give the category a name and choose income or expense",
      );
    if (await categoryNamed(parsed.data.name)) return categoryNameTaken(reply);
    try {
      return reply.code(201).send({
        data: await prisma.financialCategory.create({ data: parsed.data }),
      });
    } catch (error) {
      if (isUniqueViolation(error)) return categoryNameTaken(reply);
      throw error;
    }
  });

  // A category keeps its kind: entries already recorded under it are income
  // or expenses, and renaming must not turn one into the other.
  app.put("/accounts/categories/:id", async (req, reply) => {
    const where = { id: (req.params as { id: string }).id };
    const parsed = categorySchema.pick({ name: true }).safeParse(req.body);
    if (!parsed.success) return reply.badRequest("Give the category a name");
    if (!(await prisma.financialCategory.count({ where })))
      return reply.notFound("Category not found");
    if (await categoryNamed(parsed.data.name, where.id))
      return categoryNameTaken(reply);
    try {
      return {
        data: await prisma.financialCategory.update({
          where,
          data: parsed.data,
        }),
      };
    } catch (error) {
      if (isUniqueViolation(error)) return categoryNameTaken(reply);
      throw error;
    }
  });

  app.delete("/accounts/categories/:id", async (req, reply) => {
    const where = { id: (req.params as { id: string }).id };
    const category = await prisma.financialCategory.findUnique({
      where,
      include: { _count: { select: { transactions: true } } },
    });
    if (!category) return reply.notFound("Category not found");
    if (category._count.transactions)
      return reply.code(409).send({
        error: {
          code: "CATEGORY_IN_USE",
          message:
            "This category has ledger entries. Move or delete them before deleting the category.",
        },
      });
    await prisma.financialCategory.delete({ where });
    return reply.code(204).send();
  });

  app.get("/accounts", async (req, reply) => {
    const query = req.query as {
      period?: string;
      type?: "INCOME" | "EXPENSE";
      search?: string;
      from?: string;
      to?: string;
      // One day's records, YYYY-MM-DD, as kept for every day.
      day?: string;
    };
    const where: any = {};
    if (query.type) where.type = query.type;
    if (query.search)
      where.OR = [
        { description: { contains: query.search, mode: "insensitive" } },
        { notes: { contains: query.search, mode: "insensitive" } },
        { customer: { contains: query.search, mode: "insensitive" } },
        { user: { name: { contains: query.search, mode: "insensitive" } } },
        { user: { email: { contains: query.search, mode: "insensitive" } } },
        { application: { reference: { contains: query.search, mode: "insensitive" } } },
      ];
    if (query.day !== undefined) {
      const window = dayWindow(String(query.day));
      if (!window) return reply.badRequest("Choose the date to show, for example 2026-11-11.");
      where.date = { gte: window.start, lte: window.end };
    } else if (query.from || query.to) {
      const from = query.from ? dayWindow(query.from)?.start ?? new Date(query.from) : null;
      const to = query.to ? dayWindow(query.to)?.end ?? new Date(query.to) : null;
      if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime())))
        return reply.badRequest("Choose the dates to show, for example 2026-11-01 to 2026-11-30.");
      where.date = { ...(from && { gte: from }), ...(to && { lte: to }) };
    } else where.date = { gte: rangeStart(query.period || "month") };
    const rows = await prisma.financialTransaction.findMany({
      where,
      include: {
        category: true,
        user: { select: { id: true, name: true, email: true, phone: true } },
        application: { select: { id: true, reference: true, type: true } },
        payment: { select: { id: true, method: true, transactionId: true, receipt: { select: { receiptNumber: true } } } },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });
    const income = rows
      .filter((x) => x.type === "INCOME")
      .reduce((s, x) => s + Number(x.total), 0);
    const expense = rows
      .filter((x) => x.type === "EXPENSE")
      .reduce((s, x) => s + Number(x.total), 0);
    return {
      data: {
        rows,
        summary: {
          income,
          expense,
          profitLoss: income - expense,
          transactionCount: rows.length,
        },
      },
    };
  });

  // Checks a ledger entry. When it is not acceptable the problem is sent as
  // the reply and null is returned.
  async function ledgerEntry(req: any, reply: any) {
    const problem = (code: string, message: string, details?: unknown) => {
      reply.code(400).send({ error: { code, message, details } });
      return null;
    };
    const parsed = transactionSchema.safeParse(req.body);
    if (!parsed.success)
      return problem(
        "VALIDATION_ERROR",
        "Enter a total amount, or quantity with unit price",
        parsed.error.flatten(),
      );
    const { total, quantity, unitPrice, ...rest } = parsed.data;
    const category = await prisma.financialCategory.findUnique({
      where: { id: rest.categoryId },
    });
    if (!category)
      return problem(
        "INVALID_CATEGORY",
        "The selected financial category does not exist",
      );
    if (category.type !== rest.type)
      return problem(
        "CATEGORY_TYPE_MISMATCH",
        `Choose an ${rest.type.toLowerCase()} category for this transaction`,
      );
    if (
      total !== undefined &&
      (quantity !== undefined || unitPrice !== undefined)
    )
      return problem(
        "AMOUNT_METHOD_CONFLICT",
        "Use either a direct total or quantity with unit price, not both",
      );
    // The customer: an account, one of its applications, or both.
    const { userId, applicationId, paymentMethod, moneyAccount, ...fields } = rest;
    let customerId = userId;
    let application: { id: string; reference: string; type: string; fullName: string; amountDue: unknown; userId: string | null; payments: any[] } | null = null;
    if (customerId && !(await prisma.user.count({ where: { id: customerId } })))
      return problem("INVALID_CUSTOMER", "That customer's account no longer exists. Choose the customer again.");
    if (applicationId) {
      application = await prisma.application.findUnique({
        where: { id: applicationId },
        select: {
          id: true, reference: true, type: true, fullName: true, amountDue: true, userId: true,
          payments: { select: { amount: true, status: true, refunds: { select: { amount: true, status: true } } } },
        },
      });
      if (!application)
        return problem("INVALID_APPLICATION", "That application no longer exists. Choose it again.");
      if (customerId && application.userId !== customerId)
        return problem("APPLICATION_NOT_CUSTOMERS", `Application ${application.reference} is not this customer's. Choose one of their own applications.`);
      customerId ??= application.userId;
    }
    // Where the money went in or out. A bill still to pay has none yet.
    const unpaid = fields.type === "EXPENSE" && (fields.paymentStatus === "DUE" || fields.paymentStatus === "PENDING");
    let moneyAccountId: string | null = null;
    if (moneyAccount && !unpaid) {
      const account = await prisma.ledgerAccount.findFirst({ where: { OR: [{ id: moneyAccount }, { code: moneyAccount }], subtype: { in: ["CASH", "BANK", "MOBILE"] }, active: true }, select: { id: true } });
      if (!account) return problem("NOT_MONEY_ACCOUNT", "Choose cash, a bank account or a mobile wallet for where the money went.");
      moneyAccountId = account.id;
    }
    const amount = total ?? Number(quantity) * Number(unitPrice);
    return {
      fields: {
        ...fields,
        moneyAccountId,
        quantity: quantity ?? null,
        unitPrice: unitPrice ?? null,
        total: amount,
        userId: customerId ?? null,
        applicationId: application?.id ?? null,
      },
      application,
      paymentMethod,
    };
  }

  const billPaid = async (id: string) => (await prisma.journalEntry.count({ where: { sourceType: "bill", sourceId: id, status: "POSTED" } })) > 0;

  const linkedEntry = {
    category: true,
    user: { select: { id: true, name: true, email: true, phone: true } },
    application: { select: { id: true, reference: true, type: true } },
    payment: { select: { id: true, method: true, transactionId: true, receipt: { select: { receiptNumber: true } } } },
  } as const;

  app.post("/accounts", async (req, reply) => {
    const entry = await ledgerEntry(req, reply);
    if (!entry) return reply;
    const { fields, application, paymentMethod } = entry;
    const by = await staffOf(req);
    // Money received for an application is a payment on it too: it shows on
    // the customer's dashboard with a receipt, and counts towards what they owe.
    if (fields.type === "INCOME" && application) {
      const amountDue = application.amountDue == null ? null : Number(application.amountDue);
      const { remaining } = balance(amountDue, application.payments);
      if (remaining !== null && Math.round(fields.total * 100) > Math.round(remaining * 100))
        return reply.code(400).send({
          error: {
            code: "MORE_THAN_DUE",
            message: remaining > 0
              ? `Only ${taka(remaining)} is still due on application ${application.reference}. Enter that or less, or change what the application costs first.`
              : `Nothing is due on application ${application.reference}. Change what the application costs first.`,
          },
        });
      const previousDue = remaining ?? fields.total;
      const remainingDue = Math.max(0, Math.round((previousDue - fields.total) * 100) / 100);
      const created = await prisma.$transaction(async (tx) => {
        const payment = await tx.payment.create({
          data: {
            userId: fields.userId,
            applicationId: application.id,
            service: fields.description,
            amount: fields.total,
            totalDue: previousDue,
            method: paymentMethod,
            status: remainingDue === 0 ? "PAID" : "PARTIALLY_PAID",
            provider: "manual",
            transactionId: `BP-PAY-${randomCode(10)}`,
            paidAt: fields.date,
            receipt: { create: { receiptNumber: receiptNumber(), previousDue, remainingDue } },
          },
        });
        const row = await tx.financialTransaction.create({
          data: { ...fields, paymentStatus: payment.status, customer: fields.customer || application.fullName, paymentId: payment.id },
        });
        await postCashbookEntry(tx, row.id, by);
        return tx.financialTransaction.findUniqueOrThrow({ where: { id: row.id }, include: linkedEntry });
      });
      await audit(req, { action: "cashbook.create", entityType: "cashbook", entityId: created.id, summary: `Cash ${fields.type.toLowerCase()} ৳${fields.total} for application ${application.reference}` });
      return reply.code(201).send({ data: created });
    }
    const created = await prisma.$transaction(async (tx) => {
      const row = await tx.financialTransaction.create({ data: fields });
      await postCashbookEntry(tx, row.id, by);
      return tx.financialTransaction.findUniqueOrThrow({ where: { id: row.id }, include: linkedEntry });
    });
    await audit(req, { action: "cashbook.create", entityType: "cashbook", entityId: created.id, summary: `${fields.type === "INCOME" ? "Income" : "Expense"} ৳${fields.total}: ${fields.description}` });
    return reply.code(201).send({ data: created });
  });

  app.put("/accounts/:id", async (req, reply) => {
    const where = { id: (req.params as { id: string }).id };
    const before = await prisma.financialTransaction.findUnique({ where, select: { paymentId: true, refundId: true, type: true, moneyAccountId: true } });
    if (!before) return reply.notFound("Ledger entry not found");
    const entry = await ledgerEntry(req, reply);
    if (!entry) return reply;
    // An entry that records a payment or a refund keeps its amount, kind and
    // customer: those belong to the payment. Its wording, date and category
    // can still be corrected.
    const { fields } = entry;
    const linked = Boolean(before.paymentId || before.refundId);
    // A bill already marked paid stays paid, from the account it was paid
    // from: that payment is in the books on its own.
    if (await billPaid(where.id)) Object.assign(fields, { paymentStatus: "PAID", moneyAccountId: before.moneyAccountId });
    const data = linked
      ? { description: fields.description, notes: fields.notes, date: fields.date, customer: fields.customer, ...(fields.type === before.type ? { categoryId: fields.categoryId } : {}) }
      : fields;
    const by = await staffOf(req);
    // A changed entry is posted again: the old posting is reversed, never edited.
    const updated = await prisma.$transaction(async (tx) => {
      if (!linked) await unpostCashbookEntry(tx, where.id, by, "Hisab Kitab entry corrected");
      await tx.financialTransaction.update({ where, data });
      if (!linked) await postCashbookEntry(tx, where.id, by);
      return tx.financialTransaction.findUniqueOrThrow({ where, include: linkedEntry });
    });
    await audit(req, { action: "cashbook.update", entityType: "cashbook", entityId: where.id, summary: `Corrected: ${updated.description}` });
    return { data: updated };
  });

  // A bill entered as still due, now paid.
  app.post("/accounts/:id/pay", async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = (req.body ?? {}) as { moneyAccount?: string };
    try {
      const by = await staffOf(req);
      const paid = await prisma.$transaction((tx) => payBill(tx, id, body.moneyAccount ?? null, by));
      await audit(req, { action: "cashbook.pay", entityType: "cashbook", entityId: id, summary: `Paid bill: ${paid.description}` });
      return { data: await prisma.financialTransaction.findUniqueOrThrow({ where: { id }, include: linkedEntry }) };
    } catch (error) {
      if (error instanceof OfficeError) return reply.code(error.statusCode).send({ error: { code: error.code, message: error.message } });
      throw error;
    }
  });

  app.delete("/accounts/:id", async (req, reply) => {
    const where = { id: (req.params as { id: string }).id };
    const entry = await prisma.financialTransaction.findUnique({ where, select: { paymentId: true, refundId: true } });
    if (!entry) return reply.notFound("Ledger entry not found");
    if (entry.paymentId || entry.refundId)
      return reply.code(409).send({
        error: {
          code: "RECORDS_PAYMENT",
          message: entry.paymentId
            ? "This entry records a payment that was received, so it stays in the books. If the money went back, record a refund on the payment instead."
            : "This entry records a refund that was made, so it stays in the books.",
        },
      });
    const by = await staffOf(req);
    await prisma.$transaction(async (tx) => {
      await unpostCashbookEntry(tx, where.id, by, "Hisab Kitab entry deleted");
      // A bill paid later had its own posting: undo that too.
      for (const paid of await tx.journalEntry.findMany({ where: { sourceType: "bill", sourceId: where.id, status: "POSTED" }, select: { id: true } }))
        await reverseJournal(tx, paid.id, by, "Hisab Kitab entry deleted");
      await tx.financialTransaction.delete({ where });
    });
    await audit(req, { action: "cashbook.delete", entityType: "cashbook", entityId: where.id, summary: "Deleted a Hisab Kitab entry; its posting was reversed" });
    return reply.code(204).send();
  });

  // One entry, whole, for the page that prints it.
  app.get("/accounts/:id", async (req, reply) => {
    const row = await prisma.financialTransaction.findUnique({
      where: { id: (req.params as { id: string }).id },
      include: linkedEntry,
    });
    return row ? { data: row } : reply.notFound("Ledger entry not found");
  });

  // Customers to choose for an entry: accounts matching the search, each
  // with its applications and what is left to pay on them.
  app.get("/accounts/customers", async (req) => {
    const search = String((req.query as { search?: string }).search || "").trim();
    if (search.length < 2) return { data: [] };
    const users = await prisma.user.findMany({
      where: {
        OR: ["name", "email", "phone"].map((field) => ({ [field]: { contains: search, mode: "insensitive" as const } })),
      },
      select: {
        id: true, name: true, email: true, phone: true,
        applications: {
          select: {
            id: true, reference: true, type: true, amountDue: true, createdAt: true,
            payments: { select: { amount: true, status: true, refunds: { select: { amount: true, status: true } } } },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
      orderBy: { name: "asc" },
      take: 12,
    });
    return {
      data: users.map(({ applications, ...user }) => ({
        ...user,
        applications: applications.map(({ payments, amountDue, ...item }) => {
          const owed = amountDue === null ? null : Number(amountDue);
          const { paid, remaining } = balance(owed, payments);
          return { ...item, amountDue: owed, paid, remaining };
        }),
      })),
    };
  });

  // Invoices. The total is always worked out here from the invoice's lines.
  // A draft can be changed or deleted; an issued invoice cannot: it is
  // revised (the old version kept), credited or cancelled instead.
  const invoiceDetails = {
    application: { select: { reference: true, type: true } },
    creditNotes: { select: { id: true, number: true, amount: true, reason: true, byName: true, createdAt: true }, orderBy: { number: "asc" as const } },
    signature: { select: { id: true, ownerName: true, ownerTitle: true, label: true } },
    customer: { select: { id: true, code: true, name: true } },
    deal: { select: { id: true, number: true, title: true } },
  };
  const invoiceView = (row: any) => {
    const figures = invoiceFigures(row);
    return {
      ...row,
      number: invoiceNumber(row.serial),
      exchangeRate: Number(row.exchangeRate),
      ...figures,
      // What has been paid against the total, as before the lifecycle.
      paymentStatus: invoiceAmounts(row.items as InvoiceLine[], figures.paid + figures.credited).status,
      creditNotes: (row.creditNotes ?? []).map((note: any) => ({ ...note, amount: Number(note.amount), reference: `CN-${String(note.number).padStart(6, "0")}` })),
    };
  };
  const officeFailure = (reply: any, error: unknown) => {
    if (error instanceof OfficeError || error instanceof PostingError) return reply.code((error as any).statusCode).send({ error: { code: (error as any).code, message: error.message } });
    if ((error as any)?.statusCode && (error as any).statusCode < 500) return reply.code((error as any).statusCode).send({ error: { code: "REFUSED", message: (error as Error).message } });
    throw error;
  };

  // Checks an invoice. When it is not acceptable the problem is sent as the
  // reply and null is returned.
  async function invoiceData(req: any, reply: any) {
    const problem = (code: string, message: string, details?: unknown) => {
      reply.code(400).send({ error: { code, message, details } });
      return null;
    };
    const parsed = invoiceSchema.safeParse(req.body);
    if (!parsed.success)
      return problem(
        "VALIDATION_ERROR",
        "Check the customer's name, the invoice date and every line of the invoice",
        parsed.error.flatten(),
      );
    const { paid, applicationId, transactionId, issue, ...rest } = parsed.data;
    const amounts = invoiceAmounts(rest.items, paid);
    if (amounts.total <= 0)
      return problem("INVOICE_EMPTY", "An invoice must be for more than ৳0");
    if (amounts.total >= 10_000_000_000)
      return problem("INVOICE_TOO_LARGE", "This total is too large to record");
    if (amounts.paid > amounts.total)
      return problem(
        "INVOICE_OVERPAID",
        "The amount paid cannot be more than the total",
      );
    if (rest.currency === "BDT") rest.exchangeRate = 1;
    if (
      applicationId &&
      !(await prisma.application.count({ where: { id: applicationId } }))
    )
      return problem("INVALID_APPLICATION", "That application no longer exists");
    if (
      transactionId &&
      !(await prisma.financialTransaction.count({
        where: { id: transactionId },
      }))
    )
      return problem("INVALID_LEDGER_ENTRY", "That ledger entry no longer exists");
    if (rest.customerId && !(await prisma.customer.count({ where: { id: rest.customerId } })))
      return problem("INVALID_CUSTOMER", "That customer no longer exists");
    if (rest.dealId && !(await prisma.deal.count({ where: { id: rest.dealId, ...(rest.customerId ? { customerId: rest.customerId } : {}) } })))
      return problem("INVALID_DEAL", "That deal does not exist or belongs to another customer");
    return {
      fields: {
        ...rest,
        total: amounts.total,
        paid: amounts.paid,
        applicationId: applicationId ?? null,
        transactionId: transactionId ?? null,
      },
      issue: Boolean(issue),
    };
  }

  // The signature an invoice is issued with: the active one, when the person
  // issuing may use it.
  async function issuingSignature(req: any) {
    if (!(await allowed(req.user.role, "signature.use"))) return null;
    return (await prisma.signatureAsset.findFirst({ where: { active: true }, orderBy: { createdAt: "desc" }, select: { id: true } }))?.id ?? null;
  }

  app.get("/invoices", async (req) => {
    const query = req.query as {
      search?: string;
      page?: string;
      pageSize?: string;
      state?: string;
      customerId?: string;
    };
    const search = String(query.search || "").trim();
    const serial = serialFromSearch(search);
    const where: any = {
      ...(query.state ? { state: query.state } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(search
        ? {
            OR: [
              ...["customerName", "customerPhone", "customerEmail", "notes"].map(
                (field) => ({
                  [field]: { contains: search, mode: "insensitive" as const },
                }),
              ),
              ...(serial === null ? [] : [{ serial }]),
            ],
          }
        : {}),
    };
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 25));
    const page = Math.max(1, Number(query.page) || 1);
    const [rows, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: invoiceDetails,
        orderBy: { serial: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.invoice.count({ where }),
    ]);
    return { data: rows.map(invoiceView), meta: { total, page, pageSize } };
  });

  app.get("/invoices/:id", async (req, reply) => {
    const row = await prisma.invoice.findUnique({
      where: { id: (req.params as { id: string }).id },
      include: { ...invoiceDetails, allocations: { include: { payment: { select: { id: true, transactionId: true, method: true, paidAt: true } } } } },
    });
    if (!row) return reply.notFound("Invoice not found");
    return { data: { ...invoiceView(row), allocations: row.allocations.map((a) => ({ ...a, amount: Number(a.amount) })) } };
  });

  app.post("/invoices", async (req, reply) => {
    const checked = await invoiceData(req, reply);
    if (!checked) return reply;
    const { fields: data, issue } = checked;
    // Only someone who can open Hisab Kitab can tie a bill to its entries.
    if (!(await allowed((req.user as any).role, "hisab.read"))) data.transactionId = null;
    const staff = await staffOf(req);
    try {
      const row = await prisma.$transaction(async (tx) => {
        const created = await tx.invoice.create({ data: { ...data, state: "DRAFT", branchId: staff.branchId } as any });
        if (issue) await issueInvoice(tx, created.id, staff, await issuingSignature(req));
        return tx.invoice.findUniqueOrThrow({ where: { id: created.id }, include: invoiceDetails });
      });
      await audit(req, { action: issue ? "invoice.issue" : "invoice.create", entityType: "invoice", entityId: row.id, summary: `${issue ? "Issued" : "Draft"} ${invoiceNumber(row.serial)} for ${row.customerName}: ${row.currency} ${Number(row.total)}` });
      if (issue) await announceInvoice(row);
      return reply.code(201).send({ data: invoiceView(row) });
    } catch (error) {
      return officeFailure(reply, error);
    }
  });

  // A new invoice for the customer's assigned employee and the accountants.
  async function announceInvoice(row: any) {
    const recipients = [...(row.customerId ? [(await prisma.customer.findUnique({ where: { id: row.customerId }, select: { assignedToId: true } }))?.assignedToId] : []), ...(await staffWith("payments.create"))];
    await notify(app, recipients, {
      type: "NEW_INVOICE",
      title: `New invoice ${invoiceNumber(row.serial)}`,
      body: `${invoiceNumber(row.serial)} for ${row.customerName}: ${row.currency} ${Number(row.total).toLocaleString("en-US")}.`,
      link: `/admin/print/invoice/${row.id}`,
      relatedType: "invoice",
      relatedId: row.id,
      key: `invoice-issued:${row.id}`,
    });
  }

  app.put("/invoices/:id", async (req, reply) => {
    const where = { id: (req.params as { id: string }).id };
    const before = await prisma.invoice.findUnique({ where, select: { state: true } });
    if (!before) return reply.notFound("Invoice not found");
    if (before.state !== "DRAFT")
      return reply.code(409).send({ error: { code: "ISSUED", message: "An issued invoice is not changed in place. Make a revision (the old version is kept), add a credit note, or cancel it." } });
    const checked = await invoiceData(req, reply);
    if (!checked) return reply;
    const row = await prisma.invoice.update({ where, data: checked.fields as any, include: invoiceDetails });
    await audit(req, { action: "invoice.update", entityType: "invoice", entityId: row.id, summary: `Draft ${invoiceNumber(row.serial)} changed` });
    return { data: invoiceView(row) };
  });

  // Only a draft can be deleted; its number is never used again.
  app.delete("/invoices/:id", async (req, reply) => {
    const where = { id: (req.params as { id: string }).id };
    const invoice = await prisma.invoice.findUnique({ where, select: { state: true, serial: true } });
    if (!invoice) return reply.notFound("Invoice not found");
    if (invoice.state !== "DRAFT")
      return reply.code(409).send({ error: { code: "ISSUED", message: "An issued invoice is kept for the accounts. Cancel it or add a credit note instead." } });
    await prisma.invoice.delete({ where });
    await audit(req, { action: "invoice.delete", entityType: "invoice", entityId: where.id, summary: `Draft ${invoiceNumber(invoice.serial)} deleted` });
    return reply.code(204).send();
  });

  app.post("/invoices/:id/issue", async (req, reply) => {
    const { id } = req.params as { id: string };
    const staff = await staffOf(req);
    try {
      await prisma.$transaction(async (tx) => issueInvoice(tx, id, staff, await issuingSignature(req)));
    } catch (error) {
      return officeFailure(reply, error);
    }
    const row = await prisma.invoice.findUniqueOrThrow({ where: { id }, include: invoiceDetails });
    await audit(req, { action: "invoice.issue", entityType: "invoice", entityId: id, summary: `Issued ${invoiceNumber(row.serial)}${row.signature ? ` with ${row.signature.ownerName}'s signature` : " without a signature"}` });
    await announceInvoice(row);
    return { data: invoiceView(row) };
  });

  app.post("/invoices/:id/revise", async (req, reply) => {
    const { id } = req.params as { id: string };
    const reason = String((req.body as { reason?: unknown })?.reason ?? "").trim();
    if (reason.length < 3) return reply.code(400).send({ error: { code: "VALIDATION_ERROR", message: "Say why the invoice is being revised.", details: { fieldErrors: { reason: ["This is required"] } } } });
    const checked = await invoiceData(req, reply);
    if (!checked) return reply;
    const { paid: _paid, applicationId: _a, transactionId: _t, ...changes } = checked.fields as any;
    const staff = await staffOf(req);
    try {
      await prisma.$transaction((tx) => reviseInvoice(tx, id, staff, changes, reason));
    } catch (error) {
      return officeFailure(reply, error);
    }
    const row = await prisma.invoice.findUniqueOrThrow({ where: { id }, include: invoiceDetails });
    await audit(req, { action: "invoice.revise", entityType: "invoice", entityId: id, summary: `${invoiceNumber(row.serial)} revised to version ${row.version}: ${reason}` });
    return { data: invoiceView(row) };
  });

  app.get("/invoices/:id/revisions", async (req) => ({
    data: await prisma.invoiceRevision.findMany({ where: { invoiceId: (req.params as { id: string }).id }, orderBy: { version: "desc" } }),
  }));

  // Cancellation and credit notes are high-risk: without the approve
  // permission they wait for an approver.
  async function highRisk(req: any, reply: any, kind: "INVOICE_CANCEL" | "CREDIT_NOTE") {
    const { id } = req.params as { id: string };
    const body = (req.body ?? {}) as { reason?: string; amount?: number };
    const reason = String(body.reason ?? "").trim();
    if (reason.length < 3) return reply.code(400).send({ error: { code: "VALIDATION_ERROR", message: "Give the reason.", details: { fieldErrors: { reason: ["This is required"] } } } });
    const amount = Number(body.amount);
    if (kind === "CREDIT_NOTE" && !(amount > 0)) return reply.code(400).send({ error: { code: "VALIDATION_ERROR", message: "Enter the amount of the credit note.", details: { fieldErrors: { amount: ["Enter more than 0"] } } } });
    const invoice = await prisma.invoice.findUnique({ where: { id }, select: { serial: true, state: true, currency: true, customerName: true } });
    if (!invoice) return reply.notFound("Invoice not found");
    const staff = await staffOf(req);
    try {
      // A draft is simply withdrawn.
      if (kind === "INVOICE_CANCEL" && invoice.state === "DRAFT") {
        await prisma.$transaction((tx) => cancelInvoice(tx, id, staff, reason));
        await audit(req, { action: "invoice.cancel", entityType: "invoice", entityId: id, summary: `Draft ${invoiceNumber(invoice.serial)} cancelled: ${reason}` });
        return { data: invoiceView(await prisma.invoice.findUniqueOrThrow({ where: { id }, include: invoiceDetails })) };
      }
      const summary = kind === "INVOICE_CANCEL" ? `Cancel ${invoiceNumber(invoice.serial)} for ${invoice.customerName}: ${reason}` : `Credit note of ${invoice.currency} ${amount} on ${invoiceNumber(invoice.serial)}: ${reason}`;
      const outcome = await doOrAsk(app, { role: staff.role, by: { id: staff.id, name: staff.name } }, kind, { type: "invoice", id, summary }, { reason, amount });
      await audit(req, { action: outcome.done ? (kind === "INVOICE_CANCEL" ? "invoice.cancel" : "invoice.credit") : "approval.request", entityType: "invoice", entityId: id, summary: `${outcome.done ? "" : "Asked: "}${summary}` });
      if (!outcome.done) return reply.code(202).send({ data: { done: false, approvalId: outcome.approval.id, message: "Your request is waiting for an approver." } });
      return { data: invoiceView(await prisma.invoice.findUniqueOrThrow({ where: { id }, include: invoiceDetails })) };
    } catch (error) {
      return officeFailure(reply, error);
    }
  }
  app.post("/invoices/:id/cancel", (req, reply) => highRisk(req, reply, "INVOICE_CANCEL"));
  app.post("/invoices/:id/credit-notes", (req, reply) => highRisk(req, reply, "CREDIT_NOTE"));

  // A link the customer can open for 30 days, and a WhatsApp message with it.
  app.post("/invoices/:id/share", async (req, reply) => {
    const { id } = req.params as { id: string };
    const invoice = await prisma.invoice.findUnique({ where: { id }, include: { creditNotes: { select: { amount: true } } } });
    if (!invoice) return reply.notFound("Invoice not found");
    if (invoice.state === "DRAFT") return reply.code(409).send({ error: { code: "DRAFT", message: "Issue the invoice before sharing it." } });
    const key = app.jwt.sign({ sub: id, purpose: "invoice-share" }, { expiresIn: `${SHARE_DAYS}d` });
    const url = `${siteUrl()}/share/invoice/${id}?key=${encodeURIComponent(key)}`;
    const figures = invoiceFigures(invoice);
    const message = `Dear ${invoice.customerName}, here is your invoice ${invoiceNumber(invoice.serial)} from Bengal Port: ${invoice.currency} ${figures.total.toLocaleString("en-US")}${figures.due > 0 ? `, of which ${invoice.currency} ${figures.due.toLocaleString("en-US")} is due` : ", paid in full"}. View or download it here: ${url}`;
    const phone = String(invoice.customerPhone ?? "").replace(/\D/g, "").replace(/^0/, "880");
    await prisma.invoice.update({ where: { id }, data: { sentAt: new Date() } });
    await audit(req, { action: "invoice.share", entityType: "invoice", entityId: id, summary: `Share link made for ${invoiceNumber(invoice.serial)}` });
    return { data: { url, message, whatsapp: `https://wa.me/${phone}?text=${encodeURIComponent(message)}` } };
  });
};

export default admin;
