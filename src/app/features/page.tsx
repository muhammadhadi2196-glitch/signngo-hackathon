import Link from "next/link";
import { FileText, Receipt, Users, Shield, Mail, Download } from "lucide-react";

export const metadata = {
  title: "Features — signNGO",
  description: "Everything signNGO can do for your small business.",
};

const FEATURES = [
  {
    icon: <FileText className="h-6 w-6" />,
    title: "PDF document signing",
    desc: "Upload any PDF, drag-and-drop signature, initials, text, date, checkbox, and dropdown fields exactly where you need them. Recipients sign in their browser with no account required.",
  },
  {
    icon: <Receipt className="h-6 w-6" />,
    title: "Invoices & quotes",
    desc: "Create professional invoices and quotes with line items, per-item tax rates, your business logo, and payment terms. One-click PDF download and email send.",
  },
  {
    icon: <Users className="h-6 w-6" />,
    title: "Customer database",
    desc: "Save customer details and billing/shipping addresses once. Reuse them everywhere — invoices, quotes, and signing requests auto-fill.",
  },
  {
    icon: <Mail className="h-6 w-6" />,
    title: "Completion emails",
    desc: "When a document is signed, both you and the recipient automatically get an email with a link to download the signed PDF.",
  },
  {
    icon: <Shield className="h-6 w-6" />,
    title: "Audit trail",
    desc: "Every signing request records viewed, filled, and signed events with timestamps and IP addresses for legal proof of completion.",
  },
  {
    icon: <Download className="h-6 w-6" />,
    title: "Signed PDF storage",
    desc: "Completed documents are stamped with field values and stored securely. Download any time from your dashboard.",
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-slate-100 max-w-6xl mx-auto">
        <Link href="/" className="text-xl font-bold tracking-tight">signNGO</Link>
        <Link href="/signup" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
          Start free
        </Link>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-extrabold tracking-tight text-center mb-4">Features</h1>
        <p className="text-lg text-slate-500 text-center max-w-xl mx-auto mb-14">
          Everything you need to run a lean, professional small business — without stitching together five different tools.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="border border-slate-200 rounded-2xl p-6 bg-white hover:border-blue-200 transition-colors">
              <div className="text-blue-600 mb-3">{f.icon}</div>
              <h3 className="text-base font-semibold mb-1">{f.title}</h3>
              <p className="text-sm text-slate-500">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 text-center">
          <Link
            href="/signup"
            className="inline-block rounded-xl bg-blue-600 px-8 py-3 text-base font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            Get started free
          </Link>
        </div>
      </div>
    </div>
  );
}
