import { legacyOtherDocumentServices, nonRegionalPricingServiceTypes, pricingCatalog } from "@/lib/pricing-catalog";
import { prisma } from "@/lib/prisma";

export async function ensureDefaultPricingRows() {
  await prisma.servicePricing.updateMany({
    where: {
      serviceType: { in: [...nonRegionalPricingServiceTypes] as never },
      state: { not: null },
      active: true
    },
    data: { state: null }
  });

  for (const item of pricingCatalog) {
    const existing = await prisma.servicePricing.findFirst({
      where: {
        serviceType: item.serviceType as never,
        serviceName: item.serviceName,
        vehicleType: item.vehicleType || null,
        engineCategory: item.engineCategory || null,
        usage: item.usage || null,
        state: item.state || null,
        location: item.location || null
      }
    });

    if (!existing) {
      await prisma.servicePricing.create({
        data: {
          serviceType: item.serviceType as never,
          serviceName: item.serviceName,
          vehicleType: item.vehicleType || null,
          engineCategory: item.engineCategory || null,
          usage: item.usage || null,
          state: item.state || null,
          location: item.location || null,
          amount: item.amount,
          notes: item.notes || null
        }
      });
    }
  }

  await prisma.servicePricing.updateMany({
    where: {
      serviceType: "OTHER_PERMIT",
      serviceName: { in: legacyOtherDocumentServices },
      active: true
    },
    data: { active: false }
  });

  await prisma.servicePricing.updateMany({
    where: {
      serviceType: { in: ["NEW_DRIVERS_LICENSE", "DRIVERS_LICENSE_RENEWAL"] },
      location: null,
      active: true
    },
    data: { active: false }
  });
}
