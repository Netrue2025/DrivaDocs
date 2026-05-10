import dynamicImport from "next/dynamic";
import { pricingCatalog } from "@/lib/pricing-catalog";
import { prisma } from "@/lib/prisma";
import { ensureDefaultPricingRows } from "@/lib/pricing-sync";

export const dynamic = "force-dynamic";

const AdminPriceList = dynamicImport(() => import("@/components/admin-price-list").then((mod) => mod.AdminPriceList), {
  loading: () => <PriceListFallback />
});

export default async function AdminPricingPage() {
  const prices = await ensureDefaultPricingRows()
    .then(() =>
      prisma.servicePricing.findMany({
        orderBy: [{ serviceType: "asc" }, { serviceName: "asc" }, { amount: "asc" }]
      })
    )
    .catch(() => pricingCatalog.map((item, index) => ({ id: String(index), ...item, active: true })));
  const priceRows = prices.map((price) => ({
    id: price.id,
    serviceType: price.serviceType,
    serviceName: price.serviceName,
    vehicleType: price.vehicleType,
    engineCategory: price.engineCategory,
    usage: price.usage,
    state: price.state,
    location: price.location,
    amount: price.amount,
    notes: price.notes,
    active: price.active
  }));

  return <AdminPriceList prices={priceRows} />;
}

function PriceListFallback() {
  return (
    <div className="rounded border border-brand-900/10 bg-white p-5 shadow-sm">
      <div className="h-5 w-44 animate-pulse rounded bg-brand-900/10" />
      <div className="mt-5 grid gap-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-20 animate-pulse rounded border border-brand-900/10 bg-brand-50/60" />
        ))}
      </div>
    </div>
  );
}
