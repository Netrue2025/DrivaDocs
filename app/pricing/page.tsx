import dynamicImport from "next/dynamic";
import { mergePricingWithCatalog, pricingCatalog, type PricingItem } from "@/lib/pricing-catalog";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Pricing Estimate - DrivaDocs"
};

export const dynamic = "force-dynamic";

const PricingEstimator = dynamicImport(() => import("@/components/pricing-estimator").then((mod) => mod.PricingEstimator), {
  loading: () => <PricingEstimatorFallback />
});

export default async function PricingPage() {
  const dbPrices = await prisma.servicePricing
    .findMany({
      where: {
        OR: [
          { active: true },
          { serviceType: "VEHICLE_PAPER_RENEWAL" }
        ]
      },
      orderBy: [{ serviceType: "asc" }, { serviceName: "asc" }, { amount: "asc" }]
    })
    .then((rows) =>
      rows.map(
        (row): PricingItem => ({
          serviceType: row.serviceType,
          serviceName: row.serviceName,
          vehicleType: row.vehicleType || undefined,
          engineCategory: row.engineCategory || undefined,
          usage: row.usage || undefined,
          state: row.state || undefined,
          location: row.location || undefined,
          amount: row.amount,
          notes: row.notes || undefined,
          active: row.active
        })
      )
    )
    .catch(() => pricingCatalog);
  const prices = mergePricingWithCatalog(dbPrices);

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-3xl">
        <p className="text-sm font-black uppercase text-brand-700">Pricing estimator</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-ink">Estimate service and delivery costs</h1>
        <p className="mt-4 text-lg leading-8 text-ink/65">
          Select the service you want first. DrivaDocs will ask only for the details needed for that service,
          then show the base cost, delivery fee, full total, 75% upfront payment, and 25% balance.
        </p>
      </div>
      <PricingEstimator prices={prices} />
    </section>
  );
}

function PricingEstimatorFallback() {
  return (
    <div className="mt-8 rounded border border-brand-900/10 bg-white p-4 shadow-sm sm:p-5">
      <div className="h-5 w-44 animate-pulse rounded bg-brand-900/10" />
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-12 animate-pulse rounded bg-brand-50" />
        ))}
      </div>
    </div>
  );
}
