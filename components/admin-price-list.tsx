"use client";

import { Bike, Car, ChevronDown, ChevronRight, Edit3, Loader2, Save, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { newVehicleRegistrationCategories, newVehicleRegistrationPricing, serviceLabels, vehiclePaperRenewalBreakdowns, vehiclePaperRenewalCategories, vehiclePaperRenewalPricing } from "@/lib/pricing-catalog";
import { formatNaira } from "@/lib/utils";

type AdminPrice = {
  id: string;
  serviceType: string;
  serviceName: string;
  vehicleType?: string | null;
  engineCategory?: string | null;
  usage?: string | null;
  state?: string | null;
  location?: string | null;
  amount: number;
  notes?: string | null;
};

type PriceMatrixSection = {
  serviceType: string;
  vehicleType: string;
  title: string;
  rows: AdminPrice[];
};

const categoryOrder = [
  "VEHICLE_PAPER_RENEWAL",
  "NEW_VEHICLE_REGISTRATION",
  "CHANGE_OF_OWNERSHIP",
  "OTHER_PERMIT",
  "FADED_NUMBER_PLATE_REPRINT",
  "NEW_DRIVERS_LICENSE",
  "DRIVERS_LICENSE_RENEWAL",
  "INTERNATIONAL_DRIVERS_LICENSE",
  "NEW_MOTORCYCLE_RIDERS_LICENSE",
  "MOTORCYCLE_RIDERS_LICENSE_RENEWAL",
  "DELIVERY"
];

export function AdminPriceList({ prices }: { prices: AdminPrice[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<AdminPrice | null>(null);
  const [matrix, setMatrix] = useState<{ serviceType: string; vehicleType: string; title: string; rows: AdminPrice[] } | null>(null);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const groupedPrices = useMemo(() => groupPrices(prices), [prices]);
  const matrixSections: Record<string, PriceMatrixSection[]> = useMemo(() => buildMatrixSections(prices), [prices]);

  function openEditor(price: AdminPrice) {
    setSelected(price);
    setAmount(String(price.amount));
    setStatus("");
  }

  function closeEditor() {
    setSelected(null);
    setStatus("");
    setSaving(false);
  }

  async function savePrice(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;

    setSaving(true);
    setStatus("Saving...");
    const response = await fetch(`/api/admin/pricing/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount })
    });

    if (!response.ok) {
      setStatus("Unable to save this price.");
      setSaving(false);
      return;
    }

    setStatus("Price saved.");
    setSaving(false);
    router.refresh();
    setTimeout(() => closeEditor(), 450);
  }

  async function saveMatrixPrice(price: AdminPrice, nextAmount: string) {
    setSaving(true);
    setStatus("Saving...");
    const isNew = price.id.startsWith("new:");
    const response = await fetch(isNew ? "/api/admin/pricing" : `/api/admin/pricing/${price.id}`, {
      method: isNew ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(isNew ? { ...price, amount: nextAmount } : { amount: nextAmount })
    });

    if (!response.ok) {
      setStatus("Unable to save this price.");
      setSaving(false);
      return;
    }

    setStatus("Price saved.");
    setSaving(false);
    router.refresh();
    setTimeout(() => setStatus(""), 650);
  }

  return (
    <div className="min-w-0 rounded border border-brand-900/10 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-black uppercase text-brand-700">Existing services</p>
          <h2 className="mt-1 text-xl font-black">Active service prices</h2>
        </div>
        <p className="text-sm font-semibold text-ink/55">Click a service to edit its price.</p>
      </div>

      <div className="mt-5 grid gap-3">
        {groupedPrices.map((group) => {
          const isOpen = Boolean(openCategories[group.serviceType]);
          return (
            <section key={group.serviceType} className="min-w-0 overflow-hidden rounded border border-brand-900/10 bg-white shadow-sm">
              <button
                type="button"
                onClick={() => setOpenCategories((current) => ({ ...current, [group.serviceType]: !current[group.serviceType] }))}
                className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition hover:bg-brand-50 focus-ring sm:px-5"
                aria-expanded={isOpen}
              >
                <span className="min-w-0">
                  <span className="block break-words font-black text-ink">{group.label}</span>
                  <span className="mt-1 block text-sm font-semibold text-ink/55">{group.items.length} price {group.items.length === 1 ? "item" : "items"}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2 text-sm font-black text-brand-700">
                  {isOpen ? "Hide" : "View"}
                  {isOpen ? <ChevronDown className="h-5 w-5" aria-hidden="true" /> : <ChevronRight className="h-5 w-5" aria-hidden="true" />}
                </span>
              </button>

              {isOpen ? (
                <div className="grid gap-3 border-t border-brand-900/10 bg-slate-50/45 p-3 sm:p-4 md:grid-cols-2 xl:grid-cols-3">
                  {group.serviceType === "NEW_VEHICLE_REGISTRATION" || group.serviceType === "VEHICLE_PAPER_RENEWAL" ? (
                    <VehicleMatrixSection
                      serviceType={group.serviceType}
                      sections={matrixSections[group.serviceType] || []}
                      onOpen={(section) => {
                        setStatus("");
                        setMatrix(section);
                      }}
                    />
                  ) : (
                    group.items.map((price) => (
                      <PriceCard key={price.id} price={price} onEdit={openEditor} />
                    ))
                  )}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>

      {!prices.length ? <p className="mt-5 rounded bg-brand-50 p-4 text-sm font-semibold text-ink/65">No service prices are available yet.</p> : null}

      {selected ? (
        <PriceEditModal
          price={selected}
          amount={amount}
          status={status}
          saving={saving}
          onAmount={setAmount}
          onClose={closeEditor}
          onSubmit={savePrice}
        />
      ) : null}
      {matrix ? (
        <PriceMatrixModal
          matrix={matrix}
          status={status}
          saving={saving}
          onClose={() => setMatrix(null)}
          onSave={saveMatrixPrice}
        />
      ) : null}
    </div>
  );
}

function VehicleMatrixSection({
  serviceType,
  sections,
  onOpen
}: {
  serviceType: string;
  sections: PriceMatrixSection[];
  onOpen: (section: PriceMatrixSection) => void;
}) {
  return (
    <div className="grid gap-3 md:col-span-2 xl:col-span-3 sm:grid-cols-2 xl:grid-cols-4">
      {sections.map((section) => {
        const Icon = section.vehicleType.includes("MOTORCYCLE") ? Bike : Car;
        return (
          <button
            key={`${serviceType}-${section.vehicleType}`}
            type="button"
            onClick={() => onOpen(section)}
            className="group min-w-0 rounded border border-brand-900/10 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-brand-700/35 hover:shadow-md focus-ring"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded bg-brand-50 text-brand-700">
                <Icon size={20} />
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-brand-700 opacity-70 transition group-hover:translate-x-0.5" />
            </div>
            <p className="mt-4 font-black text-ink">{section.vehicleType}</p>
            <p className="mt-1 text-sm font-semibold text-ink/55">
              {serviceType === "NEW_VEHICLE_REGISTRATION" ? "Oyo, Lagos and Abuja" : "Document renewal total"}
            </p>
          </button>
        );
      })}
    </div>
  );
}

function PriceCard({ price, onEdit }: { price: AdminPrice; onEdit: (price: AdminPrice) => void }) {
  return (
    <button
      type="button"
      onClick={() => onEdit(price)}
      className="group min-w-0 rounded border border-brand-900/10 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-brand-700/35 hover:shadow-md focus-ring"
    >
      <div className="flex min-w-0 items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="break-words font-black text-ink">{price.serviceName}</p>
          <p className="mt-1 text-sm font-semibold text-ink/55">{priceDescriptor(price)}</p>
        </div>
        <Edit3 className="h-4 w-4 shrink-0 text-brand-700 opacity-70 transition group-hover:opacity-100" aria-hidden="true" />
      </div>
      <p className="mt-4 break-words text-2xl font-black text-brand-800">{displayPrice(price)}</p>
    </button>
  );
}

function PriceEditModal({
  price,
  amount,
  status,
  saving,
  onAmount,
  onClose,
  onSubmit
}: {
  price: AdminPrice;
  amount: string;
  status: string;
  saving: boolean;
  onAmount: (amount: string) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const details = useMemo(() => priceDescriptor(price), [price]);

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-ink/70 px-3 py-5 backdrop-blur-sm sm:px-4 sm:py-8">
      <form onSubmit={onSubmit} className="animate-rise w-full max-w-lg rounded border border-white/10 bg-white p-4 shadow-soft sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-black uppercase text-brand-700">Edit service price</p>
            <h2 className="mt-2 break-words text-xl font-black sm:text-2xl">{price.serviceName}</h2>
            <p className="mt-2 text-sm font-semibold text-ink/55">{details}</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded border border-brand-900/10 text-ink/70 focus-ring" aria-label="Close price editor">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 rounded bg-brand-50 p-4">
          <p className="text-xs font-black uppercase text-brand-700">Current price</p>
          <p className="mt-1 break-words text-2xl font-black text-brand-900">{displayPrice(price)}</p>
        </div>

        <label className="mt-5 grid min-w-0 gap-2 text-sm font-bold text-ink/75">
          New price (NGN)
          <input
            type="number"
            min={0}
            value={amount}
            onChange={(event) => onAmount(event.target.value)}
            required
            className="min-h-11 min-w-0 rounded border border-brand-900/15 px-3 text-lg font-black focus-ring"
          />
        </label>

        {status ? <p className="mt-4 text-sm font-bold text-brand-700">{status}</p> : null}

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={onClose} className="min-h-11 rounded border border-brand-900/15 px-5 font-black">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="min-h-11 rounded bg-brand-700 px-5 font-black text-white disabled:cursor-not-allowed disabled:opacity-50">
            {saving ? "Saving..." : "Save price"}
          </button>
        </div>
      </form>
    </div>
  );
}

function PriceMatrixModal({
  matrix,
  status,
  saving,
  onClose,
  onSave
}: {
  matrix: PriceMatrixSection;
  status: string;
  saving: boolean;
  onClose: () => void;
  onSave: (price: AdminPrice, amount: string) => void;
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(matrix.rows.map((row) => [row.id, String(row.amount || "")]))
  );
  const Icon = matrix.vehicleType.includes("MOTORCYCLE") ? Bike : Car;

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-ink/70 px-3 py-5 backdrop-blur-sm sm:px-4 sm:py-8">
      <div className="animate-rise max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded border border-white/10 bg-white p-4 shadow-soft sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-black uppercase text-brand-700">{serviceLabels[matrix.serviceType as keyof typeof serviceLabels]}</p>
            <h2 className="mt-2 flex items-center gap-2 break-words text-xl font-black sm:text-2xl">
              <Icon className="shrink-0 text-brand-700" size={22} />
              {matrix.vehicleType}
            </h2>
            <p className="mt-2 text-sm font-semibold text-ink/55">{matrix.title}</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded border border-brand-900/10 text-ink/70 focus-ring" aria-label="Close price editor">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 grid gap-3">
          {matrix.serviceType === "VEHICLE_PAPER_RENEWAL" ? (
            <div className="rounded border border-brand-900/10 bg-brand-50/45 p-3">
              <p className="text-xs font-black uppercase text-brand-700">Included documents</p>
              <div className="mt-3 grid gap-2 text-sm">
                {(vehiclePaperRenewalBreakdowns[matrix.vehicleType as keyof typeof vehiclePaperRenewalBreakdowns] || []).map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-ink/62">{item.label}</span>
                    <span className="font-black text-ink">{formatNaira(item.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {matrix.rows.map((row) => (
            <div key={row.id} className="grid gap-3 rounded border border-brand-900/10 bg-brand-50/35 p-3 sm:grid-cols-[minmax(0,1fr)_160px_44px] sm:items-end">
              <div className="min-w-0">
                <p className="font-black text-ink">{matrixRowLabel(row, matrix.serviceType)}</p>
                <p className="mt-1 text-xs font-semibold text-ink/50">{row.id.startsWith("new:") ? "Not set yet" : displayPrice(row)}</p>
              </div>
              <label className="grid min-w-0 gap-1 text-xs font-black uppercase text-ink/50">
                Price
                <input
                  type="number"
                  min={0}
                  value={drafts[row.id] || ""}
                  onChange={(event) => setDrafts((current) => ({ ...current, [row.id]: event.target.value }))}
                  className="min-h-11 min-w-0 rounded border border-brand-900/15 bg-white px-3 text-base font-black text-ink focus-ring"
                />
              </label>
              <button
                type="button"
                onClick={() => onSave(row, drafts[row.id] || "0")}
                disabled={saving}
                className="grid h-11 w-11 place-items-center rounded bg-brand-700 text-white disabled:opacity-50"
                aria-label={`Save ${matrixRowLabel(row, matrix.serviceType)} price`}
                title="Save"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={17} />}
              </button>
            </div>
          ))}
        </div>

        {status ? <p className="mt-4 text-sm font-bold text-brand-700">{status}</p> : null}
      </div>
    </div>
  );
}

function priceDescriptor(price: AdminPrice) {
  if (price.serviceType === "NEW_VEHICLE_REGISTRATION") {
    return [price.vehicleType, price.usage, price.state].filter(Boolean).join(" - ") || "General";
  }
  return [price.vehicleType, price.engineCategory, price.usage, price.state, price.location].filter(Boolean).join(" - ") || "General";
}

function displayPrice(price: AdminPrice) {
  if (price.amount === 0 && price.notes) return price.notes;
  return formatNaira(price.amount);
}

function groupPrices(prices: AdminPrice[]) {
  const groups = new Map<string, AdminPrice[]>();
  for (const price of prices) {
    const items = groups.get(price.serviceType) || [];
    items.push(price);
    groups.set(price.serviceType, items);
  }

  return categoryOrder
    .filter((serviceType) => groups.has(serviceType))
    .map((serviceType) => ({
      serviceType,
      label: serviceLabels[serviceType as keyof typeof serviceLabels] || serviceType,
      items: (groups.get(serviceType) || []).sort((a, b) => a.serviceName.localeCompare(b.serviceName))
    }));
}

function buildMatrixSections(prices: AdminPrice[]): Record<string, PriceMatrixSection[]> {
  return {
    NEW_VEHICLE_REGISTRATION: newVehicleRegistrationCategories.map((vehicleType) => {
      const rows = newVehicleRegistrationPricing
        .filter((item) => item.vehicleType === vehicleType)
        .map((item) => findOrCreateVirtualPrice(prices, "NEW_VEHICLE_REGISTRATION", vehicleType, undefined, item.state, item.usage, item.amount));
      return {
        serviceType: "NEW_VEHICLE_REGISTRATION",
        vehicleType,
        title: "Prices by location and use",
        rows
      };
    }),
    VEHICLE_PAPER_RENEWAL: vehiclePaperRenewalCategories.map((vehicleType) => ({
      serviceType: "VEHICLE_PAPER_RENEWAL",
      vehicleType,
      title: "Renewal documents and total price",
      rows: vehiclePaperRenewalPricing
        .filter((item) => item.vehicleType === vehicleType)
        .map((item) => findOrCreateVirtualPrice(prices, "VEHICLE_PAPER_RENEWAL", vehicleType, undefined, undefined, undefined, item.amount))
    }))
  };
}

function findOrCreateVirtualPrice(prices: AdminPrice[], serviceType: string, vehicleType: string, engineCategory?: string, state?: string, usage?: string, defaultAmount = 0): AdminPrice {
  const serviceName = serviceLabels[serviceType as keyof typeof serviceLabels] || serviceType;
  const existing = prices.find((price) =>
    price.serviceType === serviceType &&
    price.vehicleType === vehicleType &&
    (engineCategory === undefined ? !price.engineCategory : price.engineCategory === engineCategory) &&
    (state === undefined ? !price.state : price.state === state) &&
    (usage === undefined ? !price.usage : price.usage === usage) &&
    (serviceType !== "VEHICLE_PAPER_RENEWAL" || (!price.engineCategory && !price.usage))
  );
  if (existing) return existing;
  return {
    id: `new:${serviceType}:${vehicleType}:${engineCategory || "none"}:${state || "none"}:${usage || "none"}`,
    serviceType,
    serviceName,
    vehicleType,
    engineCategory: engineCategory || null,
    usage: usage || null,
    state: state || null,
    location: null,
    amount: defaultAmount,
    notes: null
  };
}

function matrixRowLabel(price: AdminPrice, serviceType: string) {
  if (serviceType === "VEHICLE_PAPER_RENEWAL") return "Total renewal price";
  return [price.usage, price.state?.toUpperCase()].filter(Boolean).join(" - ") || price.state || "Price";
}
