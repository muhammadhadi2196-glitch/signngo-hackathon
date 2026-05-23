"use client";

import { Menu, Settings, LogOut } from "lucide-react";
import { Avatar, DropdownMenu } from "@/components/ui";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";

interface TopbarProps {
  onMenuClick: () => void;
  user: User | null;
}

export function Topbar({ onMenuClick, user }: TopbarProps) {
  const router = useRouter();
  const displayName =
    user?.user_metadata?.full_name ?? user?.email ?? "Account";

  async function handleSignOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="fixed top-0 right-0 left-0 lg:left-60 z-30 h-14 border-b border-slate-200 bg-white flex items-center px-4 gap-4">
      <button
        onClick={onMenuClick}
        className="lg:hidden text-slate-500 hover:text-slate-700"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="ml-auto">
        <DropdownMenu
          align="right"
          trigger={
            <div className="flex items-center gap-2 cursor-pointer rounded-md px-2 py-1 hover:bg-slate-50 transition-colors">
              <Avatar name={displayName} size="sm" />
              <span className="hidden sm:block text-sm text-slate-700 font-medium max-w-[180px] truncate">
                {displayName}
              </span>
            </div>
          }
          items={[
            {
              label: "Profile",
              icon: <Settings className="h-4 w-4" />,
              onClick: () => router.push("/settings/profile"),
            },
            {
              label: "Sign out",
              icon: <LogOut className="h-4 w-4" />,
              onClick: handleSignOut,
              divider: true,
              danger: true,
            },
          ]}
        />
      </div>
    </div>
  );
}
