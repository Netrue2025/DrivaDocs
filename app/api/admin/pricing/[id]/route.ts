import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const priceUpdateSchema = z.object({
  amount: z.coerce.number().int().nonnegative()
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "ADMIN" && session?.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = priceUpdateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid price" }, { status: 400 });

  const existing = await prisma.servicePricing.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Price not found" }, { status: 404 });

  const price = await prisma.servicePricing.update({
    where: { id: params.id },
    data: { amount: parsed.data.amount }
  });

  await prisma.auditLog.create({
    data: {
      action: "SERVICE_PRICE_UPDATED",
      entityType: "ServicePricing",
      entityId: price.id,
      metadata: { serviceName: price.serviceName, previousAmount: existing.amount, amount: price.amount }
    }
  });

  return NextResponse.json(price);
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "ADMIN" && session?.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await prisma.servicePricing.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Price not found" }, { status: 404 });

  const price = await prisma.servicePricing.update({
    where: { id: params.id },
    data: { active: false }
  });

  await prisma.auditLog.create({
    data: {
      action: "SERVICE_PRICE_DELETED",
      entityType: "ServicePricing",
      entityId: price.id,
      metadata: { serviceName: price.serviceName, amount: price.amount }
    }
  });

  return NextResponse.json(price);
}
