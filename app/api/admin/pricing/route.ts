import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const priceSchema = z.object({
  serviceType: z.string(),
  serviceName: z.string().min(2),
  vehicleType: z.string().optional().or(z.literal("")),
  engineCategory: z.string().optional().or(z.literal("")),
  usage: z.string().optional().or(z.literal("")),
  state: z.string().optional().or(z.literal("")),
  location: z.string().optional().or(z.literal("")),
  amount: z.coerce.number().nonnegative()
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "ADMIN" && session?.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = priceSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid price" }, { status: 400 });

  const data = parsed.data;
  const price = await prisma.servicePricing.create({
    data: {
      serviceType: data.serviceType as never,
      serviceName: data.serviceName,
      vehicleType: data.vehicleType || null,
      engineCategory: data.engineCategory || null,
      usage: data.usage || null,
      state: data.state || null,
      location: data.location || null,
      amount: data.amount
    }
  });

  await prisma.auditLog.create({
    data: {
      action: "SERVICE_PRICE_CREATED",
      entityType: "ServicePricing",
      entityId: price.id,
      metadata: { serviceName: price.serviceName, amount: price.amount }
    }
  });

  return NextResponse.json(price, { status: 201 });
}
