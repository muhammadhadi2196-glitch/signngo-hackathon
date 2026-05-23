"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/cn";

export interface RowAction {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
  separator?: boolean;
  hidden?: boolean;
}

interface Props {
  actions: RowAction[];
}

export function RowActions({ actions }: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  // Position the menu after it renders in the portal
  useEffect(() => {
    if (!open || !triggerRef.current || !menuRef.current) return;

    const trigger = triggerRef.current.getBoundingClientRect();
    const menu = menuRef.current;
    const menuHeight = menu.offsetHeight;
    const spaceBelow = window.innerHeight - trigger.bottom - 8;
    const right = window.innerWidth - trigger.right;

    menu.style.right = `${right}px`;

    if (spaceBelow < menuHeight) {
      // not enough room below — open upward
      menu.style.top = "auto";
      menu.style.bottom = `${window.innerHeight - trigger.top + 4}px`;
    } else {
      menu.style.top = `${trigger.bottom + 4}px`;
      menu.style.bottom = "auto";
    }

    menu.style.visibility = "visible";
  }, [open]);

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return;
    const onMouse = (e: MouseEvent) => {
      if (
        !triggerRef.current?.contains(e.target as Node) &&
        !menuRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onMouse);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouse);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const visible = actions.filter((a) => !a.hidden);

  return (
    <>
      <button
        ref={triggerRef}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600"
        aria-label="Actions"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {mounted && open && createPortal(
        <div
          ref={menuRef}
          style={{ position: "fixed", zIndex: 9999, visibility: "hidden", right: 0, top: 0 }}
          className="w-52 bg-white border border-slate-200 rounded-xl shadow-lg py-1"
        >
          {visible.map((action, i) => (
            <div key={i}>
              {action.separator && <hr className="my-1 border-slate-100" />}
              <button
                onClick={() => {
                  action.onClick();
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors",
                  action.danger
                    ? "text-red-600 hover:bg-red-50"
                    : "text-slate-700 hover:bg-slate-50"
                )}
              >
                {action.icon}
                {action.label}
              </button>
            </div>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}
