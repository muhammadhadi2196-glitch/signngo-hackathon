"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { NavigationProgress } from "@/components/layout/NavigationProgress";
import { BobWidget } from "@/components/bob/BobWidget";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { BobAction } from "@/lib/bob/types";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  // Bob action dispatcher. Modal actions are placeholders until the
  // Quote Generator / Rewriter / Property Estimator features land.
  const handleBobAction = useCallback(
    (action: BobAction) => {
      switch (action.type) {
        case "navigate":
          if (action.payload) router.push(action.payload);
          break;
        case "open_quote_generator":
        case "open_rewriter":
        case "open_property_estimator":
          // eslint-disable-next-line no-console
          console.log("[Bob] action pending wiring:", action);
          break;
        default:
          // eslint-disable-next-line no-console
          console.log("[Bob] unknown action:", action);
      }
    },
    [router]
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <NavigationProgress />
      <Sidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <Topbar
        onMenuClick={() => setMobileOpen(true)}
        user={user}
      />
      <main className="lg:pl-60 pt-14">
        <div className="p-6 lg:p-8">{children}</div>
      </main>
      <BobWidget userId={user?.id ?? null} onAction={handleBobAction} />
    </div>
  );
}
