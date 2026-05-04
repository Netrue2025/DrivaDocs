"use client";

import Link from "next/link";
import { Download, X } from "lucide-react";

export function ReceiptActions() {
  return (
    <div className="print:hidden flex flex-wrap items-center justify-end gap-3">
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex min-h-11 items-center gap-2 rounded bg-brand-700 px-4 text-sm font-black text-white"
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        Download PDF
      </button>
      <Link href="/dashboard/requests" className="inline-flex min-h-11 items-center gap-2 rounded border border-brand-900/15 px-4 text-sm font-black text-ink">
        <X className="h-4 w-4" aria-hidden="true" />
        Exit
      </Link>
    </div>
  );
}
