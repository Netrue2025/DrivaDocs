"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/admin", label: "Console" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/pricing", label: "Pricing" },
  { href: "/admin/support", label: "Support" },
  { href: "/admin/content", label: "Home content" }
];

export function AdminShell({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <section className="mx-auto grid w-full max-w-7xl gap-5 px-3 py-5 sm:px-6 sm:py-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-6 lg:px-8">
      <aside className="h-fit min-w-0 rounded border border-brand-900/10 bg-ink p-3 text-white shadow-sm lg:sticky lg:top-24">
        <p className="px-3 py-2 text-sm font-black uppercase text-road">Admin</p>
        <nav className="flex gap-1 overflow-x-auto pb-1 lg:grid lg:overflow-visible lg:pb-0">
          {items.map((item) => {
            const isActive = item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`shrink-0 rounded px-3 py-2 text-sm font-bold transition-colors lg:shrink ${
                  isActive
                    ? "bg-road text-ink"
                    : "text-white/75 hover:bg-white/10 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="min-w-0">
        <div className="mb-5 min-w-0 rounded border border-brand-900/10 bg-white p-4 shadow-sm sm:mb-6 sm:p-5">
          <p className="text-sm font-black uppercase text-brand-700">DrivaDocs operations</p>
          <h1 className="mt-2 break-words text-2xl font-black tracking-tight sm:text-3xl">{title}</h1>
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}
