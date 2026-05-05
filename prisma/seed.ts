import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { pricingCatalog } from "../lib/pricing-catalog";

const prisma = new PrismaClient();

const faqs = [
  {
    question: "Can I pay 75% upfront?",
    answer: "Yes. DrivaDocs supports full payment or 75% upfront with 25% balance on delivery.",
    sortOrder: 1
  },
  {
    question: "Do you support business fleets?",
    answer: "Yes. Business accounts can manage multiple vehicles, drivers, bulk renewals, billing, and compliance reports.",
    sortOrder: 2
  },
  {
    question: "Can I get renewal reminders?",
    answer: "Yes. Expiry dates can trigger dashboard, email, SMS, and WhatsApp-ready reminders.",
    sortOrder: 3
  }
];

const testimonials = [
  {
    name: "Adeola Martins",
    role: "Fleet Manager",
    company: "AM Logistics",
    quote: "DrivaDocs helped us move vehicle renewals into one simple dashboard.",
    rating: 5
  },
  {
    name: "Chinedu Okafor",
    role: "Private vehicle owner",
    quote: "The estimate was clear and my renewed documents were delivered to my office.",
    rating: 5
  },
  {
    name: "Tola Adebayo",
    role: "Operations Lead",
    quote: "A practical service for teams that need compliance without constant follow-up.",
    rating: 5
  }
];

const deliveryLocations = [
  { state: "Lagos", location: "Mainland", fee: 5000 },
  { state: "Lagos", location: "Island", fee: 8000 },
  { state: "Oyo", location: "Ibadan", fee: 7000 }
];

async function main() {
  for (const item of pricingCatalog) {
    await prisma.servicePricing.create({
      data: {
        serviceType: item.serviceType as never,
        serviceName: item.serviceName,
        vehicleType: item.vehicleType,
        engineCategory: item.engineCategory,
        usage: item.usage,
        state: item.state,
        location: item.location,
        amount: item.amount,
        notes: item.notes
      }
    });
  }

  for (const item of deliveryLocations) {
    await prisma.deliveryLocation.create({ data: item });
  }

  for (const item of faqs) {
    await prisma.faqItem.create({ data: item });
  }

  for (const item of testimonials) {
    await prisma.testimonial.create({ data: item });
  }

  const passwordHash = await bcrypt.hash("AdminPass123!", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@drivadocs.ng" },
    update: {},
    create: {
      name: "DrivaDocs Admin",
      email: "admin@drivadocs.ng",
      phone: "2349074707624",
      passwordHash,
      role: "SUPER_ADMIN",
      accountType: "INDIVIDUAL"
    }
  });

  await prisma.adminUser.upsert({
    where: { userId: admin.id },
    update: {},
    create: {
      userId: admin.id,
      staffCode: "DRV-SUPER-001",
      role: "SUPER_ADMIN",
      permissions: {
        users: true,
        requests: true,
        pricing: true,
        payments: true,
        notifications: true,
        support: true
      }
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
