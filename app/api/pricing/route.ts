import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mergePricingWithCatalog, pricingCatalog, type PricingItem } from "@/lib/pricing-catalog";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await prisma.servicePricing.findMany({
      where: { active: true },
      orderBy: [{ serviceName: "asc" }, { amount: "asc" }]
    });

    if (rows.length) {
      const prices = rows.map(
        (row): PricingItem => ({
          serviceType: row.serviceType,
          serviceName: row.serviceName,
          vehicleType: row.vehicleType || undefined,
          engineCategory: row.engineCategory || undefined,
          usage: row.usage || undefined,
          state: row.state || undefined,
          location: row.location || undefined,
          amount: row.amount,
          notes: row.notes || undefined
        })
      );
      return NextResponse.json(mergePricingWithCatalog(prices));
    }
  } catch {
    // The fallback keeps the estimator usable before DATABASE_URL is provisioned.
  }

  return NextResponse.json(pricingCatalog);
}
