"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

interface Props {
  publicNote: string;
  privateNote: string;
  footerNote: string;
  onChangePublic: (v: string) => void;
  onChangePrivate: (v: string) => void;
  onChangeFooter: (v: string) => void;
}

const tabs = [
  { key: "public", label: "Public Note" },
  { key: "private", label: "Private Note" },
  { key: "footer", label: "Foot Note" },
] as const;

type Tab = (typeof tabs)[number]["key"];

export function NotesTabs({
  publicNote,
  privateNote,
  footerNote,
  onChangePublic,
  onChangePrivate,
  onChangeFooter,
}: Props) {
  const [active, setActive] = useState<Tab>("public");

  const value =
    active === "public" ? publicNote : active === "private" ? privateNote : footerNote;
  const onChange =
    active === "public"
      ? onChangePublic
      : active === "private"
      ? onChangePrivate
      : onChangeFooter;

  const placeholder =
    active === "public"
      ? "Visible on PDF — thank-you message, payment instructions..."
      : active === "private"
      ? "Internal only — not shown on PDF"
      : "Footer text — terms, bank details...";

  return (
    <div>
      <div className="flex gap-0 border-b border-slate-200 mb-3">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActive(t.key)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              active === t.key
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-slate-400"
      />
    </div>
  );
}
