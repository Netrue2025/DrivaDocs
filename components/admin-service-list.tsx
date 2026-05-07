"use client";

import { Download, Eye, PencilLine, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { documentUrlFromStorageKey } from "@/lib/document-url";
import { formatNaira } from "@/lib/utils";

export type AdminServiceDocument = {
  id: string;
  kind: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  publicUrl: string | null;
  storageKey: string;
  verifiedAt: string | null;
  createdAt: string;
};

export type AdminServicePayment = {
  id: string;
  amount: number;
  status: string;
  type: string;
};

export type AdminServiceNote = {
  note: string;
  status?: string;
  by?: string;
  at?: string;
};

export type AdminServiceRequest = {
  id: string;
  requestCode: string;
  title: string;
  status: string;
  state: string | null;
  estimateSubtotal: number;
  deliveryFee: number;
  totalAmount: number;
  upfrontAmount: number;
  balanceAmount: number;
  createdAt: string;
  customer: {
    name: string | null;
    email: string;
    phone: string | null;
  };
  deliveryAddress: {
    recipientName: string;
    phone: string;
    addressLine: string;
    city: string;
    state: string;
    deliveryMethod?: string;
  } | null;
  assignedAdminId: string | null;
  assignedTo: string | null;
  requirements: Record<string, unknown>;
  notes: AdminServiceNote[];
  documents: AdminServiceDocument[];
  payments: AdminServicePayment[];
};

export type AdminStaffOption = {
  id: string;
  label: string;
};

const adminStatusOptions = [
  { value: "PROCESSING", label: "Processing" },
  { value: "CANCELLED", label: "Rejected" },
  { value: "DOCUMENT_READY", label: "Ready for delivery" },
  { value: "DELIVERED", label: "Complete" }
];

export function AdminServiceList({
  requests
}: {
  requests: AdminServiceRequest[];
}) {
  const [selected, setSelected] = useState<AdminServiceRequest | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminServiceRequest | null>(null);
  const [pendingPayment, setPendingPayment] = useState<AdminServiceRequest | null>(null);
  const [pendingStatus, setPendingStatus] = useState<AdminServiceRequest | null>(null);

  return (
    <>
      <section className="min-w-0 rounded border border-brand-900/10 bg-white shadow-sm">
        <div className="border-b border-brand-900/10 px-4 py-4 sm:px-5">
          <p className="text-sm font-black uppercase text-brand-700">Service requests</p>
          <h2 className="mt-1 text-xl font-black">All submitted services</h2>
        </div>
        <div className="divide-y divide-brand-900/10">
          {requests.map((request) => {
            const paid = isPaid(request);
            return (
              <div
                key={request.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelected(request)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelected(request);
                  }
                }}
                className="grid w-full min-w-0 cursor-pointer gap-3 px-4 py-4 text-left transition-colors hover:bg-brand-50/55 sm:px-5 lg:grid-cols-[minmax(0,1fr)_auto]"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-ink">{request.requestCode}</span>
                    <Badge tone={statusTone(request.status)}>{statusLabel(request.status)}</Badge>
                    {paid ? <Badge tone="green">Paid</Badge> : <Badge tone="amber">Payment pending</Badge>}
                  </div>
                  <p className="mt-2 truncate text-base font-semibold">{request.title}</p>
                  <p className="mt-1 text-sm text-ink/60">
                    {request.customer.name || request.customer.email} - {formatNaira(request.totalAmount)}
                  </p>
                </div>

                <div className="flex w-full min-w-0 flex-row flex-wrap items-center gap-2 sm:w-auto lg:w-auto" onClick={(event) => event.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => setPendingStatus(request)}
                    title="Update status"
                    className="grid h-9 w-9 place-items-center rounded border border-brand-900/10 bg-white text-brand-800 transition hover:bg-brand-50"
                    aria-label={`Update ${request.requestCode} status`}
                  >
                    <PencilLine size={16} />
                  </button>
                  {!paid ? (
                    <button
                      type="button"
                      onClick={() => setPendingPayment(request)}
                      className="h-9 whitespace-nowrap rounded bg-road px-3 text-xs font-black text-ink"
                    >
                      Mark paid
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setPendingDelete(request)}
                    title="Delete request"
                    className="grid h-9 w-9 place-items-center rounded border border-red-200 bg-white text-red-700 transition hover:bg-red-50"
                    aria-label={`Delete ${request.requestCode}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
          {!requests.length ? (
            <p className="p-5 text-sm font-semibold text-ink/60">No service requests yet.</p>
          ) : null}
        </div>
      </section>

      {selected ? (
        <RequestDetailsModal request={selected} onClose={() => setSelected(null)} onMarkPayment={setPendingPayment} />
      ) : null}

      {pendingDelete ? (
        <DeleteConfirmModal request={pendingDelete} onClose={() => setPendingDelete(null)} />
      ) : null}

      {pendingStatus ? (
        <StatusUpdateModal request={pendingStatus} onClose={() => setPendingStatus(null)} />
      ) : null}

      {pendingPayment ? (
        <AdminPaymentConfirmModal request={pendingPayment} onClose={() => setPendingPayment(null)} />
      ) : null}
    </>
  );
}

function RequestDetailsModal({
  request,
  onClose,
  onMarkPayment
}: {
  request: AdminServiceRequest;
  onClose: () => void;
  onMarkPayment: (request: AdminServiceRequest) => void;
}) {
  const requirementEntries = Object.entries(request.requirements).filter(([key]) => !["adminNotes", "deliveryPeriod"].includes(key));
  const bulkItems = normalizeBulkItems(request.requirements.items);
  const serviceAppliedFor = getAppliedServiceName(request);
  const readyDocuments = request.documents.filter((document) => document.kind === "RENEWED_DOCUMENT");

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-ink/70 px-3 py-5 backdrop-blur-sm sm:px-4 sm:py-8">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded border border-white/10 bg-white shadow-soft">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-brand-900/10 bg-white px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <p className="text-sm font-black uppercase text-brand-700">{request.requestCode}</p>
            <h2 className="mt-1 break-words text-xl font-semibold sm:text-2xl">{request.title}</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge tone={statusTone(request.status)}>{statusLabel(request.status)}</Badge>
              <Badge tone="gray">{formatNaira(request.totalAmount)}</Badge>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded border border-brand-900/15 text-ink"
            aria-label="Close request details"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid min-w-0 gap-5 p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.85fr)]">
          <div className="grid min-w-0 gap-5">
            <Panel title="Customer and delivery">
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <Detail label="Customer" value={request.customer.name || "Unnamed customer"} />
                <Detail label="Email" value={request.customer.email} />
                <Detail label="Phone" value={request.customer.phone || "Not provided"} />
                <Detail label="State" value={request.state || "Not selected"} />
                <Detail label="Delivery option" value={formatDeliveryMethod(request.deliveryAddress?.deliveryMethod)} />
                <Detail label="Delivery city" value={request.deliveryAddress?.city || "Not provided"} />
                <Detail label="Delivery phone" value={request.deliveryAddress?.phone || "Not provided"} />
                <div className="sm:col-span-2">
                  <Detail label="Delivery address" value={request.deliveryAddress?.addressLine || "Not provided"} />
                </div>
              </div>
            </Panel>

            <Panel title="Service overview">
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <Detail label="Service category" value={request.title} />
                <Detail label="Service applied for" value={serviceAppliedFor} />
                {request.requirements.vehicleType ? <Detail label="Vehicle type" value={formatValue(request.requirements.vehicleType)} /> : null}
                <Detail label="State" value={request.state || request.deliveryAddress?.state || "Not selected"} />
              </div>
            </Panel>

            <Panel title="Submitted details">
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                {requirementEntries.filter(([key]) => !["bulkOrder", "fleetTarget", "itemCount", "items"].includes(key)).map(([key, value]) => (
                  <Detail key={key} label={formatFieldLabel(key)} value={formatValue(value)} />
                ))}
                {!requirementEntries.filter(([key]) => !["bulkOrder", "fleetTarget", "itemCount", "items"].includes(key)).length ? (
                  <p className="text-sm font-semibold text-ink/55">No submitted requirement details.</p>
                ) : null}
              </div>
            </Panel>

            {bulkItems.length ? (
              <Panel title="Grouped fleet services">
                <div className="grid gap-3">
                  {bulkItems.map((item, index) => (
                    <details key={item.id} className="rounded border border-brand-900/10 bg-brand-50/35 p-3">
                      <summary className="cursor-pointer text-sm font-black text-ink">
                        #{index + 1} {item.label}
                      </summary>
                      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                        {Object.entries(item.details).map(([key, value]) => (
                          <Detail key={`${item.id}-${key}`} label={formatFieldLabel(key)} value={value} />
                        ))}
                        {Object.entries(item.files).map(([key, file]) => (
                          <div key={`${item.id}-${key}`}>
                            <p className="text-xs font-black uppercase text-ink/42">{formatFieldLabel(key)}</p>
                            <div className="mt-1 flex items-center gap-2">
                              <span className="min-w-0 break-words font-medium text-ink/78">{file.fileName}</span>
                              <FileAction href={documentUrlFromStorageKey(file.storageKey)} label="View uploaded document" icon="view" />
                              <FileAction href={documentUrlFromStorageKey(file.storageKey, true)} label="Download uploaded document" icon="download" download />
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  ))}
                </div>
              </Panel>
            ) : null}

            <Panel title="Uploaded documents">
              <div className="grid gap-2">
                {request.documents.map((document) => (
                  <div key={document.id} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded border border-brand-900/10 p-3">
                    <div className="min-w-0 overflow-hidden">
                      <p className="truncate text-sm font-black" title={document.fileName}>{document.fileName}</p>
                      <p className="text-xs text-ink/50">{document.mimeType} - {formatFileSize(document.fileSize)}</p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <FileAction href={documentUrlFromStorageKey(document.storageKey)} label="View document" icon="view" />
                      <FileAction href={documentUrlFromStorageKey(document.storageKey, true)} label="Download document" icon="download" download />
                    </div>
                  </div>
                ))}
                {!request.documents.length ? (
                  <p className="rounded bg-brand-50 p-4 text-sm font-semibold text-ink/65">No uploaded documents for this request.</p>
                ) : null}
              </div>
            </Panel>
          </div>

          <div className="grid min-w-0 content-start gap-5">
            <Panel title="Upload document">
              <div className="grid gap-4">
                <form action={`/api/admin/requests/${request.id}`} method="post" encType="multipart/form-data" className="grid gap-3">
                  <input type="hidden" name="action" value="upload-document" />
                  <label className="grid gap-2 text-sm font-bold text-ink/70">
                    Upload renewed/ready document
                    <input name="file" type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" className="w-full min-w-0 rounded border border-brand-900/15 bg-white p-2 text-sm" />
                    <span className="text-xs font-semibold text-ink/45">PDF, JPG, or PNG up to 5MB.</span>
                  </label>
                  <button className="min-h-10 rounded bg-road px-4 text-sm font-black text-ink">Upload & mark ready</button>
                </form>

                <div className="grid gap-2 border-t border-brand-900/10 pt-4">
                  <p className="text-sm font-black text-ink/70">Ready uploaded documents</p>
                  {readyDocuments.map((document) => (
                    <div key={`ready-${document.id}`} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded bg-brand-50 p-3">
                      <div className="min-w-0 overflow-hidden">
                        <p className="truncate text-sm font-black" title={document.fileName}>{document.fileName}</p>
                        <p className="text-xs text-ink/50">{document.mimeType} - {formatFileSize(document.fileSize)}</p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <FileAction href={documentUrlFromStorageKey(document.storageKey)} label="View ready document" icon="view" />
                        <FileAction href={documentUrlFromStorageKey(document.storageKey, true)} label="Download ready document" icon="download" download />
                      </div>
                    </div>
                  ))}
                  {!readyDocuments.length ? (
                    <p className="rounded bg-brand-50 p-3 text-sm font-semibold text-ink/55">No ready document uploaded yet.</p>
                  ) : null}
                </div>
              </div>
            </Panel>

            <Panel title="Payments">
              <div className="grid gap-3">
                <div className="grid gap-2 rounded border border-brand-900/10 bg-brand-50 p-3 text-sm">
                  <PaymentLine label="Service price" value={request.estimateSubtotal} />
                  <PaymentLine label="Delivery fee" value={request.deliveryFee} />
                  <PaymentLine label="Total amount" value={request.totalAmount} strong />
                  <PaymentLine label="75% upfront" value={request.upfrontAmount} />
                  <PaymentLine label="25% balance" value={request.balanceAmount} />
                </div>
                {request.payments.map((payment) => (
                  <div key={payment.id} className="flex flex-wrap items-center justify-between gap-3 rounded bg-brand-50 p-3 text-sm">
                    <span className="font-bold">{payment.type.replaceAll("_", " ")}</span>
                    <span className="font-black">{formatNaira(payment.amount)} - {payment.status}</span>
                  </div>
                ))}
                {!request.payments.length ? (
                  <p className="text-sm font-semibold text-ink/55">No payment records yet.</p>
                ) : null}
                {!isPaid(request) ? (
                  <button type="button" onClick={() => onMarkPayment(request)} className="min-h-10 w-full rounded bg-road px-4 text-sm font-black text-ink">
                    Mark payment as paid
                  </button>
                ) : null}
              </div>
            </Panel>

            <Panel title="Admin notes">
              <div className="grid gap-2">
                {request.notes.map((note, index) => (
                  <div key={`${request.id}-modal-note-${index}`} className="rounded bg-brand-50 p-3 text-sm">
                    <p className="font-semibold leading-6 text-ink/76">{note.note}</p>
                    <p className="mt-1 text-xs text-ink/48">{note.by || "Admin"} {note.at ? `- ${new Date(note.at).toLocaleString()}` : ""}</p>
                  </div>
                ))}
                {!request.notes.length ? (
                  <p className="text-sm font-semibold text-ink/55">No admin notes yet.</p>
                ) : null}
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusUpdateModal({
  request,
  onClose
}: {
  request: AdminServiceRequest;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[112] grid place-items-center bg-ink/65 px-3 py-5 backdrop-blur-sm sm:px-4 sm:py-8">
      <div className="w-full max-w-sm rounded border border-white/10 bg-white p-5 shadow-soft">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-black uppercase text-brand-700">Update status</p>
            <h2 className="mt-2 break-words text-xl font-black">{request.requestCode}</h2>
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded border border-brand-900/15 text-ink" aria-label="Close status update">
            <X size={16} />
          </button>
        </div>

        <form action={`/api/admin/requests/${request.id}`} method="post" className="mt-5 grid gap-3">
          <input type="hidden" name="action" value="status" />
          <label className="grid gap-2 text-sm font-bold text-ink/70">
            Status
            <select name="status" defaultValue={request.status} className="min-h-11 rounded border border-brand-900/15 bg-white px-3 focus-ring">
              {adminStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button className="min-h-11 rounded bg-brand-700 px-4 text-sm font-black text-white hover:bg-brand-800">
            Save status
          </button>
        </form>
      </div>
    </div>
  );
}

function PaymentLine({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-semibold text-ink/62">{label}</span>
      <span className={strong ? "text-lg font-black text-brand-800" : "font-black text-ink"}>{formatNaira(value)}</span>
    </div>
  );
}

function AdminPaymentConfirmModal({
  request,
  onClose
}: {
  request: AdminServiceRequest;
  onClose: () => void;
}) {
  const paidAmount = getPaidAmount(request);
  const remainingAmount = Math.max(request.totalAmount - paidAmount, 0);
  const upfrontDue = Math.max((request.upfrontAmount || request.totalAmount) - paidAmount, 0);

  return (
    <div className="fixed inset-0 z-[115] grid place-items-center bg-ink/70 px-3 py-5 backdrop-blur-sm sm:px-4 sm:py-8">
      <div className="w-full max-w-md rounded border border-white/10 bg-white p-5 shadow-soft sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-black uppercase text-brand-700">Confirm payment</p>
            <h2 className="mt-2 break-words text-2xl font-black">{request.requestCode}</h2>
          </div>
          <button type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded border border-brand-900/15 text-ink" aria-label="Close payment confirmation">
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 grid gap-2 rounded bg-brand-50 p-4 text-sm">
          <PaymentLine label="Total amount" value={request.totalAmount} strong />
          <PaymentLine label="Already paid" value={paidAmount} />
          <PaymentLine label="Remaining" value={remainingAmount} />
        </div>

        <div className="mt-6 grid gap-3">
          {upfrontDue > 0 ? (
            <AdminMarkPaidForm requestId={request.id} paymentType="UPFRONT_75" label={`Mark 75% paid (${formatNaira(upfrontDue)})`} />
          ) : null}
          {remainingAmount > 0 ? (
            <AdminMarkPaidForm requestId={request.id} paymentType="FULL" label={`Mark full payment (${formatNaira(remainingAmount)})`} />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function AdminMarkPaidForm({
  requestId,
  paymentType,
  label
}: {
  requestId: string;
  paymentType: "UPFRONT_75" | "FULL";
  label: string;
}) {
  return (
    <form action={`/api/admin/requests/${requestId}`} method="post">
      <input type="hidden" name="action" value="mark-paid" />
      <input type="hidden" name="paymentType" value={paymentType} />
      <button className="min-h-11 w-full rounded bg-road px-4 text-sm font-black text-ink">{label}</button>
    </form>
  );
}

function DeleteConfirmModal({
  request,
  onClose
}: {
  request: AdminServiceRequest;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[110] grid place-items-center bg-ink/70 px-3 py-5 backdrop-blur-sm sm:px-4 sm:py-8">
      <div className="w-full max-w-md rounded border border-white/10 bg-white p-6 shadow-soft">
        <p className="text-sm font-black uppercase text-red-700">Delete service history</p>
        <h2 className="mt-2 text-2xl font-semibold">Delete {request.requestCode}?</h2>
        <p className="mt-3 text-sm leading-6 text-ink/65">
          This will permanently delete the service request history and linked records. This action cannot be undone.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={onClose} className="min-h-11 rounded border border-brand-900/15 px-4 font-black">
            Cancel
          </button>
          <form action={`/api/admin/requests/${request.id}`} method="post">
            <input type="hidden" name="action" value="delete" />
            <button className="min-h-11 w-full rounded bg-red-700 px-4 font-black text-white">
              Delete
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0 overflow-hidden rounded border border-brand-900/10 bg-white p-4 shadow-sm">
      <h3 className="font-bold">{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-black uppercase text-ink/42">{label}</p>
      <p className="mt-1 break-words font-medium text-ink/78">{value}</p>
    </div>
  );
}

function FileAction({
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
        title="File URL is not available yet"
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
      className="grid h-9 w-9 place-items-center rounded border border-brand-900/10 text-brand-800 hover:bg-brand-50"
    >
      <Icon size={16} />
    </a>
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

function statusTone(status: string): "green" | "amber" | "gray" | "red" {
  if (status === "DELIVERED" || status === "DOCUMENT_READY") return "green";
  if (status === "CANCELLED") return "red";
  if (status === "DRAFT") return "gray";
  return "amber";
}

function isPaid(request: AdminServiceRequest) {
  return getPaidAmount(request) >= request.totalAmount;
}

function getPaidAmount(request: AdminServiceRequest) {
  return request.payments
    .filter((payment) => payment.status === "SUCCESS")
    .reduce((sum, payment) => sum + payment.amount, 0);
}

function formatFieldLabel(key: string) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (letter) => letter.toUpperCase());
}

function getAppliedServiceName(request: AdminServiceRequest) {
  const permitType = request.requirements.permitType;
  if (typeof permitType === "string" && permitType.trim()) return permitType;
  return request.title;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "Not provided";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(formatValue).join(", ");
  try {
    return JSON.stringify(value);
  } catch {
    return "Not provided";
  }
}

function formatDeliveryMethod(method?: string) {
  const labels: Record<string, string> = {
    PHYSICAL_DELIVERY: "Physical delivery",
    SCAN_TO_ME: "Scan to me (online)",
    PICKUP_OFFICE: "Pickup from our office",
    HOME_OFFICE: "Physical delivery"
  };
  return method ? labels[method] || formatFieldLabel(method) : "Physical delivery";
}

function formatFileSize(size: number) {
  if (!size) return "size unavailable";
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function normalizeBulkItems(value: unknown): { id: string; label: string; details: Record<string, string>; files: Record<string, { fileName: string; storageKey: string; publicUrl?: string }> }[] {
  if (!Array.isArray(value)) return [];
  return value.reduce<{ id: string; label: string; details: Record<string, string>; files: Record<string, { fileName: string; storageKey: string; publicUrl?: string }> }[]>((items, item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return items;
    const row = item as Record<string, unknown>;
    const id = typeof row.id === "string" ? row.id : "";
    if (!id) return items;
    items.push({
      id,
      label: typeof row.label === "string" ? row.label : id,
      details: asStringRecord(row.details),
      files: asFileRecord(row.files)
    });
    return items;
  }, []);
}

function asStringRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.entries(value).reduce<Record<string, string>>((record, [key, item]) => {
    if (typeof item === "string") record[key] = item;
    return record;
  }, {});
}

function asFileRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.entries(value).reduce<Record<string, { fileName: string; storageKey: string; publicUrl?: string }>>((record, [key, item]) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return record;
    const row = item as Record<string, unknown>;
    if (typeof row.fileName === "string" && typeof row.storageKey === "string") {
      record[key] = {
        fileName: row.fileName,
        storageKey: row.storageKey,
        publicUrl: typeof row.publicUrl === "string" ? row.publicUrl : undefined
      };
    }
    return record;
  }, {});
}
