"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BadgeDollarSign,
  FileText,
  Headphones,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  Settings,
  ShieldCheck,
  UsersRound,
  Wrench
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type AdminGroupKey = "manage" | "support" | "settings";
type AdminGroupLink = { href: string; label: string; icon: LucideIcon; danger?: boolean };
type AdminGroup = { title: string; description: string; links: AdminGroupLink[] };

const desktopItems = [
  { href: "/admin", label: "Console" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/pricing", label: "Pricing" },
  { href: "/admin/support", label: "Support" },
  { href: "/admin/content", label: "Home content" },
  { href: "/dashboard/profile", label: "Profile" }
];

const adminGroups: Record<AdminGroupKey, AdminGroup> = {
  manage: {
    title: "Manage",
    description: "Users, prices, and homepage content.",
    links: [
      { href: "/admin/users", label: "Users", icon: UsersRound },
      { href: "/admin/pricing", label: "Pricing", icon: BadgeDollarSign },
      { href: "/admin/content", label: "Home content", icon: FileText }
    ]
  },
  support: {
    title: "Support",
    description: "Review customer conversations and tickets.",
    links: [
      { href: "/admin/support", label: "Tickets", icon: MessageSquareText }
    ]
  },
  settings: {
    title: "Settings",
    description: "Admin account actions.",
    links: [
      { href: "/dashboard/profile", label: "Profile", icon: ShieldCheck },
      { href: "/api/auth/signout", label: "Logout", icon: LogOut, danger: true }
    ]
  }
};

export function AdminShell({
  title: providedTitle,
  children
}: {
  title?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [activeGroup, setActiveGroup] = useState<AdminGroupKey | null>(null);
  const [pendingHref, setPendingHref] = useState("");
  const title = providedTitle || titleForPath(pathname);

  useEffect(() => {
    setActiveGroup(null);
    setPendingHref("");
  }, [pathname]);

  useEffect(() => {
    for (const item of desktopItems) {
      router.prefetch(item.href);
    }
  }, [router]);

  return (
    <>
      <section className="mx-auto grid w-full max-w-7xl gap-5 px-3 py-5 pb-28 sm:px-6 sm:py-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-6 lg:px-8 lg:pb-8">
        <aside className="hidden h-fit min-w-0 rounded border border-brand-900/10 bg-ink p-3 text-white shadow-sm lg:sticky lg:top-24 lg:block">
          <p className="px-3 py-2 text-sm font-black uppercase text-road">Admin</p>
          <nav className="grid gap-1">
            {desktopItems.map((item) => {
              const isActive = item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded px-3 py-2 text-sm font-bold transition-colors ${
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

      <MobileAdminNav
        pathname={pathname}
        activeGroup={activeGroup}
        onGroup={setActiveGroup}
        pendingHref={pendingHref}
        onPendingHref={setPendingHref}
      />
    </>
  );
}

function MobileAdminNav({
  pathname,
  activeGroup,
  onGroup,
  pendingHref,
  onPendingHref
}: {
  pathname: string;
  activeGroup: AdminGroupKey | null;
  onGroup: (group: AdminGroupKey | null) => void;
  pendingHref: string;
  onPendingHref: (href: string) => void;
}) {
  const activePanel = activeGroup ? adminGroups[activeGroup] : null;

  return (
    <>
      {activePanel ? (
        <div className="fixed inset-x-3 bottom-24 z-[70] lg:hidden">
          <div className="rounded border border-brand-900/10 bg-white p-3 shadow-soft">
            <div className="px-1">
              <p className="text-sm font-black text-ink">{activePanel.title}</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-ink/55">{activePanel.description}</p>
            </div>
            <div className={`mt-3 grid gap-2 ${activePanel.links.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
              {activePanel.links.map((item) => {
                const Icon = item.icon;
                const isPending = pendingHref === item.href;
                const className = `flex min-h-16 items-center gap-3 rounded border border-brand-900/10 bg-brand-50/55 px-3 text-sm font-black text-ink shadow-sm transition ${isPending ? "opacity-75 ring-2 ring-ink/15" : "active:scale-[0.98]"}`;
                const content = (
                  <>
                    {isPending ? <MenuSpinner className={item.danger ? "text-red-700" : "text-brand-700"} /> : <Icon className={item.danger ? "text-red-700" : "text-brand-700"} size={20} />}
                    <span className={item.danger ? "text-red-700" : ""}>{item.label}</span>
                  </>
                );

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
        <BottomLink href="/admin" label="Console" icon={LayoutDashboard} active={pathname === "/admin"} />
        <BottomButton label="Manage" icon={Wrench} active={isManagePath(pathname) || activeGroup === "manage"} onClick={() => onGroup(activeGroup === "manage" ? null : "manage")} />
        <BottomButton label="Support" icon={Headphones} active={pathname.startsWith("/admin/support") || activeGroup === "support"} onClick={() => onGroup(activeGroup === "support" ? null : "support")} />
        <BottomButton label="Settings" icon={Settings} active={activeGroup === "settings"} onClick={() => onGroup(activeGroup === "settings" ? null : "settings")} />
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
  active
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`grid min-h-14 place-items-center rounded px-1 text-[11px] font-black ${active ? "bg-ink text-road" : "text-ink/62"}`}
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
  icon: LucideIcon;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`grid min-h-14 place-items-center rounded px-1 text-[11px] font-black ${active ? "bg-ink text-road" : "text-ink/62"}`}
    >
      <Icon size={20} />
      <span>{label}</span>
    </button>
  );
}

function isManagePath(pathname: string) {
  return pathname.startsWith("/admin/users") || pathname.startsWith("/admin/pricing") || pathname.startsWith("/admin/content");
}

function titleForPath(pathname: string) {
  if (pathname.startsWith("/admin/users")) return "User management";
  if (pathname.startsWith("/admin/pricing")) return "Service price management";
  if (pathname.startsWith("/admin/support")) return "Support tickets";
  if (pathname.startsWith("/admin/content")) return "Home content management";
  if (pathname.startsWith("/dashboard/profile")) return "Profile";
  return "Admin console";
}
