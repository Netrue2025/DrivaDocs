"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DriverForm() {
  const router = useRouter();
  const [status, setStatus] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Saving...");
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    const response = await fetch("/api/drivers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    setStatus(response.ok ? "Driver saved." : "Unable to save driver.");
    if (response.ok) {
      event.currentTarget.reset();
      router.refresh();
    }
  }

  return (
    <form onSubmit={onSubmit} className="min-w-0 rounded border border-brand-900/10 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="text-xl font-black">Add driver</h2>
      <div className="mt-4 grid min-w-0 gap-4 md:grid-cols-2">
        <Input name="surname" label="Surname" required />
        <Input name="firstName" label="First name" required />
        <Input name="lastName" label="Last name" />
        <Input name="dateOfBirth" label="Date of birth" type="date" />
        <Input name="mothersMaidenName" label="Mother's maiden name" />
        <Input name="nextOfKinPhone" label="Next of kin phone" />
        <Input name="facialMark" label="Facial mark" />
        <Input name="disability" label="Disability" />
        <Input name="phone" label="Phone number" />
        <Input name="stateOfOrigin" label="State of origin" />
        <Input name="localGovernment" label="Local government" />
        <Input name="nin" label="NIN" />
        <label className="grid min-w-0 gap-2 text-sm font-bold text-ink/75 md:col-span-2">
          Address
          <textarea name="address" rows={3} className="min-w-0 rounded border border-brand-900/15 p-3 focus-ring" />
        </label>
      </div>
      {status ? <p className="mt-4 text-sm font-bold text-brand-700">{status}</p> : null}
      <button className="mt-4 min-h-11 w-full rounded bg-brand-700 px-5 font-bold text-white sm:w-auto">Save driver</button>
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
