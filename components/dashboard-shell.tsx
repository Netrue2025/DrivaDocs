"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bell,
  ClipboardList,
  FilePlus2,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Settings,
  UserRound,
  Wrench
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type MobileGroupKey = "services" | "tools" | "settings";
type MobileGroupLink = { href: string; label: string; icon: LucideIcon; danger?: boolean };
type MobileGroup = { title: string; description: string; links: MobileGroupLink[] };

const desktopItems = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/requests", label: "Services" },
  { href: "/dashboard/requests/new?fresh=1", label: "New Service" },
  { href: "/dashboard/reminders", label: "Reminders" },
  { href: "/dashboard/support", label: "Support" },
  { href: "/dashboard/profile", label: "Profile" }
];

const mobileGroups: Record<MobileGroupKey, MobileGroup> = {
  services: {
    title: "Services",
    description: "Manage current services or start a new one.",
    links: [
      { href: "/dashboard/requests", label: "My services", icon: ClipboardList },
      { href: "/dashboard/requests/new?fresh=1", label: "New service", icon: FilePlus2 }
    ]
  },
  tools: {
    title: "Tools",
    description: "Reminders and support for active requests.",
    links: [
      { href: "/dashboard/reminders", label: "Reminders", icon: Bell },
      { href: "/dashboard/support", label: "Support", icon: LifeBuoy }
    ]
  },
  settings: {
    title: "Settings",
    description: "Profile and account access.",
    links: [
      { href: "/dashboard/profile", label: "Profile", icon: UserRound },
      { href: "/api/auth/signout", label: "Logout", icon: LogOut, danger: true }
    ]
  }
};

export function DashboardShell({
  children,
  title,
  description
}: {
  children: React.ReactNode;
  title: string;
  description?: string;
}) {
  const pathname = usePathname();
  const [activeGroup, setActiveGroup] = useState<MobileGroupKey | null>(null);
  const [pendingHref, setPendingHref] = useState("");

  useEffect(() => {
    setActiveGroup(null);
    setPendingHref("");
  }, [pathname]);

  return (
    <>
      <section className="mx-auto grid w-full max-w-7xl gap-5 px-3 py-5 pb-28 sm:px-6 sm:py-8 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-6 lg:px-8 lg:pb-8">
        <aside className="hidden h-fit min-w-0 rounded border border-brand-900/10 bg-white p-3 shadow-sm lg:sticky lg:top-24 lg:block">
          <nav className="grid gap-1">
            {desktopItems.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded px-3 py-2 text-sm font-bold transition ${
                    active ? "bg-brand-700 text-white" : "text-ink/70 hover:bg-brand-50 hover:text-brand-800"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <a href="/api/auth/signout" className="mt-2 flex items-center gap-2 rounded px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-50">
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

      <MobileDashboardNav
        pathname={pathname}
        activeGroup={activeGroup}
        onGroup={setActiveGroup}
        pendingHref={pendingHref}
        onPendingHref={setPendingHref}
      />
    </>
  );
}

function MobileDashboardNav({
  pathname,
  activeGroup,
  onGroup,
  pendingHref,
  onPendingHref
}: {
  pathname: string;
  activeGroup: MobileGroupKey | null;
  onGroup: (group: MobileGroupKey | null) => void;
  pendingHref: string;
  onPendingHref: (href: string) => void;
}) {
  const activePanel = activeGroup ? mobileGroups[activeGroup] : null;
  const routeServiceActive = !activeGroup && isServicePath(pathname);
  const routeToolActive = !activeGroup && isToolPath(pathname);
  const routeSettingsActive = !activeGroup && isSettingsPath(pathname);

  return (
    <>
      {activePanel ? (
        <div className="fixed inset-x-3 bottom-24 z-[70] lg:hidden">
          <div className="rounded border border-brand-900/10 bg-white p-3 shadow-soft">
            <div className="px-1">
              <p className="text-sm font-black text-ink">{activePanel.title}</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-ink/55">{activePanel.description}</p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {activePanel.links.map((item) => {
                const Icon = item.icon;
                const isPending = pendingHref === item.href;
                const content = (
                  <>
                    {isPending ? <MenuSpinner className={item.danger ? "text-red-700" : "text-brand-700"} /> : <Icon className={item.danger ? "text-red-700" : "text-brand-700"} size={20} />}
                    <span className={item.danger ? "text-red-700" : ""}>{item.label}</span>
                  </>
                );
                const className = `flex min-h-16 items-center gap-3 rounded border border-brand-900/10 bg-brand-50/55 px-3 text-sm font-black text-ink shadow-sm transition ${isPending ? "opacity-75 ring-2 ring-brand-700/20" : "active:scale-[0.98]"}`;

                return item.danger ? (
                  <a key={item.href} href={item.href} onClick={() => onPendingHref(item.href)} className={className} aria-busy={isPending}>
                    {content}
                  </a>
                ) : (
                  <Link key={item.href} href={item.href} onClick={() => onPendingHref(item.href)} className={className} aria-busy={isPending}>
                    {content}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      <nav className="fixed inset-x-3 bottom-3 z-[70] grid grid-cols-4 gap-1 rounded border border-brand-900/10 bg-white/95 p-2 shadow-soft backdrop-blur lg:hidden">
        <BottomLink href="/dashboard" label="Overview" icon={LayoutDashboard} active={!activeGroup && pathname === "/dashboard"} onClick={() => onGroup(null)} />
        <BottomButton label="Services" icon={ClipboardList} active={activeGroup === "services" || routeServiceActive} onClick={() => onGroup(activeGroup === "services" ? null : "services")} />
        <BottomButton label="Tools" icon={Wrench} active={activeGroup === "tools" || routeToolActive} onClick={() => onGroup(activeGroup === "tools" ? null : "tools")} />
        <BottomButton label="Settings" icon={Settings} active={activeGroup === "settings" || routeSettingsActive} onClick={() => onGroup(activeGroup === "settings" ? null : "settings")} />
      </nav>
    </>
  );
}

function MenuSpinner({ className = "" }: { className?: string }) {
  return <span className={`h-5 w-5 animate-spin rounded-full border-2 border-current border-r-transparent ${className}`} aria-hidden="true" />;
}

function BottomLink({
  href,
  label,
  icon: Icon,
  active,
  onClick
}: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`grid min-h-14 place-items-center rounded px-1 text-[11px] font-black ${active ? "bg-brand-700 text-white" : "text-ink/62"}`}
    >
      <Icon size={20} />
      <span>{label}</span>
    </Link>
  );
}

function BottomButton({
  label,
  icon: Icon,
  active,
  onClick
}: {
  label: string;
  icon: typeof ClipboardList;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`grid min-h-14 place-items-center rounded px-1 text-[11px] font-black ${active ? "bg-brand-700 text-white" : "text-ink/62"}`}
    >
      <Icon size={20} />
      <span>{label}</span>
    </button>
  );
}

function isActivePath(pathname: string, href: string) {
  const cleanHref = href.split("?")[0];
  if (cleanHref === "/dashboard") return pathname === cleanHref;
  if (cleanHref === "/dashboard/requests") return pathname === cleanHref;
  return pathname === cleanHref || pathname.startsWith(`${cleanHref}/`);
}

function isServicePath(pathname: string) {
  return pathname.startsWith("/dashboard/requests");
}

function isToolPath(pathname: string) {
  return pathname.startsWith("/dashboard/reminders") || pathname.startsWith("/dashboard/support");
}

function isSettingsPath(pathname: string) {
  return pathname.startsWith("/dashboard/profile");
}
