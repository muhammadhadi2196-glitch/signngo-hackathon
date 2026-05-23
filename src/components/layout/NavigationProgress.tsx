"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function NavigationProgress() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [done, setDone] = useState(false);
  const [width, setWidth] = useState(0);
  const prevPathname = useRef(pathname);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start bar on any internal link click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const a = (e.target as Element).closest("a");
      if (!a) return;
      const href = a.getAttribute("href") ?? "";
      if (!href.startsWith("/") || href === pathname) return;
      setVisible(true);
      setDone(false);
      setWidth(20);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [pathname]);

  // Advance bar while loading
  useEffect(() => {
    if (!visible || done) return;
    tick.current = setInterval(() => {
      setWidth((w) => (w >= 80 ? w : w + Math.random() * 15 + 5));
    }, 500);
    return () => {
      if (tick.current) clearInterval(tick.current);
    };
  }, [visible, done]);

  // Complete on route change
  useEffect(() => {
    if (pathname === prevPathname.current) return;
    prevPathname.current = pathname;
    if (!visible) return;
    if (tick.current) clearInterval(tick.current);
    setWidth(100);
    setDone(true);
    const t = setTimeout(() => {
      setVisible(false);
      setDone(false);
      setWidth(0);
    }, 500);
    return () => clearTimeout(t);
    // pathname is the only dep we want here — visible is intentionally excluded
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (!visible) return null;

  return (
    <div
      className="fixed top-0 left-0 z-[100] h-0.5 bg-blue-500 pointer-events-none"
      style={{
        width: `${width}%`,
        opacity: done ? 0 : 1,
        transition: done
          ? "width 150ms ease-out, opacity 350ms ease-in 100ms"
          : "width 400ms ease-out",
      }}
    />
  );
}
