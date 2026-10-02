import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../lib/prisma.js";
import {
  opportunitySchema,
  partnerSchema,
  institutionSchema,
  hospitalSchema,
  transactionSchema,
  pageContentUpdateSchema,
  businessContentUpdateSchema,
  divisionContentUpdateSchema,
  feeSettingsSchema,
  amountDueSchema,
} from "../lib/schemas.js";
import { defaultHomeContent } from "../lib/home-content.js";
import { defaultBusinessContent } from "../lib/business-content.js";
import {
  defaultEducationContent,
  defaultHealthcareContent,
  defaultUmrahContent,
} from "../lib/division-content.js";
import sharp from "sharp";
import { documentSummary } from "../lib/documents.js";
import { balance } from "../lib/payment-rules.js";
import {
  notifyAmountDue,
  notifyApplicationStatus,
} from "../lib/notifications.js";

function rangeStart(period: string) {
  const now = new Date();
  if (period === "day")
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === "week") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    start.setDate(start.getDate() - 6);
    return start;
  }
  if (period === "year") return new Date(now.getFullYear(), 0, 1);
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

const admin: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", app.authenticate);
  app.addHook("preHandler", async (req, reply) => {
    if ((req.user as any).role !== "ADMIN")
      return reply.forbidden("Admin access required");
  });

  app.post("/media", async (req, reply) => {
    const upload = await req.file();
    if (!upload) return reply.badRequest("Choose an image to upload");
    if (!upload.mimetype.startsWith("image/"))
      return reply.badRequest("The selected file is not a supported image");
    try {
      const processor = sharp({ limitInputPixels: false, sequentialRead: true })
        .rotate()
        .resize({
          width: 2400,
          height: 2400,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 84, effort: 5, smartSubsample: true });
      upload.file.pipe(processor);
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
    const [enquiries, applications, payments, transactions, due] =
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
        paymentsReceived: Number(payments._sum.amount || 0),
      },
    };
  });

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
            include: { user: person },
            orderBy: newest,
          },
        },
        applications: {
          table: prisma.application,
          args: {
            where: matching("reference", "fullName", "email", "phone"),
            include: {
              user: person,
              _count: { select: { payments: true } },
              documents: { select: documentSummary },
              payments: { select: { amount: true, status: true } },
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
              id: true,
              name: true,
              email: true,
              phone: true,
              role: true,
              createdAt: true,
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
            where: matching("service", "transactionId", "method"),
            include: { user: person, application, receipt: true },
            orderBy: newest,
          },
        },
        receipts: {
          table: prisma.receipt,
          args: {
            where: matching("receiptNumber"),
            include: { payment: { include: { user: person, application } } },
            orderBy: newest,
          },
        },
      };
    const list = lists[resource];
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

  app.patch("/resources/:resource/:id", async (req, reply) => {
    const { resource, id } = req.params as { resource: string; id: string };
    const body = req.body as Record<string, unknown>;
    // What an application costs, set by staff after quoting the customer.
    if (resource === "applications" && body.amountDue !== undefined) {
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
        include: { payments: { select: { amount: true, status: true } } },
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
      if (!["USER", "ADMIN"].includes(String(body.role)))
        return reply.badRequest("Invalid user role");
      return {
        data: await prisma.user.update({
          where: { id },
          data: { role: body.role as any },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            createdAt: true,
          },
        }),
      };
    }
    return reply.badRequest("This resource cannot be updated here");
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
    resource in resourceSchemas;
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
    if (resource === "opportunities")
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

  const divisionPages = {
    education: { name: "Global Education", fallback: defaultEducationContent },
    healthcare: { name: "Global Healthcare", fallback: defaultHealthcareContent },
    umrah: { name: "Global Umrah", fallback: defaultUmrahContent },
  };
  for (const division of ["education", "healthcare", "umrah"] as const) {
    const { name, fallback } = divisionPages[division];
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
      const parsed = divisionContentUpdateSchema.safeParse(req.body);
      if (!parsed.success)
        return reply
          .code(400)
          .send({
            error: {
              code: "VALIDATION_ERROR",
              message: `Please correct the ${name} content`,
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
    data: { onlinePayment: app.gateway.configured, fees: await feeSettings() },
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
      data: { onlinePayment: app.gateway.configured, fees: await feeSettings() },
    };
  });

  app.get("/accounts/categories", async () => ({
    data: await prisma.financialCategory.findMany({ orderBy: { name: "asc" } }),
  }));

  app.get("/accounts", async (req) => {
    const query = req.query as {
      period?: string;
      type?: "INCOME" | "EXPENSE";
      search?: string;
      from?: string;
      to?: string;
    };
    const where: any = {};
    if (query.type) where.type = query.type;
    if (query.search)
      where.OR = [
        { description: { contains: query.search, mode: "insensitive" } },
        { notes: { contains: query.search, mode: "insensitive" } },
        { customer: { contains: query.search, mode: "insensitive" } },
      ];
    if (query.from || query.to)
      where.date = {
        ...(query.from && { gte: new Date(query.from) }),
        ...(query.to && { lte: new Date(query.to) }),
      };
    else where.date = { gte: rangeStart(query.period || "month") };
    const rows = await prisma.financialTransaction.findMany({
      where,
      include: { category: true },
      orderBy: { date: "desc" },
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
    return {
      ...rest,
      quantity: quantity ?? null,
      unitPrice: unitPrice ?? null,
      total: total ?? Number(quantity) * Number(unitPrice),
    };
  }

  app.post("/accounts", async (req, reply) => {
    const data = await ledgerEntry(req, reply);
    if (!data) return reply;
    return reply
      .code(201)
      .send({ data: await prisma.financialTransaction.create({ data }) });
  });

  app.put("/accounts/:id", async (req, reply) => {
    const where = { id: (req.params as { id: string }).id };
    if (!(await prisma.financialTransaction.count({ where })))
      return reply.notFound("Ledger entry not found");
    const data = await ledgerEntry(req, reply);
    if (!data) return reply;
    return {
      data: await prisma.financialTransaction.update({
        where,
        data,
        include: { category: true },
      }),
    };
  });

  app.delete("/accounts/:id", async (req, reply) => {
    const where = { id: (req.params as { id: string }).id };
    const { count } = await prisma.financialTransaction.deleteMany({ where });
    return count
      ? reply.code(204).send()
      : reply.notFound("Ledger entry not found");
  });
};

export default admin;
