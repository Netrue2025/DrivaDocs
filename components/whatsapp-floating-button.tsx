"use client";

import { MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";

const prompts = ["Chat with us, it's free", "Ask me anything, I am here to help you"];
const chatMessage = "Hello DrivaDocs, I would like help with vehicle documents.";

export function WhatsappFloatingButton() {
  const [prompt, setPrompt] = useState(prompts[0]);

  useEffect(() => {
    setPrompt(randomPrompt());
    const timer = window.setInterval(() => setPrompt(randomPrompt()), 6500);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="fixed bottom-24 right-4 z-[80] flex items-center gap-3 sm:bottom-6 sm:right-6">
      <div className="animate-rise max-w-[210px] rounded border border-brand-900/10 bg-white px-3 py-2 text-right text-xs font-black leading-5 text-ink shadow-soft">
        {prompt}
      </div>
      <a
        href={`https://wa.me/2349074707624?text=${encodeURIComponent(chatMessage)}`}
        target="_blank"
        rel="noreferrer"
        aria-label="Start a WhatsApp chat with DrivaDocs support"
        title="Start WhatsApp chat"
        className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#25D366] text-white shadow-soft ring-4 ring-white/90 transition hover:scale-105 hover:bg-[#1fb85a]"
      >
        <MessageCircle size={30} strokeWidth={2.7} />
      </a>
    </div>
  );
}

function randomPrompt() {
  return prompts[Math.floor(Math.random() * prompts.length)];
}
