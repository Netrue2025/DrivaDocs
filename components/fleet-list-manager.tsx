"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Car, IdCard, PencilLine, Plus, Trash2, X } from "lucide-react";
import { DriverForm } from "@/components/forms/driver-form";
import { VehicleForm } from "@/components/forms/vehicle-form";
import { Badge } from "@/components/ui/badge";

type FleetVehicleRow = {
  id: string;
  title: string;
  meta: string;
  badge: string;
  locked: boolean;
  details: {
    make: string;
    model: string;
    registrationNo: string | null;
    chassisNo: string | null;
    engineNo: string | null;
    color: string | null;
    vehicleType: string;
    engineCategory: string | null;
    usage: string;
    licenseExpiry: string | null;
    roadWorthinessExpiry: string | null;
    insuranceExpiry: string | null;
  };
};

type FleetDriverRow = {
  id: string;
  title: string;
  meta: string;
  badge: string;
  locked: boolean;
  details: {
    surname: string;
    firstName: string;
    lastName: string | null;
    dateOfBirth: string | null;
    mothersMaidenName: string | null;
    nextOfKinPhone: string | null;
    facialMark: string | null;
    disability: string | null;
    phone: string | null;
    stateOfOrigin: string | null;
    localGovernment: string | null;
    address: string | null;
    nin: string | null;
  };
};

type ActiveForm =
  | { kind: "vehicle"; row?: FleetVehicleRow }
  | { kind: "driver"; row?: FleetDriverRow }
  | null;
type ActiveView =
  | { kind: "vehicle"; row: FleetVehicleRow }
  | { kind: "driver"; row: FleetDriverRow }
  | null;

