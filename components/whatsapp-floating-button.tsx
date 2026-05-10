"use client";

import { MessageCircle, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const prompts = ["Chat with us, it's free", "Ask me anything, I am here to help you"];
const chatMessage = "Hello DrivaDocs, I would like help with vehicle documents.";

export function WhatsappFloatingButton() {
  const [prompt, setPrompt] = useState(prompts[0]);
  const [visible, setVisible] = useState(true);
  const restoreTimer = useRef<number | null>(null);

  useEffect(() => {
    setPrompt(randomPrompt());
    const timer = window.setInterval(() => setPrompt(randomPrompt()), 6500);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    return () => {
      if (restoreTimer.current) window.clearTimeout(restoreTimer.current);
    };
  }, []);

  function hideTemporarily() {
    setVisible(false);
    if (restoreTimer.current) window.clearTimeout(restoreTimer.current);
    restoreTimer.current = window.setTimeout(() => {
      setPrompt(randomPrompt());
      setVisible(true);
      restoreTimer.current = null;
    }, 60000);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-24 right-4 z-[80] flex items-center gap-3 sm:bottom-6 sm:right-6">
      <div className="animate-rise max-w-[210px] rounded border border-brand-900/10 bg-white px-3 py-2 text-right text-xs font-black leading-5 text-ink shadow-soft">
        {prompt}
      </div>
      <div className="relative shrink-0">
        <a
          href={`https://wa.me/2349074707624?text=${encodeURIComponent(chatMessage)}`}
          target="_blank"
          rel="noreferrer"
          aria-label="Start a WhatsApp chat with DrivaDocs support"
          title="Start WhatsApp chat"
          className="grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-soft ring-4 ring-white/90 transition hover:scale-105 hover:bg-[#1fb85a]"
        >
          <MessageCircle size={30} strokeWidth={2.7} />
        </a>
        <button
          type="button"
          onClick={hideTemporarily}
          aria-label="Hide WhatsApp chat button for 60 seconds"
          title="Hide for 60 seconds"
          className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full border border-white bg-ink text-white shadow-sm transition hover:bg-brand-800 focus-ring"
        >
          <X size={12} strokeWidth={3} />
        </button>
      </div>
    </div>
  );
}

function randomPrompt() {
  return prompts[Math.floor(Math.random() * prompts.length)];
}
