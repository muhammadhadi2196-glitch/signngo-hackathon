"use client";

import { ArrowLeft, Settings2, Trash2 } from "lucide-react";
import type { PlacedField, FieldAssignee } from "./PDFBuilder";

interface Props {
  field: PlacedField;
  recipientName: string;
  senderName: string;
  pageDim: { w: number; h: number } | null;
  onUpdate: (patch: Partial<PlacedField>) => void;
  onDelete: () => void;
  onBack: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  SIGNATURE: "Signature",
  INITIALS:  "Initials",
  TEXT:      "Text",
  DATE:      "Date",
  CHECKBOX:  "Checkbox",
  DROPDOWN:  "Dropdown",
};

export function FieldSettingsPanel({
  field,
  recipientName,
  senderName,
  pageDim,
  onUpdate,
  onDelete,
  onBack,
}: Props) {
  const wPx = pageDim ? Math.round(field.width * pageDim.w) : null;
  const hPx = pageDim ? Math.round(field.height * pageDim.h) : null;

  return (
    <div className="w-52 shrink-0 border-r border-slate-200 bg-white flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="p-3 border-b border-slate-100">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 mb-3 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to fields
        </button>
        <div className="flex items-center gap-1.5">
          <Settings2 className="h-4 w-4 text-slate-500 shrink-0" />
          <p className="text-sm font-semibold text-slate-800">
            {TYPE_LABELS[field.type] ?? field.type} field
          </p>
        </div>
        {wPx !== null && hPx !== null && (
          <p className="text-[11px] text-slate-400 mt-0.5 pl-[22px]">
            Page {field.page} · {wPx} × {hPx} px
          </p>
        )}
      </div>

      {/* Controls */}
      <div className="p-3 space-y-4 flex-1">
        <div>
          <p className="text-xs font-medium text-slate-600 mb-1">Person completing this field</p>
          <select
            value={field.assignedTo}
            onChange={(e) =>
              onUpdate({
                assignedTo: e.target.value as FieldAssignee,
                prefilledValue: null,
                prefilledImagePath: null,
                _prefilledDataUrl: undefined,
              })
            }
            className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            <option value="RECIPIENT">{recipientName}</option>
            <option value="SENDER">Me ({senderName})</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-600">Label</label>
          <input
            type="text"
            value={field.label}
            onChange={(e) => onUpdate({ label: e.target.value })}
            placeholder="e.g. Signature"
            className="mt-1 block w-full border border-slate-300 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>

        <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={field.required}
            onChange={(e) => onUpdate({ required: e.target.checked })}
            className="rounded"
          />
          Required
        </label>
      </div>

      {/* Delete */}
      <div className="p-3 border-t border-slate-100">
        <button
          onClick={onDelete}
          className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-800 font-medium transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete field
        </button>
      </div>
    </div>
  );
}