export function FleetListManager({
  vehicles,
  drivers
}: {
  vehicles: FleetVehicleRow[];
  drivers: FleetDriverRow[];
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"vehicle" | "driver">("vehicle");
  const [activeForm, setActiveForm] = useState<ActiveForm>(null);
  const [activeView, setActiveView] = useState<ActiveView>(null);

  return (
    <>
      <div className="mt-6 min-w-0 rounded border border-brand-900/10 bg-white p-4 shadow-sm sm:p-5">
        <div className="grid grid-cols-2 rounded bg-brand-50 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("vehicle")}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded px-3 text-sm font-black ${activeTab === "vehicle" ? "bg-white text-brand-800 shadow-sm" : "text-ink/55"}`}
          >
            <Car size={16} /> Vehicles
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("driver")}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded px-3 text-sm font-black ${activeTab === "driver" ? "bg-white text-brand-800 shadow-sm" : "text-ink/55"}`}
          >
            <IdCard size={16} /> Drivers
          </button>
        </div>

        <div className="mt-4">
          {activeTab === "vehicle" ? (
            <FleetList
              title="Vehicles"
              icon="vehicle"
              empty="No vehicles added yet."
              rows={vehicles}
              onAdd={() => setActiveForm({ kind: "vehicle" })}
              onView={(row) => setActiveView({ kind: "vehicle", row })}
            />
          ) : (
            <FleetList
              title="Drivers"
              icon="driver"
              empty="No drivers added yet."
              rows={drivers}
              onAdd={() => setActiveForm({ kind: "driver" })}
              onView={(row) => setActiveView({ kind: "driver", row })}
            />
          )}
        </div>
      </div>

      {activeView ? (
        <FleetViewModal
          view={activeView}
          onClose={() => setActiveView(null)}
          onEdit={() => {
            setActiveForm(activeView);
            setActiveView(null);
          }}
          onDeleted={() => {
            setActiveView(null);
            router.refresh();
          }}
        />
      ) : null}

      {activeForm ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/55 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-brand-900/10 bg-white px-4 py-3 sm:px-5">
              <div>
                <p className="text-xs font-black uppercase text-brand-700">Fleet profile</p>
                <h2 className="text-lg font-black">
                  {activeForm.row ? "Edit" : "Add"} {activeForm.kind === "vehicle" ? "vehicle" : "driver"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveForm(null)}
                className="grid h-10 w-10 place-items-center rounded-full bg-brand-50 text-ink hover:bg-brand-100"
                aria-label="Close form"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 sm:p-5">
              {activeForm.kind === "vehicle" ? (
                <VehicleForm modal initialData={activeForm.row ? { id: activeForm.row.id, ...activeForm.row.details } : undefined} onSaved={() => setActiveForm(null)} />
              ) : (
                <DriverForm modal initialData={activeForm.row ? { id: activeForm.row.id, ...activeForm.row.details } : undefined} onSaved={() => setActiveForm(null)} />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function FleetList<T extends FleetVehicleRow | FleetDriverRow>({
  title,
  icon,
  rows,
  empty,
  onAdd,
  onView
}: {
  title: string;
  icon: "vehicle" | "driver";
  rows: T[];
  empty: string;
  onAdd: () => void;
  onView: (row: T) => void;
}) {
  const Icon = icon === "vehicle" ? Car : IdCard;
  return (
    <section className="min-w-0">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-black">
          <Icon className="text-brand-700" /> {title}
        </h2>
        <button
          type="button"
          onClick={onAdd}
          className="grid h-9 w-9 place-items-center rounded bg-brand-700 text-white hover:bg-brand-800"
          aria-label={`Add ${title.toLowerCase()}`}
        >
          <Plus size={16} />
        </button>
      </div>
      <div className="mt-4 grid gap-3">
        {rows.map((row) => (
          <button
            key={row.id}
            type="button"
            onClick={() => onView(row)}
            className="grid min-w-0 gap-3 rounded border border-brand-900/10 p-3 text-left transition hover:bg-brand-50 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
          >
            <span className="min-w-0">
              <span className="block break-words font-black">{row.title}</span>
              <span className="mt-1 block break-words text-sm text-ink/55">{row.meta}</span>
            </span>
            <span className="flex flex-wrap gap-2 sm:justify-end">
              <Badge tone={row.locked ? "amber" : "green"}>{row.locked ? "Under process" : row.badge}</Badge>
            </span>
          </button>
        ))}
        {!rows.length ? (
          <p className="rounded bg-brand-50 p-4 text-sm font-semibold text-ink/65">{empty}</p>
        ) : null}
      </div>
    </section>
  );
}

function FleetViewModal({
  view,
  onClose,
  onEdit,
  onDeleted
}: {
  view: ActiveView;
  onClose: () => void;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  if (!view) return null;
  const rows = view.kind === "vehicle" ? vehicleDetailRows(view.row) : driverDetailRows(view.row);
  const deletePath = view.kind === "vehicle" ? `/api/vehicles/${view.row.id}` : `/api/drivers/${view.row.id}`;

  async function deleteRecord() {
    if (!view || view.row.locked || deleting) return;
    const confirmed = window.confirm(`Delete ${view.row.title}?`);
    if (!confirmed) return;

    setDeleting(true);
    setError("");
    try {
      const response = await fetch(deletePath, { method: "DELETE" });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error || "Unable to delete this record.");
        return;
      }
      onDeleted();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-ink/60 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-brand-900/10 bg-white px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase text-brand-700">Saved fleet info</p>
            <h2 className="mt-1 break-words text-xl font-black">{view.row.title}</h2>
            {view.row.locked ? <p className="mt-2 text-sm font-bold text-amber-700">This item is under process, so editing is disabled.</p> : null}
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={deleteRecord}
              disabled={view.row.locked || deleting}
              className="grid h-10 w-10 place-items-center rounded border border-red-200 text-red-700 disabled:cursor-not-allowed disabled:opacity-35"
              aria-label={`Delete ${view.row.title}`}
              title="Delete"
            >
              <Trash2 size={18} />
            </button>
            <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded border border-brand-900/15 text-ink" aria-label="Close details">
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="p-4 sm:p-5">
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            {rows.map((row) => (
              <Detail key={row.label} label={row.label} value={row.value} />
            ))}
          </div>
          {error ? <p className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">{error}</p> : null}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={onClose} className="min-h-11 rounded border border-brand-900/15 px-5 font-black">
              Close
            </button>
            <button
              type="button"
              onClick={onEdit}
              disabled={view.row.locked}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded bg-brand-700 px-5 font-black text-white disabled:cursor-not-allowed disabled:opacity-45"
            >
              <PencilLine size={16} />
              Edit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded border border-brand-900/10 bg-brand-50/45 p-3">
      <p className="text-xs font-black uppercase text-ink/42">{label}</p>
      <p className="mt-1 break-words font-semibold text-ink/78">{value || "Not provided"}</p>
    </div>
  );
}

function vehicleDetailRows(row: FleetVehicleRow) {
  const detail = row.details;
  return [
    { label: "Make", value: detail.make },
    { label: "Model", value: detail.model },
    { label: "Registration number", value: detail.registrationNo || "" },
    { label: "Chassis number", value: detail.chassisNo || "" },
    { label: "Engine number", value: detail.engineNo || "" },
    { label: "Color", value: detail.color || "" },
    { label: "Vehicle type", value: detail.vehicleType },
    { label: "Engine/category", value: detail.engineCategory || "" },
    { label: "Usage", value: detail.usage },
    { label: "Vehicle license expiry", value: detail.licenseExpiry || "" },
    { label: "Road worthiness expiry", value: detail.roadWorthinessExpiry || "" },
    { label: "Insurance expiry", value: detail.insuranceExpiry || "" }
  ];
}

function driverDetailRows(row: FleetDriverRow) {
  const detail = row.details;
  return [
    { label: "Surname", value: detail.surname },
    { label: "First name", value: detail.firstName },
    { label: "Last name", value: detail.lastName || "" },
    { label: "Date of birth", value: detail.dateOfBirth || "" },
    { label: "Phone", value: detail.phone || "" },
    { label: "Address", value: detail.address || "" },
    { label: "Mother's maiden name", value: detail.mothersMaidenName || "" },
    { label: "Next of kin phone", value: detail.nextOfKinPhone || "" },
    { label: "Facial mark", value: detail.facialMark || "" },
    { label: "Disability", value: detail.disability || "" },
    { label: "State of origin", value: detail.stateOfOrigin || "" },
    { label: "Local government", value: detail.localGovernment || "" },
    { label: "NIN", value: detail.nin || "" }
  ];
}
