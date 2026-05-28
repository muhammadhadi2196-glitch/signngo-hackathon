"use client";

import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/cn";

interface BobButtonProps {
  onClick: () => void;
  hasUnread?: boolean;
}

export function BobButton({ onClick, hasUnread = false }: BobButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-label="Open Bob assistant"
      className={cn(
        "group relative h-14 w-14 rounded-full",
        "bg-gradient-to-br from-blue-600 to-blue-800",
        "shadow-2xl shadow-blue-500/30",
        "flex items-center justify-center",
        "text-white",
        "transition-all duration-300 ease-out",
        "hover:scale-105 hover:shadow-blue-500/50",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
      )}
    >
      {hasUnread && (
        <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
        </span>
      )}
      <MessageCircle className="h-6 w-6 transition-transform duration-300 group-hover:scale-110" strokeWidth={2.25} />
    </button>
  );
}
