"use client";

import { cn } from "@/lib/cn";

interface BobQuickActionsProps {
  actions: { label: string; message: string }[];
  onSelect: (message: string) => void;
  disabled?: boolean;
}

export function BobQuickActions({
  actions,
  onSelect,
  disabled = false,
}: BobQuickActionsProps) {
  return (
    <div className="flex flex-wrap gap-1.5 px-3 pb-2">
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(action.message)}
          className={cn(
            "rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700",
            "transition-all duration-200",
            "hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700",
            "active:scale-95",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-slate-200 disabled:hover:bg-white disabled:hover:text-slate-700"
          )}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
