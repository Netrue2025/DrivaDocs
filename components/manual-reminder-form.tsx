"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ServiceOption = {
  id: string;
  title: string;
  requestCode: string;
  serviceType: string;
};

type Status = "idle" | "loading" | "success" | "error";

export function ManualReminderForm({ services }: { services: ServiceOption[] }) {
  const router = useRouter();
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [reminderDate, setReminderDate] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const selectedService = useMemo(
    () => services.find((service) => service.id === selectedServiceId),
    [selectedServiceId, services]
  );

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    const response = await fetch("/api/notifications/manual-reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serviceRequestId: selectedServiceId, expiryDate, reminderDate })
    });

    if (response.ok) {
      setStatus("success");
      setMessage("Reminder created and switched on.");
      setSelectedServiceId("");
      setExpiryDate("");
      setReminderDate("");
      router.refresh();
      return;
    }

    const payload = await response.json().catch(() => null);
    setStatus("error");
    setMessage(payload?.error || "Unable to create reminder. Please check the dates.");
  }

  return (
    <form onSubmit={onSubmit} className="rounded border border-brand-900/10 bg-white p-4 shadow-sm sm:p-5">
      <div className="grid gap-4">
        <label className="grid gap-2 text-sm font-bold text-ink/75">
          Select service
          <select
            value={selectedServiceId}
            onChange={(event) => {
              setSelectedServiceId(event.target.value);
              setExpiryDate("");
              setReminderDate("");
              setMessage("");
              setStatus("idle");
            }}
            required
            className="min-h-11 rounded border border-brand-900/15 px-3 focus-ring"
          >
            <option value="">Choose an existing service</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.title} - {service.requestCode}
              </option>
            ))}
          </select>
        </label>

        {selectedService ? (
          <div className="grid gap-4 rounded bg-brand-50 p-4">
            <div>
              <p className="text-sm font-black text-brand-800">{selectedService.title}</p>
              <p className="mt-1 text-xs font-bold uppercase text-ink/50">{selectedService.serviceType.replaceAll("_", " ")}</p>
            </div>
            <label className="grid gap-2 text-sm font-bold text-ink/75">
              Document expiry date
              <input
                type="date"
                value={expiryDate}
                onChange={(event) => {
                  setExpiryDate(event.target.value);
                  if (reminderDate && event.target.value && reminderDate >= event.target.value) {
                    setReminderDate("");
                  }
                }}
                required
                className="min-h-11 rounded border border-brand-900/15 px-3 focus-ring"
              />
            </label>
            {expiryDate ? (
              <label className="grid gap-2 text-sm font-bold text-ink/75">
                Reminder date
                <input
                  type="date"
                  value={reminderDate}
                  onChange={(event) => setReminderDate(event.target.value)}
                  max={expiryDate}
                  required
                  className="min-h-11 rounded border border-brand-900/15 px-3 focus-ring"
                />
                <span className="text-xs font-semibold text-ink/55">Reminder date must be before the document expiry date.</span>
              </label>
            ) : null}
          </div>
        ) : null}

        {message ? (
          <p className={status === "success" ? "text-sm font-bold text-brand-700" : "text-sm font-bold text-red-700"}>{message}</p>
        ) : null}

        <button
          type="submit"
          disabled={status === "loading" || !selectedService || !expiryDate || !reminderDate}
          className="min-h-11 rounded bg-brand-700 px-5 font-bold text-white hover:bg-brand-800 disabled:opacity-60"
        >
          {status === "loading" ? "Creating..." : "Create reminder"}
        </button>
      </div>
    </form>
  );
}
