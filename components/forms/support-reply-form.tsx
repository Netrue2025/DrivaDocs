"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SupportReplyForm({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Sending...");
    const formData = new FormData(event.currentTarget);
    const response = await fetch(`/api/admin/support/${ticketId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminReply: formData.get("adminReply"), status: formData.get("status") })
    });
    setStatus(response.ok ? "Reply saved." : "Unable to save reply.");
    if (response.ok) router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_160px_auto]">
      <input name="adminReply" placeholder="Admin response" className="min-h-11 min-w-0 rounded border border-brand-900/15 px-3 focus-ring" />
      <select name="status" className="min-h-11 min-w-0 rounded border border-brand-900/15 px-3 focus-ring">
        <option>OPEN</option>
        <option>PENDING</option>
        <option>RESOLVED</option>
        <option>CLOSED</option>
      </select>
      <button className="min-h-11 rounded bg-brand-700 px-5 font-bold text-white">Save</button>
      {status ? <p className="text-sm font-bold text-brand-700 md:col-span-3">{status}</p> : null}
    </form>
  );
}
