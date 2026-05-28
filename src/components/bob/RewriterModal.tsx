"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  REWRITER_TONE_LABELS,
  REWRITER_TONES,
  type RewriterContext,
  type RewriterTone,
} from "@/lib/bob/rewriterSystemPrompt";

interface RewriterModalProps {
  open: boolean;
  onClose: () => void;
  initialText?: string;
  defaultTone?: RewriterTone;
  context?: RewriterContext;
  /**
   * If provided, a "Use This" button appears that hands the polished text
   * back to the caller (inline PolishButton mode). Without it, the modal
   * is a standalone polish tool with only Copy.
   */
  onApply?: (newText: string) => void;
}

export function RewriterModal({
  open,
  onClose,
  initialText,
  defaultTone = "neutral",
  context = "general",
  onApply,
}: RewriterModalProps) {
  const [inputText, setInputText] = useState("");
  const [polishedText, setPolishedText] = useState("");
  const [tone, setTone] = useState<RewriterTone>(defaultTone);
  const [isStreaming, setIsStreaming] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [hasRunOnce, setHasRunOnce] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const wasOpenRef = useRef(false);
  const copyResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset on transition from closed → open.
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setInputText(initialText ?? "");
      setPolishedText("");
      setTone(defaultTone);
      setIsStreaming(false);
      setErrorMessage(null);
      setCopied(false);
      setHasRunOnce(false);
    }
    wasOpenRef.current = open;
  }, [open, initialText, defaultTone]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (copyResetTimerRef.current) clearTimeout(copyResetTimerRef.current);
    };
  }, []);

  // ESC closes (unless mid-stream).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isStreaming) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, isStreaming]);

  // Body scroll lock.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const runPolish = useCallback(
    async (overrideTone?: RewriterTone) => {
      const text = inputText.trim();
      if (!text || isStreaming) return;

      // Cancel any in-flight request first (handles tone-change re-runs).
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const usedTone = overrideTone ?? tone;
      setIsStreaming(true);
      setErrorMessage(null);
      setPolishedText("");
      setCopied(false);
      setHasRunOnce(true);

      try {
        const res = await fetch("/api/bob/rewrite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, tone: usedTone, context }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          const errText = await res.text().catch(() => "");
          throw new Error(errText || `Bob's API returned ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          setPolishedText(buffer);
        }
      } catch (err) {
        const aborted =
          err instanceof DOMException && err.name === "AbortError";
        if (!aborted) {
          setErrorMessage(
            err instanceof Error
              ? err.message
              : "Bob couldn't polish that one."
          );
        }
      } finally {
        setIsStreaming(false);
        if (abortRef.current === controller) abortRef.current = null;
      }
    },
    [inputText, isStreaming, tone, context]
  );

  const handleToneChange = useCallback(
    (next: RewriterTone) => {
      if (next === tone) return;
      setTone(next);
      // Per spec: tone change re-runs the AI, doesn't transform locally.
      // Only auto-rerun if there's already a polished result on screen.
      if (hasRunOnce && inputText.trim()) {
        void runPolish(next);
      }
    },
    [tone, hasRunOnce, inputText, runPolish]
  );

  const handleCopy = useCallback(async () => {
    if (!polishedText.trim()) return;
    try {
      await navigator.clipboard.writeText(polishedText.trim());
      setCopied(true);
      if (copyResetTimerRef.current) clearTimeout(copyResetTimerRef.current);
      copyResetTimerRef.current = setTimeout(() => setCopied(false), 1800);
    } catch {
      setErrorMessage("Couldn't access clipboard. Try selecting and copying.");
    }
  }, [polishedText]);

  const handleApply = useCallback(() => {
    if (!polishedText.trim() || !onApply) return;
    onApply(polishedText.trim());
    onClose();
  }, [polishedText, onApply, onClose]);

  if (!open) return null;

  const canPolish = inputText.trim().length > 0 && !isStreaming;
  const hasPolished = polishedText.trim().length > 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Polish your message"
      className={cn(
        "fixed inset-0 z-[60] flex items-center justify-center p-0 sm:p-4",
        "bg-slate-900/40 backdrop-blur-sm"
      )}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isStreaming) onClose();
      }}
    >
      <div
        className={cn(
          "bob-panel-in",
          "flex flex-col w-full max-w-3xl bg-white shadow-2xl shadow-blue-900/20",
          "sm:rounded-2xl sm:max-h-[88vh]",
          "max-sm:h-full max-sm:max-w-none max-sm:rounded-none"
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-md shadow-blue-500/20">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-600">
              Bob × Polish
            </p>
            <h2 className="text-base font-semibold text-slate-900 truncate">
              Polish your message
            </h2>
            <p className="text-xs text-slate-500">
              Turn rough text into professional communication.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isStreaming}
            aria-label="Close"
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg text-slate-400",
              "transition-colors duration-200",
              "hover:bg-slate-100 hover:text-slate-700",
              "disabled:opacity-40 disabled:cursor-not-allowed"
            )}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          {/* BEFORE / AFTER */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Your text
              </label>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                rows={8}
                placeholder="Type or paste rough text here…"
                disabled={isStreaming}
                className={cn(
                  "w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-slate-800",
                  "placeholder:text-slate-400",
                  "transition-all duration-200",
                  "focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100",
                  "disabled:bg-slate-50 disabled:cursor-not-allowed"
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-blue-600">
                Professional version
              </label>
              <div
                className={cn(
                  "min-h-[200px] rounded-xl border border-blue-100 bg-blue-50/40 px-3.5 py-2.5 text-sm leading-relaxed",
                  "whitespace-pre-wrap break-words"
                )}
              >
                {polishedText ? (
                  <span className="text-slate-800">{polishedText}</span>
                ) : isStreaming ? (
                  <SkeletonLines />
                ) : (
                  <span className="text-slate-400">
                    Click <strong>Polish</strong> to see your text rewritten
                    with a professional touch.
                  </span>
                )}
              </div>
            </div>
          </div>

          {errorMessage && (
            <p className="text-xs font-medium text-red-600">{errorMessage}</p>
          )}

          {/* Tone chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mr-1">
              Tone
            </span>
            {REWRITER_TONES.map((t) => {
              const active = t === tone;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleToneChange(t)}
                  disabled={isStreaming}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-all duration-200",
                    active
                      ? "border-blue-300 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  {REWRITER_TONE_LABELS[t]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <button
            type="button"
            onClick={() => runPolish()}
            disabled={!canPolish}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white",
              "bg-gradient-to-br from-blue-600 to-blue-800",
              "shadow-md shadow-blue-500/30",
              "transition-all duration-200",
              "hover:scale-[1.02] hover:shadow-blue-500/50",
              "active:scale-[0.99]",
              "disabled:from-slate-300 disabled:to-slate-400 disabled:shadow-none disabled:hover:scale-100 disabled:cursor-not-allowed"
            )}
          >
            <Sparkles className="h-4 w-4" />
            {isStreaming ? "Polishing…" : hasRunOnce ? "Try again" : "Polish"}
          </button>

          <button
            type="button"
            onClick={handleCopy}
            disabled={!hasPolished || isStreaming}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700",
              "transition-all duration-200",
              "hover:border-slate-300 hover:bg-slate-50",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-slate-200 disabled:hover:bg-white"
            )}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-emerald-600" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy
              </>
            )}
          </button>

          {onApply && (
            <button
              type="button"
              onClick={handleApply}
              disabled={!hasPolished || isStreaming}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white",
                "transition-all duration-200",
                "hover:bg-slate-800",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              Use this
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SkeletonLines() {
  return (
    <div className="space-y-2">
      <div className="h-3 w-[88%] rounded bg-blue-200/60 animate-pulse" />
      <div className="h-3 w-[72%] rounded bg-blue-200/60 animate-pulse" />
      <div className="h-3 w-[94%] rounded bg-blue-200/60 animate-pulse" />
      <div className="h-3 w-[60%] rounded bg-blue-200/60 animate-pulse" />
    </div>
  );
}
