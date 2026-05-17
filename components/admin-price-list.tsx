"use client";

import { Bike, Car, ChevronDown, ChevronRight, Edit3, Loader2, Plus, Save, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { adminVehicleCategories, categoryEngineOptions, privateCommercialOptions, resolveFleetAmount, statePriceOptions } from "@/lib/fleet-pricing";
import { nonRegionalPricingServiceTypes, serviceLabels, vehiclePaperRenewalBreakdowns } from "@/lib/pricing-catalog";
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
  active?: boolean | null;
};

type PriceMatrixSection = {
  serviceType: string;
  vehicleType: string;
  title: string;
  rows: AdminPrice[];
  breakdownRows?: AdminPrice[];
  breakdownGroups?: PriceBreakdownGroup[];
};

type PriceBreakdownGroup = {
  key: string;
  title: string;
  totalRow: AdminPrice;
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
  const [localPrices, setLocalPrices] = useState<AdminPrice[]>(() => prices);
  const [selected, setSelected] = useState<AdminPrice | null>(null);
  const [matrix, setMatrix] = useState<PriceMatrixSection | null>(null);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const groupedPrices = useMemo(() => groupPrices(localPrices), [localPrices]);
  const matrixSections: Record<string, PriceMatrixSection[]> = useMemo(() => buildMatrixSections(localPrices), [localPrices]);

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

  async function saveMatrixPrice(price: AdminPrice, nextAmount: string): Promise<AdminPrice | null> {
    setSaving(true);
    setStatus("Saving...");
    const response = await fetch("/api/admin/pricing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pricePayload(price, nextAmount, true))
    });

    if (!response.ok) {
      setStatus(await responseMessage(response, "Unable to save this price."));
      setSaving(false);
      return null;
    }

    const saved = await response.json() as AdminPrice;
    setLocalPrices((current) => upsertPriceRow(current, saved));
    setStatus("Price saved.");
    setSaving(false);
    setTimeout(() => setStatus(""), 650);
    return saved;
  }

  async function deleteMatrixPrice(price: AdminPrice): Promise<AdminPrice | null> {
    setSaving(true);
    setStatus("Deleting...");
    const response = await fetch("/api/admin/pricing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pricePayload(price, String(price.amount || 0), false))
    });

    if (!response.ok) {
      setStatus(await responseMessage(response, "Unable to delete this item."));
      setSaving(false);
      return null;
    }

    const deleted = await response.json() as AdminPrice;
    setLocalPrices((current) => upsertPriceRow(current, { ...deleted, active: false }));
    setStatus("Item deleted.");
    setSaving(false);
    setTimeout(() => setStatus(""), 650);
    return deleted;
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
          const itemCount = matrixSections[group.serviceType]?.length ?? group.items.length;
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
                  <span className="mt-1 block text-sm font-semibold text-ink/55">{itemCount} price {itemCount === 1 ? "item" : "items"}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2 text-sm font-black text-brand-700">
                  {isOpen ? "Hide" : "View"}
                  {isOpen ? <ChevronDown className="h-5 w-5" aria-hidden="true" /> : <ChevronRight className="h-5 w-5" aria-hidden="true" />}
                </span>
              </button>

              {isOpen ? (
                <div className="grid gap-3 border-t border-brand-900/10 bg-slate-50/45 p-3 sm:p-4 md:grid-cols-2 xl:grid-cols-3">
                  {usesVehicleMatrix(group.serviceType) ? (
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
          key={`${matrix.serviceType}-${matrix.vehicleType}`}
          matrix={matrix}
          status={status}
          onClose={() => setMatrix(null)}
          onSave={saveMatrixPrice}
          onDelete={deleteMatrixPrice}
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
        const Icon = section.vehicleType === "Motorcycle" ? Bike : Car;
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
            <p className="mt-1 text-sm font-semibold text-ink/55">{section.title}</p>
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
  onClose,
  onSave,
  onDelete
}: {
  matrix: PriceMatrixSection;
  status: string;
  onClose: () => void;
  onSave: (price: AdminPrice, amount: string) => Promise<AdminPrice | null>;
  onDelete: (price: AdminPrice) => Promise<AdminPrice | null>;
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries([
      ...matrix.rows,
      ...(matrix.breakdownRows || []),
      ...(matrix.breakdownGroups || []).flatMap((group) => group.rows)
    ].map((row) => [row.id, String(row.amount || "")]))
  );
  const [matrixRows, setMatrixRows] = useState<AdminPrice[]>(() => matrix.rows);
  const [breakdownGroups, setBreakdownGroups] = useState<PriceBreakdownGroup[]>(() =>
    matrix.breakdownGroups?.length
      ? matrix.breakdownGroups
      : matrix.breakdownRows?.length && matrix.rows[0]
        ? [{ key: priceIdentity(matrix.rows[0]), title: breakdownGroupTitle(matrix.rows[0]), totalRow: matrix.rows[0], rows: matrix.breakdownRows }]
        : []
  );
  const [editingBreakdownId, setEditingBreakdownId] = useState<string | null>(null);
  const [editingMatrixId, setEditingMatrixId] = useState<string | null>(null);
  const [addingBreakdownKey, setAddingBreakdownKey] = useState<string | null>(null);
  const [newDocumentName, setNewDocumentName] = useState("");
  const [newDocumentAmount, setNewDocumentAmount] = useState("");
  const addOptions = priceVariantsForCategory(matrix.serviceType, matrix.vehicleType);
  const firstAddOption = addOptions[0] || {};
  const [addingMatrix, setAddingMatrix] = useState(false);
  const [newMatrixEngineCategory, setNewMatrixEngineCategory] = useState(firstAddOption.engineCategory || "");
  const [newMatrixUsage, setNewMatrixUsage] = useState(firstAddOption.usage || "");
  const [newMatrixState, setNewMatrixState] = useState(firstAddOption.state || "");
  const [newMatrixAmount, setNewMatrixAmount] = useState("");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const Icon = matrix.vehicleType === "Motorcycle" ? Bike : Car;
  const isBusy = Boolean(busyAction);
  const matrixEngineOptions = uniqueVariantValues(addOptions, "engineCategory");
  const matrixUsageOptions = uniqueVariantValues(addOptions, "usage");
  const matrixStateOptions = uniqueVariantValues(addOptions, "state");
  const engineListId = `engine-options-${matrix.serviceType}-${matrix.vehicleType}`.replace(/[^a-zA-Z0-9_-]/g, "-");
  const stateListId = `state-options-${matrix.serviceType}-${matrix.vehicleType}`.replace(/[^a-zA-Z0-9_-]/g, "-");

  function replaceBreakdownGroup(groupKey: string, rows: AdminPrice[]) {
    setBreakdownGroups((current) => current.map((group) => group.key === groupKey ? { ...group, rows } : group));
  }

  async function saveTotalFromRows(totalRow: AdminPrice, rows: AdminPrice[], draftOverrides: Record<string, string> = {}) {
    if (!totalRow) return;
    const nextTotal = rows.reduce((sum, item) => {
      const value = draftOverrides[item.id] ?? drafts[item.id] ?? String(item.amount || 0);
      return sum + amountFromDraft(value);
    }, 0);
    setDrafts((current) => ({ ...current, [totalRow.id]: String(nextTotal) }));
    const saved = await onSave(totalRow, String(nextTotal));
    if (saved) {
      setMatrixRows((current) => current.map((item) => samePriceKey(item, totalRow) ? normalizeSavedPrice(saved, item) : item));
      setBreakdownGroups((current) => current.map((group) => group.key === priceIdentity(totalRow) ? { ...group, totalRow: normalizeSavedPrice(saved, group.totalRow) } : group));
    }
  }

  async function saveBreakdownPrice(group: PriceBreakdownGroup, row: AdminPrice) {
    const action = `save:${row.id}`;
    const nextAmount = drafts[row.id] || "0";
    setBusyAction(action);
    try {
      const saved = await onSave(row, nextAmount);
      if (!saved) return;
      const nextRows = group.rows.map((item) => item.id === row.id ? normalizeSavedPrice(saved, item) : item);
      replaceBreakdownGroup(group.key, nextRows);
      setDrafts((current) => {
        const next = { ...current, [saved.id]: nextAmount };
        if (saved.id !== row.id) delete next[row.id];
        return next;
      });
      await saveTotalFromRows(group.totalRow, nextRows, { [saved.id]: nextAmount });
      setEditingBreakdownId(null);
    } finally {
      setBusyAction(null);
    }
  }

  async function addBreakdownPrice(event: React.FormEvent<HTMLFormElement>, group: PriceBreakdownGroup) {
    event.preventDefault();
    const label = newDocumentName.trim();
    if (!label) return;
    setBusyAction(`add:${group.key}`);

    const existing = group.rows.find((item) => item.serviceName.toLowerCase() === label.toLowerCase());
    const row: AdminPrice = existing || {
      id: `new:VEHICLE_PAPER_RENEWAL:${matrix.vehicleType}:${group.totalRow.engineCategory || "none"}:${group.totalRow.usage || "none"}:${label}`,
      serviceType: "VEHICLE_PAPER_RENEWAL",
      serviceName: label,
      vehicleType: matrix.vehicleType,
      engineCategory: group.totalRow.engineCategory || null,
      usage: group.totalRow.usage || null,
      state: null,
      location: null,
      amount: amountFromDraft(newDocumentAmount),
      notes: null,
      active: true
    };

    try {
      const saved = await onSave(row, newDocumentAmount || "0");
      if (!saved) return;

      const nextRow = normalizeSavedPrice(saved, row);
      const nextRows = existing
        ? group.rows.map((item) => item.id === existing.id ? nextRow : item)
        : [...group.rows, nextRow];

      replaceBreakdownGroup(group.key, nextRows);
      setDrafts((current) => ({ ...current, [nextRow.id]: String(nextRow.amount) }));
      await saveTotalFromRows(group.totalRow, nextRows, { [nextRow.id]: String(nextRow.amount) });
      setNewDocumentName("");
      setNewDocumentAmount("");
      setAddingBreakdownKey(null);
    } finally {
      setBusyAction(null);
    }
  }

  async function deleteBreakdownPrice(group: PriceBreakdownGroup, row: AdminPrice) {
    const action = `delete:${row.id}`;
    setBusyAction(action);
    try {
      const deleted = await onDelete(row);
      if (!deleted) return;

      const nextRows = group.rows.filter((item) => item.id !== row.id);
      replaceBreakdownGroup(group.key, nextRows);
      setDrafts((current) => {
        const next = { ...current };
        delete next[row.id];
        return next;
      });
      await saveTotalFromRows(group.totalRow, nextRows);
    } finally {
      setBusyAction(null);
    }
  }

  async function saveMatrixRow(row: AdminPrice) {
    const action = `matrix:${row.id}`;
    setBusyAction(action);
    try {
      const saved = await onSave(row, drafts[row.id] || "0");
      if (!saved) return;
      setDrafts((current) => {
        const next = { ...current, [saved.id]: String(saved.amount) };
        if (saved.id !== row.id) delete next[row.id];
        return next;
      });
      setMatrixRows((current) => current.map((item) => item.id === row.id ? normalizeSavedPrice(saved, item) : item));
      setBreakdownGroups((current) => current.map((group) => samePriceKey(group.totalRow, row) ? { ...group, totalRow: normalizeSavedPrice(saved, group.totalRow) } : group));
      setEditingMatrixId(null);
    } finally {
      setBusyAction(null);
    }
  }

  async function deleteMatrixRow(row: AdminPrice) {
    const action = `delete-matrix:${row.id}`;
    setBusyAction(action);
    try {
      const deleted = await onDelete(row);
      if (!deleted) return;
      setDrafts((current) => {
        const next = { ...current };
        delete next[row.id];
        return next;
      });
      setMatrixRows((current) => current.filter((item) => item.id !== row.id));
    } finally {
      setBusyAction(null);
    }
  }

  async function addMatrixRow(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const engineCategory = newMatrixEngineCategory.trim() || undefined;
    const usage = newMatrixUsage || undefined;
    const state = newMatrixState.trim() || undefined;
    const amount = newMatrixAmount || "0";
    const existing = matrixRows.find((item) =>
      sameNullable(item.engineCategory, engineCategory) &&
      sameNullable(item.usage, usage) &&
      sameNullable(item.state, state)
    );
    const row: AdminPrice = existing || {
      id: `new:${matrix.serviceType}:${matrix.vehicleType}:${engineCategory || "none"}:${state || "none"}:${usage || "none"}`,
      serviceType: matrix.serviceType,
      serviceName: serviceLabels[matrix.serviceType as keyof typeof serviceLabels] || matrix.serviceType,
      vehicleType: matrix.vehicleType,
      engineCategory: engineCategory || null,
      usage: usage || null,
      state: state || null,
      location: null,
      amount: amountFromDraft(amount),
      notes: null,
      active: true
    };

    setBusyAction("add-matrix");
    try {
      const saved = await onSave(row, amount);
      if (!saved) return;
      const nextRow = normalizeSavedPrice(saved, row);
      setDrafts((current) => {
        const next = { ...current, [nextRow.id]: String(nextRow.amount) };
        if (nextRow.id !== row.id) delete next[row.id];
        return next;
      });
      setMatrixRows((current) => existing
        ? current.map((item) => item.id === existing.id ? nextRow : item)
        : [...current, nextRow]
      );
      setNewMatrixAmount("");
      setAddingMatrix(false);
    } finally {
      setBusyAction(null);
    }
  }

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
          <div className="rounded border border-brand-900/10 bg-white p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-black uppercase text-brand-700">Service prices</p>
              <button
                type="button"
                onClick={() => {
                  setEditingMatrixId(null);
                  setAddingMatrix((current) => !current);
                }}
                disabled={isBusy}
                className="grid h-8 w-8 place-items-center rounded text-brand-700 transition hover:bg-brand-50 focus-ring disabled:opacity-50"
                aria-label={`Add ${matrix.vehicleType} service price`}
                title="Add service price"
              >
                <Plus size={16} />
              </button>
            </div>
            {addingMatrix ? (
              <form onSubmit={addMatrixRow} className="mt-3 grid gap-2 rounded border border-brand-900/10 bg-brand-50/35 p-2 transition sm:grid-cols-2 lg:grid-cols-[repeat(3,minmax(0,1fr))_140px_auto] lg:items-end">
                {matrixEngineOptions.length ? (
                  <label className="grid min-w-0 gap-1 text-xs font-black uppercase text-ink/50">
                    Engine
                    <input
                      type="text"
                      value={newMatrixEngineCategory}
                      onChange={(event) => setNewMatrixEngineCategory(event.target.value)}
                      list={engineListId}
                      placeholder="Enter engine size"
                      className="min-h-10 min-w-0 rounded border border-brand-900/15 bg-white px-3 text-sm font-bold normal-case text-ink focus-ring"
                    />
                    <datalist id={engineListId}>
                      {matrixEngineOptions.map((option) => <option key={option} value={option} />)}
                    </datalist>
                  </label>
                ) : null}
                {matrixUsageOptions.length ? (
                  <label className="grid min-w-0 gap-1 text-xs font-black uppercase text-ink/50">
                    Use
                    <select
                      value={newMatrixUsage}
                      onChange={(event) => setNewMatrixUsage(event.target.value)}
                      className="min-h-10 min-w-0 rounded border border-brand-900/15 bg-white px-3 text-sm font-bold normal-case text-ink focus-ring"
                    >
                      {matrixUsageOptions.map((option) => <option key={option} value={option}>{formatUsage(option)}</option>)}
                    </select>
                  </label>
                ) : null}
                {matrixStateOptions.length ? (
                  <label className="grid min-w-0 gap-1 text-xs font-black uppercase text-ink/50">
                    State
                    <input
                      type="text"
                      value={newMatrixState}
                      onChange={(event) => setNewMatrixState(event.target.value)}
                      list={stateListId}
                      placeholder="Enter state"
                      className="min-h-10 min-w-0 rounded border border-brand-900/15 bg-white px-3 text-sm font-bold normal-case text-ink focus-ring"
                    />
                    <datalist id={stateListId}>
                      {matrixStateOptions.map((option) => <option key={option} value={option} />)}
                    </datalist>
                  </label>
                ) : null}
                <label className="grid min-w-0 gap-1 text-xs font-black uppercase text-ink/50">
                  Price
                  <input
                    type="number"
                    min={0}
                    value={newMatrixAmount}
                    onChange={(event) => setNewMatrixAmount(event.target.value)}
                    className="min-h-10 min-w-0 rounded border border-brand-900/15 bg-white px-3 text-sm font-black text-ink focus-ring"
                    required
                  />
                </label>
                <span className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={isBusy}
                    className="grid h-10 w-10 place-items-center rounded bg-brand-700 text-white disabled:opacity-50"
                    aria-label="Save new service price"
                    title="Save"
                  >
                    {busyAction === "add-matrix" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={16} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewMatrixAmount("");
                      setAddingMatrix(false);
                    }}
                    className="grid h-10 w-10 place-items-center rounded border border-brand-900/10 bg-white text-ink/70"
                    aria-label="Cancel new service price"
                    title="Cancel"
                  >
                    <X size={16} />
                  </button>
                </span>
              </form>
            ) : null}
          </div>
          {matrix.serviceType === "VEHICLE_PAPER_RENEWAL" && breakdownGroups.length ? (
            <div className="grid gap-3">
              {breakdownGroups.map((group) => (
                <BreakdownGroupEditor
                  key={group.key}
                  group={group}
                  drafts={drafts}
                  isBusy={isBusy}
                  busyAction={busyAction}
                  adding={addingBreakdownKey === group.key}
                  editingId={editingBreakdownId}
                  newDocumentName={newDocumentName}
                  newDocumentAmount={newDocumentAmount}
                  onAddToggle={() => {
                    setEditingBreakdownId(null);
                    setAddingBreakdownKey((current) => current === group.key ? null : group.key);
                  }}
                  onNewDocumentName={setNewDocumentName}
                  onNewDocumentAmount={setNewDocumentAmount}
                  onAdd={(event) => void addBreakdownPrice(event, group)}
                  onCancelAdd={() => {
                    setNewDocumentName("");
                    setNewDocumentAmount("");
                    setAddingBreakdownKey(null);
                  }}
                  onDraft={(id, value) => setDrafts((current) => ({ ...current, [id]: value }))}
                  onEdit={(id) => {
                    setAddingBreakdownKey(null);
                    setEditingBreakdownId(id);
                  }}
                  onCancelEdit={(item) => {
                    setDrafts((current) => ({ ...current, [item.id]: String(item.amount || "") }));
                    setEditingBreakdownId(null);
                  }}
                  onSave={(item) => void saveBreakdownPrice(group, item)}
                  onDelete={(item) => void deleteBreakdownPrice(group, item)}
                />
              ))}
            </div>
          ) : null}
          {matrix.serviceType !== "VEHICLE_PAPER_RENEWAL" || !breakdownGroups.length ? matrixRows.map((row) => {
            const isEditing = editingMatrixId === row.id;
            const label = matrixRowLabel(row, matrix.serviceType);
            return isEditing ? (
              <form
                key={row.id}
                onSubmit={(event) => {
                  event.preventDefault();
                  void saveMatrixRow(row);
                }}
                className="grid gap-3 rounded border border-brand-900/10 bg-brand-50/35 p-3 sm:grid-cols-[minmax(0,1fr)_160px_auto] sm:items-end"
              >
                <div className="min-w-0">
                  <p className="font-black text-ink">{label}</p>
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
                    autoFocus
                  />
                </label>
                <span className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={isBusy}
                    className="grid h-11 w-11 place-items-center rounded bg-brand-700 text-white disabled:opacity-50"
                    aria-label={`Save ${label} price`}
                    title="Save"
                  >
                    {busyAction === `matrix:${row.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={17} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDrafts((current) => ({ ...current, [row.id]: String(row.amount || "") }));
                      setEditingMatrixId(null);
                    }}
                    className="grid h-11 w-11 place-items-center rounded border border-brand-900/10 bg-white text-ink/70"
                    aria-label={`Cancel ${label} edit`}
                    title="Cancel"
                  >
                    <X size={17} />
                  </button>
                </span>
              </form>
            ) : (
              <div key={row.id} className="flex items-center justify-between gap-3 rounded border border-brand-900/10 bg-brand-50/35 p-3">
                <div className="min-w-0">
                  <p className="font-black text-ink">{label}</p>
                  <p className="mt-1 text-xs font-semibold text-ink/50">{row.id.startsWith("new:") ? "Not set yet" : displayPrice(row)}</p>
                </div>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="font-black text-ink">{formatNaira(amountFromDraft(drafts[row.id] || String(row.amount || 0)))}</span>
                  <button
                    type="button"
                    onClick={() => setEditingMatrixId(row.id)}
                    disabled={isBusy}
                    className="grid h-8 w-8 place-items-center rounded text-brand-700 transition hover:bg-white focus-ring disabled:opacity-50"
                    aria-label={`Edit ${label} price`}
                    title="Edit"
                  >
                    <Edit3 size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteMatrixRow(row)}
                    disabled={isBusy}
                    className="grid h-8 w-8 place-items-center rounded text-red-700 transition hover:bg-white focus-ring disabled:opacity-50"
                    aria-label={`Delete ${label}`}
                    title="Delete"
                  >
                    {busyAction === `delete-matrix:${row.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 size={15} />}
                  </button>
                </span>
              </div>
            );
          }) : null}
        </div>

        {status ? <p className="mt-4 text-sm font-bold text-brand-700">{status}</p> : null}
      </div>
    </div>
  );
}

function BreakdownGroupEditor({
  group,
  drafts,
  isBusy,
  busyAction,
  adding,
  editingId,
  newDocumentName,
  newDocumentAmount,
  onAddToggle,
  onNewDocumentName,
  onNewDocumentAmount,
  onAdd,
  onCancelAdd,
  onDraft,
  onEdit,
  onCancelEdit,
  onSave,
  onDelete
}: {
  group: PriceBreakdownGroup;
  drafts: Record<string, string>;
  isBusy: boolean;
  busyAction: string | null;
  adding: boolean;
  editingId: string | null;
  newDocumentName: string;
  newDocumentAmount: string;
  onAddToggle: () => void;
  onNewDocumentName: (value: string) => void;
  onNewDocumentAmount: (value: string) => void;
  onAdd: (event: React.FormEvent<HTMLFormElement>) => void;
  onCancelAdd: () => void;
  onDraft: (id: string, value: string) => void;
  onEdit: (id: string) => void;
  onCancelEdit: (item: AdminPrice) => void;
  onSave: (item: AdminPrice) => void;
  onDelete: (item: AdminPrice) => void;
}) {
  const computedTotal = group.rows.reduce((sum, item) => sum + amountFromDraft(drafts[item.id] || String(item.amount || 0)), 0);

  return (
    <div className="rounded border border-brand-900/10 bg-brand-50/45 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-xs font-black uppercase text-brand-700">{group.title}</p>
          <p className="mt-1 text-xs font-semibold text-ink/50">Total: {formatNaira(computedTotal)}</p>
        </div>
        <button
          type="button"
          onClick={onAddToggle}
          disabled={isBusy}
          className="grid h-8 w-8 shrink-0 place-items-center rounded text-brand-700 transition hover:bg-white focus-ring"
          aria-label={`Add item to ${group.title}`}
          title="Add item"
        >
          <Plus size={16} />
        </button>
      </div>
      {adding ? (
        <form onSubmit={onAdd} className="mt-3 grid gap-2 rounded border border-brand-900/10 bg-white p-2 transition sm:grid-cols-[minmax(0,1fr)_140px_auto] sm:items-end">
          <label className="grid gap-1 text-xs font-black uppercase text-ink/50">
            Item
            <input
              type="text"
              value={newDocumentName}
              onChange={(event) => onNewDocumentName(event.target.value)}
              className="min-h-10 min-w-0 rounded border border-brand-900/15 bg-white px-3 text-sm font-bold normal-case text-ink focus-ring"
              placeholder="Document name"
              required
            />
          </label>
          <label className="grid gap-1 text-xs font-black uppercase text-ink/50">
            Price
            <input
              type="number"
              min={0}
              value={newDocumentAmount}
              onChange={(event) => onNewDocumentAmount(event.target.value)}
              className="min-h-10 min-w-0 rounded border border-brand-900/15 bg-white px-3 text-sm font-black text-ink focus-ring"
              required
            />
          </label>
          <span className="flex items-center gap-2">
            <button
              type="submit"
              disabled={isBusy}
              className="grid h-10 w-10 place-items-center rounded bg-brand-700 text-white disabled:opacity-50"
              aria-label={`Save new item to ${group.title}`}
              title="Save"
            >
              {busyAction === `add:${group.key}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={16} />}
            </button>
            <button
              type="button"
              onClick={onCancelAdd}
              className="grid h-10 w-10 place-items-center rounded border border-brand-900/10 bg-white text-ink/70"
              aria-label={`Cancel new item for ${group.title}`}
              title="Cancel"
            >
              <X size={16} />
            </button>
          </span>
        </form>
      ) : null}
      <div className="mt-3 grid gap-2 text-sm">
        {group.rows.map((item) => {
          const isEditing = editingId === item.id;
          const label = item.serviceName;
          return isEditing ? (
            <form
              key={item.id}
              onSubmit={(event) => {
                event.preventDefault();
                onSave(item);
              }}
              className="grid gap-2 rounded border border-brand-900/10 bg-white p-2 transition sm:grid-cols-[minmax(0,1fr)_140px_auto] sm:items-center"
            >
              <span className="font-semibold text-ink/70">{label}</span>
              <input
                type="number"
                min={0}
                value={drafts[item.id] || ""}
                onChange={(event) => onDraft(item.id, event.target.value)}
                className="min-h-10 min-w-0 rounded border border-brand-900/15 bg-white px-3 text-sm font-black text-ink focus-ring"
                aria-label={`${label} price`}
                autoFocus
              />
              <span className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={isBusy}
                  className="grid h-10 w-10 place-items-center rounded bg-brand-700 text-white disabled:opacity-50"
                  aria-label={`Save ${label} price`}
                  title="Save"
                >
                  {busyAction === `save:${item.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={16} />}
                </button>
                <button
                  type="button"
                  onClick={() => onCancelEdit(item)}
                  className="grid h-10 w-10 place-items-center rounded border border-brand-900/10 bg-white text-ink/70"
                  aria-label={`Cancel ${label} edit`}
                  title="Cancel"
                >
                  <X size={16} />
                </button>
              </span>
            </form>
          ) : (
            <div key={item.id} className="flex items-center justify-between gap-3 rounded px-1 py-1 transition hover:bg-white/70">
              <span className="font-semibold text-ink/62">{label}</span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="font-black text-ink">{formatNaira(amountFromDraft(drafts[item.id] || String(item.amount || 0)))}</span>
                <button
                  type="button"
                  onClick={() => onEdit(item.id)}
                  className="grid h-8 w-8 place-items-center rounded text-brand-700 transition hover:bg-white focus-ring"
                  aria-label={`Edit ${label} price`}
                  title="Edit"
                >
                  <Edit3 size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(item)}
                  disabled={isBusy}
                  className="grid h-8 w-8 place-items-center rounded text-red-700 transition hover:bg-white focus-ring disabled:opacity-50"
                  aria-label={`Delete ${label}`}
                  title="Delete"
                >
                  {busyAction === `delete:${item.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 size={15} />}
                </button>
              </span>
            </div>
          );
        })}
        <div className="mt-2 flex items-center justify-between gap-3 rounded border border-brand-900/10 bg-white p-2">
          <span className="font-black text-ink">Total</span>
          <span className="flex shrink-0 items-center gap-2">
            <span className="font-black text-brand-800">{formatNaira(computedTotal)}</span>
            <span className="rounded bg-brand-50 px-2 py-1 text-[11px] font-black uppercase text-brand-700">Auto</span>
          </span>
        </div>
      </div>
    </div>
  );
}

function priceDescriptor(price: AdminPrice) {
  if (price.serviceType === "NEW_VEHICLE_REGISTRATION") {
    return [price.vehicleType, price.usage, price.state].filter(Boolean).join(" - ") || "General";
  }
  if (nonRegionalPricingServiceTypes.includes(price.serviceType as (typeof nonRegionalPricingServiceTypes)[number])) {
    return [price.vehicleType, price.engineCategory, price.usage, price.location].filter(Boolean).join(" - ") || "General";
  }
  return [price.vehicleType, price.engineCategory, price.usage, price.state, price.location].filter(Boolean).join(" - ") || "General";
}

function displayPrice(price: AdminPrice) {
  if (price.amount === 0 && price.notes) return price.notes;
  return formatNaira(price.amount);
}

function pricePayload(price: AdminPrice, amount: string, active: boolean) {
  return {
    serviceType: price.serviceType,
    serviceName: price.serviceName,
    vehicleType: price.vehicleType || "",
    engineCategory: price.engineCategory || "",
    usage: price.usage || "",
    state: price.state || "",
    location: price.location || "",
    amount,
    active
  };
}

async function responseMessage(response: Response, fallback: string) {
  try {
    const data = await response.json() as { error?: string };
    return data.error || fallback;
  } catch {
    return fallback;
  }
}

function normalizeSavedPrice(saved: AdminPrice, fallback: AdminPrice): AdminPrice {
  return {
    ...fallback,
    ...saved,
    vehicleType: saved.vehicleType ?? fallback.vehicleType ?? null,
    engineCategory: saved.engineCategory ?? fallback.engineCategory ?? null,
    usage: saved.usage ?? fallback.usage ?? null,
    state: saved.state ?? fallback.state ?? null,
    location: saved.location ?? fallback.location ?? null,
    notes: saved.notes ?? fallback.notes ?? null,
    active: saved.active ?? fallback.active ?? true
  };
}

function upsertPriceRow(rows: AdminPrice[], nextRow: AdminPrice) {
  const index = rows.findIndex((row) => row.id === nextRow.id || samePriceKey(row, nextRow));
  if (index === -1) return [...rows, nextRow];
  return rows.map((row, rowIndex) => rowIndex === index ? normalizeSavedPrice(nextRow, row) : row);
}

function samePriceKey(left: AdminPrice, right: AdminPrice) {
  return left.serviceType === right.serviceType &&
    left.serviceName === right.serviceName &&
    sameNullable(left.vehicleType, right.vehicleType) &&
    sameNullable(left.engineCategory, right.engineCategory) &&
    sameNullable(left.usage, right.usage) &&
    sameNullable(left.state, right.state) &&
    sameNullable(left.location, right.location);
}

function groupPrices(prices: AdminPrice[]) {
  const groups = new Map<string, AdminPrice[]>();
  for (const price of prices.filter((item) => item.active !== false)) {
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
    FADED_NUMBER_PLATE_REPRINT: adminVehicleCategories.map((vehicleType) => {
      const rows = buildVehiclePriceRows(prices, "FADED_NUMBER_PLATE_REPRINT", vehicleType);
      return {
        serviceType: "FADED_NUMBER_PLATE_REPRINT",
        vehicleType,
        title: matrixTitleForCategory("FADED_NUMBER_PLATE_REPRINT", vehicleType),
        rows
      };
    }),
    NEW_VEHICLE_REGISTRATION: adminVehicleCategories.map((vehicleType) => {
      const rows = buildVehiclePriceRows(prices, "NEW_VEHICLE_REGISTRATION", vehicleType);
      return {
        serviceType: "NEW_VEHICLE_REGISTRATION",
        vehicleType,
        title: matrixTitleForCategory("NEW_VEHICLE_REGISTRATION", vehicleType),
        rows
      };
    }),
    VEHICLE_PAPER_RENEWAL: adminVehicleCategories.map((vehicleType) => {
      const rows = buildVehiclePriceRows(prices, "VEHICLE_PAPER_RENEWAL", vehicleType);
      return {
        serviceType: "VEHICLE_PAPER_RENEWAL",
        vehicleType,
        title: matrixTitleForCategory("VEHICLE_PAPER_RENEWAL", vehicleType),
        rows,
        breakdownRows: rows.length === 1 ? buildRenewalBreakdownRows(prices, rows[0]) : [],
        breakdownGroups: rows.map((row) => ({
          key: priceIdentity(row),
          title: breakdownGroupTitle(row),
          totalRow: row,
          rows: buildRenewalBreakdownRows(prices, row)
        }))
      };
    })
  };
}

function buildVehiclePriceRows(prices: AdminPrice[], serviceType: string, vehicleType: string): AdminPrice[] {
  const defaultRows = priceVariantsForCategory(serviceType, vehicleType).flatMap((variant) => {
    const defaultAmount = serviceType === "VEHICLE_PAPER_RENEWAL"
      ? defaultRenewalTotal(vehicleType, variant.engineCategory, variant.usage, prices)
      : resolveFleetAmount(serviceType, prices.filter((item) => item.active !== false), vehicleType, variant.engineCategory, variant.usage);
    const row = findOrCreateVirtualPrice(prices, serviceType, vehicleType, variant.engineCategory, variant.state, variant.usage, defaultAmount);
    return row ? [row] : [];
  });
  const seen = new Set(defaultRows.map(priceIdentity));
  const customRows = prices.filter((price) =>
    price.active !== false &&
    price.serviceType === serviceType &&
    price.serviceName === (serviceLabels[serviceType as keyof typeof serviceLabels] || serviceType) &&
    price.vehicleType === vehicleType &&
    !price.location &&
    !seen.has(priceIdentity(price))
  );
  return [...defaultRows, ...customRows];
}

function priceVariantsForCategory(serviceType: string, vehicleType: string) {
  if (serviceType === "FADED_NUMBER_PLATE_REPRINT") {
    return [{ engineCategory: undefined, usage: undefined, state: undefined }];
  }

  const engines = categoryEngineOptions[vehicleType] || [null];
  const needsUsage = ["Car", "SUV", "Bus", "Pickup"].includes(vehicleType);
  const usages = needsUsage ? [...privateCommercialOptions] : [undefined];
  const states = serviceType === "NEW_VEHICLE_REGISTRATION" ? [...statePriceOptions] : [undefined];

  return engines.flatMap((engineCategory) =>
    usages.flatMap((usage) =>
      states.map((state) => ({
        engineCategory: engineCategory === "Motorcycle" || engineCategory === "Tricycle" ? undefined : engineCategory,
        usage,
        state
      }))
    )
  );
}

function findOrCreateVirtualPrice(prices: AdminPrice[], serviceType: string, vehicleType: string, engineCategory?: string, state?: string, usage?: string, defaultAmount = 0): AdminPrice | null {
  const serviceName = serviceLabels[serviceType as keyof typeof serviceLabels] || serviceType;
  const existing = prices.find((price) =>
    price.serviceType === serviceType &&
    price.serviceName === serviceName &&
    price.vehicleType === vehicleType &&
    (engineCategory === undefined ? !price.engineCategory : price.engineCategory === engineCategory) &&
    (state === undefined ? !price.state : price.state === state) &&
    (usage === undefined ? !price.usage : price.usage === usage)
  );
  if (existing?.active === false) return null;
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

function buildRenewalBreakdownRows(prices: AdminPrice[], totalRow: AdminPrice): AdminPrice[] {
  const defaultItems = defaultRenewalBreakdownItems(totalRow);
  const defaultLabels = new Set(defaultItems.map((item) => item.label));
  const rows = defaultItems.flatMap((item) => {
    const existing = prices.find((price) =>
      price.serviceType === "VEHICLE_PAPER_RENEWAL" &&
      price.serviceName === item.label &&
      price.vehicleType === totalRow.vehicleType &&
      sameNullable(price.engineCategory, totalRow.engineCategory) &&
      sameNullable(price.usage, totalRow.usage) &&
      !price.state &&
      !price.location
    );

    if (existing?.active === false) return [];
    if (existing) return [existing];

    return [{
      id: `new:VEHICLE_PAPER_RENEWAL:${totalRow.vehicleType}:${totalRow.engineCategory || "none"}:${totalRow.usage || "none"}:${item.label}`,
      serviceType: "VEHICLE_PAPER_RENEWAL",
      serviceName: item.label,
      vehicleType: totalRow.vehicleType,
      engineCategory: totalRow.engineCategory || null,
      usage: totalRow.usage || null,
      state: null,
      location: null,
      amount: item.amount,
      notes: null
    }];
  });

  const customRows = prices.filter((price) =>
    price.active !== false &&
    price.serviceType === "VEHICLE_PAPER_RENEWAL" &&
    price.vehicleType === totalRow.vehicleType &&
    price.serviceName !== serviceLabels.VEHICLE_PAPER_RENEWAL &&
    !defaultLabels.has(price.serviceName) &&
    sameNullable(price.engineCategory, totalRow.engineCategory) &&
    sameNullable(price.usage, totalRow.usage) &&
    !price.state &&
    !price.location
  );

  return [...rows, ...customRows];
}

function defaultRenewalTotal(vehicleType: string, engineCategory?: string, usage?: string, prices: AdminPrice[] = []) {
  const row = {
    id: "",
    serviceType: "VEHICLE_PAPER_RENEWAL",
    serviceName: serviceLabels.VEHICLE_PAPER_RENEWAL,
    vehicleType,
    engineCategory: engineCategory || null,
    usage: usage || null,
    amount: 0
  };
  const breakdownTotal = defaultRenewalBreakdownItems(row).reduce((sum, item) => sum + item.amount, 0);
  return breakdownTotal || resolveFleetAmount("VEHICLE_PAPER_RENEWAL", prices.filter((item) => item.active !== false), vehicleType, engineCategory, usage);
}

function defaultRenewalBreakdownItems(totalRow: Pick<AdminPrice, "vehicleType" | "engineCategory" | "usage">) {
  if (totalRow.vehicleType === "Pickup") return pickupRenewalBreakdowns;
  const legacyVehicleType = legacyRenewalVehicleType(totalRow);
  return vehiclePaperRenewalBreakdowns[legacyVehicleType as keyof typeof vehiclePaperRenewalBreakdowns] || [];
}

const pickupRenewalBreakdowns = [
  { label: "Vehicle license", amount: 3600 },
  { label: "Radio license", amount: 1000 },
  { label: "Road worthiness", amount: 13500 },
  { label: "Third party insurance", amount: 20000 },
  { label: "Hackney permit", amount: 2500 },
  { label: "Proof of ownership", amount: 1500 }
];

function matrixTitleForCategory(serviceType: string, vehicleType: string) {
  if (serviceType === "FADED_NUMBER_PLATE_REPRINT") return "Reprint price";

  const engines = categoryEngineOptions[vehicleType] || [];
  const engineText = engines.filter((item) => !["Motorcycle", "Tricycle"].includes(item)).join(", ");
  if (serviceType === "NEW_VEHICLE_REGISTRATION") return engineText ? `${engineText} by state and use` : "Prices by state";
  return engineText ? `${engineText} renewal totals` : "Renewal total";
}

function breakdownGroupTitle(row: Pick<AdminPrice, "vehicleType" | "usage" | "engineCategory">) {
  if (row.vehicleType === "Pickup") return `${formatUsage(row.usage) || "Private"} Pickup`;
  return [formatUsage(row.usage), row.vehicleType, row.engineCategory].filter(Boolean).join(" - ") || `${row.vehicleType || "Vehicle"} documents`;
}

function legacyRenewalVehicleType(row: Pick<AdminPrice, "vehicleType" | "usage" | "engineCategory">) {
  const vehicleType = row.vehicleType || "";
  const usage = row.usage || "PRIVATE";
  const engine = row.engineCategory || "";
  if (vehicleType === "Motorcycle") return "MOTORCYCLE";
  if (vehicleType === "Tricycle") return "TRICYCLE";
  if (vehicleType === "Car") return engine.includes("2.1") ? `SALOON CAR (2.1 - 3.0L) ${usage}` : `SALOON CAR (1.6 - 2.0L) ${usage}`;
  if (vehicleType === "SUV" || vehicleType === "Pickup") return `SUV/JEEP/SALOON CAR/PICKUP (3.1 - 12.0L) ${usage}`;
  if (vehicleType === "Bus") return `BUS/COASTER BUS (3.1 - 12.0L) ${usage}`;
  if (vehicleType === "Lorry") return "LORRY/TIPPER/TRACTOR (3.1 - 12.0L)";
  if (vehicleType === "Truck") return "TANKER/TRUCK (3.1 - 12.0L)";
  return vehicleType;
}

function sameNullable(left?: string | null, right?: string | null) {
  return (left || "") === (right || "");
}

function priceIdentity(price: Pick<AdminPrice, "engineCategory" | "usage" | "state">) {
  return [price.engineCategory || "", price.usage || "", price.state || ""].join("|");
}

function uniqueVariantValues<T extends "engineCategory" | "usage" | "state">(
  variants: ReturnType<typeof priceVariantsForCategory>,
  key: T
) {
  return Array.from(new Set(variants.map((variant) => variant[key]).filter(Boolean))) as string[];
}

function amountFromDraft(value: string) {
  const amount = Number.parseInt(value, 10);
  return Number.isFinite(amount) ? amount : 0;
}

function matrixRowLabel(price: AdminPrice, serviceType: string) {
  if (serviceType === "FADED_NUMBER_PLATE_REPRINT") return "Reprint price";
  if (serviceType === "VEHICLE_PAPER_RENEWAL") return [price.engineCategory, formatUsage(price.usage), "Renewal total"].filter(Boolean).join(" - ");
  return [price.engineCategory, formatUsage(price.usage), price.state?.toUpperCase()].filter(Boolean).join(" - ") || price.state || "Price";
}

function usesVehicleMatrix(serviceType: string) {
  return serviceType === "NEW_VEHICLE_REGISTRATION" ||
    serviceType === "VEHICLE_PAPER_RENEWAL" ||
    serviceType === "FADED_NUMBER_PLATE_REPRINT";
}

function formatUsage(usage?: string | null) {
  if (!usage) return "";
  return usage === "PRIVATE" ? "Private" : usage === "COMMERCIAL" ? "Commercial" : usage;
}
