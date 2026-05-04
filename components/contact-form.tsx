"use client";

import { signIn, useSession } from "next-auth/react";
import { useRef, useState } from "react";
import { X } from "lucide-react";

type Status = "idle" | "loading" | "success" | "error";
type PendingTicket = {
  name: string;
  subject: string;
  message: string;
};

export function ContactForm() {
  const { data: session, status: authStatus, update } = useSession();
  const formRef = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [pendingTicket, setPendingTicket] = useState<PendingTicket | null>(null);
  const [authError, setAuthError] = useState("");
  const isLoggedIn = authStatus === "authenticated";

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const ticket = {
      name: String(formData.get("name") || ""),
      subject: String(formData.get("subject") || ""),
      message: String(formData.get("message") || "")
    };

    if (!isLoggedIn) {
      setPendingTicket(ticket);
      return;
    }

    const sent = await submitTicket(ticket, session?.user.email || "");
    if (sent) event.currentTarget.reset();
  }

  async function submitTicket(ticket: PendingTicket, email: string) {
    setStatus("loading");
    setMessage("");
    const response = await fetch("/api/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...ticket, email })
    });

    if (response.ok) {
      setStatus("success");
      setMessage("Message sent. We will respond shortly.");
      return true;
    }

    const payload = await response.json().catch(() => null);
    setStatus("error");
    setMessage(payload?.error || "Unable to submit ticket. Please check the details and try again.");
    return false;
  }

  async function continueWithAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pendingTicket) return;

    setStatus("loading");
    setAuthError("");
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") || "").toLowerCase().trim();
    const password = String(formData.get("password") || "");

    const signupResponse = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: pendingTicket.name,
        email,
        password,
        accountType: "INDIVIDUAL"
      })
    });

    if (!signupResponse.ok && signupResponse.status !== 409) {
      setStatus("error");
      setAuthError("Unable to create your quick account. Check your details and try again.");
      return;
    }

    const loginResponse = await signIn("credentials", {
      email,
      password,
      redirect: false
    });

    if (loginResponse?.error) {
      setStatus("error");
      setAuthError(signupResponse.status === 409 ? "This email already has an account. Enter the correct password to continue." : "Unable to log you in after signup.");
      return;
    }

    await update();
    const sent = await submitTicket(pendingTicket, email);
    if (sent) {
      setPendingTicket(null);
      formRef.current?.reset();
    }
  }

  return (
    <>
      <form ref={formRef} onSubmit={onSubmit} className="rounded border border-brand-900/10 bg-white p-5 shadow-sm">
        <div className="grid gap-4">
          <Input name="name" label="Full name" required />
          <Input name="subject" label="Subject" required />
          <label className="grid gap-2 text-sm font-bold text-ink/75">
            Message
            <textarea name="message" rows={6} required className="rounded border border-brand-900/15 p-3 focus-ring" />
          </label>
          {message ? <p className={status === "success" ? "text-sm font-bold text-brand-700" : "text-sm font-bold text-red-700"}>{message}</p> : null}
          <button type="submit" disabled={status === "loading"} className="min-h-11 rounded bg-brand-700 px-5 font-bold text-white hover:bg-brand-800 disabled:opacity-60">
            {status === "loading" ? "Submitting..." : "Send message"}
          </button>
        </div>
      </form>

      {pendingTicket ? (
        <div className="fixed inset-0 z-[120] grid place-items-center bg-ink/70 px-3 py-5 backdrop-blur-sm sm:px-4 sm:py-8">
          <div className="w-full max-w-md rounded border border-white/10 bg-white p-5 shadow-soft sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase text-brand-700">Continue support</p>
                <h2 className="mt-2 text-2xl font-black">Quick sign up or login</h2>
              </div>
              <button type="button" onClick={() => setPendingTicket(null)} className="grid h-10 w-10 place-items-center rounded border border-brand-900/15 text-ink" aria-label="Close quick signup">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={continueWithAuth} className="mt-5 grid gap-4">
              <Input name="email" label="Email" type="email" required />
              <Input name="password" label="Password" type="password" required minLength={8} />
              {authError ? <p className="text-sm font-bold text-red-700">{authError}</p> : null}
              <button disabled={status === "loading"} className="min-h-11 rounded bg-brand-700 px-5 font-bold text-white hover:bg-brand-800 disabled:opacity-60">
                {status === "loading" ? "Continuing..." : "Continue and send"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Input({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-ink/75">
      {label}
      <input {...props} className="min-h-11 rounded border border-brand-900/15 px-3 focus-ring" />
    </label>
  );
}
