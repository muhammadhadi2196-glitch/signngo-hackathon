"use client";

import { useRef, useState } from "react";
import { Upload, FileText, X } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";

interface Props {
  onComplete: (doc: { id: string; title: string }) => void;
}

export function UploadStep({ onComplete }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  function processFile(f: File) {
    if (f.type !== "application/pdf" && !f.name.endsWith(".pdf")) {
      setError("Only PDF files are supported.");
      return;
    }
    if (f.size > 25 * 1024 * 1024) {
      setError("File must be under 25 MB.");
      return;
    }
    setError("");
    setFile(f);
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      // 1. Get signed upload URL
      const { signedUrl, path } = await api<{ signedUrl: string; path: string }>(
        "/api/documents/upload",
        {
          method: "POST",
          body: JSON.stringify({ filename: file.name }),
        }
      );

      // 2. Upload directly to Supabase Storage
      const uploadRes = await fetch(signedUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": "application/pdf" },
      });
      if (!uploadRes.ok) throw new Error("Upload to storage failed");

      // 3. Register document in DB (pageCount discovered by the builder canvas)
      const { document: doc } = await api<{ document: { id: string; title: string } }>(
        "/api/documents",
        {
          method: "POST",
          body: JSON.stringify({
            title: file.name.replace(/\.pdf$/i, ""),
            originalFilename: file.name,
            storagePath: path,
            pageCount: 0,
          }),
        }
      );

      onComplete(doc);
    } catch (e: any) {
      setError(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Upload document</h2>
        <p className="text-sm text-slate-500 mt-1">Upload a PDF file to send for signature. Max 25 MB.</p>
      </div>

      {!file ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files[0];
            if (f) processFile(f);
          }}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
            dragging ? "border-blue-400 bg-blue-50" : "border-slate-300 hover:border-slate-400 bg-slate-50"
          }`}
        >
          <Upload className="h-10 w-10 text-slate-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-700">
            Drag &amp; drop your PDF here, or{" "}
            <span className="text-blue-600 underline">browse</span>
          </p>
          <p className="text-xs text-slate-400 mt-1">PDF only · Max 25 MB</p>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) processFile(f);
            }}
          />
        </div>
      ) : (
        <div className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl bg-white">
          <FileText className="h-8 w-8 text-blue-600 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
            <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(0)} KB</p>
          </div>
          <button
            onClick={() => setFile(null)}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end">
        <Button
          variant="accent"
          onClick={handleUpload}
          disabled={!file}
          loading={uploading}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
