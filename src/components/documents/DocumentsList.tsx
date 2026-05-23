"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Trash2, ExternalLink, Settings, Send, FileCheck2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { RowActions } from "@/components/ui/RowActions";

type DocStatus = "DRAFT" | "SENT" | "VIEWED" | "COMPLETED" | "EXPIRED";

interface DocRow {
  id: string;
  title: string;
  originalFilename: string;
  createdAt: string;
  latestRequest: {
    id: string;
    status: string;
    recipientName: string;
    recipientEmail: string;
    completedAt: string | null;
    completedFilePath: string | null;
    token: string;
  } | null;
}

interface Props {
  documents: DocRow[];
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  SENT: "bg-blue-100 text-blue-700",
  VIEWED: "bg-cyan-100 text-cyan-700",
  COMPLETED: "bg-green-100 text-green-700",
  EXPIRED: "bg-orange-100 text-orange-700",
};

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function DocumentsList({ documents: initial }: Props) {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const [docs, setDocs] = useState(initial);
  const [deleteTarget, setDeleteTarget] = useState<DocRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api(`/api/documents/${deleteTarget.id}`, { method: "DELETE" });
      success("Document deleted");
      setDocs((prev) => prev.filter((d) => d.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e: any) {
      showError(e.message || "Failed to delete");
    } finally {
      setDeleting(false);
    }
  }

  async function handleViewSigned(docId: string) {
    try {
      const { url } = await api<{ url: string }>(`/api/documents/${docId}/signed-url`);
      window.open(url, "_blank");
    } catch {
      showError("Signed document not available.");
    }
  }

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  if (docs.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="h-10 w-10" />}
        title="No documents yet"
        description="Upload a PDF to send it for signing."
        action={{ label: "+ New Document", onClick: () => router.push("/documents/new") }}
      />
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-xs uppercase tracking-wide">Title</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-xs uppercase tracking-wide">Recipient</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-xs uppercase tracking-wide">Status</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-xs uppercase tracking-wide">Created</th>
                <th className="py-3 px-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {docs.map((doc) => {
                const status = doc.latestRequest?.status || "DRAFT";
                return (
                  <tr
                    key={doc.id}
                    className="hover:bg-slate-50 cursor-pointer"
                    onClick={() => doc.latestRequest && router.push(`/builder/${doc.latestRequest.id}`)}
                  >
                    <td className="py-3 px-4 font-medium text-slate-900 max-w-xs truncate">
                      {doc.title}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {doc.latestRequest ? (
                        <span>
                          {doc.latestRequest.recipientName || doc.latestRequest.recipientEmail}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">No recipient</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_STYLES[status] || STATUS_STYLES.DRAFT)}>
                        {status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{fmtDate(doc.createdAt)}</td>
                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <RowActions
                        actions={[
                          {
                            icon: <FileCheck2 className="h-3.5 w-3.5" />,
                            label: "View signed document",
                            hidden: status !== "COMPLETED",
                            onClick: () => handleViewSigned(doc.id),
                          },
                          {
                            icon: <Settings className="h-3.5 w-3.5" />,
                            label: "Open builder",
                            hidden: !doc.latestRequest || status === "COMPLETED",
                            onClick: () => router.push(`/builder/${doc.latestRequest!.id}`),
                          },
                          {
                            icon: <ExternalLink className="h-3.5 w-3.5" />,
                            label: "Copy signing link",
                            hidden: !doc.latestRequest,
                            onClick: () => {
                              navigator.clipboard.writeText(`${baseUrl}/sign/${doc.latestRequest!.token}`);
                              success("Link copied!");
                            },
                          },
                          {
                            icon: <Send className="h-3.5 w-3.5" />,
                            label: "Start signing flow",
                            hidden: !!doc.latestRequest,
                            onClick: () => router.push(`/documents/new?docId=${doc.id}`),
                          },
                          {
                            icon: <Trash2 className="h-3.5 w-3.5" />,
                            label: "Delete",
                            danger: true,
                            separator: true,
                            onClick: () => setDeleteTarget(doc),
                          },
                        ]}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile */}
        <div className="md:hidden divide-y divide-slate-100">
          {docs.map((doc) => {
            const status = doc.latestRequest?.status || "DRAFT";
            return (
              <div key={doc.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 truncate">{doc.title}</p>
                    <p className="text-sm text-slate-500 mt-0.5">{fmtDate(doc.createdAt)}</p>
                  </div>
                  <span className={cn("shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", STATUS_STYLES[status] || STATUS_STYLES.DRAFT)}>
                    {status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete document?">
        <p className="text-sm text-slate-600 mb-4">
          This will permanently delete <strong>{deleteTarget?.title}</strong> and all associated signing requests. This cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete} loading={deleting}>Delete</Button>
        </div>
      </Modal>
    </>
  );
}
