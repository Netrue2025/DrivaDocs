"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Car, ChevronDown, ChevronRight, IdCard, Send, X } from "lucide-react";
import { resolveFleetAmount } from "@/lib/fleet-pricing";
import { serviceLabels, type PricingItem } from "@/lib/pricing-catalog";
import { serviceRequirements, type RequirementField } from "@/lib/service-requirements";
import { formatNaira, splitPayment } from "@/lib/utils";

type FleetVehicle = {
  id: string;
  label: string;
  meta: string;
  vehicleType: string;
  engineCategory?: string | null;
  usage?: string | null;
};

type FleetDriver = {
  id: string;
  label: string;
  meta: string;
  loggedFields: string[];
};

type BulkPrice = Pick<PricingItem, "serviceType" | "serviceName" | "vehicleType" | "engineCategory" | "usage" | "state" | "amount">;
type Target = "VEHICLE" | "DRIVER";
type SubmissionMode = "PAY" | "PAY_LATER";
type DetailMap = Record<string, Record<string, string>>;
type FileMap = Record<string, Record<string, File | undefined>>;
type UploadedFileMeta = { fileName: string; mimeType: string; fileSize: number; storageKey: string; publicUrl?: string };
type BulkStep = "ITEMS" | "DELIVERY";
type DeliveryMethod = "PHYSICAL_DELIVERY" | "SCAN_TO_ME" | "PICKUP_OFFICE";

const vehicleServices = [
  { value: "VEHICLE_PAPER_RENEWAL", label: "Vehicle paper renewal" },
  { value: "NEW_VEHICLE_REGISTRATION", label: "New vehicle registration" },
  { value: "CHANGE_OF_OWNERSHIP", label: "Change of ownership" },
  { value: "FADED_NUMBER_PLATE_REPRINT", label: "Reprint of faded number plate" }
];

const driverServices = [
  { value: "NEW_DRIVERS_LICENSE", label: "New driver's license" },
  { value: "DRIVERS_LICENSE_RENEWAL", label: "Driver's license renewal" },
  { value: "INTERNATIONAL_DRIVERS_LICENSE", label: "International driver's license" },
  { value: "NEW_MOTORCYCLE_RIDERS_LICENSE", label: "New motorcycle rider's license" },
  { value: "MOTORCYCLE_RIDERS_LICENSE_RENEWAL", label: "Motorcycle rider's license renewal" }
];

const deliveryMethods: { value: DeliveryMethod; label: string }[] = [
  { value: "PHYSICAL_DELIVERY", label: "Physical delivery" },
  { value: "SCAN_TO_ME", label: "Scan to me (online)" },
  { value: "PICKUP_OFFICE", label: "Pickup from our office" }
];

const driverFieldAliases: Record<string, string[]> = {
  address: ["nigerianAddress"],
  phone: ["nigerianPhoneNumber"],
  licenseNo: ["licenseNumber"],
  surname: ["nameOnLicense"],
  firstName: ["nameOnLicense"],
  lastName: ["nameOnLicense"]
};

