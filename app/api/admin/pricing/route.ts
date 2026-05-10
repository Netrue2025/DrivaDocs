import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const pricingServiceTypes = [
  "VEHICLE_PAPER_RENEWAL",
  "NEW_VEHICLE_REGISTRATION",
  "CHANGE_OF_OWNERSHIP",
  "OTHER_PERMIT",
  "FADED_NUMBER_PLATE_REPRINT",
  "NEW_DRIVERS_LICENSE",
  "DRIVERS_LICENSE_RENEWAL",
  "INTERNATIONAL_DRIVERS_LICENSE",
  "NEW_MOTORCYCLE_RIDERS_LICENSE",
  "MOTORCYCLE_RIDERS_LICENSE_RENEWAL",
  "DELIVERY"
] as const;

const priceSchema = z.object({
  serviceType: z.enum(pricingServiceTypes),
  serviceName: z.string().min(2),
  vehicleType: z.string().optional().or(z.literal("")),
  engineCategory: z.string().optional().or(z.literal("")),
  usage: z.string().optional().or(z.literal("")),
  state: z.string().optional().or(z.literal("")),
  location: z.string().optional().or(z.literal("")),
  amount: z.coerce.number().nonnegative(),
  active: z.boolean().optional()
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "ADMIN" && session?.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = priceSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid price", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const data = parsed.data;
  try {
    const key = {
      serviceType: data.serviceType,
      serviceName: data.serviceName.trim(),
      vehicleType: data.vehicleType || null,
      engineCategory: data.engineCategory || null,
      usage: data.usage || null,
      state: data.state || null,
      location: data.location || null
    };
    const existing = await prisma.servicePricing.findFirst({ where: key });
    const active = data.active ?? true;
    const price = existing
      ? await prisma.servicePricing.update({
          where: { id: existing.id },
          data: { amount: data.amount, active }
        })
      : await prisma.servicePricing.create({
          data: {
            ...key,
            amount: data.amount,
            active
          }
        });

    await prisma.auditLog.create({
      data: {
        action: active ? "SERVICE_PRICE_CREATED" : "SERVICE_PRICE_DELETED",
        entityType: "ServicePricing",
        entityId: price.id,
        metadata: { serviceName: price.serviceName, amount: price.amount, active }
      }
    });

    return NextResponse.json(price, { status: 201 });
  } catch (error) {
    console.error("Admin pricing upsert failed", error);
    return NextResponse.json({ error: "Unable to save pricing item" }, { status: 500 });
  }
}
