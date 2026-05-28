"use client";

import { useEffect, useRef } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";

interface QuoteGeneratorInputProps {
  value: string;
  onChange: (value: string) => void;
  onGenerate: () => void;
  disabled?: boolean;
}

const PLACEHOLDER =
  "e.g. Lawn mowing for 742 Springbank Hill SW, weekly May to October, around half acre property…";

export function QuoteGeneratorInput({
  value,
  onChange,
  onGenerate,
  disabled = false,
}: QuoteGeneratorInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const canGenerate = value.trim().length > 4 && !disabled;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 tracking-tight">
          Describe the job
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Tell Bob what the work is. Mention the address, frequency, and anything
          specific. Bob will ask 1–3 quick questions, then build a complete
          professional quote.
        </p>
      </div>

      <textarea
        ref={textareaRef}
        rows={6}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && canGenerate) {
            e.preventDefault();
            onGenerate();
          }
        }}
        placeholder={PLACEHOLDER}
        className={cn(
          "w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-slate-800",
          "placeholder:text-slate-400",
          "transition-all duration-200",
          "focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        )}
      />

      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">⌘/Ctrl + Enter to generate</p>
        <button
          type="button"
          onClick={onGenerate}
          disabled={!canGenerate}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white",
            "bg-gradient-to-br from-blue-600 to-blue-800",
            "shadow-md shadow-blue-500/30",
            "transition-all duration-200",
            "hover:scale-[1.02] hover:shadow-blue-500/50",
            "active:scale-[0.99]",
            "disabled:from-slate-300 disabled:to-slate-400 disabled:shadow-none disabled:hover:scale-100 disabled:cursor-not-allowed"
          )}
        >
          <Sparkles className="h-4 w-4" />
          Generate
        </button>
      </div>
    </div>
  );
}
