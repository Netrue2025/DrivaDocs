"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { serviceLabels } from "@/lib/pricing-catalog";

export function PriceForm() {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const serviceTypes = Object.keys(serviceLabels);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Saving...");
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    const response = await fetch("/api/admin/pricing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    setStatus(response.ok ? "Price saved." : "Unable to save price.");
    if (response.ok) {
      event.currentTarget.reset();
      router.refresh();
    }
  }

  return (
    <form onSubmit={onSubmit} className="min-w-0 rounded border border-brand-900/10 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="text-xl font-black">Add/update price</h2>
      <div className="mt-4 grid min-w-0 gap-4">
        <label className="grid min-w-0 gap-2 text-sm font-bold text-ink/75">
          Service type
          <select name="serviceType" className="min-h-11 min-w-0 rounded border border-brand-900/15 px-3 focus-ring">
            {serviceTypes.map((type) => <option key={type} value={type}>{serviceLabels[type as keyof typeof serviceLabels]}</option>)}
          </select>
        </label>
        <Input name="serviceName" label="Display name" required />
        <Input name="vehicleType" label="Vehicle type" />
        <Input name="engineCategory" label="Engine/category" />
        <Input name="usage" label="Usage" />
        <Input name="state" label="State" />
        <Input name="location" label="Location" />
        <Input name="amount" label="Amount (NGN)" type="number" min={0} required />
      </div>
      {status ? <p className="mt-4 text-sm font-bold text-brand-700">{status}</p> : null}
      <button className="mt-4 min-h-11 w-full rounded bg-brand-700 px-5 font-bold text-white sm:w-auto">Save price</button>
    </form>
  );
}

function Input({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="grid min-w-0 gap-2 text-sm font-bold text-ink/75">
      {label}
      <input {...props} className="min-h-11 min-w-0 rounded border border-brand-900/15 px-3 focus-ring" />
    </label>
  );
}
