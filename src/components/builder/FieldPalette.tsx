"use client";

import { PenLine, Type, Calendar, CheckSquare, ChevronDown, Fingerprint } from "lucide-react";
import { cn } from "@/lib/cn";
import type { FieldType, FieldAssignee } from "./PDFBuilder";

interface Props {
  recipientInitials: string;
  recipientName: string;
  senderInitials: string;
  senderName: string;
  pendingType: FieldType | null;
  pendingAssignee: FieldAssignee;
  onSelectType: (t: FieldType) => void;
  onSelectAssignee: (a: FieldAssignee) => void;
}

const FIELD_TYPES: { type: FieldType; label: string; icon: React.ReactNode }[] = [
  { type: "SIGNATURE",  label: "Signature",  icon: <PenLine className="h-5 w-5" /> },
  { type: "INITIALS",   label: "Initials",   icon: <Fingerprint className="h-5 w-5" /> },
  { type: "TEXT",       label: "Text field", icon: <Type className="h-5 w-5" /> },
  { type: "DATE",       label: "Date",       icon: <Calendar className="h-5 w-5" /> },
  { type: "CHECKBOX",   label: "Checkbox",   icon: <CheckSquare className="h-5 w-5" /> },
  { type: "DROPDOWN",   label: "Dropdown",   icon: <ChevronDown className="h-5 w-5" /> },
];

export function FieldPalette({
  recipientInitials,
  recipientName,
  senderInitials,
  senderName,
  pendingType,
  pendingAssignee,
  onSelectType,
  onSelectAssignee,
}: Props) {
  return (
    <div className="w-52 shrink-0 border-r border-slate-200 bg-white flex flex-col overflow-y-auto">
      {/* Assignee toggle */}
      <div className="p-3 border-b border-slate-100 space-y-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Add fields for</p>
        <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-medium">
          <button
            onClick={() => onSelectAssignee("RECIPIENT")}
            className={cn(
              "flex-1 py-1.5 text-center transition-colors",
              pendingAssignee === "RECIPIENT"
                ? "bg-yellow-500 text-white"
                : "bg-white text-slate-600 hover:bg-slate-50"
            )}
          >
            Recipient
          </button>
          <button
            onClick={() => onSelectAssignee("SENDER")}
            className={cn(
              "flex-1 py-1.5 text-center transition-colors border-l border-slate-200",
              pendingAssignee === "SENDER"
                ? "bg-blue-600 text-white"
                : "bg-white text-slate-600 hover:bg-slate-50"
            )}
          >
            Me
          </button>
        </div>

        {/* Recipient or sender info */}
        {pendingAssignee === "RECIPIENT" ? (
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-yellow-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
              {recipientInitials || "?"}
            </div>
            <p className="text-xs text-slate-600 truncate">{recipientName}</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                {senderInitials || "M"}
              </div>
              <p className="text-xs text-slate-600 truncate">{senderName}</p>
            </div>
            <p className="text-xs text-slate-400 pl-8">Locked in when you send</p>
          </div>
        )}
      </div>

      {/* Field type buttons */}
      <div className="p-3 space-y-1 flex-1">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Fields</p>
        {FIELD_TYPES.map(({ type, label, icon }) => (
          <button
            key={type}
            onClick={() => onSelectType(type)}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              pendingType === type
                ? pendingAssignee === "SENDER"
                  ? "bg-blue-600 text-white"
                  : "bg-yellow-500 text-white"
                : "text-slate-700 hover:bg-slate-100"
            )}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
