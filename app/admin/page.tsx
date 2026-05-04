import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import type { Prisma } from "@prisma/client";
import { AdminServiceList, type AdminServiceRequest } from "@/components/admin-service-list";
import { AdminShell } from "@/components/admin-shell";
import { Badge } from "@/components/ui/badge";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatNaira } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) redirect("/dashboard");

  let dbConnectionFailed = false;
  let loggedDbError = false;
  const dbFallback =
    <T,>(fallback: T) =>
    (error: unknown) => {
      dbConnectionFailed = true;
      if (!loggedDbError) {
        loggedDbError = true;
        console.error("Admin console database query failed", error);
      }
      return fallback;
    };

  const [usersCount, requestsCount, payments, tickets, requests, staff, statusCounts] =
    await Promise.all([
      prisma.user.count().catch(dbFallback(0)),
      prisma.serviceRequest.count().catch(dbFallback(0)),
      prisma.payment.aggregate({ where: { status: "SUCCESS" }, _sum: { amount: true } }).catch(dbFallback({ _sum: { amount: 0 } })),
      prisma.supportTicket.count({ where: { status: { in: ["OPEN", "PENDING"] } } }).catch(dbFallback(0)),
      prisma.serviceRequest.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          user: true,
          payments: true,
          documents: true,
          deliveryAddress: true,
          assignedAdmin: { include: { user: true } }
        }
      }).catch(dbFallback([])),
      prisma.adminUser.findMany({
        orderBy: { createdAt: "desc" },
        include: { user: true }
      }).catch(dbFallback([])),
      prisma.serviceRequest.groupBy({
        by: ["status"],
        _count: { status: true }
      }).catch(dbFallback([]))
    ]);

  const requestRows: AdminServiceRequest[] = requests.map((request) => ({
    id: request.id,
    requestCode: request.requestCode,
    title: request.title,
    status: request.status,
    state: request.state,
    estimateSubtotal: request.estimateSubtotal,
    deliveryFee: request.deliveryFee,
    totalAmount: request.totalAmount,
    upfrontAmount: request.upfrontAmount,
    balanceAmount: request.balanceAmount,
    createdAt: request.createdAt.toISOString(),
    customer: {
      name: request.user.name,
      email: request.user.email,
      phone: request.user.phone
    },
    deliveryAddress: request.deliveryAddress
      ? {
          recipientName: request.deliveryAddress.recipientName,
          phone: request.deliveryAddress.phone,
          addressLine: request.deliveryAddress.addressLine,
          city: request.deliveryAddress.city,
          state: request.deliveryAddress.state
        }
      : null,
    assignedAdminId: request.assignedAdminId,
    assignedTo: request.assignedAdmin?.user.name || request.assignedAdmin?.user.email || null,
    requirements: getRequirementObject(request.requirements),
    notes: getAdminNotes(request.requirements),
    documents: request.documents.map((document) => ({
      id: document.id,
      kind: document.kind,
      fileName: document.fileName,
      mimeType: document.mimeType,
      fileSize: document.fileSize,
      publicUrl: document.publicUrl || publicUrlFromStorageKey(document.storageKey),
      storageKey: document.storageKey,
      verifiedAt: document.verifiedAt?.toISOString() || null,
      createdAt: document.createdAt.toISOString()
    })),
    payments: request.payments.map((payment) => ({
      id: payment.id,
      amount: payment.amount,
      status: payment.status,
      type: payment.type
    }))
  }));

  return (
    <AdminShell title="Admin console">
      <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Users" value={usersCount} />
        <Stat label="Requests" value={requestsCount} />
        <Stat label="Revenue" value={formatNaira(payments._sum.amount || 0)} />
        <Stat label="Open tickets" value={tickets} />
      </div>

      {dbConnectionFailed ? (
        <div className="mt-4 rounded border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">
          Database connection failed. Service requests and users could not be loaded. Check your DATABASE_URL/DIRECT_URL, then restart the app.
        </div>
      ) : null}

      <div className="mt-6">
        <AdminServiceList requests={requestRows} />
      </div>

      <section className="mt-6 grid min-w-0 gap-4 xl:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)]">
        <div className="min-w-0 rounded border border-brand-900/10 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-xl font-black">Staff assignment</h2>
          <div className="mt-4 grid gap-3">
            {staff.map((admin) => (
              <div key={admin.id} className="rounded border border-brand-900/10 p-3">
                <p className="font-black">{admin.user.name || admin.user.email}</p>
                <p className="text-sm text-ink/60">{admin.staffCode || "No staff code"} - {admin.role}</p>
              </div>
            ))}
            {!staff.length ? <p className="rounded bg-brand-50 p-4 text-sm font-semibold text-ink/65">No admin staff found.</p> : null}
          </div>
        </div>

        <div className="min-w-0 rounded border border-brand-900/10 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-xl font-black">Analytics</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {statusCounts.map((item) => (
              <div key={item.status} className="rounded bg-brand-50 p-4">
                <p className="text-sm font-bold text-ink/55">{statusLabel(item.status)}</p>
                <p className="mt-2 text-2xl font-black">{item._count.status}</p>
              </div>
            ))}
            {!statusCounts.length ? <p className="rounded bg-brand-50 p-4 text-sm font-semibold text-ink/65">No request analytics yet.</p> : null}
          </div>
        </div>
      </section>
    </AdminShell>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded border border-brand-900/10 bg-white p-4 shadow-sm">
      <p className="text-sm font-bold text-ink/55">{label}</p>
      <p className="mt-2 break-words text-2xl font-black">{value}</p>
    </div>
  );
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    DRAFT: "Draft",
    SUBMITTED: "Submitted",
    AWAITING_PAYMENT: "Awaiting payment",
    PAYMENT_CONFIRMED: "Payment confirmed",
    PROCESSING: "Processing",
    DOCUMENT_READY: "Ready for delivery",
    OUT_FOR_DELIVERY: "Out for delivery",
    DELIVERED: "Complete",
    CANCELLED: "Rejected"
  };

  return labels[status] || status.replaceAll("_", " ");
}

function getRequirementObject(requirements: Prisma.JsonValue | null) {
  if (!requirements || typeof requirements !== "object" || Array.isArray(requirements)) return {};
  return requirements as Record<string, unknown>;
}

function publicUrlFromStorageKey(storageKey: string) {
  return storageKey.startsWith("uploads/") ? `/${storageKey}` : null;
}

function getAdminNotes(requirements: Prisma.JsonValue | null): { note: string; status?: string; by?: string; at?: string }[] {
  if (!requirements || typeof requirements !== "object" || Array.isArray(requirements)) return [];
  const notes = (requirements as Prisma.JsonObject).adminNotes;
  if (!Array.isArray(notes)) return [];

  return notes.reduce<{ note: string; status?: string; by?: string; at?: string }[]>((items, note) => {
      if (!note || typeof note !== "object" || Array.isArray(note)) return items;
      const value = note as Prisma.JsonObject;
      const item = {
        note: typeof value.note === "string" ? value.note : "",
        status: typeof value.status === "string" ? value.status : undefined,
        by: typeof value.by === "string" ? value.by : undefined,
        at: typeof value.at === "string" ? value.at : undefined
      };
      if (item.note) items.push(item);
      return items;
    }, []);
}
