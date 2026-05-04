"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { X } from "lucide-react";

export function ReminderControls({
  id,
  enabled
}: {
  id: string;
  enabled: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function updateReminder(nextEnabled: boolean) {
    setBusy(true);
    await fetch(`/api/notifications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: nextEnabled })
    });
    setBusy(false);
    router.refresh();
  }

  async function cancelReminder() {
    setBusy(true);
    await fetch(`/api/notifications/${id}`, { method: "DELETE" });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      <button
        type="button"
        onClick={() => updateReminder(!enabled)}
        disabled={busy}
        className={`relative h-7 w-12 rounded-full transition ${enabled ? "bg-brand-700" : "bg-slate-300"} disabled:opacity-50`}
        aria-label={enabled ? "Switch reminder off" : "Switch reminder on"}
      >
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${enabled ? "left-6" : "left-1"}`} />
      </button>
      <button
        type="button"
        onClick={cancelReminder}
        disabled={busy}
        className="grid h-8 w-8 place-items-center rounded border border-brand-900/10 text-ink/60 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
        aria-label="Cancel reminder"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
