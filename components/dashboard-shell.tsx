import Link from "next/link";
import { LogOut } from "lucide-react";

const items = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/requests", label: "Services" },
  { href: "/dashboard/requests/new?fresh=1", label: "New Service" },
  { href: "/dashboard/reminders", label: "Reminders" },
  { href: "/dashboard/support", label: "Support" },
  { href: "/dashboard/profile", label: "Profile" }
];

export function DashboardShell({
  children,
  title,
  description
}: {
  children: React.ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <section className="mx-auto grid w-full max-w-7xl gap-5 px-3 py-5 sm:px-6 sm:py-8 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-6 lg:px-8">
      <aside className="h-fit min-w-0 rounded border border-brand-900/10 bg-white p-3 shadow-sm lg:sticky lg:top-24">
        <nav className="flex gap-1 overflow-x-auto pb-1 lg:grid lg:overflow-visible lg:pb-0">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 rounded px-3 py-2 text-sm font-bold text-ink/70 hover:bg-brand-50 hover:text-brand-800 lg:shrink"
            >
              {item.label}
            </Link>
          ))}
          <a href="/api/auth/signout" className="flex shrink-0 items-center gap-2 rounded px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-50 lg:mt-2 lg:shrink">
            <LogOut size={16} /> Logout
          </a>
        </nav>
      </aside>
      <div className="min-w-0">
        <div className="mb-5 min-w-0 rounded border border-brand-900/10 bg-white p-4 shadow-sm sm:mb-6 sm:p-5">
          <p className="text-sm font-black uppercase text-brand-700">DrivaDocs dashboard</p>
          <h1 className="mt-2 break-words text-2xl font-black tracking-tight text-ink sm:text-3xl">{title}</h1>
          {description ? <p className="mt-2 text-ink/65">{description}</p> : null}
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}
