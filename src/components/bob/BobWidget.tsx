"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { BobButton } from "./BobButton";
import { BobPanel } from "./BobPanel";
import { BOB_WELCOME_MESSAGE } from "@/lib/bob/systemPrompt";
import {
  BOB_EVENTS,
  parseBobActions,
  type BobAction,
  type BobMessage,
} from "@/lib/bob/types";

interface BobWidgetProps {
  userId: string | null;
  onAction?: (action: BobAction) => void;
}

const HISTORY_KEY_PREFIX = "bob_chat_history_";
const LAST_SEEN_KEY = "bob_last_seen";
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const MAX_STORED_MESSAGES = 50;
const AUTO_OPEN_DELAY_MS = 1500;
const AUTO_CLOSE_DELAY_MS = 30_000;
const VOICE_AUTOSUBMIT_DELAY_MS = 1000;
const VOICE_AUTOSUBMIT_TICK_MS = 100;

function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function buildWelcomeMessage(): BobMessage {
  return {
    id: generateId(),
    role: "assistant",
    content: BOB_WELCOME_MESSAGE,
    createdAt: Date.now(),
  };
}

export function BobWidget({ userId, onAction }: BobWidgetProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<BobMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null
  );
  const [hasHydrated, setHasHydrated] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const autoCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userInteractedRef = useRef(false);

  // Voice-to-Quote pending dispatch.
  const voiceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const voiceTranscriptRef = useRef<string>("");
  const [voiceCountdown, setVoiceCountdown] = useState<number | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const historyKey = userId ? `${HISTORY_KEY_PREFIX}${userId}` : null;

  // ── Hydrate persisted history on mount / userId change ─────────────────
  useEffect(() => {
    if (!historyKey) return;
    try {
      const raw = window.localStorage.getItem(historyKey);
      if (raw) {
        const parsed = JSON.parse(raw) as BobMessage[];
        if (Array.isArray(parsed)) {
          setMessages(parsed.slice(-MAX_STORED_MESSAGES));
        }
      }
    } catch {
      // Corrupt history — ignore and start fresh.
    }
    setHasHydrated(true);
  }, [historyKey]);

  // ── Persist messages to localStorage ───────────────────────────────────
  useEffect(() => {
    if (!historyKey || !hasHydrated) return;
    try {
      const trimmed = messages.slice(-MAX_STORED_MESSAGES);
      window.localStorage.setItem(historyKey, JSON.stringify(trimmed));
    } catch {
      // Storage full or disabled — non-fatal.
    }
  }, [messages, historyKey, hasHydrated]);

  // ── Auto-popup logic: open 1.5s after dashboard mount, if first time
  //    or >24h since last seen.
  useEffect(() => {
    if (!hasHydrated) return;
    if (typeof window === "undefined") return;

    let lastSeen: number | null = null;
    try {
      const raw = window.localStorage.getItem(LAST_SEEN_KEY);
      lastSeen = raw ? Date.parse(raw) : null;
    } catch {
      lastSeen = null;
    }

    const shouldAutoOpen =
      !lastSeen ||
      Number.isNaN(lastSeen) ||
      Date.now() - lastSeen > TWENTY_FOUR_HOURS_MS;

    if (!shouldAutoOpen) return;

    const openTimer = setTimeout(() => {
      setIsOpen(true);
      autoCloseTimerRef.current = setTimeout(() => {
        if (!userInteractedRef.current) setIsOpen(false);
      }, AUTO_CLOSE_DELAY_MS);
    }, AUTO_OPEN_DELAY_MS);

    return () => {
      clearTimeout(openTimer);
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    };
  }, [hasHydrated]);

  // ── Seed welcome message the first time the panel opens with no
  //    history.
  useEffect(() => {
    if (!isOpen) return;
    if (messages.length === 0) {
      setMessages([buildWelcomeMessage()]);
    }
  }, [isOpen, messages.length]);

  // ── Mark "last seen" whenever the panel opens ──────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    try {
      window.localStorage.setItem(LAST_SEEN_KEY, new Date().toISOString());
    } catch {
      // ignore
    }
  }, [isOpen]);

  // ── Cancel any in-flight stream on unmount ─────────────────────────────
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const markInteracted = useCallback(() => {
    userInteractedRef.current = true;
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
  }, []);

  // ── Voice-to-Quote ────────────────────────────────────────────────────
  const cancelVoiceDispatch = useCallback(() => {
    if (voiceTimerRef.current) {
      clearInterval(voiceTimerRef.current);
      voiceTimerRef.current = null;
    }
    voiceTranscriptRef.current = "";
    setVoiceCountdown(null);
  }, []);

  const handleVoiceTranscript = useCallback(
    (transcript: string) => {
      const trimmed = transcript.trim();
      if (!trimmed) return;

      markInteracted();
      cancelVoiceDispatch();
      setVoiceError(null);
      voiceTranscriptRef.current = trimmed;

      // Show the transcript in the input so the user can confirm visually.
      setInputValue(trimmed);

      const startedAt = Date.now();
      setVoiceCountdown(Math.ceil(VOICE_AUTOSUBMIT_DELAY_MS / 1000));

      voiceTimerRef.current = setInterval(() => {
        const elapsed = Date.now() - startedAt;
        const remaining = VOICE_AUTOSUBMIT_DELAY_MS - elapsed;

        if (remaining <= 0) {
          if (voiceTimerRef.current) {
            clearInterval(voiceTimerRef.current);
            voiceTimerRef.current = null;
          }
          const text = voiceTranscriptRef.current;
          voiceTranscriptRef.current = "";
          setVoiceCountdown(null);
          setInputValue("");

          window.dispatchEvent(
            new CustomEvent(BOB_EVENTS.openQuoteGenerator, {
              detail: { initialText: text, autoStart: true },
            })
          );
          return;
        }

        setVoiceCountdown(Math.max(1, Math.ceil(remaining / 1000)));
      }, VOICE_AUTOSUBMIT_TICK_MS);
    },
    [cancelVoiceDispatch, markInteracted]
  );

  const handleVoiceError = useCallback((message: string) => {
    setVoiceError(message);
  }, []);

  // Cancel pending voice dispatch when the user types (any change after
  // the transcript was inserted).
  useEffect(() => {
    if (voiceCountdown === null) return;
    if (inputValue !== voiceTranscriptRef.current) {
      cancelVoiceDispatch();
    }
  }, [inputValue, voiceCountdown, cancelVoiceDispatch]);

  // Cleanup voice timer on unmount.
  useEffect(() => {
    return () => {
      if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
    };
  }, []);

  const handleClose = useCallback(() => {
    markInteracted();
    setIsOpen(false);
  }, [markInteracted]);

  const handleOpen = useCallback(() => {
    markInteracted();
    setIsOpen(true);
  }, [markInteracted]);

  const handleClearHistory = useCallback(() => {
    markInteracted();
    abortRef.current?.abort();
    setIsStreaming(false);
    setStreamingMessageId(null);
    setMessages([buildWelcomeMessage()]);
    if (historyKey) {
      try {
        window.localStorage.removeItem(historyKey);
      } catch {
        // ignore
      }
    }
  }, [historyKey, markInteracted]);

  const sendMessage = useCallback(
    async (rawText: string) => {
      const text = rawText.trim();
      if (!text || isStreaming) return;
      markInteracted();

      const userMsg: BobMessage = {
        id: generateId(),
        role: "user",
        content: text,
        createdAt: Date.now(),
      };
      const assistantMsg: BobMessage = {
        id: generateId(),
        role: "assistant",
        content: "",
        createdAt: Date.now(),
      };

      // Snapshot of conversation to send to the API. We include the welcome
      // message only if it was followed by real conversation — Anthropic's
      // API requires the first message to be from the user, so we strip any
      // leading assistant messages.
      const conversation = [...messages, userMsg]
        .filter((m) => m.content.trim().length > 0)
        .map((m) => ({ role: m.role, content: m.content }));

      // Drop any leading assistant messages so the first message is "user".
      while (conversation.length > 0 && conversation[0].role !== "user") {
        conversation.shift();
      }

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setInputValue("");
      setIsStreaming(true);
      setStreamingMessageId(assistantMsg.id);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/bob/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: conversation,
            context: {
              page: pathname ?? "",
              userId: userId ?? "",
            },
          }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          const errText = await res.text().catch(() => "");
          throw new Error(
            errText || `Bob's API returned ${res.status} ${res.statusText}`
          );
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

          // Strip any [ACTION:...] tokens from the visible streaming text
          // so the user never sees them flash on screen.
          const visible = buffer.replace(/\[ACTION:[^\]]*\]?/gi, "");

          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsg.id ? { ...m, content: visible } : m
            )
          );
        }

        // Final pass: parse actions out of the complete buffer.
        const { text: cleaned, action } = parseBobActions(buffer);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id ? { ...m, content: cleaned } : m
          )
        );
        if (action && onAction) {
          onAction(action);
        }
      } catch (err) {
        const aborted =
          err instanceof DOMException && err.name === "AbortError";
        if (!aborted) {
          const message =
            err instanceof Error ? err.message : "Something went wrong.";
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsg.id
                ? {
                    ...m,
                    content:
                      m.content ||
                      `Sorry — I couldn't reach the server. ${message}`,
                  }
                : m
            )
          );
        }
      } finally {
        setIsStreaming(false);
        setStreamingMessageId(null);
        abortRef.current = null;
      }
    },
    [isStreaming, markInteracted, messages, onAction, pathname, userId]
  );

  // When a voice error fires, surface it as a transient banner via the
  // assistant message bubble — but keep it cheap (no chat history append).
  // Reuse the existing inputValue area is already noisy; we route errors
  // through onVoiceError → setVoiceError → render below.

  return (
    <div className="fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6 print:hidden">
      {isOpen ? (
        <div className="flex flex-col items-end gap-1.5">
          {voiceError && (
            <div className="max-w-[380px] rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800 shadow-sm">
              {voiceError}
              <button
                type="button"
                onClick={() => setVoiceError(null)}
                className="ml-2 font-semibold underline-offset-2 hover:underline"
              >
                Dismiss
              </button>
            </div>
          )}
          <BobPanel
            messages={messages}
            inputValue={inputValue}
            onInputChange={setInputValue}
            onSendMessage={sendMessage}
            onClose={handleClose}
            onClearHistory={handleClearHistory}
            isStreaming={isStreaming}
            streamingMessageId={streamingMessageId}
            onVoiceTranscript={handleVoiceTranscript}
            onVoiceError={handleVoiceError}
            voiceCountdownSeconds={voiceCountdown ?? undefined}
          />
        </div>
      ) : (
        <BobButton onClick={handleOpen} />
      )}
    </div>
  );
}
