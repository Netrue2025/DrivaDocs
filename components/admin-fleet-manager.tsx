"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Car, IdCard, PencilLine, Trash2, X } from "lucide-react";
import { DriverForm } from "@/components/forms/driver-form";
import { VehicleForm } from "@/components/forms/vehicle-form";
import { Badge } from "@/components/ui/badge";

export type AdminFleetVehicle = {
  id: string;
  label: string;
  meta: string;
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

export type AdminFleetDriver = {
  id: string;
  label: string;
  meta: string;
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

export type AdminFleetBusiness = {
  id: string;
  companyName: string;
  owner: string;
  vehicles: AdminFleetVehicle[];
  drivers: AdminFleetDriver[];
};

type ActiveRecord =
  | { kind: "vehicles"; business: AdminFleetBusiness; row: AdminFleetVehicle }
  | { kind: "drivers"; business: AdminFleetBusiness; row: AdminFleetDriver }
  | null;

export function AdminFleetManager({ businesses }: { businesses: AdminFleetBusiness[] }) {
  const router = useRouter();
  const [active, setActive] = useState<ActiveRecord>(null);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function deleteRecord() {
    if (!active || active.row.locked || deleting) return;
    if (!window.confirm(`Delete ${active.row.label}?`)) return;
    setDeleting(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/fleet-records/${active.kind}/${active.row.id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error || "Unable to delete fleet record.");
        return;
      }
      setActive(null);
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <section className="mt-6 min-w-0 rounded border border-brand-900/10 bg-white shadow-sm">
        <div className="border-b border-brand-900/10 px-4 py-4 sm:px-5">
          <p className="text-sm font-black uppercase text-brand-700">Business fleets</p>
          <h2 className="mt-1 text-xl font-black">Vehicles and drivers added by businesses</h2>
        </div>
        <div className="divide-y divide-brand-900/10">
          {businesses.map((business) => (
            <div key={business.id} className="p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="flex items-center gap-2 break-words font-black">
                    <Building2 className="h-5 w-5 text-brand-700" /> {business.companyName}
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-ink/55">{business.owner}</p>
                </div>
                <Badge tone="gray">{business.vehicles.length} vehicles / {business.drivers.length} drivers</Badge>
              </div>
              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                <FleetColumn
                  title="Vehicles"
                  icon="vehicle"
                  rows={business.vehicles}
                  onOpen={(row) => {
                    setActive({ kind: "vehicles", business, row });
                    setMode("view");
                    setError("");
                  }}
                />
                <FleetColumn
                  title="Drivers"
                  icon="driver"
                  rows={business.drivers}
                  onOpen={(row) => {
                    setActive({ kind: "drivers", business, row });
                    setMode("view");
                    setError("");
                  }}
                />
              </div>
            </div>
          ))}
          {!businesses.length ? <p className="p-5 text-sm font-semibold text-ink/60">No business fleet records yet.</p> : null}
        </div>
      </section>

      {active ? (
        <div className="fixed inset-0 z-[120] grid place-items-center bg-ink/70 px-3 py-5 backdrop-blur-sm sm:px-4 sm:py-8">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded border border-white/10 bg-white shadow-soft">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-brand-900/10 bg-white px-4 py-4 sm:px-5">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase text-brand-700">{active.business.companyName}</p>
                <h2 className="mt-1 break-words text-xl font-black">{active.row.label}</h2>
                {active.row.locked ? <p className="mt-2 text-sm font-bold text-amber-700">Under process. Editing and delete are disabled.</p> : null}
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={deleteRecord}
                  disabled={active.row.locked || deleting}
                  className="grid h-10 w-10 place-items-center rounded border border-red-200 text-red-700 disabled:cursor-not-allowed disabled:opacity-35"
                  title="Delete"
                  aria-label="Delete fleet record"
                >
                  <Trash2 size={18} />
                </button>
                <button type="button" onClick={() => setActive(null)} className="grid h-10 w-10 place-items-center rounded border border-brand-900/15 text-ink" aria-label="Close fleet record">
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="p-4 sm:p-5">
              {mode === "view" ? (
                <>
                  <div className="grid gap-3 text-sm sm:grid-cols-2">
                    {recordRows(active).map((row) => (
                      <Detail key={row.label} label={row.label} value={row.value} />
                    ))}
                  </div>
                  {error ? <p className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">{error}</p> : null}
                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <button type="button" onClick={() => setActive(null)} className="min-h-11 rounded border border-brand-900/15 px-5 font-black">
                      Close
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("edit")}
                      disabled={active.row.locked}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded bg-brand-700 px-5 font-black text-white disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      <PencilLine size={16} /> Edit
                    </button>
                  </div>
                </>
              ) : active.kind === "vehicles" ? (
                <VehicleForm modal initialData={{ id: active.row.id, ...active.row.details }} savePath={`/api/admin/fleet-records/vehicles/${active.row.id}`} onSaved={() => { setActive(null); router.refresh(); }} />
              ) : (
                <DriverForm modal initialData={{ id: active.row.id, ...active.row.details }} savePath={`/api/admin/fleet-records/drivers/${active.row.id}`} onSaved={() => { setActive(null); router.refresh(); }} />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function FleetColumn<T extends AdminFleetVehicle | AdminFleetDriver>({
  title,
  icon,
  rows,
  onOpen
}: {
  title: string;
  icon: "vehicle" | "driver";
  rows: T[];
  onOpen: (row: T) => void;
}) {
  const Icon = icon === "vehicle" ? Car : IdCard;
  return (
    <div className="min-w-0 rounded border border-brand-900/10">
      <div className="flex items-center gap-2 border-b border-brand-900/10 bg-brand-50 px-3 py-2 text-sm font-black text-ink/70">
        <Icon size={16} className="text-brand-700" /> {title}
      </div>
      <div className="grid max-h-72 gap-2 overflow-y-auto p-2">
        {rows.map((row) => (
          <button key={row.id} type="button" onClick={() => onOpen(row)} className="flex min-w-0 items-start justify-between gap-3 rounded p-3 text-left hover:bg-brand-50">
            <span className="min-w-0">
              <span className="block break-words text-sm font-black">{row.label}</span>
              <span className="mt-1 block break-words text-xs font-semibold text-ink/50">{row.meta}</span>
            </span>
            <Badge tone={row.locked ? "amber" : "green"}>{row.locked ? "Under process" : "Editable"}</Badge>
          </button>
        ))}
        {!rows.length ? <p className="rounded bg-brand-50 p-3 text-sm font-semibold text-ink/55">No {title.toLowerCase()} added.</p> : null}
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

function recordRows(active: Exclude<ActiveRecord, null>) {
  if (active.kind === "vehicles") {
    const detail = active.row.details;
    return [
      { label: "Make", value: detail.make },
      { label: "Model", value: detail.model },
      { label: "Registration number", value: detail.registrationNo || "" },
      { label: "Chassis number", value: detail.chassisNo || "" },
      { label: "Engine number", value: detail.engineNo || "" },
      { label: "Color", value: detail.color || "" },
      { label: "Vehicle type", value: detail.vehicleType },
      { label: "Usage", value: detail.usage },
      { label: "License expiry", value: detail.licenseExpiry || "" },
      { label: "Road worthiness expiry", value: detail.roadWorthinessExpiry || "" },
      { label: "Insurance expiry", value: detail.insuranceExpiry || "" }
    ];
  }

  const detail = active.row.details;
  return [
    { label: "Surname", value: detail.surname },
    { label: "First name", value: detail.firstName },
    { label: "Last name", value: detail.lastName || "" },
    { label: "Date of birth", value: detail.dateOfBirth || "" },
    { label: "Phone", value: detail.phone || "" },
    { label: "Address", value: detail.address || "" },
    { label: "Mother's maiden name", value: detail.mothersMaidenName || "" },
    { label: "Next of kin phone", value: detail.nextOfKinPhone || "" },
    { label: "State of origin", value: detail.stateOfOrigin || "" },
    { label: "Local government", value: detail.localGovernment || "" },
    { label: "NIN", value: detail.nin || "" }
  ];
}
