"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type AdminSupportMessageRow = {
  id: string;
  senderRole: string;
  message: string;
  readByAdmin: boolean;
  createdAt: string;
};

export type AdminSupportTicketRow = {
  id: string;
  ticketNo: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  adminReply: string | null;
  createdAt: string;
  updatedAt: string;
  messages: AdminSupportMessageRow[];
};

const statusOptions = ["OPEN", "PENDING", "RESOLVED", "CLOSED"];

export function AdminSupportInbox({ tickets }: { tickets: AdminSupportTicketRow[] }) {
  const router = useRouter();
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [status, setStatus] = useState("OPEN");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const activeTicket = useMemo(
    () => tickets.find((ticket) => ticket.id === activeTicketId) || null,
    [activeTicketId, tickets]
  );

  function openTicket(ticket: AdminSupportTicketRow) {
    setActiveTicketId(ticket.id);
    setStatus(ticket.status);
    setReply("");
    setNotice("");
  }

  async function updateTicket(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeTicket) return;
    setBusy(true);
    setNotice("");
    const response = await fetch(`/api/admin/support/${activeTicket.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminReply: reply, status })
    });
    setBusy(false);
    if (response.ok) {
      setReply("");
      setNotice("Ticket updated.");
      router.refresh();
      return;
    }
    const payload = await response.json().catch(() => null);
    setNotice(payload?.error || "Unable to update ticket.");
  }

  async function deleteTicket(ticket: AdminSupportTicketRow) {
    setBusy(true);
    setNotice("");
    const response = await fetch(`/api/admin/support/${ticket.id}`, { method: "DELETE" });
    setBusy(false);
    if (response.ok) {
      setActiveTicketId(null);
      router.refresh();
      return;
    }
    const payload = await response.json().catch(() => null);
    setNotice(payload?.error || "Unable to delete ticket.");
  }

  return (
    <>
      <section className="rounded border border-brand-900/10 bg-white shadow-sm">
        <div className="border-b border-brand-900/10 p-4 sm:p-5">
          <h2 className="text-xl font-black">Support conversations</h2>
          <p className="mt-1 text-sm font-semibold text-ink/55">Open a ticket to view user replies, respond, update status, or delete closed tickets.</p>
        </div>
        <div className="divide-y divide-brand-900/10">
          {tickets.map((ticket) => {
            const unread = ticket.messages.some((message) => message.senderRole === "USER" && !message.readByAdmin);
            return (
              <button
                key={ticket.id}
                type="button"
                onClick={() => openTicket(ticket)}
                className="flex w-full items-start justify-between gap-4 px-4 py-4 text-left transition hover:bg-brand-50/60 sm:px-5"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-black">{ticket.subject}</p>
                    {unread ? <Badge tone="amber">User reply</Badge> : null}
                  </div>
                  <p className="mt-1 break-words text-sm text-ink/55">{ticket.ticketNo} - {ticket.name} - {ticket.email}</p>
                  <p className="mt-2 line-clamp-2 text-sm text-ink/65">{lastMessage(ticket)}</p>
                </div>
                <Badge tone={ticket.status === "CLOSED" || ticket.status === "RESOLVED" ? "green" : "gray"}>{ticket.status}</Badge>
              </button>
            );
          })}
          {!tickets.length ? <p className="p-5 text-sm font-semibold text-ink/60">No support tickets yet.</p> : null}
        </div>
      </section>

      {activeTicket ? (
        <div className="fixed inset-0 z-[120] grid place-items-center bg-ink/70 px-3 py-5 backdrop-blur-sm sm:px-4 sm:py-8">
          <div className="flex max-h-[92vh] w-full max-w-3xl flex-col rounded border border-white/10 bg-white shadow-soft">
            <div className="flex items-start justify-between gap-4 border-b border-brand-900/10 p-4 sm:p-5">
              <div className="min-w-0">
                <p className="text-sm font-black uppercase text-brand-700">{activeTicket.ticketNo}</p>
                <h2 className="mt-1 break-words text-xl font-black">{activeTicket.subject}</h2>
                <p className="mt-1 text-sm font-semibold text-ink/55">{activeTicket.name} - {activeTicket.email}</p>
              </div>
              <button type="button" onClick={() => setActiveTicketId(null)} className="grid h-10 w-10 shrink-0 place-items-center rounded border border-brand-900/15 text-ink" aria-label="Close support ticket">
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-3 overflow-y-auto p-4 sm:p-5">
              {activeTicket.messages.map((message) => (
                <div key={message.id} className={`max-w-[86%] rounded p-3 text-sm ${message.senderRole === "ADMIN" ? "justify-self-end bg-brand-700 text-white" : "justify-self-start bg-brand-50 text-ink"}`}>
                  <p className="leading-6">{message.message}</p>
                  <p className={`mt-2 text-xs font-bold ${message.senderRole === "ADMIN" ? "text-white/65" : "text-ink/45"}`}>
                    {message.senderRole === "ADMIN" ? "Admin" : "User"} - {new Date(message.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>

            <form onSubmit={updateTicket} className="grid gap-3 border-t border-brand-900/10 p-4 sm:p-5">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
                <label className="grid gap-2 text-sm font-bold text-ink/70">
                  Reply
                  <textarea value={reply} onChange={(event) => setReply(event.target.value)} rows={3} className="rounded border border-brand-900/15 p-3 focus-ring" />
                </label>
                <label className="grid h-fit gap-2 text-sm font-bold text-ink/70">
                  Status
                  <select value={status} onChange={(event) => setStatus(event.target.value)} className="min-h-11 rounded border border-brand-900/15 px-3 focus-ring">
                    {statusOptions.map((option) => <option key={option}>{option}</option>)}
                  </select>
                </label>
              </div>
              {notice ? <p className={notice.includes("Unable") || notice.includes("Only") ? "text-sm font-bold text-red-700" : "text-sm font-bold text-brand-700"}>{notice}</p> : null}
              <div className="flex flex-wrap gap-2">
                <button disabled={busy || (!reply.trim() && status === activeTicket.status)} className="min-h-11 rounded bg-brand-700 px-4 font-black text-white hover:bg-brand-800 disabled:opacity-60">
                  {busy ? "Saving..." : "Save reply/status"}
                </button>
                {activeTicket.status === "CLOSED" ? (
                  <button type="button" onClick={() => deleteTicket(activeTicket)} disabled={busy} className="inline-flex min-h-11 items-center gap-2 rounded border border-red-200 bg-white px-4 font-black text-red-700 hover:bg-red-50 disabled:opacity-60">
                    <Trash2 size={16} /> Delete closed ticket
                  </button>
                ) : null}
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

function lastMessage(ticket: AdminSupportTicketRow) {
  const message = ticket.messages[ticket.messages.length - 1];
  return message?.message || ticket.message;
}
