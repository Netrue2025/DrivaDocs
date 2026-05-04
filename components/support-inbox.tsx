"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type SupportMessageRow = {
  id: string;
  senderRole: string;
  message: string;
  readByUser: boolean;
  createdAt: string;
};

export type SupportTicketRow = {
  id: string;
  ticketNo: string;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  messages: SupportMessageRow[];
};

export function SupportInbox({
  tickets,
  openTicketId
}: {
  tickets: SupportTicketRow[];
  openTicketId?: string | null;
}) {
  const router = useRouter();
  const [activeTicketId, setActiveTicketId] = useState(openTicketId || null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const activeTicket = useMemo(
    () => tickets.find((ticket) => ticket.id === activeTicketId) || null,
    [activeTicketId, tickets]
  );

  useEffect(() => {
    if (openTicketId) setActiveTicketId(openTicketId);
  }, [openTicketId]);

  useEffect(() => {
    if (!activeTicket) return;
    fetch(`/api/support/${activeTicket.id}/read`, { method: "PATCH" }).catch(() => null);
  }, [activeTicket]);

  async function submitReply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeTicket || !reply.trim()) return;
    setBusy(true);
    const response = await fetch(`/api/support/${activeTicket.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: reply })
    });
    setBusy(false);
    if (response.ok) {
      setReply("");
      router.refresh();
    }
  }

  function closeModal() {
    setActiveTicketId(null);
    router.replace("/dashboard/support");
  }

  return (
    <>
      <section className="rounded border border-brand-900/10 bg-white shadow-sm">
        <div className="border-b border-brand-900/10 p-4 sm:p-5">
          <h2 className="text-xl font-black">Support history</h2>
          <p className="mt-1 text-sm font-semibold text-ink/55">Open old conversations or continue a support chat.</p>
        </div>
        <div className="divide-y divide-brand-900/10">
          {tickets.map((ticket) => {
            const unread = ticket.messages.some((message) => message.senderRole === "ADMIN" && !message.readByUser);
            return (
              <button
                key={ticket.id}
                type="button"
                onClick={() => setActiveTicketId(ticket.id)}
                className="flex w-full items-start justify-between gap-4 px-4 py-4 text-left transition hover:bg-brand-50/60 sm:px-5"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-black">{ticket.subject}</p>
                    {unread ? <Badge tone="amber">New reply</Badge> : null}
                  </div>
                  <p className="mt-1 text-sm text-ink/55">{ticket.ticketNo} - {new Date(ticket.updatedAt).toLocaleString()}</p>
                  <p className="mt-2 line-clamp-2 text-sm text-ink/65">{lastMessage(ticket)}</p>
                </div>
                <Badge tone={ticket.status === "RESOLVED" || ticket.status === "CLOSED" ? "green" : "gray"}>{ticket.status}</Badge>
              </button>
            );
          })}
          {!tickets.length ? (
            <p className="p-5 text-sm font-semibold text-ink/60">No support conversations yet.</p>
          ) : null}
        </div>
      </section>

      {activeTicket ? (
        <div className="fixed inset-0 z-[120] grid place-items-center bg-ink/70 px-3 py-5 backdrop-blur-sm sm:px-4 sm:py-8">
          <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded border border-white/10 bg-white shadow-soft">
            <div className="flex items-start justify-between gap-4 border-b border-brand-900/10 p-4 sm:p-5">
              <div className="min-w-0">
                <p className="text-sm font-black uppercase text-brand-700">{activeTicket.ticketNo}</p>
                <h2 className="mt-1 break-words text-xl font-black">{activeTicket.subject}</h2>
              </div>
              <button type="button" onClick={closeModal} className="grid h-10 w-10 shrink-0 place-items-center rounded border border-brand-900/15 text-ink" aria-label="Close support message">
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-3 overflow-y-auto p-4 sm:p-5">
              {activeTicket.messages.map((message) => (
                <div key={message.id} className={`max-w-[86%] rounded p-3 text-sm ${message.senderRole === "ADMIN" ? "justify-self-start bg-brand-50 text-ink" : "justify-self-end bg-brand-700 text-white"}`}>
                  <p className="leading-6">{message.message}</p>
                  <p className={`mt-2 text-xs font-bold ${message.senderRole === "ADMIN" ? "text-ink/45" : "text-white/65"}`}>
                    {message.senderRole === "ADMIN" ? "Support" : "You"} - {new Date(message.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>

            <form onSubmit={submitReply} className="grid gap-3 border-t border-brand-900/10 p-4 sm:p-5">
              <label className="grid gap-2 text-sm font-bold text-ink/70">
                Reply
                <textarea value={reply} onChange={(event) => setReply(event.target.value)} rows={3} className="rounded border border-brand-900/15 p-3 focus-ring" />
              </label>
              <button disabled={busy || !reply.trim()} className="min-h-11 rounded bg-brand-700 px-4 font-black text-white hover:bg-brand-800 disabled:opacity-60">
                {busy ? "Sending..." : "Send reply"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

function lastMessage(ticket: SupportTicketRow) {
  const message = ticket.messages[ticket.messages.length - 1];
  return message?.message || ticket.message;
}