export function BulkFleetOrderForm({
  vehicles,
  drivers,
  prices = []
}: {
  vehicles: FleetVehicle[];
  drivers: FleetDriver[];
  prices?: BulkPrice[];
}) {
  const router = useRouter();
  const [target, setTarget] = useState<Target>("VEHICLE");
  const [serviceType, setServiceType] = useState(vehicleServices[0].value);
  const [selected, setSelected] = useState<string[]>([]);
  const [details, setDetails] = useState<DetailMap>({});
  const [files, setFiles] = useState<FileMap>({});
  const [busyMode, setBusyMode] = useState<SubmissionMode | null>(null);
  const [message, setMessage] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [openItemId, setOpenItemId] = useState("");
  const [step, setStep] = useState<BulkStep>("ITEMS");
  const [delivery, setDelivery] = useState({
    method: "PHYSICAL_DELIVERY" as DeliveryMethod,
    recipientName: "",
    phone: "",
    addressLine: "",
    city: "",
    stateChoice: "Lagos",
    otherState: "",
    onlineContact: ""
  });
  const options = target === "VEHICLE" ? vehicleServices : driverServices;
  const rows = useMemo(() => (target === "VEHICLE" ? vehicles : drivers), [drivers, target, vehicles]);
  const selectedRows = rows.filter((row) => selected.includes(row.id));
  const requirements = serviceRequirements[serviceType as keyof typeof serviceRequirements] || [];
  const lineItems = selectedRows.map((row) => ({
    id: row.id,
    label: row.label,
    amount: resolveFleetAmount(
      serviceType,
      prices,
      target === "VEHICLE" ? (row as FleetVehicle).vehicleType : undefined,
      target === "VEHICLE" ? (row as FleetVehicle).engineCategory : undefined,
      target === "VEHICLE" ? (row as FleetVehicle).usage : undefined
    ),
    requirements: getRequirementsForRow(requirements, target, row)
  }));
  const total = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const split = splitPayment(total);

  function switchTarget(nextTarget: Target) {
    setTarget(nextTarget);
    setServiceType(nextTarget === "VEHICLE" ? vehicleServices[0].value : driverServices[0].value);
    setSelected([]);
    setDetails({});
    setFiles({});
    setMessage("");
    setReviewOpen(false);
    setOpenItemId("");
    setStep("ITEMS");
  }

  function toggle(id: string) {
    setSelected((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      if (!openItemId && next.length) setOpenItemId(next[0]);
      return next;
    });
  }

  function updateDetail(itemId: string, name: string, value: string) {
    setDetails((current) => ({ ...current, [itemId]: { ...(current[itemId] || {}), [name]: value } }));
  }

  function updateFile(itemId: string, field: RequirementField, file?: File) {
    setFiles((current) => ({ ...current, [itemId]: { ...(current[itemId] || {}), [field.name]: file } }));
    if (file) updateDetail(itemId, field.name, file.name);
  }

  function continueToDelivery() {
    if (!selected.length) {
      setMessage("Select at least one item first.");
      return;
    }
    const missing = findMissingRequirement(lineItems, details, files);
    if (missing) {
      setMessage(`Complete ${missing.field.label} for ${missing.item.label}.`);
      setOpenItemId(missing.item.id);
      return;
    }
    setMessage("");
    setStep("DELIVERY");
  }

  function openReview() {
    const deliveryState = delivery.stateChoice === "Others State" ? delivery.otherState.trim() : delivery.stateChoice;
    if (delivery.method === "PHYSICAL_DELIVERY" && (!delivery.phone.trim() || !delivery.addressLine.trim() || !delivery.city.trim() || !deliveryState)) {
      setMessage("Complete the fleet delivery details first.");
      return;
    }
    if (delivery.method === "SCAN_TO_ME" && !delivery.onlineContact.trim()) {
      setMessage("Enter the WhatsApp number or email for online document delivery.");
      return;
    }
    setMessage("");
    setOpenItemId(lineItems[0]?.id || "");
    setReviewOpen(true);
  }

  async function submit(mode: SubmissionMode) {
    if (!selected.length) return;
    const missing = findMissingRequirement(lineItems, details, files);
    if (missing) {
      setMessage(`Complete ${missing.field.label} for ${missing.item.label}.`);
      setOpenItemId(missing.item.id);
      setReviewOpen(false);
      return;
    }

    setBusyMode(mode);
    setMessage(mode === "PAY" ? "Creating order and preparing payment..." : "Saving bulk order...");
    try {
      const uploaded = await uploadBulkFiles(lineItems, files);
      const response = await fetch("/api/fleets/bulk-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target,
          serviceType,
          ids: selected,
          submissionMode: mode,
          details,
          files: uploaded,
          deliveryAddress: {
            recipientName: delivery.recipientName,
            phone: delivery.method === "PHYSICAL_DELIVERY" ? delivery.phone : delivery.method === "SCAN_TO_ME" ? delivery.onlineContact : "Office pickup",
            addressLine: delivery.method === "PHYSICAL_DELIVERY" ? delivery.addressLine : delivery.method === "SCAN_TO_ME" ? "Scan to me (online)" : "Pickup from our office",
            city: delivery.method === "PHYSICAL_DELIVERY" ? delivery.city : delivery.method === "SCAN_TO_ME" ? "Online" : "Office pickup",
            state: delivery.stateChoice === "Others State" ? delivery.otherState.trim() : delivery.stateChoice,
            deliveryMethod: delivery.method
          }
        })
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setMessage(payload?.error || "Unable to create bulk order.");
        return;
      }

      if (mode === "PAY") {
        const paymentForm = document.createElement("form");
        paymentForm.method = "post";
        paymentForm.action = "/api/payments/initialize";
        addHidden(paymentForm, "serviceRequestId", payload.requestId);
        addHidden(paymentForm, "paymentType", "UPFRONT_75");
        document.body.appendChild(paymentForm);
        paymentForm.submit();
        return;
      }

      setMessage(`Bulk order saved for ${payload?.count || selected.length} fleet item${(payload?.count || selected.length) === 1 ? "" : "s"}.`);
      setSelected([]);
      setDetails({});
      setFiles({});
      setDelivery({ method: "PHYSICAL_DELIVERY", recipientName: "", phone: "", addressLine: "", city: "", stateChoice: "Lagos", otherState: "", onlineContact: "" });
      setStep("ITEMS");
      setReviewOpen(false);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create bulk order.");
    } finally {
      setBusyMode(null);
    }
  }

  return (
    <section className="min-w-0 rounded border border-brand-900/10 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black uppercase text-brand-700">Bulk service order</p>
          <h2 className="mt-1 text-xl font-black">Start one request for multiple fleet items</h2>
        </div>
        <div className="grid grid-cols-2 rounded bg-brand-50 p-1">
          <TargetButton active={target === "VEHICLE"} onClick={() => switchTarget("VEHICLE")} icon="vehicle" label="Vehicles" />
          <TargetButton active={target === "DRIVER"} onClick={() => switchTarget("DRIVER")} icon="driver" label="Drivers" />
        </div>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <button type="button" onClick={() => setStep("ITEMS")} className={`rounded px-3 py-3 text-sm font-black ${step === "ITEMS" ? "bg-brand-700 text-white" : "bg-brand-50 text-brand-800"}`}>
          1. Services
        </button>
        <button type="button" onClick={() => lineItems.length && setStep("DELIVERY")} className={`rounded px-3 py-3 text-sm font-black ${step === "DELIVERY" ? "bg-brand-700 text-white" : "bg-brand-50 text-brand-800"}`}>
          2. Delivery & review
        </button>
      </div>

      {step === "ITEMS" ? (
        <>
      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <label className="grid min-w-0 gap-2 text-sm font-bold text-ink/75">
          Service type
          <select
            value={serviceType}
            onChange={(event) => {
              setServiceType(event.target.value);
              setDetails({});
              setFiles({});
            }}
            className="min-h-11 min-w-0 rounded border border-brand-900/15 bg-white px-3 focus-ring"
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="min-w-0 rounded border border-brand-900/10">
          <div className="border-b border-brand-900/10 bg-brand-50 px-3 py-2 text-sm font-black text-ink/70">
            Select {target === "VEHICLE" ? "vehicles" : "drivers"}
          </div>
          <div className="max-h-72 overflow-y-auto p-2">
            {rows.map((row) => (
              <label key={row.id} className="flex min-w-0 cursor-pointer items-start gap-3 rounded p-3 hover:bg-brand-50">
                <input type="checkbox" checked={selected.includes(row.id)} onChange={() => toggle(row.id)} className="mt-1 h-4 w-4 shrink-0 rounded border-brand-900/20" />
                <span className="min-w-0">
                  <span className="block break-words text-sm font-black text-ink">{row.label}</span>
                  <span className="mt-1 block break-words text-xs font-semibold text-ink/50">{row.meta}</span>
                </span>
              </label>
            ))}
            {!rows.length ? <p className="rounded bg-brand-50 p-4 text-sm font-semibold text-ink/60">Add {target === "VEHICLE" ? "vehicles" : "drivers"} first, then start a bulk order.</p> : null}
          </div>
        </div>
      </div>

      {lineItems.length ? (
        <div className="mt-5 rounded border border-brand-900/10">
          <div className="border-b border-brand-900/10 bg-brand-50 px-3 py-2 text-sm font-black text-ink/70">Service details for each selected item</div>
          <div className="grid gap-2 p-2">
            {lineItems.map((item, index) => (
              <ItemRequirements
                key={item.id}
                item={item}
                index={index}
                open={openItemId === item.id}
                requirements={item.requirements}
                values={details[item.id] || {}}
                files={files[item.id] || {}}
                onOpen={() => setOpenItemId(openItemId === item.id ? "" : item.id)}
                onValue={(name, value) => updateDetail(item.id, name, value)}
                onFile={(field, file) => updateFile(item.id, field, file)}
              />
            ))}
          </div>
        </div>
      ) : null}
        </>
      ) : null}

      {step === "DELIVERY" ? (
        <div className="mt-5 grid min-w-0 gap-4 rounded border border-brand-900/10 p-4 md:grid-cols-2">
          <p className="text-sm font-black uppercase text-brand-700 md:col-span-2">Universal fleet delivery</p>
          <label className="grid min-w-0 gap-2 text-sm font-bold text-ink/75 md:col-span-2">
            Delivery option
            <select value={delivery.method} onChange={(event) => setDelivery((current) => ({ ...current, method: event.target.value as DeliveryMethod }))} className="min-h-11 min-w-0 rounded border border-brand-900/15 bg-white px-3 focus-ring">
              {deliveryMethods.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <DeliveryInput label="Recipient name" value={delivery.recipientName} onChange={(value) => setDelivery((current) => ({ ...current, recipientName: value }))} />
          {delivery.method === "PHYSICAL_DELIVERY" ? (
            <>
              <DeliveryInput label="Recipient phone" value={delivery.phone} onChange={(value) => setDelivery((current) => ({ ...current, phone: value }))} required />
              <DeliveryInput label="City" value={delivery.city} onChange={(value) => setDelivery((current) => ({ ...current, city: value }))} required />
              <label className="grid min-w-0 gap-2 text-sm font-bold text-ink/75">
                Delivery state
                <select value={delivery.stateChoice} onChange={(event) => setDelivery((current) => ({ ...current, stateChoice: event.target.value, otherState: "" }))} className="min-h-11 min-w-0 rounded border border-brand-900/15 bg-white px-3 focus-ring">
                  <option>Lagos</option>
                  <option>Oyo</option>
                  <option>Others State</option>
                </select>
              </label>
              {delivery.stateChoice === "Others State" ? (
                <DeliveryInput label="Other delivery state" value={delivery.otherState} onChange={(value) => setDelivery((current) => ({ ...current, otherState: value }))} required />
              ) : null}
              <label className="grid min-w-0 gap-2 text-sm font-bold text-ink/75 md:col-span-2">
                Delivery address
                <textarea value={delivery.addressLine} onChange={(event) => setDelivery((current) => ({ ...current, addressLine: event.target.value }))} rows={3} className="min-w-0 rounded border border-brand-900/15 p-3 focus-ring" />
              </label>
            </>
          ) : delivery.method === "SCAN_TO_ME" ? (
            <DeliveryInput label="WhatsApp number or email" value={delivery.onlineContact} onChange={(value) => setDelivery((current) => ({ ...current, onlineContact: value }))} required />
          ) : (
            <div className="rounded border border-road/35 bg-road/10 p-4 text-sm font-semibold leading-6 text-ink/72 md:col-span-2">
              Delivery fee is removed. Our team will notify you when the fleet documents are ready for office pickup.
            </div>
          )}
        </div>
      ) : null}

      {message ? <p className="mt-4 text-sm font-bold text-brand-700">{message}</p> : null}
      <button type="button" onClick={step === "ITEMS" ? continueToDelivery : openReview} disabled={Boolean(busyMode) || !rows.length} className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded bg-brand-700 px-5 font-bold text-white hover:bg-brand-800 disabled:opacity-60 sm:w-auto">
        <Send size={16} /> {step === "ITEMS" ? "Continue to delivery" : "Create bulk request"}
      </button>

      {reviewOpen ? (
        <BulkReviewModal
          serviceName={serviceLabels[serviceType as keyof typeof serviceLabels] || serviceType}
          target={target}
          lineItems={lineItems}
          total={total}
          upfront={split.upfront}
          balance={split.balance}
          busyMode={busyMode}
          onClose={() => setReviewOpen(false)}
          onSave={() => submit("PAY_LATER")}
          onPay={() => submit("PAY")}
        />
      ) : null}
    </section>
  );
}

function TargetButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: "vehicle" | "driver"; label: string }) {
  const Icon = icon === "vehicle" ? Car : IdCard;
  return (
    <button type="button" onClick={onClick} className={`inline-flex min-h-10 items-center justify-center gap-2 rounded px-3 text-sm font-black ${active ? "bg-white text-brand-800 shadow-sm" : "text-ink/55"}`}>
      <Icon size={16} /> {label}
    </button>
  );
}

function DeliveryInput({
  label,
  value,
  onChange,
  required
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="grid min-w-0 gap-2 text-sm font-bold text-ink/75">
      {label} {required ? <span className="text-red-700">*</span> : null}
      <input value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 min-w-0 rounded border border-brand-900/15 px-3 focus-ring" />
    </label>
  );
}

function ItemRequirements({
  item,
  index,
  open,
  requirements,
  values,
  files,
  onOpen,
  onValue,
  onFile
}: {
  item: { id: string; label: string; amount: number };
  index: number;
  open: boolean;
  requirements: RequirementField[];
  values: Record<string, string>;
  files: Record<string, File | undefined>;
  onOpen: () => void;
  onValue: (name: string, value: string) => void;
  onFile: (field: RequirementField, file?: File) => void;
}) {
  return (
    <div className="rounded border border-brand-900/10">
      <button type="button" onClick={onOpen} className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left">
        <span className="min-w-0">
          <span className="block text-sm font-black text-ink">#{index + 1} {item.label}</span>
          <span className="mt-1 block text-xs font-semibold text-ink/50">{formatNaira(item.amount)}</span>
        </span>
        {open ? <ChevronDown className="h-5 w-5 shrink-0 text-brand-700" /> : <ChevronRight className="h-5 w-5 shrink-0 text-brand-700" />}
      </button>
      {open ? (
        <div className="grid min-w-0 gap-3 border-t border-brand-900/10 p-3 md:grid-cols-2">
          {requirements.map((field) => (
            <RequirementInput key={field.name} field={field} value={values[field.name] || ""} file={files[field.name]} onValue={onValue} onFile={onFile} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function RequirementInput({
  field,
  value,
  file,
  onValue,
  onFile
}: {
  field: RequirementField;
  value: string;
  file?: File;
  onValue: (name: string, value: string) => void;
  onFile: (field: RequirementField, file?: File) => void;
}) {
  if (field.type === "file") {
    const accept = field.accept === "image" ? "image/png,image/jpeg" : "application/pdf,image/png,image/jpeg";
    return (
      <label className="grid min-w-0 gap-2 rounded bg-brand-50/45 p-3 text-sm font-bold text-ink/75">
        {field.label} {field.required ? <span className="text-red-700">*</span> : null}
        <input type="file" accept={accept} onChange={(event) => onFile(field, event.target.files?.[0])} className="w-full min-w-0 rounded border border-brand-900/15 bg-white p-2 text-sm focus-ring" />
        <span className="text-xs font-semibold text-ink/52">{file ? file.name : value || "PDF, JPG, or PNG, max 5MB."}</span>
      </label>
    );
  }

  return (
    <label className={`grid min-w-0 gap-2 text-sm font-bold text-ink/75 ${field.type === "textarea" ? "md:col-span-2" : ""}`}>
      {field.label} {field.required ? <span className="text-red-700">*</span> : null}
      {field.type === "textarea" ? (
        <textarea value={value} onChange={(event) => onValue(field.name, event.target.value)} rows={3} className="min-w-0 rounded border border-brand-900/15 p-3 focus-ring" />
      ) : (
        <input value={value} onChange={(event) => onValue(field.name, event.target.value)} type={field.type || "text"} className="min-h-11 min-w-0 rounded border border-brand-900/15 px-3 focus-ring" />
      )}
    </label>
  );
}

function BulkReviewModal({
  serviceName,
  target,
  lineItems,
  total,
  upfront,
  balance,
  busyMode,
  onClose,
  onSave,
  onPay
}: {
  serviceName: string;
  target: Target;
  lineItems: { id: string; label: string; amount: number }[];
  total: number;
  upfront: number;
  balance: number;
  busyMode: SubmissionMode | null;
  onClose: () => void;
  onSave: () => void;
  onPay: () => void;
}) {
  const isBusy = Boolean(busyMode);

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-ink/70 px-3 py-5 backdrop-blur-sm sm:px-4 sm:py-8">
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded border border-white/10 bg-white p-4 shadow-soft sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-black uppercase text-brand-700">Bulk request total</p>
            <h2 className="mt-2 break-words text-xl font-black sm:text-2xl">{serviceName}</h2>
          </div>
          <button type="button" onClick={onClose} disabled={isBusy} className="grid h-10 w-10 shrink-0 place-items-center rounded border border-brand-900/15 text-ink disabled:opacity-60" aria-label="Close bulk order review">
            <X size={18} />
          </button>
        </div>
        <div className="mt-5 max-h-64 overflow-y-auto rounded border border-brand-900/10">
          {lineItems.map((item) => (
            <div key={item.id} className="flex items-start justify-between gap-3 border-b border-brand-900/10 p-3 text-sm last:border-b-0">
              <span className="min-w-0 break-words font-bold">{item.label}</span>
              <span className="shrink-0 font-black">{formatNaira(item.amount)}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-2 rounded bg-brand-50 p-4 text-sm">
          <PaymentLine label={`${lineItems.length} ${target === "VEHICLE" ? "vehicle" : "driver"}${lineItems.length === 1 ? "" : "s"}`} value={total} strong />
          <PaymentLine label="75% upfront" value={upfront} />
          <PaymentLine label="25% balance" value={balance} />
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <button type="button" onClick={onClose} disabled={isBusy} className="min-h-11 rounded border border-brand-900/15 px-4 font-black disabled:opacity-60">Cancel</button>
          <button type="button" onClick={onSave} disabled={isBusy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded bg-brand-50 px-4 font-black text-brand-800 disabled:opacity-60">
            {busyMode === "PAY_LATER" ? <ButtonSpinner /> : null}
            {busyMode === "PAY_LATER" ? "Saving..." : "Save to pay later"}
          </button>
          <button type="button" onClick={onPay} disabled={isBusy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded bg-brand-700 px-4 font-black text-white disabled:opacity-60">
            {busyMode === "PAY" ? <ButtonSpinner /> : null}
            {busyMode === "PAY" ? "Preparing..." : "Pay now"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PaymentLine({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-semibold text-ink/62">{label}</span>
      <span className={strong ? "text-lg font-black text-brand-800" : "font-black text-ink"}>{formatNaira(value)}</span>
    </div>
  );
}

function ButtonSpinner() {
  return <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" />;
}

function getRequirementsForRow(requirements: RequirementField[], target: Target, row: FleetVehicle | FleetDriver) {
  if (target !== "DRIVER") return requirements;
  const loggedFields = new Set<string>();
  for (const field of (row as FleetDriver).loggedFields || []) {
    loggedFields.add(field);
    for (const alias of driverFieldAliases[field] || []) loggedFields.add(alias);
  }
  return requirements.filter((field) => !loggedFields.has(field.name));
}

function findMissingRequirement(items: { id: string; label: string; requirements: RequirementField[] }[], details: DetailMap, files: FileMap) {
  for (const item of items) {
    for (const field of item.requirements) {
      if (!field.required) continue;
      if (field.type === "file") {
        if (!files[item.id]?.[field.name] && !details[item.id]?.[field.name]?.trim()) return { item, field };
      } else if (!details[item.id]?.[field.name]?.trim()) {
        return { item, field };
      }
    }
  }
  return null;
}

async function uploadBulkFiles(items: { id: string; requirements: RequirementField[] }[], files: FileMap) {
  const uploaded: Record<string, Record<string, UploadedFileMeta>> = {};
  for (const item of items) {
    for (const field of item.requirements) {
      const file = files[item.id]?.[field.name];
      if (!file) continue;
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/uploads", { method: "POST", body: formData });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || `Unable to upload ${field.label}`);
      }
      const body = await response.json();
      uploaded[item.id] = {
        ...(uploaded[item.id] || {}),
        [field.name]: {
          fileName: body.fileName,
          mimeType: body.mimeType,
          fileSize: body.fileSize,
          storageKey: body.storageKey,
          publicUrl: body.publicUrl
        }
      };
    }
  }
  return uploaded;
}

function addHidden(form: HTMLFormElement, name: string, value: string) {
  const input = document.createElement("input");
  input.type = "hidden";
  input.name = name;
  input.value = value;
  form.appendChild(input);
}
