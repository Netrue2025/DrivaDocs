import { legacyOtherDocumentServices, pricingCatalog } from "@/lib/pricing-catalog";
import { prisma } from "@/lib/prisma";

export async function ensureDefaultPricingRows() {
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
}
