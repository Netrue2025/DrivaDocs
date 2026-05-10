"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { categoryEngineOptions, engineOptionsForVehicle, usageOptionsForVehicle } from "@/lib/fleet-pricing";
import { vehicleTypes, engineCategories, usageTypes, type PricingItem } from "@/lib/pricing-catalog";

type VehicleFormData = {
  id?: string;
  make?: string;
  model?: string;
  registrationNo?: string | null;
  chassisNo?: string | null;
  engineNo?: string | null;
  color?: string | null;
  vehicleType?: string;
  engineCategory?: string | null;
  usage?: string;
  licenseExpiry?: string | null;
  roadWorthinessExpiry?: string | null;
  insuranceExpiry?: string | null;
};

export function VehicleForm({
  modal = false,
  onSaved,
  initialData,
  savePath,
  prices = []
}: {
  modal?: boolean;
  onSaved?: () => void;
  initialData?: VehicleFormData;
  savePath?: string;
  prices?: PricingItem[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState("");
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>(() => ({
    make: initialData?.make || "",
    model: initialData?.model || "",
    registrationNo: initialData?.registrationNo || "",
    chassisNo: initialData?.chassisNo || "",
    engineNo: initialData?.engineNo || "",
    color: initialData?.color || "",
    vehicleType: initialData?.vehicleType || vehicleTypes[0],
    engineCategory: initialData?.engineCategory || engineOptionsForVehicle(prices, ["VEHICLE_PAPER_RENEWAL", "NEW_VEHICLE_REGISTRATION"], initialData?.vehicleType || vehicleTypes[0])?.[0] || categoryEngineOptions[initialData?.vehicleType || vehicleTypes[0]]?.[0] || engineCategories[0],
    usage: initialData?.usage || usageTypes[0],
    licenseExpiry: initialData?.licenseExpiry || "",
    roadWorthinessExpiry: initialData?.roadWorthinessExpiry || "",
    insuranceExpiry: initialData?.insuranceExpiry || ""
  }));
  const editing = Boolean(initialData?.id);

  function updateDraft(event: React.FormEvent<HTMLFormElement>) {
    const target = event.target as HTMLInputElement | HTMLSelectElement;
    if (!target.name) return;
    setDraft((current) => ({
      ...current,
      [target.name]: target.value,
      ...(target.name === "vehicleType"
        ? { engineCategory: engineOptionsForVehicle(prices, ["VEHICLE_PAPER_RENEWAL", "NEW_VEHICLE_REGISTRATION"], target.value)[0] || categoryEngineOptions[target.value]?.[0] || engineCategories[0] }
        : {})
    }));
  }

  function nextStep() {
    const nextDraft = {
      ...draft,
      ...Object.fromEntries(new FormData(formRef.current || undefined).entries())
    } as Record<string, string>;
    setDraft(nextDraft);

    if (!nextDraft.make?.trim() || !nextDraft.model?.trim()) {
      setStatus("Enter the vehicle make and model to continue.");
      return;
    }
    setStatus("");
    setStep(2);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    if (step === 1 || submitter?.value !== "save") {
      nextStep();
      return;
    }
    if (saving) return;

    const form = event.currentTarget;
    setSaving(true);
    setStatus("Saving...");
    const payload = {
      ...draft,
      ...Object.fromEntries(new FormData(form).entries())
    };
    try {
      const response = await fetch(editing ? savePath || `/api/vehicles/${initialData?.id}` : "/api/vehicles", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setStatus(body?.error || "Unable to save vehicle.");
        return;
      }

      setStatus(editing ? "Vehicle updated." : "Vehicle saved.");
      form.reset();
      setDraft({});
      setStep(1);
      router.refresh();
      onSaved?.();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} onChange={updateDraft} className={modal ? "min-w-0" : "min-w-0 rounded border border-brand-900/10 bg-white p-4 shadow-sm sm:p-5"}>
      {!modal ? <h2 className="text-xl font-black">Add vehicle</h2> : null}
      <div className="mt-1 flex items-center gap-2 text-xs font-black uppercase text-ink/45">
        <span className={step === 1 ? "text-brand-700" : ""}>Vehicle info</span>
        <span>/</span>
        <span className={step === 2 ? "text-brand-700" : ""}>Category and expiry</span>
      </div>
      <div className="mt-4 grid min-w-0 gap-4 md:grid-cols-2">
        {step === 1 ? (
          <>
            <Input name="make" label="Make" defaultValue={draft.make || ""} required />
            <Input name="model" label="Model" defaultValue={draft.model || ""} required />
            <Input name="registrationNo" label="Registration number" defaultValue={draft.registrationNo || ""} />
            <Input name="chassisNo" label="Chassis number" defaultValue={draft.chassisNo || ""} />
            <Input name="engineNo" label="Engine number" defaultValue={draft.engineNo || ""} />
            <Input name="color" label="Color" defaultValue={draft.color || ""} />
          </>
        ) : (
          <>
            <Select name="vehicleType" label="Vehicle type" options={vehicleTypes} defaultValue={draft.vehicleType} />
            <Select
              name="engineCategory"
              label="Engine/category"
              options={engineOptionsForVehicle(prices, ["VEHICLE_PAPER_RENEWAL", "NEW_VEHICLE_REGISTRATION"], draft.vehicleType) || categoryEngineOptions[draft.vehicleType] || engineCategories}
              defaultValue={draft.engineCategory}
            />
            <Select name="usage" label="Private or commercial" options={usageOptionsForVehicle(prices, ["VEHICLE_PAPER_RENEWAL", "NEW_VEHICLE_REGISTRATION"], draft.vehicleType)} defaultValue={draft.usage} />
            <Input name="licenseExpiry" label="Vehicle license expiry" type="date" defaultValue={draft.licenseExpiry || ""} />
            <Input name="roadWorthinessExpiry" label="Road worthiness expiry" type="date" defaultValue={draft.roadWorthinessExpiry || ""} />
            <Input name="insuranceExpiry" label="Insurance expiry" type="date" defaultValue={draft.insuranceExpiry || ""} />
          </>
        )}
      </div>
      {status ? <p className="mt-4 text-sm font-bold text-brand-700">{status}</p> : null}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        {step === 2 ? (
          <button type="button" onClick={() => setStep(1)} className="min-h-11 rounded border border-brand-900/15 px-5 font-bold text-ink">
            Back
          </button>
        ) : null}
        {step === 1 ? (
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              nextStep();
            }}
            className="min-h-11 w-full rounded bg-brand-700 px-5 font-bold text-white sm:w-auto"
          >
            Continue
          </button>
        ) : (
          <button type="submit" name="intent" value="save" disabled={saving} className="min-h-11 w-full rounded bg-brand-700 px-5 font-bold text-white disabled:opacity-60 sm:w-auto">
            {saving ? "Saving..." : editing ? "Update vehicle" : "Save vehicle"}
          </button>
        )}
      </div>
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

function Select({ label, name, options, defaultValue }: { label: string; name: string; options: string[]; defaultValue?: string }) {
  return (
    <label className="grid min-w-0 gap-2 text-sm font-bold text-ink/75">
      {label}
      <select name={name} defaultValue={defaultValue} className="min-h-11 min-w-0 rounded border border-brand-900/15 px-3 focus-ring">
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
