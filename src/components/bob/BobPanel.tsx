"use client";

import { useEffect, useRef } from "react";
import { Minus, RefreshCw } from "lucide-react";
import { cn } from "@/lib/cn";
import { BobMessage } from "./BobMessage";
import { BobInput } from "./BobInput";
import { BobQuickActions } from "./BobQuickActions";
import { BOB_QUICK_ACTIONS } from "@/lib/bob/systemPrompt";
import type { BobMessage as BobMessageType } from "@/lib/bob/types";

interface BobPanelProps {
  messages: BobMessageType[];
  inputValue: string;
  onInputChange: (value: string) => void;
  onSendMessage: (message: string) => void;
  onClose: () => void;
  onClearHistory: () => void;
  isStreaming: boolean;
  streamingMessageId: string | null;
  onVoiceTranscript?: (text: string) => void;
  onVoiceError?: (message: string) => void;
  voiceCountdownSeconds?: number;
}

export function BobPanel({
  messages,
  inputValue,
  onInputChange,
  onSendMessage,
  onClose,
  onClearHistory,
  isStreaming,
  streamingMessageId,
  onVoiceTranscript,
  onVoiceError,
  voiceCountdownSeconds,
}: BobPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom whenever messages change or content streams in.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, isStreaming]);

  // Hide quick actions after the user has sent at least one message.
  const hasUserMessage = messages.some((m) => m.role === "user");
  const showQuickActions = !hasUserMessage && !isStreaming;

  function handleSubmit() {
    const trimmed = inputValue.trim();
    if (!trimmed || isStreaming) return;
    onSendMessage(trimmed);
  }

  return (
    <div
      role="dialog"
      aria-label="Bob assistant"
      className={cn(
        "bob-panel-in",
        "flex flex-col overflow-hidden",
        "rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-blue-500/10",
        // Desktop sizing
        "h-[580px] w-[380px]",
        // Mobile: nearly fullscreen anchored bottom
        "max-sm:h-[80vh] max-sm:w-[90vw]"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full",
            "bg-gradient-to-br from-blue-600 to-blue-800 text-white",
            "text-sm font-semibold shadow-md shadow-blue-500/20"
          )}
          aria-hidden
        >
          B
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-900">Bob</span>
            <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              Online
            </span>
          </div>
          <p className="text-[11px] text-slate-500">Your signNGO assistant</p>
        </div>
        <button
          type="button"
          onClick={onClearHistory}
          aria-label="New chat"
          title="New chat"
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg text-slate-400",
            "transition-all duration-200",
            "hover:bg-slate-100 hover:text-slate-700"
          )}
        >
          <RefreshCw className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Minimize"
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg text-slate-400",
            "transition-all duration-200",
            "hover:bg-slate-100 hover:text-slate-700"
          )}
        >
          <Minus className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
      >
        {messages.map((m) => (
          <BobMessage
            key={m.id}
            role={m.role}
            content={m.content}
            isStreaming={isStreaming && m.id === streamingMessageId}
          />
        ))}
      </div>

      {/* Quick actions (only before first user message) */}
      {showQuickActions && (
        <BobQuickActions
          actions={BOB_QUICK_ACTIONS}
          onSelect={(message) => onSendMessage(message)}
          disabled={isStreaming}
        />
      )}

      {/* Input */}
      <div className="border-t border-slate-100 bg-slate-50/50 p-3 space-y-1.5">
        {voiceCountdownSeconds !== undefined && voiceCountdownSeconds > 0 && (
          <p className="text-[11px] font-medium text-blue-600 px-1">
            ✓ Got it. Opening quote builder in {voiceCountdownSeconds}s — type
            to cancel.
          </p>
        )}
        <BobInput
          value={inputValue}
          onChange={onInputChange}
          onSubmit={handleSubmit}
          disabled={isStreaming}
          autoFocus
          onVoiceTranscript={onVoiceTranscript}
          onVoiceError={onVoiceError}
        />
      </div>
    </div>
  );
}
