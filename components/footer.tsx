"use client";

import Link from "next/link";
import { Mail, MessageCircle, Phone } from "lucide-react";

export function Footer({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <footer className="border-t border-brand-900/10 bg-white px-4 py-4 text-center text-xs font-semibold text-ink/55">
        <p>
          <span>Copyright {new Date().getFullYear()} DrivaDocs. All rights reserved.</span>
          <span className="mx-2 text-ink/25">|</span>
          <span>Privacy &amp; Policy</span>
        </p>
        <p className="mt-2 text-[11px] font-black uppercase tracking-[0.14em] text-brand-700/80">
          Design and Developed By{" "}
          <a href="https://netrue.io" target="_blank" rel="noreferrer" className="text-brand-900 underline decoration-road decoration-2 underline-offset-4 transition hover:text-brand-700">
            Netrue Limited
          </a>
        </p>
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
            <a href="tel:09074707624" className="flex items-center gap-2">
              <Phone size={16} /> 09074707624
            </a>
            <a href="mailto:support@drivadocs.com" className="flex items-center gap-2">
              <Mail size={16} /> Email support
            </a>
            <a href="https://wa.me/2349074707624" className="flex items-center gap-2">
              <MessageCircle size={16} /> 09074707624
            </a>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 px-4 py-4 text-center text-xs text-white/50">
        <p>
          Copyright {new Date().getFullYear()} DrivaDocs. All rights reserved.
          <span className="mx-2 text-white/20">|</span>
          Privacy &amp; Policy
        </p>
        <p className="mt-2 text-[11px] font-black uppercase tracking-[0.16em] text-white/60">
          Design and Developed By{" "}
          <a href="https://netrue.io" target="_blank" rel="noreferrer" className="text-road underline decoration-white/25 decoration-2 underline-offset-4 transition hover:text-white">
            Netrue Limited
          </a>
        </p>
      </div>
    </footer>
  );
}
