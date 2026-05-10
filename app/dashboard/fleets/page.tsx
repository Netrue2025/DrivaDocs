import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import dynamicImport from "next/dynamic";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const BulkFleetOrderForm = dynamicImport(() => import("@/components/bulk-fleet-order-form").then((mod) => mod.BulkFleetOrderForm), {
  loading: () => <PanelFallback />
});
const FleetListManager = dynamicImport(() => import("@/components/fleet-list-manager").then((mod) => mod.FleetListManager), {
  loading: () => <PanelFallback />
});

export default async function FleetsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.accountType !== "BUSINESS") redirect("/dashboard");

  const businessAccount = await prisma.businessAccount.findUnique({
    where: { userId: session.user.id },
    include: {
      vehicles: {
        orderBy: { createdAt: "desc" },
        include: { serviceRequests: { select: { status: true } } }
      },
      drivers: {
        orderBy: { createdAt: "desc" },
        include: { requests: { select: { status: true } } }
      }
    }
  }).catch(() => null);
  const prices = await prisma.servicePricing.findMany({
    where: { active: true },
    orderBy: [{ serviceType: "asc" }, { serviceName: "asc" }, { amount: "asc" }]
  }).catch(() => []);

  if (!businessAccount) redirect("/dashboard");

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Company" value={businessAccount.companyName} />
        <SummaryCard label="Vehicles" value={businessAccount.vehicles.length} />
        <SummaryCard label="Drivers" value={businessAccount.drivers.length} />
      </div>

      <div className="mt-6">
        <BulkFleetOrderForm
          prices={prices.map((price) => ({
            serviceType: price.serviceType,
            serviceName: price.serviceName,
            vehicleType: price.vehicleType || undefined,
            engineCategory: price.engineCategory || undefined,
            usage: price.usage || undefined,
            state: price.state || undefined,
            amount: price.amount
          }))}
          vehicles={businessAccount.vehicles.map((vehicle) => ({
            id: vehicle.id,
            label: vehicle.registrationNo || `${vehicle.make} ${vehicle.model}`,
            meta: `${vehicle.make} ${vehicle.model} - ${vehicle.vehicleType}${vehicle.licenseExpiry ? ` - License expires ${vehicle.licenseExpiry.toLocaleDateString("en-NG")}` : ""}`,
            vehicleType: vehicle.vehicleType,
            engineCategory: vehicle.engineCategory,
            usage: vehicle.usage
          }))}
          drivers={businessAccount.drivers.map((driver) => ({
            id: driver.id,
            label: [driver.surname, driver.firstName, driver.lastName].filter(Boolean).join(" "),
            meta: `${driver.phone || "No phone"}${driver.licenseExpiry ? ` - License expires ${driver.licenseExpiry.toLocaleDateString("en-NG")}` : ""}`,
            loggedFields: getLoggedDriverFields({
              surname: driver.surname,
              firstName: driver.firstName,
              lastName: driver.lastName,
              dateOfBirth: driver.dateOfBirth,
              mothersMaidenName: driver.mothersMaidenName,
              nextOfKinPhone: driver.nextOfKinPhone,
              facialMark: driver.facialMark,
              disability: driver.disability,
              phone: driver.phone,
              stateOfOrigin: driver.stateOfOrigin,
              localGovernment: driver.localGovernment,
              address: driver.address,
              nin: driver.nin,
              licenseNo: driver.licenseNo
            })
          }))}
        />
      </div>

      <FleetListManager
        prices={prices.map((price) => ({
          serviceType: price.serviceType,
          serviceName: price.serviceName,
          vehicleType: price.vehicleType || undefined,
          engineCategory: price.engineCategory || undefined,
          usage: price.usage || undefined,
          state: price.state || undefined,
          amount: price.amount
        }))}
        vehicles={businessAccount.vehicles.map((vehicle) => ({
          id: vehicle.id,
          title: vehicle.registrationNo || `${vehicle.make} ${vehicle.model}`,
          meta: `${vehicle.make} ${vehicle.model} - ${vehicle.vehicleType}`,
          badge: vehicle.usage,
          locked: isUnderProcess(vehicle.serviceRequests),
          details: {
            make: vehicle.make,
            model: vehicle.model,
            registrationNo: vehicle.registrationNo,
            chassisNo: vehicle.chassisNo,
            engineNo: vehicle.engineNo,
            color: vehicle.color,
            vehicleType: vehicle.vehicleType,
            engineCategory: vehicle.engineCategory,
            usage: vehicle.usage,
            licenseExpiry: toInputDate(vehicle.licenseExpiry),
            roadWorthinessExpiry: toInputDate(vehicle.roadWorthinessExpiry),
            insuranceExpiry: toInputDate(vehicle.insuranceExpiry)
          }
        }))}
        drivers={businessAccount.drivers.map((driver) => ({
          id: driver.id,
          title: [driver.surname, driver.firstName, driver.lastName].filter(Boolean).join(" "),
          meta: driver.phone || driver.address || "No contact details",
          badge: driver.licenseNo ? "Licensed" : "Profile",
          locked: isUnderProcess(driver.requests),
          details: {
            surname: driver.surname,
            firstName: driver.firstName,
            lastName: driver.lastName,
            dateOfBirth: toInputDate(driver.dateOfBirth),
            mothersMaidenName: driver.mothersMaidenName,
            nextOfKinPhone: driver.nextOfKinPhone,
            facialMark: driver.facialMark,
            disability: driver.disability,
            phone: driver.phone,
            stateOfOrigin: driver.stateOfOrigin,
            localGovernment: driver.localGovernment,
            address: driver.address,
            nin: driver.nin
          }
        }))}
      />
    </>
  );
}

function isUnderProcess(requests: { status: string }[]) {
  return requests.some((request) => ["PROCESSING", "DOCUMENT_READY", "OUT_FOR_DELIVERY", "DELIVERED"].includes(request.status));
}

function toInputDate(date?: Date | null) {
  return date ? date.toISOString().slice(0, 10) : null;
}

function getLoggedDriverFields(driver: Record<string, unknown>) {
  return Object.entries(driver)
    .filter(([, value]) => Boolean(value))
    .map(([key]) => key);
}

function SummaryCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded border border-brand-900/10 bg-white p-4 shadow-sm">
      <p className="text-sm font-bold text-ink/55">{label}</p>
      <p className="mt-2 break-words text-2xl font-black">{value}</p>
    </div>
  );
}

function PanelFallback() {
  return (
    <div className="rounded border border-brand-900/10 bg-white p-4 shadow-sm sm:p-5">
      <div className="h-5 w-40 animate-pulse rounded bg-brand-900/10" />
      <div className="mt-4 grid gap-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-12 animate-pulse rounded bg-brand-50" />
        ))}
      </div>
    </div>
  );
}
