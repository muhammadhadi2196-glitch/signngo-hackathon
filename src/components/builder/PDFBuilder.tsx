"use client";

import "@/lib/pdf/pdfWorker";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { FieldPalette } from "./FieldPalette";
import { PDFCanvas } from "./PDFCanvas";
import { SignatureModal } from "@/components/sign/SignatureModal";

export type FieldType = "SIGNATURE" | "INITIALS" | "TEXT" | "DATE" | "CHECKBOX" | "DROPDOWN";
export type FieldAssignee = "SENDER" | "RECIPIENT";

export interface PlacedField {
  id: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: FieldType;
  label: string;
  required: boolean;
  assignedTo: FieldAssignee;
  prefilledValue?: string | null;
  prefilledImagePath?: string | null;
  // client-only: data URL for sender signatures before upload
  _prefilledDataUrl?: string;
}

const DEFAULT_SIZES: Record<FieldType, { w: number; h: number }> = {
  SIGNATURE:  { w: 0.28, h: 0.06 },
  INITIALS:   { w: 0.12, h: 0.05 },
  TEXT:       { w: 0.28, h: 0.04 },
  DATE:       { w: 0.18, h: 0.04 },
  CHECKBOX:   { w: 0.03, h: 0.03 },
  DROPDOWN:   { w: 0.28, h: 0.04 },
};

let _idCounter = 0;
function tempId() { return `tmp_${++_idCounter}`; }

interface Props {
  requestId: string;
  documentTitle: string;
  pageCount: number;
  pdfUrl: string;
  recipientName: string;
  recipientEmail: string;
  senderName: string;
  initialFields: PlacedField[];
  status: string;
}

