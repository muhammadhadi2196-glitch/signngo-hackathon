"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { NavigationProgress } from "@/components/layout/NavigationProgress";
import { BobWidget } from "@/components/bob/BobWidget";
import { QuoteGeneratorModal } from "@/components/bob/QuoteGeneratorModal";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import {
  BOB_EVENTS,
  type BobAction,
  type OpenQuoteGeneratorDetail,
} from "@/lib/bob/types";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const [quoteGenOpen, setQuoteGenOpen] = useState(false);
  const [quoteGenInitialText, setQuoteGenInitialText] = useState<string>("");

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  // Listen for cross-app events that ask Bob's modals to open.
  // Fired by Bob's chat actions, by ?ai=1 / ?aiDraft= URL handlers in
  // QuoteEditor, and (in later waves) by Property Estimator / Voice handoffs.
  useEffect(() => {
    function onOpenQuoteGen(e: Event) {
      const detail = (e as CustomEvent<OpenQuoteGeneratorDetail>).detail ?? {};
      setQuoteGenInitialText(detail.initialText ?? "");
      setQuoteGenOpen(true);
    }
    window.addEventListener(BOB_EVENTS.openQuoteGenerator, onOpenQuoteGen);
    return () =>
      window.removeEventListener(BOB_EVENTS.openQuoteGenerator, onOpenQuoteGen);
  }, []);

  const handleBobAction = useCallback(
    (action: BobAction) => {
      switch (action.type) {
        case "navigate":
          if (action.payload) router.push(action.payload);
          break;
        case "open_quote_generator":
          setQuoteGenInitialText("");
          setQuoteGenOpen(true);
          break;
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
      <QuoteGeneratorModal
        open={quoteGenOpen}
        initialText={quoteGenInitialText}
        onClose={() => setQuoteGenOpen(false)}
      />
    </div>
  );
}
