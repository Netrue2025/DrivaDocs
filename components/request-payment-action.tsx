"use client";

import Link from "next/link";
import { CheckCircle2, ReceiptText, X } from "lucide-react";
import { useState } from "react";
import { formatNaira } from "@/lib/utils";

export function RequestPaymentAction({
  requestId,
  total,
  upfront,
  balance,
  paidAmount
}: {
  requestId: string;
  total: number;
  upfront: number;
  balance: number;
  paidAmount: number;
}) {
  const balanceDue = Math.max(total - paidAmount, 0);

  if (paidAmount >= total) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded bg-green-50 px-2.5 py-1.5 text-xs font-black text-green-700">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          Paid
        </span>
        <Link href={`/dashboard/requests/${requestId}/receipt`} className="inline-flex items-center gap-1 rounded border border-brand-900/15 px-2.5 py-1.5 text-xs font-black text-brand-800 hover:bg-brand-50">
          <ReceiptText className="h-4 w-4" aria-hidden="true" />
          Receipt
        </Link>
      </div>
    );
  }

  if (paidAmount >= upfront && balance > 0) {
    return <PaymentForm requestId={requestId} amount={balanceDue} paymentType="BALANCE_25" label={`Pay ${formatNaira(balanceDue)}`} />;
  }

  return <PayNowChooser requestId={requestId} total={total} upfront={upfront} />;
}

function PayNowChooser({ requestId, total, upfront }: { requestId: string; total: number; upfront: number }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="whitespace-nowrap rounded bg-road px-3 py-2 text-xs font-black text-ink"
      >
        Pay now
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-[95] grid place-items-center bg-ink/70 px-3 py-5 backdrop-blur-sm sm:px-4 sm:py-8"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded border border-white/10 bg-white p-5 shadow-soft sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase text-brand-700">Choose payment</p>
                <h2 className="mt-2 text-2xl font-black">How do you want to pay?</h2>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center rounded border border-brand-900/15 text-ink" aria-label="Close payment options">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-6 grid gap-3">
              <PaymentForm requestId={requestId} amount={total} paymentType="FULL" label={`Full payment ${formatNaira(total)}`} />
              <PaymentForm requestId={requestId} amount={upfront} paymentType="UPFRONT_75" label={`75% upfront ${formatNaira(upfront)}`} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function PaymentForm({
  requestId,
  amount,
  paymentType,
  label
}: {
  requestId: string;
  amount: number;
  paymentType: "UPFRONT_75" | "BALANCE_25" | "FULL";
  label: string;
}) {
  const [submitting, setSubmitting] = useState(false);

  return (
    <form action="/api/payments/initialize" method="post" onSubmit={() => setSubmitting(true)}>
      <input type="hidden" name="serviceRequestId" value={requestId} />
      <input type="hidden" name="amount" value={amount} />
      <input type="hidden" name="paymentType" value={paymentType} />
      <button disabled={submitting} className="inline-flex min-h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded bg-road px-3 py-2 text-sm font-black text-ink disabled:opacity-60">
        {submitting ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" /> : null}
        {submitting ? "Preparing..." : label}
      </button>
    </form>
  );
}
