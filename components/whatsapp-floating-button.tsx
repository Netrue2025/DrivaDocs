"use client";

import { MessageCircle } from "lucide-react";

export function WhatsappFloatingButton() {
  return (
    <a
      href="https://wa.me/2349074707624"
      target="_blank"
      rel="noreferrer"
      aria-label="Open WhatsApp support"
      title="WhatsApp support"
      className="fixed bottom-24 right-4 z-[80] grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-soft ring-4 ring-white/90 transition hover:scale-105 hover:bg-[#1fb85a] sm:bottom-6 sm:right-6"
    >
      <MessageCircle size={30} strokeWidth={2.7} />
    </a>
  );
}
