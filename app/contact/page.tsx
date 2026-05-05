import { Mail, MessageCircle, Phone } from "lucide-react";
import { ContactForm } from "@/components/contact-form";

export const metadata = {
  title: "Contact Us - DrivaDocs"
};

export default function ContactPage() {
  return (
    <section className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
      <div>
        <p className="text-sm font-black uppercase text-brand-700">Contact Us</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-ink">Support for every document request</h1>
        <p className="mt-4 text-lg leading-8 text-ink/65">
          Ask about vehicle renewals, registrations, licensing, permits, pricing, or delivery.
          Your message is sent to info@netrue.io and stored for admin follow-up.
        </p>
        <div className="mt-8 grid gap-3">
          <a className="flex items-center gap-3 rounded border border-brand-900/10 bg-white p-4 font-bold" href="tel:+2349074707624">
            <Phone className="text-brand-700" /> +234 907 470 7624
          </a>
          <a className="flex items-center gap-3 rounded border border-brand-900/10 bg-white p-4 font-bold" href="https://wa.me/2348147511776">
            <MessageCircle className="text-brand-700" /> WhatsApp support: +234 814 751 1776
          </a>
          <a className="flex items-center gap-3 rounded border border-brand-900/10 bg-white p-4 font-bold" href="mailto:info@netrue.io">
            <Mail className="text-brand-700" /> info@netrue.io
          </a>
        </div>
      </div>
      <ContactForm />
    </section>
  );
}
