"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";

type AccountType = "INDIVIDUAL" | "BUSINESS";

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const [accountType, setAccountType] = useState<AccountType>("INDIVIDUAL");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, accountType })
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error || "Unable to create account.");
        setLoading(false);
        return;
      }

      await signIn("credentials", {
        email: payload.email,
        password: payload.password,
        redirect: false
      });

      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError("Unable to reach the server. Please check your connection and try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 grid gap-4">
      <div className="grid grid-cols-2 gap-2 rounded bg-brand-50 p-1">
        {(["INDIVIDUAL", "BUSINESS"] as AccountType[]).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setAccountType(type)}
            className={`min-h-11 rounded px-3 text-sm font-black ${accountType === type ? "bg-white text-brand-800 shadow-sm" : "text-ink/60"}`}
          >
            {type === "INDIVIDUAL" ? "Individual" : "Business/Fleet"}
          </button>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Input name="name" label="Full name" required />
        <Input name="email" label="Email" type="email" required />
        <Input name="phone" label="Phone number" />
        <Input name="password" label="Password" type="password" minLength={8} required />
      </div>
      {accountType === "BUSINESS" ? (
        <div className="grid gap-4 rounded border border-brand-900/10 bg-brand-50/40 p-4 md:grid-cols-2">
          <Input name="companyName" label="Company name" required />
          <Input name="contactPerson" label="Contact person" />
          <label className="grid gap-2 text-sm font-bold text-ink/75 md:col-span-2">
            Office address
            <textarea name="officeAddress" required rows={3} className="rounded border border-brand-900/15 p-3 focus-ring" />
          </label>
        </div>
      ) : null}
      {error ? <p className="text-sm font-bold text-red-700">{error}</p> : null}
      <button className="min-h-11 rounded bg-brand-700 px-5 font-bold text-white hover:bg-brand-800 disabled:opacity-60" disabled={loading}>
        {loading ? "Creating account..." : "Create account"}
      </button>
      <p className="text-sm text-ink/60">
        Already have an account?{" "}
        <Link href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="font-bold text-brand-700">
          Log in
        </Link>
      </p>
    </form>
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
