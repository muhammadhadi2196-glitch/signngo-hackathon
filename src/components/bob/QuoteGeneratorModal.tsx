"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { QuoteGeneratorInput } from "./QuoteGeneratorInput";
import { QuoteGeneratorConversation } from "./QuoteGeneratorConversation";
import { QuoteGeneratorPreview } from "./QuoteGeneratorPreview";
import {
  READY_SENTINEL,
  type AIQuoteDraft,
  type ClarifyTurn,
} from "@/lib/bob/types";

type Stage = "input" | "clarifying" | "generating" | "preview" | "error";

interface QuoteGeneratorModalProps {
  open: boolean;
  onClose: () => void;
  initialText?: string;
  /**
   * When true and `initialText` is non-empty, the modal kicks off the
   * clarify flow automatically as soon as it opens. Used by Voice-to-Quote.
   */
  autoStart?: boolean;
}

const MAX_CLARIFY_TURNS = 3;
const DRAFT_STORAGE_PREFIX = "bob_ai_draft_";

function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function QuoteGeneratorModal({
  open,
  onClose,
  initialText,
  autoStart = false,
}: QuoteGeneratorModalProps) {
  const router = useRouter();

  const [stage, setStage] = useState<Stage>("input");
  const [inputText, setInputText] = useState("");
  const [turns, setTurns] = useState<ClarifyTurn[]>([]);
  const [pendingQuestion, setPendingQuestion] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [awaitingAnswer, setAwaitingAnswer] = useState(false);
  const [draft, setDraft] = useState<AIQuoteDraft | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const wasOpenRef = useRef(false);
  const pendingAutoStartRef = useRef(false);

  // Reset on transition from closed → open. Pre-fill if initialText is given
  // (Voice-to-Quote, Property Estimator handoffs).
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setStage("input");
      setInputText(initialText ?? "");
      setTurns([]);
      setPendingQuestion("");
      setIsStreaming(false);
      setAwaitingAnswer(false);
      setDraft(null);
      setRegenerating(false);
      setErrorMessage(null);
      pendingAutoStartRef.current = Boolean(autoStart && initialText?.trim());
    }
    wasOpenRef.current = open;
  }, [open, initialText, autoStart]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  // ─── ESC closes ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isStreaming && !regenerating) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, isStreaming, regenerating]);

  // ─── Body scroll lock ──────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // ─── Streaming clarify request ────────────────────────────────────────
  const runClarifyTurn = useCallback(
    async (currentTurns: ClarifyTurn[]) => {
      // Guard: if we've hit the cap, jump to generate immediately.
      if (currentTurns.length >= MAX_CLARIFY_TURNS) {
        await runGenerate(currentTurns);
        return;
      }

      setStage("clarifying");
      setPendingQuestion("");
      setAwaitingAnswer(false);
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/bob/generate-quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stage: "clarify",
            originalInput: inputText,
            previousAnswers: currentTurns,
          }),
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
          // Hide the sentinel from the visible bubble even if it arrives
          // mid-stream — looks cleaner if the model accidentally precedes
          // it with whitespace.
          const visible = buffer.includes(READY_SENTINEL) ? "" : buffer;
          setPendingQuestion(visible);
        }

        const final = buffer.trim();
        setIsStreaming(false);

        if (final === READY_SENTINEL || final.startsWith(READY_SENTINEL)) {
          // No more questions — straight to generate.
          await runGenerate(currentTurns);
          return;
        }

        setPendingQuestion(final);
        setAwaitingAnswer(true);
      } catch (err) {
        const aborted =
          err instanceof DOMException && err.name === "AbortError";
        if (!aborted) {
          setIsStreaming(false);
          setAwaitingAnswer(false);
          setErrorMessage(
            err instanceof Error
              ? err.message
              : "Bob couldn't reach the server."
          );
          setStage("error");
        }
      } finally {
        abortRef.current = null;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [inputText]
  );

  // ─── Final generate request ───────────────────────────────────────────
  const runGenerate = useCallback(
    async (currentTurns: ClarifyTurn[], variationHint?: string) => {
      setStage("generating");
      setRegenerating(Boolean(variationHint));
      setErrorMessage(null);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/bob/generate-quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stage: "generate",
            originalInput: inputText,
            previousAnswers: currentTurns,
            variationHint,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          throw new Error(errText || `Bob's API returned ${res.status}`);
        }

        const data = (await res.json()) as { quote: AIQuoteDraft };
        setDraft(data.quote);
        setStage("preview");
      } catch (err) {
        const aborted =
          err instanceof DOMException && err.name === "AbortError";
        if (!aborted) {
          setErrorMessage(
            err instanceof Error
              ? err.message
              : "Bob couldn't generate the quote."
          );
          setStage("error");
        }
      } finally {
        setRegenerating(false);
        abortRef.current = null;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [inputText]
  );

  // ─── User actions ─────────────────────────────────────────────────────
  const handleStart = useCallback(() => {
    if (!inputText.trim()) return;
    void runClarifyTurn([]);
  }, [inputText, runClarifyTurn]);

  // Auto-start the clarify flow when opened via Voice-to-Quote (or any
  // caller that passes autoStart=true with initialText). Only fires once
  // per open transition.
  useEffect(() => {
    if (!open) return;
    if (!pendingAutoStartRef.current) return;
    if (stage !== "input") return;
    if (!inputText.trim()) return;
    pendingAutoStartRef.current = false;
    handleStart();
  }, [open, stage, inputText, handleStart]);

  const handleAnswer = useCallback(
    (answer: string) => {
      const trimmed = answer.trim();
      if (!trimmed || !pendingQuestion) return;
      const next: ClarifyTurn[] = [
        ...turns,
        { question: pendingQuestion.trim(), answer: trimmed },
      ];
      setTurns(next);
      setAwaitingAnswer(false);
      setPendingQuestion("");
      void runClarifyTurn(next);
    },
    [pendingQuestion, runClarifyTurn, turns]
  );

  const handleEditAndSend = useCallback(() => {
    if (!draft) return;
    const id = generateId();
    try {
      window.sessionStorage.setItem(
        `${DRAFT_STORAGE_PREFIX}${id}`,
        JSON.stringify(draft)
      );
    } catch {
      // sessionStorage disabled or full — non-fatal, the editor will just
      // open empty.
    }
    onClose();
    router.push(`/quotes/new?aiDraft=${id}`);
  }, [draft, onClose, router]);

  const handleRegenerate = useCallback(() => {
    void runGenerate(turns, "Different angle — change the structure or pricing tier");
  }, [runGenerate, turns]);

  const handleRetry = useCallback(() => {
    setErrorMessage(null);
    setStage("input");
  }, []);

  if (!open) return null;

  const headerLabel =
    stage === "input"
      ? "AI Quote Builder"
      : stage === "clarifying"
      ? "A few quick questions"
      : stage === "generating"
      ? "Drafting your quote"
      : stage === "preview"
      ? "Quote ready"
      : "Something went wrong";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="AI Quote Generator"
      className={cn(
        "fixed inset-0 z-[60] flex items-center justify-center p-0 sm:p-4",
        "bg-slate-900/40 backdrop-blur-sm"
      )}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isStreaming && !regenerating) {
          onClose();
        }
      }}
    >
      <div
        className={cn(
          "bob-panel-in",
          "flex flex-col",
          "w-full max-w-2xl sm:rounded-2xl bg-white shadow-2xl shadow-blue-900/20",
          "max-sm:h-full max-sm:max-w-none max-sm:rounded-none",
          "sm:max-h-[85vh]"
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-md shadow-blue-500/20">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-600">
              Bob × Quotes
            </p>
            <h2 className="text-base font-semibold text-slate-900 truncate">
              {headerLabel}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isStreaming || regenerating}
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
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {stage === "input" && (
            <QuoteGeneratorInput
              value={inputText}
              onChange={setInputText}
              onGenerate={handleStart}
            />
          )}

          {stage === "clarifying" && (
            <QuoteGeneratorConversation
              originalInput={inputText}
              turns={turns}
              pendingQuestion={pendingQuestion}
              isStreaming={isStreaming}
              awaitingAnswer={awaitingAnswer}
              onSubmitAnswer={handleAnswer}
            />
          )}

          {stage === "generating" && (
            <GeneratingState />
          )}

          {stage === "preview" && draft && (
            <QuoteGeneratorPreview
              draft={draft}
              onEditAndSend={handleEditAndSend}
              onRegenerate={handleRegenerate}
              regenerating={regenerating}
            />
          )}

          {stage === "error" && (
            <ErrorState
              message={errorMessage ?? "Unknown error"}
              onRetry={handleRetry}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function GeneratingState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <div className="relative h-12 w-12">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 opacity-20 animate-ping" />
        <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-blue-800 shadow-lg shadow-blue-500/30">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-slate-900">
          Bob is drafting your quote…
        </p>
        <p className="mt-0.5 text-xs text-slate-500">
          Calculating line items and writing the scope.
        </p>
      </div>
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
      <p className="text-sm font-medium text-slate-900">
        Bob hit a snag generating your quote.
      </p>
      <p className="max-w-md text-xs text-slate-500">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
      >
        Start over
      </button>
    </div>
  );
}
