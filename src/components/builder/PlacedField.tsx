"use client";

import { useRef, useState } from "react";
import { Settings2 } from "lucide-react";
import { cn } from "@/lib/cn";
import type { PlacedField as PlacedFieldType, FieldType } from "./PDFBuilder";
import { FieldSettingsPopover } from "./FieldSettingsPopover";

const SENDER_COLORS = "bg-blue-100 text-blue-800";
const RECIPIENT_COLORS = "bg-yellow-100 text-yellow-800";

type HandleDir = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

const HANDLE_DEFS: { dir: HandleDir; style: React.CSSProperties }[] = [
  { dir: "nw", style: { top: -4, left: -4, cursor: "nw-resize" } },
  { dir: "n",  style: { top: -4, left: "calc(50% - 4px)", cursor: "n-resize" } },
  { dir: "ne", style: { top: -4, right: -4, cursor: "ne-resize" } },
  { dir: "e",  style: { top: "calc(50% - 4px)", right: -4, cursor: "e-resize" } },
  { dir: "se", style: { bottom: -4, right: -4, cursor: "se-resize" } },
  { dir: "s",  style: { bottom: -4, left: "calc(50% - 4px)", cursor: "s-resize" } },
  { dir: "sw", style: { bottom: -4, left: -4, cursor: "sw-resize" } },
  { dir: "w",  style: { top: "calc(50% - 4px)", left: -4, cursor: "w-resize" } },
];

function getMinPx(type: FieldType) {
  return type === "CHECKBOX" ? { w: 16, h: 16 } : { w: 80, h: 24 };
}

interface Props {
  field: PlacedFieldType;
  pageWidth: number;
  pageHeight: number;
  recipientInitials: string;
  senderInitials: string;
  recipientName: string;
  senderName: string;
  isSelected: boolean;
  inactive: boolean;
  onSelect: (id: string | null) => void;
  onMove: (id: string, x: number, y: number) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, patch: Partial<PlacedFieldType>) => void;
  onSenderSig: (id: string, label: string) => void;
}

