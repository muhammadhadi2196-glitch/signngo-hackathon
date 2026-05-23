"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Trash2 } from "lucide-react";
import type { PlacedField, FieldAssignee } from "./PDFBuilder";

interface Props {
  field: PlacedField;
  anchorRect: DOMRect | null;
  recipientName: string;
  senderName: string;
  onUpdate: (patch: Partial<PlacedField>) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function FieldSettingsPopover({
  field,
  anchorRect,
  recipientName,
  senderName,
  onUpdate,
  onDelete,
  onClose,
}: Props) {
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const pop = popRef.current;
    if (!pop || !anchorRect) return;
    const spaceBelow = window.innerHeight - anchorRect.bottom - 8;
    const popH = pop.offsetHeight;
    if (spaceBelow < popH) {
      pop.style.top = `${anchorRect.top - popH - 4}px`;
    } else {
      pop.style.top = `${anchorRect.bottom + 4}px`;
    }
    pop.style.left = `${Math.min(anchorRect.left, window.innerWidth - 240)}px`;
    pop.style.visibility = "visible";
  }, [anchorRect]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!popRef.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return createPortal(
    <div
      ref={popRef}
      style={{ position: "fixed", zIndex: 9999, visibility: "hidden", minWidth: 220 }}
      className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 space-y-3"
    >
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{field.type}</p>

      {/* Assignee selector */}
      <div>
        <p className="text-xs text-slate-600 mb-1">Person completing this field</p>
        <select
          value={field.assignedTo}
          onChange={(e) => onUpdate({ assignedTo: e.target.value as FieldAssignee, prefilledValue: null, prefilledImagePath: null, _prefilledDataUrl: undefined })}
          className="w-full border border-slate-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
        >
          <option value="RECIPIENT">{recipientName}</option>
          <option value="SENDER">Me ({senderName})</option>
        </select>
      </div>

      {/* Label */}
      <div>
        <label className="text-xs text-slate-600">Label</label>
        <input
          type="text"
          value={field.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          placeholder="e.g. Signature"
          className="mt-0.5 block w-full border border-slate-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
        />
      </div>

      <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
        <input
          type="checkbox"
          checked={field.required}
          onChange={(e) => onUpdate({ required: e.target.checked })}
          className="rounded"
        />
        Required
      </label>

      <button
        onClick={onDelete}
        className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-800"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete field
      </button>
    </div>,
    document.body
  );
}
