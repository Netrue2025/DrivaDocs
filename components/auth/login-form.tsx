"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";

export function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await signIn("credentials", {
      email: form.get("email"),
      password: form.get("password"),
      callbackUrl,
      redirect: false
    });

    if (response?.error) {
      setLoading(false);
      setError("Invalid email or password.");
      return;
    }

    window.location.assign(response?.url || callbackUrl);
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 grid gap-4">
      <label className="grid gap-2 text-sm font-bold text-ink/75">
        Email
        <input name="email" type="email" required className="min-h-11 rounded border border-brand-900/15 px-3 focus-ring" />
      </label>
      <label className="grid gap-2 text-sm font-bold text-ink/75">
        Password
        <input name="password" type="password" required className="min-h-11 rounded border border-brand-900/15 px-3 focus-ring" />
      </label>
      {error ? <p className="text-sm font-bold text-red-700">{error}</p> : null}
      <button className="min-h-11 rounded bg-brand-700 px-5 font-bold text-white hover:bg-brand-800 disabled:opacity-60" disabled={loading}>
        {loading ? "Logging in..." : "Log in"}
      </button>
      <p className="text-sm text-ink/60">
        New to DrivaDocs?{" "}
        <Link href={`/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="font-bold text-brand-700">
          Create an account
        </Link>
      </p>
    </form>
  );
}
