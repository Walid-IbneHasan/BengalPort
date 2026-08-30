import { PrismaClient } from "../generated/prisma/index.js";
import bcrypt from "bcryptjs";
import { defaultHomeContent } from "../src/lib/home-content.js";
import { defaultBusinessContent } from "../src/lib/business-content.js";
import {
  defaultEducationContent,
  defaultHealthcareContent,
} from "../src/lib/division-content.js";

const prisma = new PrismaClient();
const at = (daysAgo: number, hour: number, minute = 0) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hour, minute, 0, 0);
  return date;
};

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: "admin@bengalport.com" },
    update: {},
    create: {
      name: "Bengal Port Admin",
      email: "admin@bengalport.com",
      passwordHash: await bcrypt.hash("Admin123!", 12),
      role: "ADMIN",
    },
  });
  await prisma.pageContent.upsert({
    where: { slug: "home" },
    update: {},
    create: {
      slug: "home",
      name: "Homepage",
      content: defaultHomeContent as any,
      published: true,
    },
  });
  await prisma.pageContent.upsert({
    where: { slug: "business" },
    update: {},
    create: {
      slug: "business",
      name: "Global Business",
      content: defaultBusinessContent as any,
      published: true,
    },
  });
  await prisma.pageContent.upsert({
    where: { slug: "education" },
    update: {},
    create: {
      slug: "education",
      name: "Global Education",
      content: defaultEducationContent as any,
      published: true,
    },
  });
  await prisma.pageContent.upsert({
    where: { slug: "healthcare" },
    update: {},
    create: {
      slug: "healthcare",
      name: "Global Healthcare",
      content: defaultHealthcareContent as any,
      published: true,
    },
  });

  const opportunities = [
    [
      "china-sourcing-tour",
      "BUSINESS_TOUR",
      "China Sourcing & Factory Tour",
      "Meet verified manufacturers and tour production facilities with Bengal Port coordination.",
      "China",
      "Guangzhou",
      "/images/global-business.webp",
    ],
    [
      "international-mbbs-2026",
      "EDUCATION",
      "International MBBS Admissions 2026",
      "Applications are open for selected international medical institutions.",
      "Malaysia",
      "Kuala Lumpur",
      "/images/global-education.webp",
    ],
    [
      "executive-health-check",
      "HEALTHCARE",
      "Executive Health Checkup",
      "Coordinated comprehensive screening at a leading international hospital.",
      "Thailand",
      "Bangkok",
      "/images/global-healthcare.webp",
    ],
  ];
  for (const item of opportunities)
    await prisma.opportunity.upsert({
      where: { slug: item[0] },
      update: {},
      create: {
        slug: item[0],
        category: item[1] as any,
        title: item[2],
        description: item[3],
        country: item[4],
        location: item[5],
        image: item[6],
        deadline: new Date("2026-12-31"),
      },
    });

  if ((await prisma.supplier.count()) === 0)
    await prisma.supplier.createMany({
      data: [
        {
          name: "Eastern Textiles Group",
          country: "Bangladesh",
          industry: "Textiles",
          product: "Ready-made garments",
          description:
            "Export-oriented apparel supplier supporting private-label and volume production.",
          image: "/images/global-business.webp",
          featured: true,
        },
        {
          name: "Delta Agro Exports",
          country: "Bangladesh",
          industry: "Agriculture",
          product: "Processed foods",
          description:
            "International supplier of packaged foods, spices and agricultural products.",
          image: "/images/global-business.webp",
          featured: true,
        },
        {
          name: "Pacific Machinery Co.",
          country: "China",
          industry: "Industrial",
          product: "Production equipment",
          description:
            "Machinery sourcing partner for light manufacturing and packaging operations.",
          image: "/images/global-business.webp",
          featured: false,
        },
      ],
    });

  if ((await prisma.factory.count()) === 0)
    await prisma.factory.createMany({
      data: [
        {
          name: "Bengal Apparel Works",
          country: "Bangladesh",
          industry: "Apparel",
          product: "Knitwear",
          description:
            "Modern knitwear facility available for coordinated buyer visits.",
          image: "/images/global-business.webp",
          featured: true,
        },
        {
          name: "Guangzhou Pack Systems",
          country: "China",
          industry: "Packaging",
          product: "Automated packaging lines",
          description:
            "Packaging equipment manufacturer offering demonstrations and factory tours.",
          image: "/images/global-business.webp",
          featured: true,
        },
      ],
    });

  if ((await prisma.institution.count()) === 0) {
    await prisma.institution.create({
      data: {
        name: "International Medical University",
        country: "Malaysia",
        description:
          "Internationally focused medical education with a structured admissions pathway.",
        image: "/images/global-education.webp",
        programs: {
          create: [
            {
              title: "Bachelor of Medicine and Surgery",
              level: "Undergraduate",
              discipline: "MBBS",
              deadline: new Date("2026-12-31"),
            },
          ],
        },
      },
    });
    await prisma.institution.create({
      data: {
        name: "Global Engineering Institute",
        country: "China",
        description:
          "English-medium engineering and technology programs for international students.",
        image: "/images/global-education.webp",
        programs: {
          create: [
            {
              title: "BSc Mechanical Engineering",
              level: "Undergraduate",
              discipline: "Engineering",
              deadline: new Date("2026-11-30"),
            },
            {
              title: "MBA International Business",
              level: "Postgraduate",
              discipline: "Business",
              deadline: new Date("2026-10-31"),
            },
          ],
        },
      },
    });
  }

  if ((await prisma.hospital.count()) === 0) {
    await prisma.hospital.create({
      data: {
        name: "Bangkok International Medical Centre",
        country: "Thailand",
        city: "Bangkok",
        description:
          "International patient centre offering coordinated specialist consultations and checkups.",
        image: "/images/global-healthcare.webp",
        services: {
          create: [
            {
              title: "Executive Health Checkup",
              category: "Checkup",
              description:
                "Comprehensive screening coordinated for international patients.",
            },
            {
              title: "Cardiology Consultation",
              category: "Specialist",
              description:
                "Specialist cardiac assessment and treatment planning.",
            },
          ],
        },
      },
    });
    await prisma.hospital.create({
      data: {
        name: "Kuala Lumpur Specialist Hospital",
        country: "Malaysia",
        city: "Kuala Lumpur",
        description:
          "Multi-specialty hospital with dedicated international patient support.",
        image: "/images/global-healthcare.webp",
        services: {
          create: [
            {
              title: "Surgery Coordination",
              category: "Surgery",
              description:
                "Pre-arrival review, appointment planning and patient assistance.",
            },
          ],
        },
      },
    });
  }

  if ((await prisma.enquiry.count()) === 0)
    await prisma.enquiry.create({
      data: {
        type: "BUSINESS",
        name: "Arif Hasan",
        email: "arif.demo@example.com",
        phone: "+8801700000000",
        message: "I would like to join the next sourcing and factory visit.",
        details: { company: "Hasan Trading", preferredCountry: "China" },
        status: "SUBMITTED",
        userId: admin.id,
      },
    });

  const demoApplication = await prisma.application.upsert({
    where: { reference: "BP-DEMO-2026" },
    update: {},
    create: {
      reference: "BP-DEMO-2026",
      type: "BUSINESS",
      status: "IN_REVIEW",
      fullName: "Arif Hasan",
      email: "arif.demo@example.com",
      phone: "+8801700000000",
      userId: admin.id,
      details: {
        nationality: "Bangladeshi",
        passportNumber: "A00000000",
        passportExpiryDate: "2029-08-29",
        companyName: "Hasan Trading",
        purpose: "Supplier meetings and factory visits",
        preferredCountry: "China",
        visitors: 2,
      },
    },
  });
  await prisma.payment.upsert({
    where: { transactionId: "MOCK-DEMO-2026-001" },
    update: {},
    create: {
      userId: admin.id,
      applicationId: demoApplication.id,
      service: "Business sourcing and factory visit",
      amount: 25000,
      totalDue: 60000,
      method: "Bank Transfer",
      transactionId: "MOCK-DEMO-2026-001",
      status: "PARTIALLY_PAID",
      provider: "mock",
      paidAt: at(0, 11, 45),
      receipt: {
        create: {
          receiptNumber: "BPR-2026-DEMO001",
          previousDue: 60000,
          remainingDue: 35000,
        },
      },
    },
  });

  const categories = await Promise.all(
    [
      ["Client Payment", "INCOME"],
      ["Consultation Fee", "INCOME"],
      ["Application Fee", "INCOME"],
      ["Office Purchase", "EXPENSE"],
      ["Travel & Transport", "EXPENSE"],
      ["Marketing", "EXPENSE"],
      ["Utilities", "EXPENSE"],
    ].map(async ([name, type]) =>
      prisma.financialCategory.upsert({
        where: { name },
        update: {},
        create: { name, type: type as any },
      }),
    ),
  );
  const category = Object.fromEntries(categories.map((c) => [c.name, c.id]));

  if ((await prisma.financialTransaction.count()) === 0) {
    const entries = [
      [
        "INCOME",
        0,
        9,
        15,
        "China sourcing service payment",
        "Client paid the second instalment by bank transfer.",
        "Rahman Imports",
        1,
        68000,
        68000,
        "Client Payment",
      ],
      [
        "EXPENSE",
        0,
        10,
        40,
        "Printer toner cartridges",
        "Purchased four cartridges for the operations desk.",
        "Office Mart",
        4,
        1850,
        7400,
        "Office Purchase",
      ],
      [
        "EXPENSE",
        0,
        13,
        20,
        "Airport client pickup",
        "Vehicle hire and parking.",
        "City Transport",
        1,
        null,
        3200,
        "Travel & Transport",
      ],
      [
        "INCOME",
        0,
        15,
        5,
        "Education consultation",
        "Initial university selection consultation.",
        "Nusrat Jahan",
        1,
        5500,
        5500,
        "Consultation Fee",
      ],
      [
        "INCOME",
        1,
        11,
        30,
        "MBBS application processing",
        "Application fee received in full.",
        "Samiul Karim",
        1,
        18000,
        18000,
        "Application Fee",
      ],
      [
        "EXPENSE",
        1,
        16,
        10,
        "Social media campaign",
        "Seven-day education campaign.",
        "Ad Platform",
        null,
        null,
        12500,
        "Marketing",
      ],
      [
        "INCOME",
        2,
        10,
        0,
        "Factory visit coordination",
        "Deposit for a six-person delegation.",
        "Metro Traders",
        6,
        8500,
        51000,
        "Client Payment",
      ],
      [
        "EXPENSE",
        2,
        14,
        25,
        "Client meeting refreshments",
        "Tea, coffee and lunch for eight attendees.",
        "Bistro Dhaka",
        8,
        480,
        3840,
        "Office Purchase",
      ],
      [
        "EXPENSE",
        3,
        9,
        35,
        "Internet and phone bill",
        "Monthly office connectivity.",
        "Telecom Provider",
        1,
        null,
        6200,
        "Utilities",
      ],
      [
        "INCOME",
        3,
        12,
        45,
        "Healthcare coordination advance",
        "International hospital appointment support.",
        "Mahmud Family",
        1,
        32000,
        32000,
        "Client Payment",
      ],
      [
        "INCOME",
        5,
        10,
        20,
        "Business consultation",
        "Import documentation advisory session.",
        "Bengal Foods Ltd.",
        2,
        7500,
        15000,
        "Consultation Fee",
      ],
      [
        "EXPENSE",
        5,
        17,
        5,
        "Intercity travel tickets",
        "Two return tickets for supplier verification.",
        "Rail Service",
        2,
        1450,
        2900,
        "Travel & Transport",
      ],
      [
        "INCOME",
        7,
        11,
        10,
        "University application fees",
        "Three applications processed.",
        "Farhan Ahmed",
        3,
        12000,
        36000,
        "Application Fee",
      ],
      [
        "EXPENSE",
        8,
        15,
        30,
        "Printed brochures",
        "Premium business division brochures.",
        "Print House",
        500,
        24,
        12000,
        "Marketing",
      ],
      [
        "INCOME",
        10,
        9,
        50,
        "Supplier connection package",
        "Final settlement.",
        "Eastern Retail",
        1,
        44000,
        44000,
        "Client Payment",
      ],
      [
        "EXPENSE",
        12,
        12,
        10,
        "Office stationery",
        "Notebooks, folders and pens.",
        "Office Mart",
        null,
        null,
        4650,
        "Office Purchase",
      ],
      [
        "INCOME",
        14,
        14,
        0,
        "Healthcare consultation",
        "Hospital shortlist and cost review.",
        "Ayesha Begum",
        1,
        8000,
        8000,
        "Consultation Fee",
      ],
      [
        "EXPENSE",
        17,
        10,
        50,
        "Electricity bill",
        "Monthly office electricity.",
        "Power Company",
        1,
        null,
        9100,
        "Utilities",
      ],
      [
        "INCOME",
        20,
        13,
        35,
        "Trade delegation payment",
        "Full payment for two delegates.",
        "Nova Commerce",
        2,
        28500,
        57000,
        "Client Payment",
      ],
      [
        "EXPENSE",
        24,
        16,
        20,
        "Video production",
        "Business tour promotional edit.",
        "Creative Studio",
        1,
        null,
        18000,
        "Marketing",
      ],
    ];
    await prisma.financialTransaction.createMany({
      data: entries.map((e) => ({
        type: e[0] as any,
        date: at(e[1] as number, e[2] as number, e[3] as number),
        description: e[4] as string,
        notes: e[5] as string,
        customer: e[6] as string,
        quantity: e[7] as number | null,
        unitPrice: e[8] as number | null,
        total: e[9] as number,
        paymentStatus: e[0] === "INCOME" ? "PAID" : undefined,
        categoryId: category[e[10] as string],
      })),
    });
  }
}

main().finally(() => prisma.$disconnect());
