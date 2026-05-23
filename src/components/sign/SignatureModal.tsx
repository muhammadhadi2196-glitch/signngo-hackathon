"use client";

import { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/Button";

interface Props {
  label: string;
  onAdopt: (dataUrl: string) => void;
  onClose: () => void;
}

const FONTS = [
  { name: "Dancing Script", css: "'Dancing Script', cursive" },
  { name: "Pacifico", css: "'Pacifico', cursive" },
  { name: "Satisfy", css: "'Satisfy', cursive" },
];

export function SignatureModal({ label, onAdopt, onClose }: Props) {
  const [tab, setTab] = useState<"draw" | "type">("draw");
  const [typed, setTyped] = useState("");
  const [font, setFont] = useState(0);
  const [mounted, setMounted] = useState(false);
  const sigRef = useRef<SignatureCanvas>(null);

  useEffect(() => { setMounted(true); }, []);

  function getDrawnDataUrl(): string | null {
    if (!sigRef.current || sigRef.current.isEmpty()) return null;
    const src = sigRef.current.getCanvas();
    const srcCtx = src.getContext("2d")!;
    const imageData = srcCtx.getImageData(0, 0, src.width, src.height);
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] > 240 && d[i + 1] > 240 && d[i + 2] > 240) d[i + 3] = 0;
    }
    const out = document.createElement("canvas");
    out.width = src.width;
    out.height = src.height;
    out.getContext("2d")!.putImageData(imageData, 0, 0);
    return out.toDataURL("image/png");
  }

  function getTypedDataUrl(): string | null {
    if (!typed.trim()) return null;
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 100;
    const ctx = canvas.getContext("2d")!;
    // No background fill — transparent canvas so the ink stamps cleanly on the PDF
    ctx.fillStyle = "#0f172a";
    ctx.font = `44px ${FONTS[font].css}`;
    ctx.textBaseline = "middle";
    ctx.fillText(typed, 12, 50);
    return canvas.toDataURL("image/png");
  }

  function handleAdopt() {
    const url = tab === "draw" ? getDrawnDataUrl() : getTypedDataUrl();
    if (!url) return;
    onAdopt(url);
    onClose();
  }

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">{label || "Sign here"}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex border-b border-slate-200">
          {(["draw", "type"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                tab === t
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t === "draw" ? "Draw" : "Type"}
            </button>
          ))}
        </div>

        <div className="p-6">
          {tab === "draw" && (
            <div className="space-y-3">
              <div className="border border-slate-300 rounded-xl overflow-hidden bg-slate-50">
                <SignatureCanvas
                  ref={sigRef}
                  penColor="#0f172a"
                  canvasProps={{ width: 460, height: 140, className: "w-full" }}
                  backgroundColor="rgba(248,250,252,1)"
                />
              </div>
              <button
                onClick={() => sigRef.current?.clear()}
                className="text-xs text-slate-500 hover:text-slate-700 underline"
              >
                Clear
              </button>
            </div>
          )}

          {tab === "type" && (
            <div className="space-y-4">
              <input
                type="text"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder="Type your name"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
              <div className="space-y-2">
                {FONTS.map((f, i) => (
                  <button
                    key={f.name}
                    onClick={() => setFont(i)}
                    className={`w-full text-left border rounded-lg px-4 py-3 transition-colors ${
                      font === i ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <span style={{ fontFamily: f.css, fontSize: 24 }}>
                      {typed || "Your signature"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-6 pb-6">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="accent" onClick={handleAdopt}>Adopt and sign</Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
