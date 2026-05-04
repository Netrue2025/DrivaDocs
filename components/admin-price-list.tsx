"use client";

import { ChevronDown, ChevronRight, Edit3, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { serviceLabels } from "@/lib/pricing-catalog";
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
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const groupedPrices = useMemo(() => groupPrices(prices), [prices]);

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
                  {group.items.map((price) => (
                    <PriceCard key={price.id} price={price} onEdit={openEditor} />
                  ))}
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

function priceDescriptor(price: AdminPrice) {
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