export function PDFBuilder({
  requestId,
  documentTitle,
  pageCount,
  pdfUrl,
  recipientName,
  recipientEmail,
  senderName,
  initialFields,
  status,
}: Props) {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const [fields, setFields] = useState<PlacedField[]>(initialFields);
  const [pendingType, setPendingType] = useState<FieldType | null>(null);
  const [pendingAssignee, setPendingAssignee] = useState<FieldAssignee>("RECIPIENT");
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [sigModal, setSigModal] = useState<{ fieldId: string; label: string } | null>(null);

  const recipientInitials = (recipientName || recipientEmail)
    .split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("");
  const senderInitials = senderName
    .split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("");

  const handleCanvasClick = useCallback(
    (page: number, xRatio: number, yRatio: number, wRatio?: number, hRatio?: number) => {
      if (!pendingType) return;
      const sz = DEFAULT_SIZES[pendingType];
      const w = wRatio ?? sz.w;
      const h = hRatio ?? sz.h;
      const id = tempId();
      const newField: PlacedField = {
        id,
        page,
        x: Math.min(xRatio, 1 - w),
        y: Math.min(yRatio, 1 - h),
        width: w,
        height: h,
        type: pendingType,
        label: "",
        required: true,
        assignedTo: pendingAssignee,
      };
      setFields((prev) => [...prev, newField]);
      setPendingType(null);
    },
    [pendingType, pendingAssignee]
  );

  const handleMove = useCallback((id: string, x: number, y: number) => {
    setFields((prev) =>
      prev.map((f) =>
        f.id === id
          ? { ...f, x: Math.max(0, Math.min(1 - f.width, x)), y: Math.max(0, Math.min(1 - f.height, y)) }
          : f
      )
    );
  }, []);

  const handleDelete = useCallback((id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const handleUpdate = useCallback((id: string, patch: Partial<PlacedField>) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }, []);

  // Opens signature modal for a sender-assigned sig field
  const handleSenderSig = useCallback((fieldId: string, label: string) => {
    setSigModal({ fieldId, label });
  }, []);

  async function adoptSenderSignature(dataUrl: string) {
    if (!sigModal) return;
    // Store data URL locally for display; upload happens on save
    handleUpdate(sigModal.fieldId, { _prefilledDataUrl: dataUrl });
    setSigModal(null);
  }

  async function uploadPendingSenderImages(fieldList: PlacedField[]): Promise<PlacedField[]> {
    return Promise.all(
      fieldList.map(async (f) => {
        if (f._prefilledDataUrl && f.assignedTo === "SENDER") {
          try {
            const { path } = await api<{ path: string }>(
              `/api/requests/${requestId}/prefill-image`,
              { method: "POST", body: JSON.stringify({ dataUrl: f._prefilledDataUrl }) }
            );
            const { _prefilledDataUrl: _, ...rest } = f;
            return { ...rest, prefilledImagePath: path };
          } catch {
            return f;
          }
        }
        return f;
      })
    );
  }

  function validateSenderFields(fieldList: PlacedField[]): string | null {
    const unfilled = fieldList.filter((f) => {
      if (f.assignedTo !== "SENDER" || !f.required) return false;
      const isSig = f.type === "SIGNATURE" || f.type === "INITIALS";
      if (isSig) return !f._prefilledDataUrl && !f.prefilledImagePath;
      if (f.type === "CHECKBOX") return false; // checkboxes are optional by nature
      return !f.prefilledValue;
    });
    if (unfilled.length > 0) {
      return `Fill in your required fields before sending (${unfilled.length} unfilled)`;
    }
    return null;
  }

  async function saveFields(fieldList?: PlacedField[]) {
    setSaving(true);
    try {
      const list = fieldList ?? fields;
      const uploaded = await uploadPendingSenderImages(list);
      setFields(uploaded);
      await api(`/api/requests/${requestId}/fields`, {
        method: "PUT",
        body: JSON.stringify({ fields: uploaded }),
      });
      success("Fields saved");
      return uploaded;
    } catch (e: any) {
      showError(e.message || "Save failed");
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function handleSend() {
    const err = validateSenderFields(fields);
    if (err) { showError(err); return; }
    setSending(true);
    try {
      const saved = await saveFields();
      if (!saved) { setSending(false); return; }
      const res = await api<{ ok: boolean; emailSent: boolean; signingUrl: string }>(
        `/api/requests/${requestId}/send`,
        { method: "POST" }
      );
      if (res.emailSent) {
        success(`Sent to ${recipientEmail}`);
      } else {
        success(`Document ready — email delivery unavailable. Copy the signing link from the documents list.`);
      }
      router.push("/documents");
    } catch (e: any) {
      showError(e.message || "Send failed");
      setSending(false);
    }
  }

  const senderCount = fields.filter((f) => f.assignedTo === "SENDER").length;
  const recipientCount = fields.filter((f) => f.assignedTo === "RECIPIENT").length;

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] -m-6 lg:-m-8">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => router.push("/documents")}
            className="text-slate-500 hover:text-slate-800 p-1"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold text-slate-900 truncate max-w-xs">
            {documentTitle}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => saveFields()} loading={saving}>
            Save
          </Button>
          <Button
            variant="accent"
            size="sm"
            onClick={handleSend}
            loading={sending}
            disabled={fields.length === 0}
          >
            Send
          </Button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Left sidebar */}
        <FieldPalette
          recipientInitials={recipientInitials}
          recipientName={recipientName || recipientEmail}
          senderInitials={senderInitials}
          senderName={senderName}
          pendingType={pendingType}
          pendingAssignee={pendingAssignee}
          onSelectType={setPendingType}
          onSelectAssignee={setPendingAssignee}
        />

        {/* Canvas */}
        <div className="flex-1 overflow-auto bg-slate-100 p-4">
          {pendingType && (
            <div className="mb-3 flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-sm text-blue-700">
              <span>
                Click or drag on the PDF to place a <strong>{pendingType}</strong> field for{" "}
                <strong>{pendingAssignee === "SENDER" ? "you" : (recipientName || recipientEmail)}</strong>.
              </span>
              <button
                className="ml-auto text-blue-500 hover:text-blue-700 underline text-xs"
                onClick={() => setPendingType(null)}
              >
                Cancel
              </button>
            </div>
          )}
          <PDFCanvas
            pdfUrl={pdfUrl}
            pageCount={pageCount}
            fields={fields}
            pendingType={pendingType}
            recipientInitials={recipientInitials}
            senderInitials={senderInitials}
            recipientName={recipientName || recipientEmail}
            senderName={senderName}
            onCanvasClick={handleCanvasClick}
            onMove={handleMove}
            onDelete={handleDelete}
            onUpdate={handleUpdate}
            onSenderSig={handleSenderSig}
          />
          {/* Legend */}
          {fields.length > 0 && (
            <div className="mt-3 flex items-center gap-4 justify-center text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded-sm bg-blue-200 border border-blue-400" />
                Your fields ({senderCount})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded-sm bg-yellow-200 border border-yellow-400" />
                Recipient fields ({recipientCount})
              </span>
            </div>
          )}
        </div>
      </div>

      {sigModal && (
        <SignatureModal
          label={sigModal.label || "Your signature"}
          onAdopt={adoptSenderSignature}
          onClose={() => setSigModal(null)}
        />
      )}
    </div>
  );
}
