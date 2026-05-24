"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MapPin, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { PropertyEstimatorInput } from "./PropertyEstimatorInput";
import { PropertyEstimatorResults } from "./PropertyEstimatorResults";
import {
  BOB_EVENTS,
  buildQuoteDescriptionFromEstimate,
  type PropertyEstimateResult,
} from "@/lib/bob/types";

type Stage = "input" | "analyzing" | "results" | "error";

interface PropertyEstimatorModalProps {
  open: boolean;
  onClose: () => void;
  initialAddress?: string;
}

export function PropertyEstimatorModal({
  open,
  onClose,
  initialAddress,
}: PropertyEstimatorModalProps) {
  const [stage, setStage] = useState<Stage>("input");
  const [address, setAddress] = useState("");
  const [result, setResult] = useState<PropertyEstimateResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const wasOpenRef = useRef(false);

  // Reset on transition from closed → open.
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setStage("input");
      setAddress(initialAddress ?? "");
      setResult(null);
      setErrorMessage(null);
    }
    wasOpenRef.current = open;
  }, [open, initialAddress]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  // ESC closes (unless mid-analyze).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && stage !== "analyzing") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, stage]);

  // Body scroll lock.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const runAnalysis = useCallback(async () => {
    const trimmed = address.trim();
    if (!trimmed) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStage("analyzing");
    setErrorMessage(null);
    setResult(null);

    try {
      const res = await fetch("/api/bob/estimate-property", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: trimmed }),
        signal: controller.signal,
      });

      if (!res.ok) {
        let message = `Bob's estimator returned ${res.status}`;
        try {
          const data = (await res.json()) as { error?: string };
          if (data.error) message = data.error;
        } catch {
          // Body wasn't JSON — fall back to status message.
        }
        throw new Error(message);
      }

      const data = (await res.json()) as PropertyEstimateResult;
      setResult(data);
      setStage("results");
    } catch (err) {
      const aborted =
        err instanceof DOMException && err.name === "AbortError";
      if (!aborted) {
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "Couldn't measure that property."
        );
        setStage("error");
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, [address]);

  const handleGenerateQuote = useCallback(() => {
    if (!result) return;
    const initialText = buildQuoteDescriptionFromEstimate(result);
    onClose();
    // Slight delay so the property modal's close animation doesn't compete
    // with the quote modal's open animation.
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent(BOB_EVENTS.openQuoteGenerator, {
          detail: { initialText },
        })
      );
    }, 80);
  }, [result, onClose]);

  const handleRetry = useCallback(() => {
    setErrorMessage(null);
    setStage("input");
  }, []);

  if (!open) return null;

  const headerLabel =
    stage === "input"
      ? "Property scan"
      : stage === "analyzing"
      ? "Measuring your property"
      : stage === "results"
      ? "Property measured"
      : "Couldn't measure that one";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Property Size Estimator"
      className={cn(
        "fixed inset-0 z-[60] flex items-center justify-center p-0 sm:p-4",
        "bg-slate-900/40 backdrop-blur-sm"
      )}
      onClick={(e) => {
        if (e.target === e.currentTarget && stage !== "analyzing") onClose();
      }}
    >
      <div
        className={cn(
          "bob-panel-in",
          "flex flex-col w-full max-w-2xl bg-white shadow-2xl shadow-blue-900/20",
          "sm:rounded-2xl sm:max-h-[90vh]",
          "max-sm:h-full max-sm:max-w-none max-sm:rounded-none"
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-md shadow-blue-500/20">
            <MapPin className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-600">
              Bob × Properties
            </p>
            <h2 className="text-base font-semibold text-slate-900 truncate">
              {headerLabel}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={stage === "analyzing"}
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
            <PropertyEstimatorInput
              value={address}
              onChange={setAddress}
              onAnalyze={runAnalysis}
            />
          )}

          {stage === "analyzing" && <AnalyzingState address={address} />}

          {stage === "results" && result && (
            <PropertyEstimatorResults
              result={result}
              onGenerateQuote={handleGenerateQuote}
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

function AnalyzingState({ address }: { address: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-12 text-center">
      <div className="relative h-14 w-14">
        <span className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 opacity-25 animate-ping" />
        <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-blue-800 shadow-lg shadow-blue-500/30">
          <Sparkles className="h-6 w-6 text-white" />
        </span>
      </div>
      <div>
        <p className="text-sm font-medium text-slate-900">
          Bob is measuring your property…
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Pulling satellite imagery for{" "}
          <span className="font-medium text-slate-700">
            {address || "the address"}
          </span>{" "}
          and analyzing lot boundaries.
        </p>
      </div>
      <div className="flex items-center gap-1">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
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
        Bob couldn't measure that property.
      </p>
      <p className="max-w-md text-xs text-slate-500">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
      >
        Try a different address
      </button>
    </div>
  );
}
