"use client";

import { useEffect, useRef } from "react";
import { Send } from "lucide-react";
import { cn } from "@/lib/cn";
import { MicButton } from "./MicButton";

interface BobInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
  /** Called with the final voice transcript (Voice-to-Quote). */
  onVoiceTranscript?: (text: string) => void;
  onVoiceError?: (message: string) => void;
}

export function BobInput({
  value,
  onChange,
  onSubmit,
  disabled = false,
  autoFocus = false,
  placeholder = "Ask Bob anything…",
  onVoiceTranscript,
  onVoiceError,
}: BobInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  // Auto-grow textarea up to a max height.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    const next = Math.min(el.scrollHeight, 120);
    el.style.height = `${next}px`;
  }, [value]);

  const canSubmit = value.trim().length > 0 && !disabled;

  function handleSubmit() {
    if (!canSubmit) return;
    onSubmit();
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
      className={cn(
        "flex items-end gap-2 rounded-2xl border border-slate-200 bg-white p-1.5",
        "transition-all duration-200",
        "focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100"
      )}
    >
      {onVoiceTranscript && (
        <div className="flex items-center pl-0.5 pb-0.5 self-end">
          <MicButton
            onTranscript={onVoiceTranscript}
            onError={onVoiceError}
            disabled={disabled}
          />
        </div>
      )}
      <textarea
        ref={textareaRef}
        rows={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
          }
        }}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "flex-1 resize-none bg-transparent px-2.5 py-1.5 text-sm text-slate-800 placeholder:text-slate-400",
          "focus:outline-none",
          "max-h-[120px]"
        )}
      />
      <button
        type="submit"
        disabled={!canSubmit}
        aria-label="Send message"
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
          "bg-gradient-to-br from-blue-600 to-blue-800 text-white",
          "shadow-sm shadow-blue-500/20",
          "transition-all duration-200",
          "hover:scale-105 hover:shadow-blue-500/40",
          "active:scale-95",
          "disabled:from-slate-300 disabled:to-slate-400 disabled:shadow-none disabled:hover:scale-100 disabled:cursor-not-allowed"
        )}
      >
        <Send className="h-4 w-4" strokeWidth={2.25} />
      </button>
    </form>
  );
}
