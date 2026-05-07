"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type DriverFormData = {
  id?: string;
  surname?: string;
  firstName?: string;
  lastName?: string | null;
  dateOfBirth?: string | null;
  mothersMaidenName?: string | null;
  nextOfKinPhone?: string | null;
  facialMark?: string | null;
  disability?: string | null;
  phone?: string | null;
  stateOfOrigin?: string | null;
  localGovernment?: string | null;
  address?: string | null;
  nin?: string | null;
};

export function DriverForm({
  modal = false,
  onSaved,
  initialData,
  savePath
}: {
  modal?: boolean;
  onSaved?: () => void;
  initialData?: DriverFormData;
  savePath?: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState("");
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>(() => ({
    surname: initialData?.surname || "",
    firstName: initialData?.firstName || "",
    lastName: initialData?.lastName || "",
    dateOfBirth: initialData?.dateOfBirth || "",
    mothersMaidenName: initialData?.mothersMaidenName || "",
    nextOfKinPhone: initialData?.nextOfKinPhone || "",
    facialMark: initialData?.facialMark || "",
    disability: initialData?.disability || "",
    phone: initialData?.phone || "",
    stateOfOrigin: initialData?.stateOfOrigin || "",
    localGovernment: initialData?.localGovernment || "",
    address: initialData?.address || "",
    nin: initialData?.nin || ""
  }));
  const editing = Boolean(initialData?.id);

  function updateDraft(event: React.FormEvent<HTMLFormElement>) {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    if (!target.name) return;
    setDraft((current) => ({ ...current, [target.name]: target.value }));
  }

  function nextStep() {
    const nextDraft = {
      ...draft,
      ...Object.fromEntries(new FormData(formRef.current || undefined).entries())
    } as Record<string, string>;
    setDraft(nextDraft);

    if (!nextDraft.surname?.trim() || !nextDraft.firstName?.trim()) {
      setStatus("Enter the driver's surname and first name to continue.");
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
      const response = await fetch(editing ? savePath || `/api/drivers/${initialData?.id}` : "/api/drivers", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setStatus(body?.error || "Unable to save driver.");
        return;
      }

      setStatus(editing ? "Driver updated." : "Driver saved.");
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
      {!modal ? <h2 className="text-xl font-black">Add driver</h2> : null}
      <div className="mt-1 flex items-center gap-2 text-xs font-black uppercase text-ink/45">
        <span className={step === 1 ? "text-brand-700" : ""}>Driver info</span>
        <span>/</span>
        <span className={step === 2 ? "text-brand-700" : ""}>Identity details</span>
      </div>
      <div className="mt-4 grid min-w-0 gap-4 md:grid-cols-2">
        {step === 1 ? (
          <>
            <Input name="surname" label="Surname" defaultValue={draft.surname || ""} required />
            <Input name="firstName" label="First name" defaultValue={draft.firstName || ""} required />
            <Input name="lastName" label="Last name" defaultValue={draft.lastName || ""} />
            <Input name="dateOfBirth" label="Date of birth" type="date" defaultValue={draft.dateOfBirth || ""} />
            <Input name="phone" label="Phone number" defaultValue={draft.phone || ""} />
            <label className="grid min-w-0 gap-2 text-sm font-bold text-ink/75 md:col-span-2">
              Address
              <textarea name="address" defaultValue={draft.address || ""} rows={3} className="min-w-0 rounded border border-brand-900/15 p-3 focus-ring" />
            </label>
          </>
        ) : (
          <>
            <Input name="mothersMaidenName" label="Mother's maiden name" defaultValue={draft.mothersMaidenName || ""} />
            <Input name="nextOfKinPhone" label="Next of kin phone" defaultValue={draft.nextOfKinPhone || ""} />
            <Input name="facialMark" label="Facial mark" defaultValue={draft.facialMark || ""} />
            <Input name="disability" label="Disability" defaultValue={draft.disability || ""} />
            <Input name="stateOfOrigin" label="State of origin" defaultValue={draft.stateOfOrigin || ""} />
            <Input name="localGovernment" label="Local government" defaultValue={draft.localGovernment || ""} />
            <Input name="nin" label="NIN" defaultValue={draft.nin || ""} />
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
            {saving ? "Saving..." : editing ? "Update driver" : "Save driver"}
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
