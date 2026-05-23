"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const tabs = [
  { href: "/settings/business", label: "Business" },
  { href: "/settings/profile", label: "Profile" },
  { href: "/settings/tax", label: "Tax & Numbering" },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="max-w-4xl">
      <h1 className="text-xl font-semibold text-slate-900 tracking-tight mb-6">
        Settings
      </h1>
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Tab nav */}
        <nav className="flex lg:flex-col gap-1 shrink-0 lg:w-44">
          {tabs.map((tab) => {
            const isActive = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-slate-900 text-white"
                    : "text-slate-700 hover:bg-slate-100"
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        {/* Page content */}
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
