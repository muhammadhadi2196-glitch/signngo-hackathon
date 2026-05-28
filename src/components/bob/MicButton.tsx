"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/cn";

// ── Minimal Web Speech API surface ────────────────────────────────────────
// The Web Speech API isn't in TypeScript's lib.dom.d.ts in every version,
// so we declare just what we use. webkitSpeechRecognition is the WebKit-
// prefixed implementation present in Chrome/Edge/Safari.

interface SpeechResult {
  readonly transcript: string;
  readonly confidence: number;
}
interface SpeechAlternativeList {
  readonly length: number;
  readonly [index: number]: SpeechResult;
}
interface SpeechResultEntry {
  readonly isFinal: boolean;
  readonly length: number;
  readonly [index: number]: SpeechResult;
  item?(index: number): SpeechResult;
}
interface SpeechResultList {
  readonly length: number;
  readonly [index: number]: SpeechResultEntry;
}
interface SpeechRecognitionEventLike {
  readonly results: SpeechResultList;
  readonly resultIndex: number;
}
interface SpeechRecognitionErrorEventLike {
  readonly error: string;
  readonly message?: string;
}
interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onstart: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

// ── Component ─────────────────────────────────────────────────────────────

interface MicButtonProps {
  onTranscript: (text: string) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
  lang?: string;
}

type State = "idle" | "recording" | "processing" | "unsupported" | "denied";

const SILENCE_AUTOSTOP_MS = 2000;

export function MicButton({
  onTranscript,
  onError,
  disabled = false,
  lang = "en-US",
}: MicButtonProps) {
  const [state, setState] = useState<State>("idle");
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const finalTranscriptRef = useRef<string>("");
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ctor = useMemo(() => getSpeechRecognitionCtor(), []);

  useEffect(() => {
    if (!ctor) setState("unsupported");
  }, [ctor]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      recognitionRef.current?.abort();
    };
  }, []);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    if (!ctor) return;
    finalTranscriptRef.current = "";

    let recognition: SpeechRecognitionInstance;
    try {
      recognition = new ctor();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Couldn't start the microphone.";
      onError?.(message);
      return;
    }

    // continuous=true lets us keep the session open through the speaker's
    // natural pauses so we control the silence-stop timing ourselves with a
    // 2s timer below. Without continuous=true, Chrome ends recognition on
    // its own (typically ~1s of silence), which is too eager for slower
    // dictators.
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = lang;

    const armSilenceTimer = () => {
      clearSilenceTimer();
      silenceTimerRef.current = setTimeout(() => {
        // 2 s of silence (no new partial or final results) → stop.
        recognition.stop();
      }, SILENCE_AUTOSTOP_MS);
    };

    recognition.onstart = () => {
      setState("recording");
      armSilenceTimer();
    };

    recognition.onresult = (event) => {
      // Any result (interim or final) means the user is still talking —
      // reset the silence timer.
      armSilenceTimer();

      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const entry = event.results[i];
        if (entry.isFinal) {
          finalText += entry[0]?.transcript ?? "";
        }
      }
      if (finalText) {
        finalTranscriptRef.current += finalText;
      }
    };

    recognition.onerror = (event) => {
      const code = event.error;
      if (code === "not-allowed" || code === "service-not-allowed") {
        setState("denied");
        onError?.(
          "Microphone permission denied. Click the lock icon in your address bar to enable it."
        );
      } else if (code === "no-speech") {
        // Silent — user just didn't say anything.
      } else if (code === "aborted") {
        // User cancelled — no error.
      } else {
        onError?.(event.message || `Speech recognition error: ${code}`);
      }
    };

    recognition.onend = () => {
      clearSilenceTimer();
      const transcript = finalTranscriptRef.current.trim();
      recognitionRef.current = null;

      // Brief "processing" pulse before we hand the transcript off, so the
      // button has a clear stop → think → done rhythm even though the
      // recognition is local.
      setState("processing");
      window.setTimeout(() => {
        setState((s) => (s === "processing" ? "idle" : s));
        if (transcript) onTranscript(transcript);
      }, 280);
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Couldn't start microphone recording.";
      onError?.(message);
      setState("idle");
    }
  }, [ctor, lang, onError, onTranscript, clearSilenceTimer]);

  const stop = useCallback(() => {
    clearSilenceTimer();
    recognitionRef.current?.stop();
  }, [clearSilenceTimer]);

  const handleClick = useCallback(() => {
    if (state === "recording") stop();
    else if (state === "idle" || state === "denied") start();
  }, [state, start, stop]);

  if (state === "unsupported") return null;

  const isRecording = state === "recording";
  const isProcessing = state === "processing";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isProcessing}
      aria-label={isRecording ? "Stop recording" : "Voice to quote"}
      title={
        state === "denied"
          ? "Mic permission needed"
          : isRecording
          ? "Stop recording"
          : "Speak to build a quote"
      }
      className={cn(
        "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
        "transition-all duration-200",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-1",
        isRecording
          ? "bg-red-500 text-white shadow-md shadow-red-500/40 hover:bg-red-600"
          : isProcessing
          ? "bg-slate-200 text-slate-500"
          : state === "denied"
          ? "bg-amber-50 text-amber-600 hover:bg-amber-100"
          : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700",
        "disabled:opacity-50 disabled:cursor-not-allowed"
      )}
    >
      {isRecording && (
        <span className="absolute inset-0 rounded-xl bg-red-500/40 animate-ping" />
      )}
      {state === "denied" ? (
        <MicOff className="relative h-4 w-4" strokeWidth={2.25} />
      ) : isRecording ? (
        <SoundWave />
      ) : (
        <Mic className="relative h-4 w-4" strokeWidth={2.25} />
      )}
    </button>
  );
}

function SoundWave() {
  return (
    <span className="relative flex items-end gap-[2px] h-3.5">
      <span className="bob-soundwave-bar" style={{ animationDelay: "0ms" }} />
      <span className="bob-soundwave-bar" style={{ animationDelay: "120ms" }} />
      <span className="bob-soundwave-bar" style={{ animationDelay: "240ms" }} />
      <span className="bob-soundwave-bar" style={{ animationDelay: "360ms" }} />
    </span>
  );
}
