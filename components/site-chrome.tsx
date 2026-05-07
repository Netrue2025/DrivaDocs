"use client";

import { usePathname } from "next/navigation";
import { AuthSessionProvider } from "@/components/auth-session-provider";
import { Footer } from "@/components/footer";
import { NavbarClient } from "@/components/navbar-client";
import { NavigationPreloader } from "@/components/navigation-preloader";
import { WhatsappFloatingButton } from "@/components/whatsapp-floating-button";

const navItems = [
  { href: "/pricing", label: "Pricing" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/contact", label: "Contact" },
  { href: "/dashboard", label: "Dashboard" }
];

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const useCompactFooter = pathname !== "/";

  return (
    <AuthSessionProvider>
      <div className="flex min-h-screen flex-col">
        <div className="site-chrome-nav">
          <NavbarClient navItems={navItems} />
        </div>
        <main className="min-w-0 flex-1">{children}</main>
        <div className="site-chrome-footer">
          <Footer compact={useCompactFooter} />
        </div>
        <WhatsappFloatingButton />
        <NavigationPreloader />
      </div>
    </AuthSessionProvider>
  );
}
