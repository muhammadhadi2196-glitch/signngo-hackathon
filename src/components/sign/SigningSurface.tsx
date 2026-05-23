"use client";

import "@/lib/pdf/pdfWorker";
import { useEffect, useRef, useState } from "react";
import { Document, Page } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { SignatureModal } from "./SignatureModal";

interface Field {
  id: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: string;
  label: string;
  required: boolean;
  optionsJson?: string;
  assignedTo?: string;
  prefilledValue?: string | null;
  prefilledImagePath?: string | null;
}

interface Props {
  token: string;
  request: {
    id: string;
    recipientName: string;
    recipientEmail: string;
    status: string;
    fields: Field[];
  };
  document: {
    id: string;
    title: string;
    pageCount: number;
    pdfUrl: string;
  };
  sender: {
    businessName: string;
    logoPath: string | null;
  };
}

export function SigningSurface({ token, request, document, sender }: Props) {
  const [pageDims, setPageDims] = useState<Record<number, { w: number; h: number }>>({});
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [sigDataUrls, setSigDataUrls] = useState<Record<string, string>>({});
  // Loaded sender signature images (path -> object URL)
  const [senderImages, setSenderImages] = useState<Record<string, string>>({});
  const [signModal, setSignModal] = useState<{ fieldId: string; label: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ downloadUrl: string } | null>(null);
  const [numPages, setNumPages] = useState(document.pageCount || 1);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewedRef = useRef(false);

  const allFields = request.fields;
  const recipientFields = allFields.filter((f) => !f.assignedTo || f.assignedTo === "RECIPIENT");
  const senderFields = allFields.filter((f) => f.assignedTo === "SENDER");

  // Fire viewed exactly once on mount
  useEffect(() => {
    if (viewedRef.current) return;
    viewedRef.current = true;
    fetch(`/api/sign/${token}/viewed`, { method: "POST" }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load sender prefilled images
  useEffect(() => {
    const fieldsWithImages = senderFields.filter((f) => f.prefilledImagePath);
    if (fieldsWithImages.length === 0) return;
    fieldsWithImages.forEach(async (f) => {
      try {
        const res = await fetch(`/api/sign/${token}/prefill-image?path=${encodeURIComponent(f.prefilledImagePath!)}`);
        if (!res.ok) return;
        const { url } = await res.json();
        setSenderImages((prev) => ({ ...prev, [f.id]: url }));
      } catch {}
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const required = recipientFields.filter((f) => f.required);
  const completed = required.filter((f) => {
    if (f.type === "SIGNATURE" || f.type === "INITIALS") return !!sigDataUrls[f.id];
    if (f.type === "CHECKBOX") return values[f.id] === true;
    return !!values[f.id] && String(values[f.id]).trim() !== "";
  });

  const pages = Array.from({ length: numPages }, (_, i) => i + 1);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/sign/${token}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values, signatureDataUrls: sigDataUrls }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");
      setDone({ downloadUrl: data.downloadUrl });
    } catch (e: any) {
      alert(e.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 max-w-md w-full text-center">
          <div className="h-14 w-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4 text-2xl">🎉</div>
          <h1 className="text-xl font-semibold text-slate-900">Document signed!</h1>
          <p className="text-sm text-slate-500 mt-2">Your signed copy is on its way to your inbox.</p>
          <a
            href={done.downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700 transition-colors"
          >
            Download now
          </a>
          <p className="mt-6 text-xs text-slate-400">Powered by signNGO</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 shadow-sm">
        <span className="text-sm font-semibold text-slate-900 truncate max-w-xs">{sender.businessName}</span>
        <span className="text-sm font-medium text-slate-700 truncate hidden sm:block">{document.title}</span>
        <span className="text-xs text-slate-400">Powered by signNGO</span>
      </div>

      {/* PDF canvas */}
      <div className="flex-1 overflow-auto p-4">
        <div ref={containerRef} className="flex flex-col items-center gap-6 max-w-3xl mx-auto">
          <Document
            file={document.pdfUrl}
            onLoadSuccess={({ numPages: n }) => setNumPages(n)}
            loading={
              <div className="h-96 w-full bg-white rounded shadow flex items-center justify-center text-slate-400 text-sm">
                Loading PDF…
              </div>
            }
          >
            {pages.map((pageNum) => (
              <div key={pageNum} className="relative bg-white shadow-md">
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

                {pageDims[pageNum] && (() => {
                  const dim = pageDims[pageNum];
                  return (
                    <>
                      {/* Sender pre-filled fields — read-only stamps */}
                      {senderFields
                        .filter((f) => f.page === pageNum)
                        .map((f) => {
                          const style: React.CSSProperties = {
                            position: "absolute",
                            left: f.x * dim.w,
                            top: f.y * dim.h,
                            width: f.width * dim.w,
                            height: f.height * dim.h,
                            pointerEvents: "none",
                          };
                          const isSig = f.type === "SIGNATURE" || f.type === "INITIALS";
                          return (
                            <div key={f.id} style={style} className="flex items-center justify-center overflow-hidden">
                              {isSig && senderImages[f.id] ? (
                                <img src={senderImages[f.id]} alt="signature" className="w-full h-full object-contain" />
                              ) : f.type === "CHECKBOX" ? (
                                <span className="text-sm font-bold">{f.prefilledValue === "true" ? "✓" : ""}</span>
                              ) : (
                                <span className="text-xs text-slate-800 px-0.5 truncate">{f.prefilledValue}</span>
                              )}
                            </div>
                          );
                        })}

                      {/* Recipient fields — interactive */}
                      {recipientFields
                        .filter((f) => f.page === pageNum)
                        .map((f) => {
                          const style: React.CSSProperties = {
                            position: "absolute",
                            left: f.x * dim.w,
                            top: f.y * dim.h,
                            width: f.width * dim.w,
                            height: f.height * dim.h,
                          };
                          const isSig = f.type === "SIGNATURE" || f.type === "INITIALS";
                          const filled = isSig
                            ? !!sigDataUrls[f.id]
                            : f.type === "CHECKBOX"
                            ? values[f.id] === true
                            : !!values[f.id];

                          return (
                            <div key={f.id} style={style}>
                              {isSig ? (
                                sigDataUrls[f.id] ? (
                                  <img
                                    src={sigDataUrls[f.id]}
                                    alt="signature"
                                    className="w-full h-full object-contain cursor-pointer"
                                    onClick={() => setSignModal({ fieldId: f.id, label: f.label || f.type })}
                                  />
                                ) : (
                                  <button
                                    onClick={() => setSignModal({ fieldId: f.id, label: f.label || f.type })}
                                    className={cn(
                                      "w-full h-full border-2 border-dashed rounded text-xs font-medium flex items-center justify-center transition-colors",
                                      f.required
                                        ? "border-yellow-400 bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
                                        : "border-slate-300 bg-slate-50 text-slate-500 hover:bg-slate-100"
                                    )}
                                  >
                                    {f.label || f.type}
                                  </button>
                                )
                              ) : f.type === "CHECKBOX" ? (
                                <label className="flex items-center justify-center w-full h-full cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={!!values[f.id]}
                                    onChange={(e) =>
                                      setValues((v) => ({ ...v, [f.id]: e.target.checked }))
                                    }
                                    className="h-4 w-4 rounded border-slate-300"
                                  />
                                </label>
                              ) : f.type === "DROPDOWN" ? (
                                <select
                                  value={String(values[f.id] || "")}
                                  onChange={(e) =>
                                    setValues((v) => ({ ...v, [f.id]: e.target.value }))
                                  }
                                  className={cn(
                                    "w-full h-full border rounded px-1 text-xs focus:outline-none focus:ring-1 focus:ring-yellow-400",
                                    filled ? "border-slate-300 bg-white" : "border-yellow-400 bg-yellow-50"
                                  )}
                                >
                                  <option value="">Select…</option>
                                  {JSON.parse(f.optionsJson || "[]").map((opt: string) => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  type={f.type === "DATE" ? "date" : "text"}
                                  value={String(values[f.id] || "")}
                                  onChange={(e) =>
                                    setValues((v) => ({ ...v, [f.id]: e.target.value }))
                                  }
                                  placeholder={f.label || f.type}
                                  className={cn(
                                    "w-full h-full border rounded px-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-yellow-400",
                                    filled ? "border-slate-300 bg-white" : "border-yellow-400 bg-yellow-50"
                                  )}
                                />
                              )}
                            </div>
                          );
                        })}
                    </>
                  );
                })()}
              </div>
            ))}
          </Document>
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="sticky bottom-0 z-30 flex items-center justify-between gap-4 px-4 py-3 bg-white border-t border-slate-200 shadow-sm">
        <p className="text-sm text-slate-600">
          <span className="font-semibold text-slate-900">{completed.length}</span>
          {" / "}
          {required.length} required fields completed
        </p>
        <Button
          variant="accent"
          onClick={handleSubmit}
          loading={submitting}
          disabled={completed.length < required.length}
        >
          Submit
        </Button>
      </div>

      {signModal && (
        <SignatureModal
          label={signModal.label}
          onAdopt={(url) => setSigDataUrls((s) => ({ ...s, [signModal.fieldId]: url }))}
          onClose={() => setSignModal(null)}
        />
      )}
    </div>
  );
}
