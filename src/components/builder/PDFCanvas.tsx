"use client";

import { useRef, useState } from "react";
import { Document, Page } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import type { FieldType, PlacedField } from "./PDFBuilder";
import { PlacedField as PlacedFieldComponent } from "./PlacedField";

interface Props {
  pdfUrl: string;
  pageCount: number;
  fields: PlacedField[];
  pendingType: FieldType | null;
  recipientInitials: string;
  senderInitials: string;
  recipientName: string;
  senderName: string;
  onCanvasClick: (page: number, x: number, y: number, w?: number, h?: number) => void;
  onMove: (id: string, x: number, y: number) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, patch: Partial<PlacedField>) => void;
  onSenderSig: (id: string, label: string) => void;
}

type DrawPreview = { page: number; x: number; y: number; w: number; h: number };

export function PDFCanvas({
  pdfUrl,
  pageCount: initialPageCount,
  fields,
  pendingType,
  recipientInitials,
  senderInitials,
  recipientName,
  senderName,
  onCanvasClick,
  onMove,
  onDelete,
  onUpdate,
  onSenderSig,
}: Props) {
  const [pageDims, setPageDims] = useState<Record<number, { w: number; h: number }>>({});
  const [actualPageCount, setActualPageCount] = useState(initialPageCount || 1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawPreview, setDrawPreview] = useState<DrawPreview | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const drawRef = useRef<{
    page: number;
    startClientX: number;
    startClientY: number;
    dim: { w: number; h: number };
    pageEl: HTMLDivElement;
  } | null>(null);

  const pages = Array.from({ length: actualPageCount }, (_, i) => i + 1);

  function onPageMouseDown(e: React.MouseEvent<HTMLDivElement>, pageNum: number) {
    const dim = pageDims[pageNum];
    if (!dim) return;

    if (!pendingType) {
      setSelectedId(null);
      return;
    }

    e.preventDefault();
    const pageEl = e.currentTarget;
    drawRef.current = {
      page: pageNum,
      startClientX: e.clientX,
      startClientY: e.clientY,
      dim,
      pageEl,
    };

    const onMov = (ev: MouseEvent) => {
      if (!drawRef.current) return;
      const r = drawRef.current.pageEl.getBoundingClientRect();
      const sx = drawRef.current.startClientX - r.left;
      const sy = drawRef.current.startClientY - r.top;
      const cx = ev.clientX - r.left;
      const cy = ev.clientY - r.top;
      setDrawPreview({
        page: drawRef.current.page,
        x: Math.min(sx, cx),
        y: Math.min(sy, cy),
        w: Math.abs(cx - sx),
        h: Math.abs(cy - sy),
      });
    };

    const onUp = (ev: MouseEvent) => {
      if (!drawRef.current) return;
      const r = drawRef.current.pageEl.getBoundingClientRect();
      const { page, startClientX: scx, startClientY: scy, dim: d } = drawRef.current;
      const sx = scx - r.left;
      const sy = scy - r.top;
      const cx = ev.clientX - r.left;
      const cy = ev.clientY - r.top;
      const dx = cx - sx;
      const dy = cy - sy;

      drawRef.current = null;
      setDrawPreview(null);
      window.removeEventListener("mousemove", onMov);
      window.removeEventListener("mouseup", onUp);

      if (Math.abs(dx) < 10 || Math.abs(dy) < 10) {
        onCanvasClick(page, sx / d.w, sy / d.h);
      } else {
        const x = Math.min(sx, cx) / d.w;
        const y = Math.min(sy, cy) / d.h;
        onCanvasClick(page, x, y, Math.abs(dx) / d.w, Math.abs(dy) / d.h);
      }
    };

    window.addEventListener("mousemove", onMov);
    window.addEventListener("mouseup", onUp);
  }

  return (
    <div ref={containerRef} className="flex flex-col items-center gap-6">
      <Document
        file={pdfUrl}
        onLoadSuccess={({ numPages }) => setActualPageCount(numPages)}
        loading={
          <div className="h-96 w-[595px] max-w-full bg-white rounded shadow flex items-center justify-center text-slate-400 text-sm">
            Loading PDF…
          </div>
        }
        error={
          <div className="h-96 w-[595px] max-w-full bg-white rounded shadow flex items-center justify-center text-red-400 text-sm">
            Failed to load PDF
          </div>
        }
      >
        {pages.map((pageNum) => (
          <div
            key={pageNum}
            className="relative bg-white shadow-md mb-2"
            style={{ cursor: pendingType ? "crosshair" : "default" }}
            onMouseDown={(e) => onPageMouseDown(e, pageNum)}
          >
            <Page
              pageNumber={pageNum}
              width={Math.min(700, (containerRef.current?.clientWidth ?? 700) - 32)}
              renderAnnotationLayer={false}
              renderTextLayer={false}
              onRenderSuccess={(page) => {
                setPageDims((prev) => ({
                  ...prev,
                  [pageNum]: { w: page.width, h: page.height },
                }));
              }}
            />
            {pageDims[pageNum] &&
              fields
                .filter((f) => f.page === pageNum)
                .map((f) => (
                  <PlacedFieldComponent
                    key={f.id}
                    field={f}
                    pageWidth={pageDims[pageNum].w}
                    pageHeight={pageDims[pageNum].h}
                    recipientInitials={recipientInitials}
                    senderInitials={senderInitials}
                    recipientName={recipientName}
                    senderName={senderName}
                    isSelected={selectedId === f.id}
                    inactive={!!pendingType}
                    onSelect={setSelectedId}
                    onMove={onMove}
                    onDelete={onDelete}
                    onUpdate={onUpdate}
                    onSenderSig={onSenderSig}
                  />
                ))}

            {/* Draw-to-place preview rect */}
            {drawPreview && drawPreview.page === pageNum && (
              <div
                style={{
                  position: "absolute",
                  left: drawPreview.x,
                  top: drawPreview.y,
                  width: drawPreview.w,
                  height: drawPreview.h,
                  border: "2px dashed #2563EB",
                  borderRadius: 3,
                  background: "rgba(37,99,235,0.08)",
                  pointerEvents: "none",
                  zIndex: 50,
                }}
              />
            )}

            <div className="absolute bottom-2 right-2 bg-slate-900/50 text-white text-xs px-1.5 py-0.5 rounded pointer-events-none">
              {pageNum} / {actualPageCount}
            </div>
          </div>
        ))}
      </Document>
    </div>
  );
}
