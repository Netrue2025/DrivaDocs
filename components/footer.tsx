"use client";

import Link from "next/link";
import { Phone, Mail, MessageCircle } from "lucide-react";

export function Footer({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <footer className="border-t border-brand-900/10 bg-white px-4 py-4 text-center text-xs font-semibold text-ink/55">
        <span>Copyright {new Date().getFullYear()} DrivaDocs. All rights reserved.</span>
        <span className="mx-2 text-ink/25">|</span>
        <span>Privacy &amp; Policy</span>
      </footer>
    );
  }

  return (
    <footer className="border-t border-brand-900/10 bg-ink text-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-4 lg:px-8">
        <div className="md:col-span-2">
          <p className="text-2xl font-black text-white">DrivaDocs</p>
          <p className="mt-3 max-w-md text-sm leading-6 text-white/70">
            Vehicle documents, licensing, renewals, permits, and office delivery
            support for individuals and fleets across Nigeria.
          </p>
        </div>
        <div>
          <p className="font-semibold">Company</p>
          <div className="mt-3 grid gap-2 text-sm text-white/70">
            <Link href="/pricing">Pricing</Link>
            <Link href="/contact">Contact Us</Link>
            <Link href="/login">Login</Link>
          </div>
        </div>
        <div>
          <p className="font-semibold">Support</p>
          <div className="mt-3 grid gap-2 text-sm text-white/70">
            <a href="tel:+2348000000000" className="flex items-center gap-2">
              <Phone size={16} /> Call support
            </a>
            <a href="mailto:support@drivadocs.ng" className="flex items-center gap-2">
              <Mail size={16} /> Email support
            </a>
            <a href="https://wa.me/2348000000000" className="flex items-center gap-2">
              <MessageCircle size={16} /> WhatsApp
            </a>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 px-4 py-4 text-center text-xs text-white/50">
        Copyright {new Date().getFullYear()} DrivaDocs. All rights reserved.
        <span className="mx-2 text-white/20">|</span>
        Privacy &amp; Policy
      </div>
    </footer>
  );
}