export function PlacedField({
  field,
  pageWidth,
  pageHeight,
  recipientInitials,
  senderInitials,
  recipientName,
  senderName,
  isSelected,
  inactive,
  onSelect,
  onMove,
  onDelete,
  onUpdate,
  onSenderSig,
}: Props) {
  const [showPopover, setShowPopover] = useState(false);
  const [editing, setEditing] = useState(false);
  const [sizeLabel, setSizeLabel] = useState<string | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const fieldRef = useRef<HTMLDivElement>(null);

  const px = field.x * pageWidth;
  const py = field.y * pageHeight;
  const pw = field.width * pageWidth;
  const ph = field.height * pageHeight;

  const isSender = field.assignedTo === "SENDER";
  const colorClass = isSender ? SENDER_COLORS : RECIPIENT_COLORS;
  const initials = isSender ? senderInitials : recipientInitials;

  function onBodyMouseDown(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest("input,select,button")) return;
    e.stopPropagation();
    onSelect(field.id);

    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: field.x, origY: field.y };
    const onMov = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = (ev.clientX - dragRef.current.startX) / pageWidth;
      const dy = (ev.clientY - dragRef.current.startY) / pageHeight;
      onMove(field.id, dragRef.current.origX + dx, dragRef.current.origY + dy);
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener("mousemove", onMov);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMov);
    window.addEventListener("mouseup", onUp);
  }

  function onHandleMouseDown(e: React.MouseEvent, dir: HandleDir) {
    e.stopPropagation();
    e.preventDefault();

    const orig = { x: field.x, y: field.y, w: field.width, h: field.height };
    const startX = e.clientX;
    const startY = e.clientY;
    const { w: minWPx, h: minHPx } = getMinPx(field.type);
    const minWR = minWPx / pageWidth;
    const minHR = minHPx / pageHeight;

    const onMov = (ev: MouseEvent) => {
      const dx = (ev.clientX - startX) / pageWidth;
      const dy = (ev.clientY - startY) / pageHeight;

      let nx = orig.x, ny = orig.y, nw = orig.w, nh = orig.h;

      if (dir.includes("w")) { nx = orig.x + dx; nw = orig.w - dx; }
      if (dir.includes("e")) { nw = orig.w + dx; }
      if (dir.includes("n")) { ny = orig.y + dy; nh = orig.h - dy; }
      if (dir.includes("s")) { nh = orig.h + dy; }

      if (nw < minWR) { if (dir.includes("w")) nx = orig.x + orig.w - minWR; nw = minWR; }
      if (nh < minHR) { if (dir.includes("n")) ny = orig.y + orig.h - minHR; nh = minHR; }

      nx = Math.max(0, nx);
      ny = Math.max(0, ny);
      if (nx + nw > 1) nw = 1 - nx;
      if (ny + nh > 1) nh = 1 - ny;

      onUpdate(field.id, { x: nx, y: ny, width: nw, height: nh });
      setSizeLabel(`${Math.round(nw * pageWidth)} × ${Math.round(nh * pageHeight)} px`);
    };

    const onUp = () => {
      setSizeLabel(null);
      window.removeEventListener("mousemove", onMov);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMov);
    window.addEventListener("mouseup", onUp);
  }

  function renderSenderContent() {
    if (!isSender) return null;
    const isSig = field.type === "SIGNATURE" || field.type === "INITIALS";

    if (isSig) {
      if (field._prefilledDataUrl) {
        return (
          <img
            src={field._prefilledDataUrl}
            alt="signature"
            className="w-full h-full object-contain"
            onClick={(e) => { e.stopPropagation(); onSenderSig(field.id, field.label || field.type); }}
          />
        );
      }
      return null;
    }

    if (field.type === "CHECKBOX") {
      return (
        <input
          type="checkbox"
          checked={field.prefilledValue === "true"}
          onChange={(e) => {
            e.stopPropagation();
            onUpdate(field.id, { prefilledValue: e.target.checked ? "true" : "false" });
          }}
          className="h-3 w-3 rounded"
          onClick={(e) => e.stopPropagation()}
        />
      );
    }

    if (editing) {
      return (
        <input
          autoFocus
          type={field.type === "DATE" ? "date" : "text"}
          value={field.prefilledValue || ""}
          onChange={(e) => onUpdate(field.id, { prefilledValue: e.target.value })}
          onBlur={() => setEditing(false)}
          onClick={(e) => e.stopPropagation()}
          className="w-full h-full bg-transparent border-none outline-none text-xs px-0.5"
        />
      );
    }

    if (field.prefilledValue) {
      return (
        <span
          className="text-xs truncate px-0.5"
          onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); }}
        >
          {field.prefilledValue}
        </span>
      );
    }

    return null;
  }

  const senderContent = renderSenderContent();
  const showDefaultLabel = !senderContent;

  const borderStyle = isSelected
    ? "2px solid #2563EB"
    : isSender
    ? "1px solid #93c5fd"
    : "1px solid #fbbf24";

  return (
    <>
      {/*
        Two-layer structure:
        - Outer div: overflow:visible so the gear icon and resize handles
          can render outside the field boundary without being clipped.
        - Inner div: overflow:hidden to clip field text content.
      */}
      <div
        ref={fieldRef}
        style={{
          position: "absolute",
          left: px,
          top: py,
          width: pw,
          height: ph,
          overflow: "visible",
          zIndex: isSelected ? 10 : 2,
          pointerEvents: inactive ? "none" : undefined,
        }}
      >
        {/* Inner content area */}
        <div
          onMouseDown={onBodyMouseDown}
          onClick={(e) => {
            e.stopPropagation();
            if (isSender && (field.type === "SIGNATURE" || field.type === "INITIALS")) {
              onSenderSig(field.id, field.label || field.type);
            } else if (isSender && field.type !== "CHECKBOX" && !editing) {
              setEditing(true);
            }
          }}
          style={{
            position: "absolute",
            inset: 0,
            border: borderStyle,
            borderRadius: 3,
            cursor: "move",
            overflow: "hidden",
            boxSizing: "border-box",
          }}
          className={cn("select-none flex items-center gap-1 px-1", colorClass)}
          title={`${field.type} — ${isSender ? "You" : "Recipient"}`}
        >
          {showDefaultLabel ? (
            <>
              <span
                className={cn(
                  "h-4 w-4 rounded-full text-white text-[9px] flex items-center justify-center font-bold shrink-0",
                  isSender ? "bg-blue-600" : "bg-yellow-500"
                )}
              >
                {initials || "?"}
              </span>
              <span className="truncate text-xs font-medium">{field.label || field.type}</span>
              {field.required && <span className="text-red-500 shrink-0 text-xs">*</span>}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center overflow-hidden">
              {senderContent}
            </div>
          )}
        </div>

        {/* Always-visible gear icon — sits outside the top-right corner of the field */}
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); setShowPopover((v) => !v); }}
          style={{
            position: "absolute",
            top: -10,
            right: -10,
            zIndex: 25,
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "white",
            border: "1px solid #cbd5e1",
            boxShadow: "0 1px 3px rgba(0,0,0,0.18)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            padding: 0,
          }}
          title="Field settings"
        >
          <Settings2 style={{ width: 11, height: 11, color: "#334155" }} />
        </button>

        {/* 8 resize handles — only when selected */}
        {isSelected && HANDLE_DEFS.map(({ dir, style }) => (
          <div
            key={dir}
            data-handle={dir}
            onMouseDown={(e) => onHandleMouseDown(e, dir)}
            style={{
              position: "absolute",
              width: 8,
              height: 8,
              background: "white",
              border: "1.5px solid #2563EB",
              borderRadius: 1,
              zIndex: 20,
              ...style,
            }}
          />
        ))}

        {/* Size indicator while resizing */}
        {sizeLabel && (
          <div
            style={{
              position: "absolute",
              bottom: -22,
              left: 0,
              background: "rgba(15,23,42,0.85)",
              color: "white",
              fontSize: 10,
              padding: "2px 6px",
              borderRadius: 3,
              whiteSpace: "nowrap",
              pointerEvents: "none",
              zIndex: 30,
            }}
          >
            {sizeLabel}
          </div>
        )}
      </div>

      {showPopover && (
        <FieldSettingsPopover
          field={field}
          anchorRect={fieldRef.current?.getBoundingClientRect() ?? null}
          recipientName={recipientName}
          senderName={senderName}
          onUpdate={(patch) => onUpdate(field.id, patch)}
          onDelete={() => { onDelete(field.id); setShowPopover(false); }}
          onClose={() => setShowPopover(false)}
        />
      )}
    </>
  );
}
