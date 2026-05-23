import Link from "next/link";
import { CheckCircle } from "lucide-react";

export const metadata = {
  title: "Pricing — signNGO",
  description: "signNGO is free during beta. All features included.",
};

const FEATURES = [
  "Unlimited document signing requests",
  "Unlimited invoices & quotes",
  "PDF field builder (signature, text, date, checkbox, dropdown)",
  "Customer & item database",
  "Signed PDF generation & storage",
  "Completion emails to sender and recipient",
  "Audit trail for every document",
  "Business profile with logo & tax number",
  "GST/VAT support with per-line-item tax rates",
  "Invoice & quote PDF download",
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-slate-100 max-w-6xl mx-auto">
        <Link href="/" className="text-xl font-bold tracking-tight">signNGO</Link>
        <Link href="/signup" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
          Start free
        </Link>
      </nav>

      <div className="max-w-lg mx-auto px-6 py-16 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight mb-4">Simple pricing</h1>
        <p className="text-lg text-slate-500 mb-10">Free during beta. No credit card. No limits.</p>

        <div className="bg-white border-2 border-blue-600 rounded-2xl shadow-lg p-8">
          <div className="flex items-baseline justify-center gap-1 mb-2">
            <span className="text-5xl font-extrabold text-slate-900">$0</span>
            <span className="text-slate-500 text-lg">/ month</span>
          </div>
          <p className="text-sm text-blue-600 font-medium mb-6">Beta — free forever while we grow</p>

          <ul className="text-left space-y-3 mb-8">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-slate-700">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                {f}
              </li>
            ))}
          </ul>

          <Link
            href="/signup"
            className="block w-full rounded-xl bg-blue-600 py-3 text-base font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            Get started free
          </Link>
        </div>

        <p className="mt-6 text-xs text-slate-400">
          Paid plans with Stripe payments and recurring invoices are coming soon.
        </p>
      </div>
    </div>
  );
}
