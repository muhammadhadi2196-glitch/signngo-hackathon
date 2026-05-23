"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";

interface Props {
  documentId: string;
  onBack: () => void;
}

export function RecipientsStep({ documentId, onBack }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handlePrepare() {
    if (!email) { setError("Recipient email is required."); return; }
    setLoading(true);
    setError("");
    try {
      const { request } = await api<{ request: { id: string } }>("/api/requests", {
        method: "POST",
        body: JSON.stringify({ documentId, recipientName: name, recipientEmail: email }),
      });
      router.push(`/builder/${request.id}`);
    } catch (e: any) {
      setError(e.message || "Failed to create signing request");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Add recipient</h2>
        <p className="text-sm text-slate-500 mt-1">
          Who should sign this document?
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Full Name (optional)">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Smith"
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </Field>
        <Field label="Email" required>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jane@example.com"
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </Field>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-between">
        <Button variant="secondary" onClick={onBack} type="button">
          Back
        </Button>
        <Button variant="accent" onClick={handlePrepare} loading={loading} disabled={!email}>
          Prepare document →
        </Button>
      </div>
    </div>
  );
}
