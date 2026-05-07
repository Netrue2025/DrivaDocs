import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Download, Eye } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { FleetBulkRequestAction } from "@/components/fleet-bulk-request-action";
import { RequestPaymentAction } from "@/components/request-payment-action";
import { Badge } from "@/components/ui/badge";
import { authOptions } from "@/lib/auth";
import { documentUrlFromStorageKey } from "@/lib/document-url";
import { verifyPaystackPayment } from "@/lib/paystack";
import { prisma } from "@/lib/prisma";
import { getServiceDeliveryPeriod } from "@/lib/service-delivery";
import { formatNaira } from "@/lib/utils";

export const dynamic = "force-dynamic";

type RequestsSearchParams = {
  payment?: string;
  reference?: string;
};

export default async function RequestsPage({ searchParams }: { searchParams?: RequestsSearchParams }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const paymentReference = searchParams?.payment || searchParams?.reference || "";

  if (paymentReference) {
    await completePaymentFromReference(paymentReference, session.user.id);
  }

  const requests = await prisma.serviceRequest.findMany({
    where: { userId: session.user.id },
    include: { payments: true, documents: true },
    orderBy: { createdAt: "desc" }
  }).catch(() => []);
  const completedPayment = paymentReference
    ? requests.find((request) => request.payments.some((payment) => payment.providerReference === paymentReference && payment.status === "SUCCESS"))
    : null;

  return (
    <DashboardShell title="Service requests" description="Track every request from draft through delivery.">
      {completedPayment ? <PaymentSuccessModal request={completedPayment} /> : null}
      <div className="min-w-0 rounded border border-brand-900/10 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-xl font-black">Requests</h2>
          <Link href="/dashboard/requests/new?fresh=1" className="rounded bg-brand-700 px-4 py-2 text-sm font-bold text-white">New request</Link>
        </div>
        <div className="mt-4 overflow-x-auto rounded border border-brand-900/10">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-brand-50 text-ink/70">
              <tr>
                <th className="p-3">Code</th>
                <th className="p-3">Service</th>
                <th className="p-3">Delivery period</th>
                <th className="p-3">Status</th>
                <th className="p-3">Documents</th>
                <th className="p-3">Total</th>
                <th className="p-3">Payment</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => {
                const canEdit = request.status === "DRAFT" || request.status === "AWAITING_PAYMENT";
                const requirements = getRequirementObject(request.requirements);
                const isBulkFleetOrder = requirements.bulkOrder === true;
                const successfulPayments = request.payments.filter((payment) => payment.status === "SUCCESS");
                const paidAmount = successfulPayments.reduce((sum, payment) => sum + payment.amount, 0);
                const paymentState = getPaymentState({
                  total: request.totalAmount,
                  upfront: request.upfrontAmount || request.totalAmount,
                  paidAmount
                });
                const statusBadges = getStatusBadges(request.status, paymentState);
                const readyDocuments = request.documents.filter((document) => document.kind === "RENEWED_DOCUMENT");
                return (
                  <tr key={request.id} className="border-b border-brand-900/10">
                    <td className="p-3 font-bold">{request.requestCode}</td>
                    <td className="p-3">
                      {isBulkFleetOrder ? (
                        <FleetBulkRequestAction
                          requestId={request.id}
                          title={request.title}
                          serviceType={request.serviceType}
                          status={request.status}
                          requirements={requirements}
                        />
                      ) : canEdit ? (
                        <Link href={`/dashboard/requests/new?requestId=${request.id}`} className="font-bold text-brand-800 hover:text-brand-600">
                          {request.title}
                        </Link>
                      ) : (
                        request.title
                      )}
                    </td>
                    <td className="p-3 text-ink/65">{getServiceDeliveryPeriod(request.serviceType)}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">
                        {statusBadges.map((badge) => (
                          <Badge key={badge.label} tone={badge.tone}>{badge.label}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className="p-3">
                      {readyDocuments.length ? (
                        <div className="flex flex-wrap gap-2">
                          {readyDocuments.map((document) => {
                            const viewHref = documentUrlFromStorageKey(document.storageKey);
                            const downloadHref = documentUrlFromStorageKey(document.storageKey, true);
                            return (
                              <div key={document.id} className="flex gap-1" title={document.fileName}>
                                <DocumentAction href={viewHref} label="View ready document" icon="view" />
                                <DocumentAction href={downloadHref} label="Download ready document" icon="download" download />
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-ink/40">Not ready</span>
                      )}
                    </td>
                    <td className="p-3 font-bold">{formatNaira(request.totalAmount)}</td>
                    <td className="p-3">
                      <RequestPaymentAction requestId={request.id} total={request.totalAmount} upfront={request.upfrontAmount || request.totalAmount} balance={request.balanceAmount} paidAmount={paidAmount} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!requests.length ? <p className="rounded bg-brand-50 p-4 text-sm font-semibold text-ink/65">No requests yet.</p> : null}
        </div>
      </div>
    </DashboardShell>
  );
}

type BadgeState = { label: string; tone: "green" | "amber" | "gray" | "red" };

function getPaymentState({ total, upfront, paidAmount }: { total: number; upfront: number; paidAmount: number }): BadgeState {
  if (paidAmount >= total) return { label: "Paid", tone: "green" };
  if (paidAmount >= upfront) return { label: "75% paid", tone: "amber" };
  if (paidAmount > 0) return { label: "Part paid", tone: "amber" };
  return { label: "Awaiting payment", tone: "red" };
}

function getStatusBadges(status: string, paymentState: BadgeState): BadgeState[] {
  const adminStatus = getAdminDocumentStatus(status);
  const inReview = { label: "In review", tone: "amber" } as const;

  if (paymentState.label === "75% paid" && adminStatus) {
    return [paymentState, adminStatus];
  }

  if (adminStatus) return [adminStatus];
  if (paymentState.label === "75% paid") return [paymentState, inReview];
  if (paymentState.label === "Paid") return [inReview];
  return [paymentState];
}

function getAdminDocumentStatus(status: string): BadgeState | null {
  const labels: Record<string, string> = {
    PROCESSING: "Processing",
    DOCUMENT_READY: "Ready for delivery",
    OUT_FOR_DELIVERY: "Out for delivery",
    DELIVERED: "Delivered",
    CANCELLED: "Rejected"
  };

  if (!labels[status]) return null;
  if (status === "DELIVERED" || status === "DOCUMENT_READY") return { label: labels[status], tone: "green" };
  if (status === "CANCELLED") return { label: labels[status], tone: "red" };
  return { label: labels[status], tone: "amber" };
}

function PaymentSuccessModal({ request }: { request: { id: string; requestCode: string; title: string; totalAmount: number; payments: { status: string; amount: number }[] } }) {
  const paidAmount = request.payments.filter((payment) => payment.status === "SUCCESS").reduce((sum, payment) => sum + payment.amount, 0);
  const fullyPaid = paidAmount >= request.totalAmount;

  return (
    <div className="fixed inset-0 z-[95] grid place-items-center bg-ink/70 px-3 py-5 backdrop-blur-sm sm:px-4 sm:py-8">
      <div className="w-full max-w-md rounded border border-white/10 bg-white p-5 shadow-soft sm:p-6">
        <p className="text-sm font-black uppercase text-brand-700">Payment successful</p>
        <h2 className="mt-2 break-words text-2xl font-black">{request.title}</h2>
        <p className="mt-3 text-sm leading-6 text-ink/65">
          We received {formatNaira(paidAmount)} for {request.requestCode}. {fullyPaid ? "This request is fully paid." : "You can pay the remaining balance from the payment column."}
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link href={`/dashboard/requests/${request.id}/receipt`} className="inline-flex min-h-11 items-center justify-center rounded bg-road px-4 text-sm font-black text-ink">
            Download receipt
          </Link>
          <Link href="/dashboard/requests" className="inline-flex min-h-11 items-center justify-center rounded border border-brand-900/15 px-4 text-sm font-black text-ink">
            Exit
          </Link>
        </div>
      </div>
    </div>
  );
}

function DocumentAction({
  href,
  label,
  icon,
  download
}: {
  href: string | null;
  label: string;
  icon: "view" | "download";
  download?: boolean;
}) {
  const Icon = icon === "view" ? Eye : Download;
  if (!href) {
    return (
      <button
        type="button"
        disabled
        title="Document link is not available yet"
        className="grid h-9 w-9 cursor-not-allowed place-items-center rounded border border-brand-900/10 text-ink/30"
      >
        <Icon size={16} />
      </button>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      download={download}
      title={label}
      className="grid h-9 w-9 place-items-center rounded border border-brand-900/10 text-brand-800 transition hover:bg-brand-50"
    >
      <Icon size={16} />
    </a>
  );
}

function getRequirementObject(requirements: unknown) {
  if (!requirements || typeof requirements !== "object" || Array.isArray(requirements)) return {};
  return requirements as Record<string, unknown>;
}

async function completePaymentFromReference(reference: string, userId: string) {
  const payment = await prisma.payment.findFirst({
    where: { providerReference: reference, userId },
    include: { serviceRequest: true }
  }).catch(() => null);

  if (!payment || payment.status === "SUCCESS") return;
  const verified = process.env.PAYSTACK_SECRET_KEY ? await verifyPaystackPayment(reference) : { status: "success" };
  if (verified?.status !== "success") return;

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: "SUCCESS",
      paidAt: new Date(),
      receiptNo: `RCT-${reference}`
    }
  });

  const request = await prisma.serviceRequest.findUnique({
    where: { id: payment.serviceRequestId },
    include: { payments: true }
  });
  const paidAmount = request?.payments
    .filter((item) => item.status === "SUCCESS")
    .reduce((sum, item) => sum + item.amount, 0) ?? payment.amount;
  const fullyPaid = request ? paidAmount >= request.totalAmount : true;

  await prisma.serviceRequest.update({
    where: { id: payment.serviceRequestId },
    data: { status: fullyPaid ? "PAYMENT_CONFIRMED" : "AWAITING_PAYMENT" }
  });
}
