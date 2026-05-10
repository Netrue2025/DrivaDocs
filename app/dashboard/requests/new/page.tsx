import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import dynamicImport from "next/dynamic";
import type { InitialServiceDraft } from "@/components/forms/service-request-form";
import { authOptions } from "@/lib/auth";
import { mergePricingWithCatalog, pricingCatalog, type PricingItem } from "@/lib/pricing-catalog";
import { prisma } from "@/lib/prisma";
import { serviceRequirements } from "@/lib/service-requirements";

export const dynamic = "force-dynamic";

const ServiceRequestForm = dynamicImport(() => import("@/components/forms/service-request-form").then((mod) => mod.ServiceRequestForm), {
  loading: () => <RequestFormFallback />
});

type NewRequestSearchParams = {
  serviceType?: string;
  state?: string;
  vehicleType?: string;
  otherDocument?: string;
  fresh?: string;
  requestId?: string;
};

const validServiceTypes = Object.keys(serviceRequirements);

export default async function NewRequestPage({
  searchParams
}: {
  searchParams?: NewRequestSearchParams;
}) {
  const session = await getServerSession(authOptions);
  const initialServiceType = validServiceTypes.includes(searchParams?.serviceType || "")
    ? searchParams?.serviceType
    : undefined;
  const query = new URLSearchParams();
  if (initialServiceType) query.set("serviceType", initialServiceType);
  if (searchParams?.state) query.set("state", searchParams.state);
  if (searchParams?.vehicleType) query.set("vehicleType", searchParams.vehicleType);
  if (searchParams?.otherDocument) query.set("otherDocument", searchParams.otherDocument);
  if (searchParams?.fresh) query.set("fresh", searchParams.fresh);
  if (searchParams?.requestId) query.set("requestId", searchParams.requestId);

  if (!session) {
    const callbackUrl = `/dashboard/requests/new${query.size ? `?${query.toString()}` : ""}`;
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  let initialDraft: InitialServiceDraft | undefined;
  const priceRows = await prisma.servicePricing
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
  const prices = mergePricingWithCatalog(priceRows);

  if (searchParams?.requestId && searchParams.fresh !== "1") {
    const request = await prisma.serviceRequest.findFirst({
      where: {
        id: searchParams.requestId,
        userId: session.user.id,
        status: { in: ["DRAFT", "AWAITING_PAYMENT"] }
      },
      include: {
        deliveryAddress: true,
        documents: true
      }
    }).catch(() => null);

    if (request && request.serviceType in serviceRequirements) {
      const serviceType = request.serviceType as keyof typeof serviceRequirements;
      const requirements = asRecord(request.requirements);
      const values: Record<string, string> = {};
      const fileMeta: NonNullable<InitialServiceDraft["fileMeta"]> = {};

      for (const field of serviceRequirements[serviceType]) {
        if (field.type === "file") {
          const fileName = toFieldString(requirements[field.name]);
          const document = request.documents.find((doc) => doc.fileName === fileName) ?? request.documents.find((doc) => !Object.values(fileMeta).some((item) => item.fileName === doc.fileName));
          if (fileName || document) {
            fileMeta[field.name] = {
              name: fileName || document?.fileName || field.label,
              size: document?.fileSize || 0,
              type: document?.mimeType || "application/pdf",
              fileName: document?.fileName || fileName,
              mimeType: document?.mimeType || "application/pdf",
              fileSize: document?.fileSize || 0,
              storageKey: document?.storageKey,
              publicUrl: document?.publicUrl || undefined,
              persisted: true
            };
          }
        } else {
          values[field.name] = toFieldString(requirements[field.name]);
        }
      }

      if (request.deliveryAddress) {
        values.deliveryMethod = request.deliveryAddress.deliveryMethod || "PHYSICAL_DELIVERY";
        values.deliveryLocation = request.deliveryAddress.label || "";
        if (request.deliveryAddress.deliveryMethod === "SCAN_TO_ME") {
          values.onlineDeliveryContact = request.deliveryAddress.phone;
        } else if (request.deliveryAddress.deliveryMethod === "PICKUP_OFFICE") {
          values.deliveryPhone = "";
          values.city = "";
          values.deliveryAddress = "";
        } else {
          values.city = request.deliveryAddress.city;
          values.deliveryPhone = request.deliveryAddress.phone;
          values.deliveryAddress = request.deliveryAddress.addressLine;
        }
      }

      initialDraft = {
        id: request.id,
        serviceType,
        state: request.state || request.deliveryAddress?.state || searchParams?.state || "Lagos",
        vehicleType: toFieldString(requirements.vehicleType) || searchParams?.vehicleType || "Car",
        values,
        fileMeta,
        step: 2
      };
    }
  }

  return (
    <ServiceRequestForm
      initialDraft={initialDraft}
      initialServiceType={initialServiceType}
      initialState={searchParams?.state}
      initialVehicleType={searchParams?.vehicleType}
      initialOtherDocument={searchParams?.otherDocument}
      prices={prices}
      freshStart={searchParams?.fresh === "1"}
    />
  );
}

function RequestFormFallback() {
  return (
    <div className="rounded border border-brand-900/10 bg-white p-4 shadow-sm sm:p-5">
      <div className="h-6 w-48 animate-pulse rounded bg-brand-900/10" />
      <div className="mt-5 grid gap-3">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-12 animate-pulse rounded bg-brand-50" />
        ))}
      </div>
    </div>
  );
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function toFieldString(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}
