"use client";

import { ChevronDown, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type TestimonialRow = {
  id: string;
  name: string;
  role: string | null;
  company: string | null;
  quote: string;
  rating: number;
  published: boolean;
};

type FaqRow = {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  sortOrder: number;
  published: boolean;
};

type Status = {
  tone: "success" | "error";
  message: string;
} | null;

export function AdminContentManager({
  testimonials,
  faqs
}: {
  testimonials: TestimonialRow[];
  faqs: FaqRow[];
}) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>(null);
  const [busy, setBusy] = useState(false);
  const [testimonialsOpen, setTestimonialsOpen] = useState(false);
  const [faqsOpen, setFaqsOpen] = useState(true);
  const [showNewTestimonial, setShowNewTestimonial] = useState(false);
  const [showNewFaq, setShowNewFaq] = useState(false);

  async function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setStatus(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const response = await fetch("/api/admin/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(formData.entries()))
    });

    if (response.ok) {
      if (formData.get("action") === "create") {
        form.reset();
        setShowNewTestimonial(false);
        setShowNewFaq(false);
      }
      setStatus({ tone: "success", message: "Home content updated." });
      router.refresh();
    } else {
      const payload = await response.json().catch(() => null);
      setStatus({ tone: "error", message: payload?.error || "Unable to update content." });
    }
    setBusy(false);
  }

  async function deleteItem(type: "testimonial" | "faq", id: string) {
    setBusy(true);
    setStatus(null);
    const response = await fetch("/api/admin/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", type, id })
    });
    setStatus(response.ok ? { tone: "success", message: "Item removed." } : { tone: "error", message: "Unable to remove item." });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="grid gap-6">
      {status ? (
        <p className={status.tone === "success" ? "rounded bg-brand-50 p-3 text-sm font-bold text-brand-800" : "rounded bg-red-50 p-3 text-sm font-bold text-red-700"}>
          {status.message}
        </p>
      ) : null}

      <section className="rounded border border-brand-900/10 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 p-4 sm:p-5">
          <button
            type="button"
            onClick={() => setTestimonialsOpen((current) => !current)}
            className="flex min-w-0 items-center gap-2 text-left text-xl font-black"
            aria-expanded={testimonialsOpen}
          >
            <ChevronDown className={`h-5 w-5 shrink-0 transition ${testimonialsOpen ? "rotate-0" : "-rotate-90"}`} />
            <span>Testimonials</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTestimonialsOpen(true);
              setShowNewTestimonial((current) => !current);
            }}
            className="grid h-10 w-10 place-items-center rounded bg-brand-700 text-white hover:bg-brand-800"
            aria-label="Add testimony"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
        {testimonialsOpen ? (
          <div className="grid gap-3 border-t border-brand-900/10 p-4 sm:p-5">
            {showNewTestimonial ? <TestimonialForm action="create" onSubmit={submitForm} disabled={busy} /> : null}
            {testimonials.length ? testimonials.map((item) => (
              <details key={item.id} className="rounded border border-brand-900/10 bg-brand-50/55">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 font-black">
                  <span>{item.name}</span>
                  <span className="text-xs font-bold uppercase text-brand-700">{item.published ? "Published" : "Hidden"}</span>
                </summary>
                <div className="border-t border-brand-900/10 p-4">
                  <TestimonialForm action="update" item={item} onSubmit={submitForm} onDelete={() => deleteItem("testimonial", item.id)} disabled={busy} />
                </div>
              </details>
            )) : (
              <p className="rounded bg-brand-50 p-4 text-sm font-semibold text-ink/65">No testimonials yet.</p>
            )}
          </div>
        ) : null}
      </section>

      <section className="rounded border border-brand-900/10 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 p-4 sm:p-5">
          <button
            type="button"
            onClick={() => setFaqsOpen((current) => !current)}
            className="flex min-w-0 items-center gap-2 text-left text-xl font-black"
            aria-expanded={faqsOpen}
          >
            <ChevronDown className={`h-5 w-5 shrink-0 transition ${faqsOpen ? "rotate-0" : "-rotate-90"}`} />
            <span>Frequently asked questions</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setFaqsOpen(true);
              setShowNewFaq((current) => !current);
            }}
            className="grid h-10 w-10 place-items-center rounded bg-brand-700 text-white hover:bg-brand-800"
            aria-label="Add FAQ"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
        {faqsOpen ? (
          <div className="grid gap-3 border-t border-brand-900/10 p-4 sm:p-5">
            {showNewFaq ? <FaqForm action="create" onSubmit={submitForm} disabled={busy} /> : null}
            {faqs.length ? faqs.map((item) => (
              <details key={item.id} className="rounded border border-brand-900/10 bg-brand-50/55">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 font-black">
                  <span>{item.question}</span>
                  <span className="text-xs font-bold uppercase text-brand-700">{item.published ? "Published" : "Hidden"}</span>
                </summary>
                <div className="border-t border-brand-900/10 p-4">
                  <FaqForm action="update" item={item} onSubmit={submitForm} onDelete={() => deleteItem("faq", item.id)} disabled={busy} />
                </div>
              </details>
            )) : (
              <p className="rounded bg-brand-50 p-4 text-sm font-semibold text-ink/65">No FAQs yet.</p>
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function TestimonialForm({
  action,
  item,
  onSubmit,
  onDelete,
  disabled
}: {
  action: "create" | "update";
  item?: TestimonialRow;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onDelete?: () => void;
  disabled: boolean;
}) {
  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <input type="hidden" name="type" value="testimonial" />
      <input type="hidden" name="action" value={action} />
      {item ? <input type="hidden" name="id" value={item.id} /> : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-black">{action === "create" ? "Add testimony" : "Edit testimony"}</p>
        <label className="flex items-center gap-2 text-sm font-bold text-ink/65">
          <input type="checkbox" name="published" value="true" defaultChecked={item?.published ?? true} className="h-4 w-4 rounded border-brand-900/20" />
          Published
        </label>
      </div>
      <Input name="name" label="Name" defaultValue={item?.name || ""} required />
      <label className="grid gap-2 text-sm font-bold text-ink/75">
        Testimony
        <textarea name="quote" rows={3} defaultValue={item?.quote || ""} required className="rounded border border-brand-900/15 p-3 focus-ring" />
      </label>
      <Input name="rating" label="Rating" type="number" min={1} max={5} defaultValue={String(item?.rating || 5)} required />
      <FormButtons action={action} disabled={disabled} onDelete={onDelete} />
    </form>
  );
}

function FaqForm({
  action,
  item,
  onSubmit,
  onDelete,
  disabled
}: {
  action: "create" | "update";
  item?: FaqRow;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onDelete?: () => void;
  disabled: boolean;
}) {
  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <input type="hidden" name="type" value="faq" />
      <input type="hidden" name="action" value={action} />
      <input type="hidden" name="sortOrder" value={item?.sortOrder || 0} />
      {item ? <input type="hidden" name="id" value={item.id} /> : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-black">{action === "create" ? "Add FAQ" : "Edit FAQ"}</p>
        <label className="flex items-center gap-2 text-sm font-bold text-ink/65">
          <input type="checkbox" name="published" value="true" defaultChecked={item?.published ?? true} className="h-4 w-4 rounded border-brand-900/20" />
          Published
        </label>
      </div>
      <Input name="question" label="Question" defaultValue={item?.question || ""} required />
      <label className="grid gap-2 text-sm font-bold text-ink/75">
        Answer
        <textarea name="answer" rows={3} defaultValue={item?.answer || ""} required className="rounded border border-brand-900/15 p-3 focus-ring" />
      </label>
      <FormButtons action={action} disabled={disabled} onDelete={onDelete} />
    </form>
  );
}

function FormButtons({
  action,
  disabled,
  onDelete
}: {
  action: "create" | "update";
  disabled: boolean;
  onDelete?: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button type="submit" disabled={disabled} className="min-h-10 rounded bg-brand-700 px-4 text-sm font-bold text-white hover:bg-brand-800 disabled:opacity-60">
        {action === "create" ? "Add" : "Save"}
      </button>
      {onDelete ? (
        <button type="button" onClick={onDelete} disabled={disabled} className="min-h-10 rounded border border-red-200 bg-white px-4 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-60">
          Delete
        </button>
      ) : null}
    </div>
  );
}

function Input({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-ink/75">
      {label}
      <input {...props} className="min-h-10 rounded border border-brand-900/15 px-3 focus-ring" />
    </label>
  );
}
