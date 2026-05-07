"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, Download, Eye, Layers3, X } from "lucide-react";
import { documentUrlFromStorageKey } from "@/lib/document-url";
import { serviceLabels } from "@/lib/pricing-catalog";
import { serviceRequirements, type RequirementField } from "@/lib/service-requirements";

type BulkItem = {
  id: string;
  label?: string;
  amount?: number;
  details?: Record<string, string>;
  files?: Record<string, UploadedFileMeta>;
};

type UploadedFileMeta = { fileName: string; mimeType: string; fileSize: number; storageKey: string; publicUrl?: string };

export function FleetBulkRequestAction({
  requestId,
  title,
  serviceType,
  status,
  requirements
}: {
  requestId: string;
  title: string;
  serviceType: string;
  status: string;
  requirements: Record<string, unknown>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [openItemId, setOpenItemId] = useState("");
  const [items, setItems] = useState<BulkItem[]>(() => normalizeItems(requirements.items));
  const [pendingFiles, setPendingFiles] = useState<Record<string, Record<string, File | undefined>>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const editable = ["DRAFT", "AWAITING_PAYMENT", "PAYMENT_CONFIRMED"].includes(status);
  const fields = serviceRequirements[serviceType as keyof typeof serviceRequirements] || [];

  function updateDetail(itemId: string, name: string, value: string) {
    setItems((current) => current.map((item) => item.id === itemId ? { ...item, details: { ...(item.details || {}), [name]: value } } : item));
  }

  function updateFile(itemId: string, field: RequirementField, file?: File) {
    setPendingFiles((current) => ({ ...current, [itemId]: { ...(current[itemId] || {}), [field.name]: file } }));
    if (file) updateDetail(itemId, field.name, file.name);
  }

  async function save() {
    if (!editable || saving) return;
    setSaving(true);
    setMessage("Saving group details...");
    try {
      const uploaded = await uploadFiles(items, fields, pendingFiles);
      const nextItems = items.map((item) => ({
        ...item,
        files: { ...(item.files || {}), ...(uploaded[item.id] || {}) }
      }));
      const response = await fetch(`/api/fleets/bulk-orders/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: nextItems })
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setMessage(body?.error || "Unable to save group details.");
        return;
      }

      setItems(nextItems);
      setPendingFiles({});
      setMessage("Group details saved.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save group details.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button type="button" onClick={() => { setOpen(true); setOpenItemId(items[0]?.id || ""); }} className="inline-flex items-center gap-2 rounded text-left font-bold text-brand-800 hover:text-brand-600">
        <Layers3 size={16} /> {title}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[95] grid place-items-center bg-ink/70 px-3 py-5 backdrop-blur-sm sm:px-4 sm:py-8">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded border border-white/10 bg-white shadow-soft">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-brand-900/10 bg-white px-4 py-4 sm:px-5">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase text-brand-700">Grouped fleet service</p>
                <h2 className="mt-1 break-words text-xl font-black">{title}</h2>
                <p className="mt-2 text-sm font-semibold text-ink/55">{serviceLabels[serviceType as keyof typeof serviceLabels] || serviceType} - {items.length} nested service{items.length === 1 ? "" : "s"}</p>
                {!editable ? <p className="mt-2 text-sm font-bold text-amber-700">Admin has moved this order into process, so editing is disabled.</p> : null}
              </div>
              <button type="button" onClick={() => setOpen(false)} className="grid h-10 w-10 shrink-0 place-items-center rounded border border-brand-900/15 text-ink" aria-label="Close grouped order">
                <X size={18} />
              </button>
            </div>
            <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[260px_minmax(0,1fr)]">
              <div className="grid content-start gap-2">
                {items.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setOpenItemId(item.id)}
                    className={`rounded border px-3 py-3 text-left text-sm ${openItemId === item.id ? "border-brand-700 bg-brand-50 text-brand-900" : "border-brand-900/10 hover:bg-brand-50"}`}
                  >
                    <span className="block font-black">#{index + 1} {item.label || item.id}</span>
                    <span className="mt-1 block text-xs font-semibold text-ink/50">{item.amount ? `Estimate item saved` : "Nested service"}</span>
                  </button>
                ))}
              </div>
              <div className="min-w-0 rounded border border-brand-900/10">
                {items.map((item) => item.id === openItemId ? (
                  <NestedItemEditor
                    key={item.id}
                    item={item}
                    fields={fields}
                    editable={editable}
                    pendingFiles={pendingFiles[item.id] || {}}
                    onValue={(name, value) => updateDetail(item.id, name, value)}
                    onFile={(field, file) => updateFile(item.id, field, file)}
                  />
                ) : null)}
              </div>
            </div>
            <div className="sticky bottom-0 flex flex-col gap-3 border-t border-brand-900/10 bg-white px-4 py-4 sm:flex-row sm:justify-end sm:px-5">
              {message ? <p className="mr-auto text-sm font-bold text-brand-700">{message}</p> : null}
              <button type="button" onClick={() => setOpen(false)} className="min-h-11 rounded border border-brand-900/15 px-5 font-black">Close</button>
              <button type="button" onClick={save} disabled={!editable || saving} className="min-h-11 rounded bg-brand-700 px-5 font-black text-white disabled:cursor-not-allowed disabled:opacity-45">
                {saving ? "Saving..." : "Save group changes"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function NestedItemEditor({
  item,
  fields,
  editable,
  pendingFiles,
  onValue,
  onFile
}: {
  item: BulkItem;
  fields: RequirementField[];
  editable: boolean;
  pendingFiles: Record<string, File | undefined>;
  onValue: (name: string, value: string) => void;
  onFile: (field: RequirementField, file?: File) => void;
}) {
  const [detailsOpen, setDetailsOpen] = useState(true);
  return (
    <>
      <button type="button" onClick={() => setDetailsOpen((value) => !value)} className="flex w-full items-center justify-between gap-3 border-b border-brand-900/10 px-4 py-3 text-left">
        <span>
          <span className="block text-sm font-black">{item.label || item.id}</span>
          <span className="mt-1 block text-xs font-semibold text-ink/50">Edit service-specific requirements for this nested service</span>
        </span>
        {detailsOpen ? <ChevronDown className="h-5 w-5 shrink-0 text-brand-700" /> : <ChevronRight className="h-5 w-5 shrink-0 text-brand-700" />}
      </button>
      {detailsOpen ? (
        <div className="grid min-w-0 gap-3 p-4 md:grid-cols-2">
          {fields.map((field) => (
            <RequirementInput
              key={field.name}
              field={field}
              value={item.details?.[field.name] || ""}
              uploaded={item.files?.[field.name]}
              pendingFile={pendingFiles[field.name]}
              editable={editable}
              onValue={onValue}
              onFile={onFile}
            />
          ))}
        </div>
      ) : null}
    </>
  );
}

function RequirementInput({
  field,
  value,
  uploaded,
  pendingFile,
  editable,
  onValue,
  onFile
}: {
  field: RequirementField;
  value: string;
  uploaded?: UploadedFileMeta;
  pendingFile?: File;
  editable: boolean;
  onValue: (name: string, value: string) => void;
  onFile: (field: RequirementField, file?: File) => void;
}) {
  if (field.type === "file") {
    return (
      <label className="grid min-w-0 gap-2 rounded bg-brand-50/45 p-3 text-sm font-bold text-ink/75">
        {field.label}
        <input disabled={!editable} type="file" accept={field.accept === "image" ? "image/png,image/jpeg" : "application/pdf,image/png,image/jpeg"} onChange={(event) => onFile(field, event.target.files?.[0])} className="w-full min-w-0 rounded border border-brand-900/15 bg-white p-2 text-sm focus-ring disabled:opacity-50" />
        <span className="text-xs font-semibold text-ink/52">{pendingFile?.name || uploaded?.fileName || value || "No file selected"}</span>
        {uploaded ? (
          <span className="flex gap-2">
            <FileAction href={documentUrlFromStorageKey(uploaded.storageKey)} label="View uploaded document" icon="view" />
          </span>
        ) : null}
      </label>
    );
  }

  return (
    <label className={`grid min-w-0 gap-2 text-sm font-bold text-ink/75 ${field.type === "textarea" ? "md:col-span-2" : ""}`}>
      {field.label}
      {field.type === "textarea" ? (
        <textarea disabled={!editable} value={value} onChange={(event) => onValue(field.name, event.target.value)} rows={3} className="min-w-0 rounded border border-brand-900/15 p-3 focus-ring disabled:opacity-50" />
      ) : (
        <input disabled={!editable} value={value} onChange={(event) => onValue(field.name, event.target.value)} type={field.type || "text"} className="min-h-11 min-w-0 rounded border border-brand-900/15 px-3 focus-ring disabled:opacity-50" />
      )}
    </label>
  );
}

function FileAction({ href, label, icon, download }: { href: string | null; label: string; icon: "view" | "download"; download?: boolean }) {
  const Icon = icon === "view" ? Eye : Download;
  if (!href) {
    return (
      <span title="Document link is unavailable" className="grid h-9 w-9 place-items-center rounded border border-brand-900/10 text-ink/30">
        <Icon size={16} />
      </span>
    );
  }
  return (
    <a href={href} target="_blank" rel="noreferrer" download={download} title={label} aria-label={label} className="grid h-9 w-9 place-items-center rounded border border-brand-900/10 bg-white text-brand-800 hover:bg-brand-50">
      <Icon size={16} />
    </a>
  );
}

function normalizeItems(value: unknown): BulkItem[] {
  if (!Array.isArray(value)) return [];
  return value.reduce<BulkItem[]>((items, item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return items;
    const row = item as Record<string, unknown>;
    const id = typeof row.id === "string" ? row.id : "";
    if (!id) return items;
    items.push({
      id,
      label: typeof row.label === "string" ? row.label : id,
      amount: typeof row.amount === "number" ? row.amount : undefined,
      details: asStringMap(row.details),
      files: asFileMap(row.files)
    });
    return items;
  }, []);
}

function asStringMap(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.entries(value).reduce<Record<string, string>>((map, [key, item]) => {
    if (typeof item === "string") map[key] = item;
    return map;
  }, {});
}

function asFileMap(value: unknown): Record<string, UploadedFileMeta> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.entries(value).reduce<Record<string, UploadedFileMeta>>((map, [key, item]) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return map;
    const row = item as Record<string, unknown>;
    if (typeof row.fileName !== "string" || typeof row.mimeType !== "string" || typeof row.fileSize !== "number" || typeof row.storageKey !== "string") return map;
    map[key] = {
      fileName: row.fileName,
      mimeType: row.mimeType,
      fileSize: row.fileSize,
      storageKey: row.storageKey,
      publicUrl: typeof row.publicUrl === "string" ? row.publicUrl : undefined
    };
    return map;
  }, {});
}

async function uploadFiles(items: BulkItem[], fields: RequirementField[], files: Record<string, Record<string, File | undefined>>) {
  const uploaded: Record<string, Record<string, UploadedFileMeta>> = {};
  for (const item of items) {
    for (const field of fields) {
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
