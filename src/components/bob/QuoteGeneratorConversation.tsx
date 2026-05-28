"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { cn } from "@/lib/cn";
import { BobMessage } from "./BobMessage";
import type { ClarifyTurn } from "@/lib/bob/types";

interface QuoteGeneratorConversationProps {
  originalInput: string;
  turns: ClarifyTurn[];
  pendingQuestion: string;
  isStreaming: boolean;
  awaitingAnswer: boolean;
  onSubmitAnswer: (answer: string) => void;
}

export function QuoteGeneratorConversation({
  originalInput,
  turns,
  pendingQuestion,
  isStreaming,
  awaitingAnswer,
  onSubmitAnswer,
}: QuoteGeneratorConversationProps) {
  const [answer, setAnswer] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [turns, pendingQuestion, isStreaming]);

  useEffect(() => {
    if (awaitingAnswer) {
      // Brief pause so the streamed question fully renders before focus.
      const t = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [awaitingAnswer]);

  const canSubmit = answer.trim().length > 0 && awaitingAnswer;

  function submit() {
    if (!canSubmit) return;
    const value = answer.trim();
    setAnswer("");
    onSubmitAnswer(value);
  }

  return (
    <div className="flex flex-col h-[420px]">
      <div className="flex-1 overflow-y-auto px-1 py-2 space-y-3" ref={scrollRef}>
        <BobMessage role="user" content={originalInput} />

        {turns.map((turn, i) => (
          <div key={i} className="space-y-3">
            <BobMessage role="assistant" content={turn.question} />
            <BobMessage role="user" content={turn.answer} />
          </div>
        ))}

        {(pendingQuestion || isStreaming) && (
          <BobMessage
            role="assistant"
            content={pendingQuestion}
            isStreaming={isStreaming && pendingQuestion.length === 0}
          />
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className={cn(
          "mt-3 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1.5",
          "transition-all duration-200",
          "focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100",
          !awaitingAnswer && "opacity-60"
        )}
      >
        <input
          ref={inputRef}
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder={awaitingAnswer ? "Type your answer…" : "Bob is thinking…"}
          disabled={!awaitingAnswer}
          className="flex-1 bg-transparent px-2.5 py-1.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          disabled={!canSubmit}
          aria-label="Send answer"
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
    </div>
  );
}
