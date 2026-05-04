import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { AdminShell } from "@/components/admin-shell";
import { AdminPriceList } from "@/components/admin-price-list";
import { authOptions } from "@/lib/auth";
import { pricingCatalog } from "@/lib/pricing-catalog";
import { prisma } from "@/lib/prisma";
import { ensureDefaultPricingRows } from "@/lib/pricing-sync";

export const dynamic = "force-dynamic";

export default async function AdminPricingPage() {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) redirect("/dashboard");

  const prices = await ensureDefaultPricingRows()
    .then(() =>
      prisma.servicePricing.findMany({
        where: { active: true },
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
    notes: price.notes
  }));

  return (
    <AdminShell title="Service price management">
      <AdminPriceList prices={priceRows} />
    </AdminShell>
  );
}
