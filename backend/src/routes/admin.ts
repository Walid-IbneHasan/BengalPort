import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../lib/prisma.js";
import {
  opportunitySchema,
  transactionSchema,
  pageContentUpdateSchema,
  businessContentUpdateSchema,
  divisionContentUpdateSchema,
} from "../lib/schemas.js";
import { defaultHomeContent } from "../lib/home-content.js";
import { defaultBusinessContent } from "../lib/business-content.js";
import {
  defaultEducationContent,
  defaultHealthcareContent,
} from "../lib/division-content.js";
import sharp from "sharp";

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
    return reply
      .code(201)
      .send({ data: await prisma.opportunity.create({ data: parsed.data }) });
  });

  app.get("/resources/:resource", async (req, reply) => {
    const { resource } = req.params as { resource: string };
    const search = String((req.query as any).search || "").trim();
    const contains = search
      ? { contains: search, mode: "insensitive" as const }
      : undefined;
    switch (resource) {
      case "enquiries":
        return {
          data: await prisma.enquiry.findMany({
            where: search
              ? {
                  OR: [
                    { name: contains },
                    { phone: contains },
                    { email: contains },
                    { message: contains },
                  ],
                }
              : {},
            include: { user: { select: { name: true, email: true } } },
            orderBy: { createdAt: "desc" },
          }),
        };
      case "applications":
        return {
          data: await prisma.application.findMany({
            where: search
              ? {
                  OR: [
                    { reference: contains },
                    { fullName: contains },
                    { email: contains },
                    { phone: contains },
                  ],
                }
              : {},
            include: {
              user: { select: { name: true, email: true } },
              _count: { select: { payments: true } },
            },
            orderBy: { createdAt: "desc" },
          }),
        };
      case "opportunities":
        return {
          data: await prisma.opportunity.findMany({
            where: search
              ? {
                  OR: [
                    { title: contains },
                    { country: contains },
                    { location: contains },
                  ],
                }
              : {},
            orderBy: { createdAt: "desc" },
          }),
        };
      case "suppliers":
        return {
          data: await prisma.supplier.findMany({
            where: search
              ? {
                  OR: [
                    { name: contains },
                    { country: contains },
                    { industry: contains },
                    { product: contains },
                  ],
                }
              : {},
            orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
          }),
        };
      case "factories":
        return {
          data: await prisma.factory.findMany({
            where: search
              ? {
                  OR: [
                    { name: contains },
                    { country: contains },
                    { industry: contains },
                    { product: contains },
                  ],
                }
              : {},
            orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
          }),
        };
      case "education":
        return {
          data: await prisma.institution.findMany({
            where: search
              ? { OR: [{ name: contains }, { country: contains }] }
              : {},
            include: { programs: true },
            orderBy: { name: "asc" },
          }),
        };
      case "healthcare":
        return {
          data: await prisma.hospital.findMany({
            where: search
              ? {
                  OR: [
                    { name: contains },
                    { country: contains },
                    { city: contains },
                  ],
                }
              : {},
            include: { services: true },
            orderBy: { name: "asc" },
          }),
        };
      case "users":
        return {
          data: await prisma.user.findMany({
            where: search
              ? {
                  OR: [
                    { name: contains },
                    { email: contains },
                    { phone: contains },
                  ],
                }
              : {},
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
            orderBy: { createdAt: "desc" },
          }),
        };
      case "payments":
        return {
          data: await prisma.payment.findMany({
            include: {
              user: { select: { name: true, email: true } },
              application: { select: { reference: true, fullName: true } },
              receipt: true,
            },
            orderBy: { createdAt: "desc" },
          }),
        };
      case "receipts":
        return {
          data: await prisma.receipt.findMany({
            include: {
              payment: {
                include: {
                  user: { select: { name: true, email: true } },
                  application: { select: { reference: true, fullName: true } },
                },
              },
            },
            orderBy: { createdAt: "desc" },
          }),
        };
      default:
        return reply.notFound("Admin resource not found");
    }
  });

  app.patch("/resources/:resource/:id", async (req, reply) => {
    const { resource, id } = req.params as { resource: string; id: string };
    const body = req.body as Record<string, unknown>;
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
      return {
        data:
          resource === "enquiries"
            ? await prisma.enquiry.update({
                where: { id },
                data: { status: body.status as any },
              })
            : await prisma.application.update({
                where: { id },
                data: { status: body.status as any },
              }),
      };
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

  app.post("/resources/:resource", async (req, reply) => {
    const { resource } = req.params as { resource: string };
    const body = req.body as any;
    const basic = {
      name: String(body.name || "").trim(),
      country: String(body.country || "").trim(),
      industry: String(body.industry || "").trim(),
      product: String(body.product || "").trim(),
      description: String(body.description || "").trim(),
      image: String(body.image || "/images/global-business.webp"),
      featured: Boolean(body.featured),
    };
    if (
      !basic.name ||
      !basic.country ||
      !basic.industry ||
      !basic.product ||
      basic.description.length < 10
    )
      return reply.badRequest("Complete all required partner fields");
    if (resource === "suppliers")
      return reply
        .code(201)
        .send({ data: await prisma.supplier.create({ data: basic }) });
    if (resource === "factories")
      return reply
        .code(201)
        .send({ data: await prisma.factory.create({ data: basic }) });
    return reply.badRequest("This resource cannot be created here");
  });

  app.delete("/resources/:resource/:id", async (req, reply) => {
    const { resource, id } = req.params as { resource: string; id: string };
    if (resource === "opportunities")
      await prisma.opportunity.delete({ where: { id } });
    else if (resource === "suppliers")
      await prisma.supplier.delete({ where: { id } });
    else if (resource === "factories")
      await prisma.factory.delete({ where: { id } });
    else return reply.badRequest("This resource cannot be deleted here");
    return reply.code(204).send();
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

  for (const division of ["education", "healthcare"] as const) {
    const fallback =
      division === "education"
        ? defaultEducationContent
        : defaultHealthcareContent;
    const name =
      division === "education" ? "Global Education" : "Global Healthcare";
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

  app.post("/accounts", async (req, reply) => {
    const parsed = transactionSchema.safeParse(req.body);
    if (!parsed.success)
      return reply
        .code(400)
        .send({
          error: {
            code: "VALIDATION_ERROR",
            message: "Enter a total amount, or quantity with unit price",
            details: parsed.error.flatten(),
          },
        });
    const { total, quantity, unitPrice, ...rest } = parsed.data;
    const category = await prisma.financialCategory.findUnique({
      where: { id: rest.categoryId },
    });
    if (!category)
      return reply
        .code(400)
        .send({
          error: {
            code: "INVALID_CATEGORY",
            message: "The selected financial category does not exist",
          },
        });
    if (category.type !== rest.type)
      return reply
        .code(400)
        .send({
          error: {
            code: "CATEGORY_TYPE_MISMATCH",
            message: `Choose an ${rest.type.toLowerCase()} category for this transaction`,
          },
        });
    if (
      total !== undefined &&
      (quantity !== undefined || unitPrice !== undefined)
    )
      return reply
        .code(400)
        .send({
          error: {
            code: "AMOUNT_METHOD_CONFLICT",
            message:
              "Use either a direct total or quantity with unit price, not both",
          },
        });
    const calculatedTotal = total ?? Number(quantity) * Number(unitPrice);
    const data = await prisma.financialTransaction.create({
      data: { ...rest, quantity, unitPrice, total: calculatedTotal },
    });
    return reply.code(201).send({ data });
  });
};

export default admin;
