import { getSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { FileText, Receipt, Users, CheckCircle, ChevronDown } from "lucide-react";

export default async function HomePage() {
  const supabase = await getSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (!error && user) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-slate-100 max-w-6xl mx-auto">
        <span className="text-xl font-bold tracking-tight">signNGO</span>
        <div className="flex items-center gap-4">
          <Link href="/features" className="text-sm text-slate-600 hover:text-slate-900">Features</Link>
          <Link href="/pricing" className="text-sm text-slate-600 hover:text-slate-900">Pricing</Link>
          <Link href="/login" className="text-sm text-slate-600 hover:text-slate-900">Log in</Link>
          <Link
            href="/signup"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
          >
            Start free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight leading-tight">
          Sign documents.<br />Send invoices.<br />
          <span className="text-blue-600">Get paid.</span>
        </h1>
        <p className="mt-6 text-lg text-slate-500 max-w-xl mx-auto">
          The fast, simple way to send signable documents and professional invoices.
          Built for small businesses.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/signup"
            className="rounded-xl bg-blue-600 px-7 py-3 text-base font-semibold text-white hover:bg-blue-700 transition-colors shadow-md"
          >
            Start free
          </Link>
          <Link
            href="/features"
            className="rounded-xl border border-slate-300 px-7 py-3 text-base font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            See how it works
          </Link>
        </div>
        <p className="mt-4 text-sm text-slate-400">Free during beta · No credit card required</p>

        {/* Visual mockup */}
        <div className="mt-14 flex flex-col sm:flex-row gap-5 justify-center items-start">
          <div className="w-72 bg-white border border-slate-200 rounded-2xl shadow-lg p-5 text-left">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Invoice</span>
              <span className="rounded-full bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5">PAID</span>
            </div>
            <p className="text-sm font-bold text-slate-900">INV-1001</p>
            <p className="text-xs text-slate-500 mt-0.5">Acme Corp · Due Jan 31</p>
            <div className="mt-4 space-y-1.5">
              {[["Web design", "$1,200"], ["Hosting", "$50"]].map(([n, v]) => (
                <div key={n} className="flex justify-between text-xs text-slate-700">
                  <span>{n}</span><span>{v}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between text-sm font-bold">
              <span>Total</span><span>$1,364.50</span>
            </div>
          </div>

          <div className="w-72 bg-white border border-slate-200 rounded-2xl shadow-lg p-5 text-left">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Document</span>
              <span className="rounded-full bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" /> Signed
              </span>
            </div>
            <p className="text-sm font-bold text-slate-900">Service Agreement 2025.pdf</p>
            <p className="text-xs text-slate-500 mt-0.5">Signed by jane@client.com</p>
            <div className="mt-5 border-t border-slate-200 pt-3">
              <div className="h-8 bg-slate-900/10 rounded flex items-center justify-center">
                <span className="text-xs italic text-slate-500 font-serif">Jane Smith</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">Signed · {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-slate-50 py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center tracking-tight mb-10">Everything in one place</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                icon: <FileText className="h-6 w-6" />,
                title: "Send & sign documents",
                desc: "Upload a PDF, drop fields where you need them, send. Recipients sign in their browser — no account needed.",
              },
              {
                icon: <Receipt className="h-6 w-6" />,
                title: "Professional invoices & quotes",
                desc: "Built-in editor with line items, tax, and your branding. Email and PDF in one click.",
              },
              {
                icon: <Users className="h-6 w-6" />,
                title: "Customer database",
                desc: "Save customer details once. Reuse them across invoices, quotes, and signing requests.",
              },
            ].map((f) => (
              <div key={f.title} className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className="text-blue-600 mb-3">{f.icon}</div>
                <h3 className="text-base font-semibold mb-1">{f.title}</h3>
                <p className="text-sm text-slate-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 max-w-6xl mx-auto px-6">
        <h2 className="text-3xl font-bold text-center tracking-tight mb-10">How it works</h2>
        <div className="grid sm:grid-cols-3 gap-8">
          {[
            { n: "1", t: "Add your business", d: "Set your name, logo, GST/tax number. Takes 2 minutes." },
            { n: "2", t: "Build invoices or upload documents", d: "Send to your customer in seconds, straight from your dashboard." },
            { n: "3", t: "Get paid & get signed", d: "Track status, receive payments, download signed PDFs." },
          ].map((s) => (
            <div key={s.n} className="text-center">
              <div className="h-10 w-10 rounded-full bg-blue-600 text-white text-lg font-bold flex items-center justify-center mx-auto mb-3">
                {s.n}
              </div>
              <h3 className="text-base font-semibold mb-1">{s.t}</h3>
              <p className="text-sm text-slate-500">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-slate-50 py-16">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center tracking-tight mb-8">FAQ</h2>
          <div className="space-y-3">
            {[
              { q: "Is signNGO free?", a: "Yes, during beta. Anyone can sign up and use all features at no cost." },
              { q: "Can my customers sign without an account?", a: "Yes. They click the link in their email and sign directly in their browser. No sign-up required." },
              { q: "What about taxes (GST/VAT)?", a: "Set your default tax rate or adjust per line item. Your tax number prints on every invoice and quote." },
              { q: "Will my data be safe?", a: "Yes. Your data lives in your private, encrypted database. We never share customer information." },
            ].map((item) => (
              <details key={item.q} className="bg-white border border-slate-200 rounded-xl">
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer text-sm font-medium list-none">
                  {item.q}
                  <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                </summary>
                <p className="px-5 pb-4 text-sm text-slate-500">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-sm font-bold tracking-tight">signNGO</span>
          <div className="flex gap-4 text-sm text-slate-500">
            <Link href="/features" className="hover:text-slate-900">Features</Link>
            <Link href="/pricing" className="hover:text-slate-900">Pricing</Link>
            <Link href="/login" className="hover:text-slate-900">Login</Link>
          </div>
          <p className="text-xs text-slate-400">© {new Date().getFullYear()} signNGO. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
