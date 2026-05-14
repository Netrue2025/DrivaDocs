"use client";

import { X } from "lucide-react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { renderGreetingMessage, type GreetingSettings } from "@/lib/greeting-settings";

export function GreetingPopupModal() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [settings, setSettings] = useState<GreetingSettings | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (pathname?.startsWith("/admin")) return;
    let cancelled = false;

    fetch("/api/greeting", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: GreetingSettings | null) => {
        if (!cancelled && payload?.enabled) setSettings(payload);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const userName = session?.user?.name || "";
  const userKey = session?.user?.email || "guest";
  const message = useMemo(() => (settings ? renderGreetingMessage(settings.message, userName) : ""), [settings, userName]);

  useEffect(() => {
    if (!settings || status === "loading") return;

    const today = new Date().toISOString().slice(0, 10);
    const storageKey = `drivadocs:greeting:${today}:${userKey}:${settings.title}:${settings.message}`;
    if (window.localStorage.getItem(storageKey)) return;

    const timer = window.setTimeout(() => {
      window.localStorage.setItem(storageKey, "seen");
      setOpen(true);
    }, Math.max(0, settings.delaySeconds) * 1000);

    return () => window.clearTimeout(timer);
  }, [settings, status, userKey]);

  if (!settings || !open || !message) return null;

  return (
    <div className="fixed inset-0 z-[9000] grid place-items-center bg-ink/45 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="greeting-popup-title">
      <div className="w-full max-w-md rounded border border-brand-900/10 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-brand-900/10 p-5">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-brand-700">DrivaDocs</p>
            <h2 id="greeting-popup-title" className="mt-1 text-2xl font-black text-ink">
              {settings.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="grid h-10 w-10 shrink-0 place-items-center rounded border border-brand-900/10 bg-white text-ink/70 transition hover:bg-brand-50 hover:text-ink focus-ring"
            aria-label="Close greeting"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="grid gap-5 p-5">
          <p className="text-base font-semibold leading-7 text-ink/78">{message}</p>
          <button type="button" onClick={() => setOpen(false)} className="min-h-11 rounded bg-brand-700 px-5 text-sm font-bold text-white transition hover:bg-brand-800 focus-ring">
            Thank you
          </button>
        </div>
      </div>
    </div>
  );
}
