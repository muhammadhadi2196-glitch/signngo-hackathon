"use client";

import { cn } from "@/lib/cn";

interface BobMessageProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

function BobAvatar() {
  return (
    <div
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
        "bg-gradient-to-br from-blue-600 to-blue-800 text-white",
        "text-xs font-semibold shadow-md shadow-blue-500/20"
      )}
      aria-hidden
    >
      B
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1" aria-label="Bob is typing">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
    </div>
  );
}

export function BobMessage({ role, content, isStreaming = false }: BobMessageProps) {
  const isUser = role === "user";
  const showTyping = !isUser && isStreaming && content.length === 0;

  return (
    <div
      className={cn(
        "bob-fade-up flex w-full gap-2",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {!isUser && <BobAvatar />}
      <div
        className={cn(
          "max-w-[78%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words",
          isUser
            ? "bg-blue-600 text-white rounded-br-sm shadow-sm shadow-blue-500/20"
            : "bg-slate-100 text-slate-800 rounded-bl-sm"
        )}
      >
        {showTyping ? <TypingDots /> : content}
      </div>
    </div>
  );
}
