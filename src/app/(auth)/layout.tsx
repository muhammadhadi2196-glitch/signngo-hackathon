import { Logo } from "@/components/brand/Logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="mb-8">
        <Logo size="lg" />
      </div>
      <div className="max-w-md w-full bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
        {children}
      </div>
    </div>
  );
}
