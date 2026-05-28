"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { RewriterModal } from "./RewriterModal";
import type { RewriterContext, RewriterTone } from "@/lib/bob/rewriterSystemPrompt";

interface PolishButtonProps {
  value: string;
  onApply: (newText: string) => void;
  context?: RewriterContext;
  defaultTone?: RewriterTone;
  size?: "xs" | "sm";
  disabled?: boolean;
  label?: string;
}

export function PolishButton({
  value,
  onApply,
  context = "general",
  defaultTone = "neutral",
  size = "xs",
  disabled = false,
  label = "Polish",
}: PolishButtonProps) {
  const [open, setOpen] = useState(false);

  const sizeClasses =
    size === "xs"
      ? "px-2 py-1 text-[11px] gap-1"
      : "px-2.5 py-1.5 text-xs gap-1.5";

  const iconSize = size === "xs" ? "h-3 w-3" : "h-3.5 w-3.5";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        title="Polish with Bob"
        className={cn(
          "inline-flex items-center rounded-md border border-slate-200 bg-white font-medium text-slate-600",
          "transition-all duration-200",
          "hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700",
          "active:scale-95",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-slate-200 disabled:hover:bg-white disabled:hover:text-slate-600",
          sizeClasses
        )}
      >
        <Sparkles className={iconSize} />
        {label}
      </button>
      <RewriterModal
        open={open}
        onClose={() => setOpen(false)}
        initialText={value}
        context={context}
        defaultTone={defaultTone}
        onApply={onApply}
      />
    </>
  );
}
