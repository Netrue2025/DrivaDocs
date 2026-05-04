"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PreloaderArtwork } from "@/components/preloader-artwork";

export function NavigationPreloader() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(true);
  const showTimer = useRef<number | null>(null);
  const hideTimer = useRef<number | null>(null);
  const initialLoadDone = useRef(false);

  function clearTimers() {
    if (showTimer.current) window.clearTimeout(showTimer.current);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    showTimer.current = null;
    hideTimer.current = null;
  }

  function scheduleLoader(delay = 220) {
    clearTimers();
    showTimer.current = window.setTimeout(() => setVisible(true), delay);
    hideTimer.current = window.setTimeout(() => setVisible(false), 12000);
  }

  useEffect(() => {
    if (!initialLoadDone.current) return;
    clearTimers();
    setVisible(false);
  }, [pathname]);

  useEffect(() => {
    function finishInitialLoad() {
      window.setTimeout(() => {
        initialLoadDone.current = true;
        setVisible(false);
      }, 450);
    }

    if (document.readyState === "complete") {
      finishInitialLoad();
    } else {
      window.addEventListener("load", finishInitialLoad, { once: true });
    }

    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target : null;
      const anchor = target?.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.target || anchor.hasAttribute("download")) return;

      const nextUrl = new URL(anchor.href, window.location.href);
      if (nextUrl.origin !== window.location.origin) return;
      const samePage = nextUrl.pathname === window.location.pathname && nextUrl.search === window.location.search;
      if (samePage && nextUrl.hash) return;

      scheduleLoader();
    }

    function onBeforeUnload() {
      clearTimers();
      setVisible(true);
    }

    document.addEventListener("click", onClick);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("load", finishInitialLoad);
      clearTimers();
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="navigation-preloader" role="status" aria-live="polite" aria-label="Loading DrivaDocs">
      <PreloaderArtwork />
    </div>
  );
}
