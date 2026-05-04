"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { vehicleTypes, engineCategories, usageTypes } from "@/lib/pricing-catalog";

export function VehicleForm() {
  const router = useRouter();
  const [status, setStatus] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Saving...");
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    const response = await fetch("/api/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    setStatus(response.ok ? "Vehicle saved." : "Unable to save vehicle.");
    if (response.ok) {
      event.currentTarget.reset();
      router.refresh();
    }
  }

  return (
    <form onSubmit={onSubmit} className="min-w-0 rounded border border-brand-900/10 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="text-xl font-black">Add vehicle</h2>
      <div className="mt-4 grid min-w-0 gap-4 md:grid-cols-2">
        <Input name="make" label="Make" required />
        <Input name="model" label="Model" required />
        <Input name="registrationNo" label="Registration number" />
        <Input name="chassisNo" label="Chassis number" />
        <Input name="engineNo" label="Engine number" />
        <Input name="color" label="Color" />
        <Select name="vehicleType" label="Vehicle type" options={vehicleTypes} />
        <Select name="engineCategory" label="Engine/category" options={engineCategories} />
        <Select name="usage" label="Private or commercial" options={usageTypes} />
        <Input name="licenseExpiry" label="Vehicle license expiry" type="date" />
        <Input name="roadWorthinessExpiry" label="Road worthiness expiry" type="date" />
        <Input name="insuranceExpiry" label="Insurance expiry" type="date" />
      </div>
      {status ? <p className="mt-4 text-sm font-bold text-brand-700">{status}</p> : null}
      <button className="mt-4 min-h-11 w-full rounded bg-brand-700 px-5 font-bold text-white sm:w-auto">Save vehicle</button>
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

function Select({ label, name, options }: { label: string; name: string; options: string[] }) {
  return (
    <label className="grid min-w-0 gap-2 text-sm font-bold text-ink/75">
      {label}
      <select name={name} className="min-h-11 min-w-0 rounded border border-brand-900/15 px-3 focus-ring">
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
