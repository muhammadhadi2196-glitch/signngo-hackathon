"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeMap = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
};

export function Modal({
  open,
  onClose,
  title,
  children,
  className,
  size = "md",
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      if (!dialog.open) dialog.showModal();
    } else {
      if (dialog.open) dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => onClose();
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <dialog
      ref={dialogRef}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
      className={cn(
        "rounded-xl border border-slate-200 shadow-sm p-0 w-full backdrop:bg-slate-900/50",
        "open:flex flex-col",
        sizeMap[size],
        className
      )}
    >
      {(title || true) && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          {title && (
            <h2 className="text-base font-semibold text-slate-900 tracking-tight">
              {title}
            </h2>
          )}
          <button
            onClick={onClose}
            className="ml-auto text-slate-400 hover:text-slate-600 transition-colors rounded-md p-1 hover:bg-slate-100"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      <div className="p-6">{children}</div>
    </dialog>,
    document.body
  );
}
