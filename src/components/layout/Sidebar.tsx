"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  FilePlus,
  Receipt,
  FileOutput,
  Quote,
  Users,
  Package,
  BarChart2,
  Settings,
  LogOut,
  X,
  Repeat,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Logo } from "@/components/brand/Logo";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    label: "Overview",
    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        icon: <LayoutDashboard className="h-4 w-4" />,
      },
    ],
  },
  {
    label: "Documents",
    items: [
      {
        href: "/documents",
        label: "Documents",
        icon: <FileText className="h-4 w-4" />,
      },
      {
        href: "/documents/new",
        label: "New Document",
        icon: <FilePlus className="h-4 w-4" />,
      },
    ],
  },
  {
    label: "Billing",
    items: [
      {
        href: "/invoices",
        label: "Invoices",
        icon: <Receipt className="h-4 w-4" />,
      },
      {
        href: "/invoices/new",
        label: "New Invoice",
        icon: <FileOutput className="h-4 w-4" />,
      },
      {
        href: "/quotes",
        label: "Quotes",
        icon: <Quote className="h-4 w-4" />,
      },
      {
        href: "/quotes/new",
        label: "New Quote",
        icon: <FilePlus className="h-4 w-4" />,
      },
      {
        href: "/recurring",
        label: "Recurring",
        icon: <Repeat className="h-4 w-4" />,
      },
    ],
  },
  {
    label: "Contacts",
    items: [
      {
        href: "/customers",
        label: "Customers",
        icon: <Users className="h-4 w-4" />,
      },
      {
        href: "/items",
        label: "Items",
        icon: <Package className="h-4 w-4" />,
      },
    ],
  },
  {
    label: "Insights",
    items: [
      {
        href: "/reports",
        label: "Reports",
        icon: <BarChart2 className="h-4 w-4" />,
      },
    ],
  },
];

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

function NavLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const isActive =
    item.href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(item.href);

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-2.5 px-3 py-2 rounded-sm text-sm transition-colors",
        isActive
          ? "bg-slate-800 text-white border-l-2 border-blue-500 pl-[10px]"
          : "text-slate-300 hover:bg-slate-800 hover:text-white border-l-2 border-transparent pl-[10px]"
      )}
    >
      {item.icon}
      {item.label}
    </Link>
  );
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  async function handleSignOut() {
    await fetch("/api/auth/signout", { method: "POST" }).catch(() => {});
    window.location.href = "/login";
  }

  const inner = (
    <div className="flex h-full flex-col bg-slate-900">
      <div className="flex items-center px-4 h-14 border-b border-slate-800 shrink-0">
        <Logo size="sm" invert />
        <button
          onClick={onMobileClose}
          className="ml-auto lg:hidden text-slate-400 hover:text-white"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="text-xs uppercase tracking-wide font-medium text-slate-500 px-3 mt-5 mb-1.5">
              {section.label}
            </p>
            <div className="flex flex-col gap-0.5">
              {section.items.map((item) => (
                <NavLink key={item.href} item={item} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-2 pb-4 border-t border-slate-800 pt-4 flex flex-col gap-0.5">
        <Link
          href="/settings/business"
          className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white rounded-sm transition-colors"
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white rounded-sm transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-60 lg:flex-col">
        {inner}
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/60"
            onClick={onMobileClose}
          />
          <div className="relative w-60 h-full">{inner}</div>
        </div>
      )}
    </>
  );
}
