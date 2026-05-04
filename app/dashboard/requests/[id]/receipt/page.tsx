import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { ReceiptActions } from "@/components/receipt-actions";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatNaira } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ReceiptPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const request = await prisma.serviceRequest.findFirst({
    where: { id: params.id, userId: session.user.id },
    include: {
      user: true,
      payments: { where: { status: "SUCCESS" }, orderBy: { paidAt: "asc" } },
      deliveryAddress: true
    }
  });

  if (!request) redirect("/dashboard/requests");

  const paidAmount = request.payments.reduce((sum, payment) => sum + payment.amount, 0);
  const balanceDue = Math.max(request.totalAmount - paidAmount, 0);
  const latestPayment = request.payments[request.payments.length - 1];
  const receiptNo = latestPayment?.receiptNo || `RCT-${request.requestCode}`;
  const requirements = asRecord(request.requirements);
  const serviceAppliedFor = typeof requirements.permitType === "string" && requirements.permitType.trim() ? requirements.permitType : request.title;

  return (
    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 print:max-w-none print:px-0 print:py-0">
      <ReceiptActions />

      <article className="mt-5 overflow-hidden rounded border border-brand-900/10 bg-white shadow-soft print:mt-0 print:rounded-none print:border-0 print:shadow-none">
        <div className="bg-ink px-5 py-6 text-white sm:px-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-3xl font-black tracking-tight">DrivaDocs</p>
              <p className="mt-2 text-sm font-semibold text-white/70">Vehicle documents, licensing, renewals, permits, and delivery support.</p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xs font-black uppercase text-road">Payment receipt</p>
              <p className="mt-1 font-black">{receiptNo}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 p-5 sm:p-7">
          <div className="grid gap-4 sm:grid-cols-2">
            <ReceiptBlock title="Client">
              <Line label="Name" value={request.user.name || "Unnamed customer"} />
              <Line label="Email" value={request.user.email} />
              <Line label="Phone" value={request.user.phone || "Not provided"} />
            </ReceiptBlock>
            <ReceiptBlock title="Service">
              <Line label="Request code" value={request.requestCode} />
              <Line label="Category" value={request.title} />
              <Line label="Applied service" value={serviceAppliedFor} />
              <Line label="Status" value={balanceDue > 0 ? "Part payment received" : "Paid"} />
            </ReceiptBlock>
          </div>

          <ReceiptBlock title="Delivery">
            <div className="grid gap-3 sm:grid-cols-2">
              <Line label="State" value={request.deliveryAddress?.state || request.state || "Not provided"} />
              <Line label="City" value={request.deliveryAddress?.city || "Not provided"} />
              <Line label="Phone" value={request.deliveryAddress?.phone || "Not provided"} />
              <Line label="Address" value={request.deliveryAddress?.addressLine || "Not provided"} />
            </div>
          </ReceiptBlock>

          <ReceiptBlock title="Payment breakdown">
            <div className="grid gap-2">
              <MoneyLine label="Service price" value={request.estimateSubtotal} />
              <MoneyLine label="Delivery fee" value={request.deliveryFee} />
              <MoneyLine label="Total amount" value={request.totalAmount} strong />
              <MoneyLine label="Amount paid" value={paidAmount} strong />
              <MoneyLine label="Balance due" value={balanceDue} />
            </div>
          </ReceiptBlock>

          <ReceiptBlock title="Payment records">
            <div className="grid gap-2">
              {request.payments.map((payment) => (
                <div key={payment.id} className="grid gap-1 rounded bg-brand-50 p-3 text-sm sm:grid-cols-[1fr_auto]">
                  <div>
                    <p className="font-black">{payment.type.replaceAll("_", " ")}</p>
                    <p className="text-ink/55">{payment.paidAt ? new Date(payment.paidAt).toLocaleString() : "Payment date unavailable"}</p>
                  </div>
                  <p className="font-black text-brand-800">{formatNaira(payment.amount)}</p>
                </div>
              ))}
            </div>
          </ReceiptBlock>

          <div className="rounded border border-brand-900/10 p-4 text-sm leading-6 text-ink/65">
            Thank you for choosing DrivaDocs. This receipt confirms payment received for the service listed above.
          </div>
        </div>
      </article>
    </section>
  );
}

function ReceiptBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded border border-brand-900/10 p-4">
      <h2 className="text-sm font-black uppercase text-brand-700">{title}</h2>
      <div className="mt-3 grid gap-3">{children}</div>
    </section>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-black uppercase text-ink/42">{label}</p>
      <p className="mt-1 break-words font-semibold text-ink/78">{value}</p>
    </div>
  );
}

function MoneyLine({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-brand-900/10 py-2 last:border-b-0">
      <span className="font-semibold text-ink/62">{label}</span>
      <span className={strong ? "text-lg font-black text-brand-800" : "font-black text-ink"}>{formatNaira(value)}</span>
    </div>
  );
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}
