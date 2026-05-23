"use client";

import { useState } from "react";
import { StepIndicator } from "@/components/documents/StepIndicator";
import { UploadStep } from "@/components/documents/UploadStep";
import { RecipientsStep } from "@/components/documents/RecipientsStep";

const STEPS = [
  { label: "Upload" },
  { label: "Recipients" },
  { label: "Prepare" },
  { label: "Send" },
];

export default function NewDocumentPage() {
  const [step, setStep] = useState(0);
  const [doc, setDoc] = useState<{ id: string; title: string } | null>(null);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8 flex justify-center">
        <StepIndicator steps={STEPS} current={step} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-8">
        {step === 0 && (
          <UploadStep
            onComplete={(d) => {
              setDoc(d);
              setStep(1);
            }}
          />
        )}
        {step === 1 && doc && (
          <RecipientsStep
            documentId={doc.id}
            onBack={() => setStep(0)}
          />
        )}
      </div>
    </div>
  );
}
