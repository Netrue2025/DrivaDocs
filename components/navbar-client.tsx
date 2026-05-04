"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { Mail, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

type NavItem = {
  href: string;
  label: string;
};

type ProfileSummary = {
  name: string | null;
  email: string | null;
  image: string | null;
  updatedAt?: string;
};

type SupportUnread = {
  count: number;
  latestTicketId: string | null;
};

export function NavbarClient({
  navItems
}: {
  navItems: NavItem[];
}) {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [supportUnread, setSupportUnread] = useState<SupportUnread>({ count: 0, latestTicketId: null });
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";
  const profileLabel = profile?.name || session?.user.name || profile?.email || session?.user.email || "Dashboard";
  const profileImage = profile?.image || session?.user.image || null;
  const profileImageSrc = profileImage
    ? `${profileImage}${profileImage.includes("?") ? "&" : "?"}v=${encodeURIComponent(profile?.updatedAt || "session")}`
    : null;
  const supportHref = supportUnread.latestTicketId
    ? `/dashboard/support?open=${supportUnread.latestTicketId}`
    : "/dashboard/support";

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      if (!isAuthenticated) {
        setProfile(null);
        return;
      }

      const response = await fetch("/api/profile", { cache: "no-store" }).catch(() => null);
      if (!response?.ok) return;
      const payload = await response.json().catch(() => null);
      if (!cancelled && payload) setProfile(payload);
    }

    async function loadUnreadSupport() {
      if (!isAuthenticated) {
        setSupportUnread({ count: 0, latestTicketId: null });
        return;
      }

      const response = await fetch("/api/support/unread", { cache: "no-store" }).catch(() => null);
      if (!response?.ok) return;
      const payload = await response.json().catch(() => null);
      if (!cancelled && payload) {
        setSupportUnread({ count: payload.count || 0, latestTicketId: payload.latestTicketId || null });
      }
    }

    loadProfile();
    loadUnreadSupport();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, pathname]);

  return (
    <header className="sticky top-0 z-50 border-b border-brand-900/10 bg-white/92 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center" aria-label="DrivaDocs home">
          <Image
            src="/images/drivadocs-logo.png"
            alt="DrivaDocs"
            width={210}
            height={63}
            priority
            className="h-11 w-auto"
          />
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-semibold text-ink/75 md:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="transition hover:text-brand-700">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          {isAuthenticated ? (
            <ProfileAction href="/dashboard" image={profileImageSrc} label={profileLabel} unreadCount={supportUnread.count} unreadHref={supportHref} />
          ) : (
            <>
              <NavAction href="/login" tone="plain">
                Log in
              </NavAction>
              <NavAction href="/signup" tone="solid">
                Get Started
              </NavAction>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="grid h-10 w-10 place-items-center rounded border border-brand-900/10 bg-white text-brand-800 shadow-sm transition hover:bg-brand-50 md:hidden"
          aria-label="Toggle navigation menu"
          aria-expanded={open}
          aria-controls="mobile-navigation"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      <div
        id="mobile-navigation"
        className={`md:hidden ${
          open ? "grid grid-rows-[1fr] border-t border-brand-900/10" : "grid grid-rows-[0fr]"
        } overflow-hidden bg-white transition-[grid-template-rows] duration-300`}
      >
        <div className="overflow-hidden">
          <nav className="mx-auto grid max-w-7xl gap-1 px-4 py-4 sm:px-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded px-3 py-3 text-sm font-bold text-ink/75 transition hover:bg-brand-50 hover:text-brand-800"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-3 grid gap-2 border-t border-brand-900/10 pt-4">
              {isAuthenticated ? (
                <ProfileAction href="/dashboard" image={profileImageSrc} label={profileLabel} unreadCount={supportUnread.count} unreadHref={supportHref} mobile />
              ) : (
                <>
                  <NavAction href="/login" tone="plain" className="w-full">
                    Log in
                  </NavAction>
                  <NavAction href="/signup" tone="solid" className="w-full">
                    Get Started
                  </NavAction>
                </>
              )}
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}

function ProfileAction({
  href,
  image,
  label,
  unreadCount,
  unreadHref,
  mobile = false
}: {
  href: string;
  image?: string | null;
  label: string;
  unreadCount: number;
  unreadHref: string;
  mobile?: boolean;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const initials = label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "DD";

  useEffect(() => {
    setImageFailed(false);
  }, [image]);

  return (
    <div className={`relative inline-flex ${mobile ? "w-full" : ""}`}>
      <Link
        href={href}
        className={`inline-flex min-h-11 items-center gap-3 rounded border border-brand-900/10 bg-white px-3 py-2 text-sm font-black text-ink shadow-sm transition hover:border-brand-700/30 hover:bg-brand-50 focus-ring ${mobile ? "w-full justify-start" : ""}`}
        aria-label="Open dashboard"
      >
        {image && !imageFailed ? (
          <img src={image} alt="" onError={() => setImageFailed(true)} className="h-9 w-9 rounded-full object-cover ring-2 ring-road/70" />
        ) : (
          <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-700 text-xs text-white ring-2 ring-road/70">
            {initials}
          </span>
        )}
        <span className={mobile ? "truncate pr-8" : "sr-only"}>{mobile ? label : "Dashboard"}</span>
      </Link>
      {unreadCount > 0 ? (
        <Link
          href={unreadHref}
          className={`absolute grid h-7 w-7 place-items-center rounded-full bg-road text-ink shadow-md ring-2 ring-white animate-support-envelope ${mobile ? "right-3 top-2" : "-right-2 -top-2"}`}
          aria-label={`${unreadCount} unread support message${unreadCount === 1 ? "" : "s"}`}
          title="Unread support message"
        >
          <Mail className="h-4 w-4" />
        </Link>
      ) : null}
    </div>
  );
}

function NavAction({
  href,
  children,
  tone,
  className = ""
}: {
  href: string;
  children: React.ReactNode;
  tone: "plain" | "solid";
  className?: string;
}) {
  const toneClass =
    tone === "solid"
      ? "bg-brand-700 text-white hover:text-road"
      : "bg-white text-brand-800 ring-1 ring-brand-900/10 hover:text-brand-600";

  return (
    <Link
      href={href}
      className={`inline-flex min-h-11 items-center justify-center rounded px-5 text-sm font-bold transition-colors focus-ring ${toneClass} ${className}`}
    >
      {children}
    </Link>
  );
}
