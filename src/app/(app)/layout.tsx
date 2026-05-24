"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { NavigationProgress } from "@/components/layout/NavigationProgress";
import { BobWidget } from "@/components/bob/BobWidget";
import { QuoteGeneratorModal } from "@/components/bob/QuoteGeneratorModal";
import { RewriterModal } from "@/components/bob/RewriterModal";
import { PropertyEstimatorModal } from "@/components/bob/PropertyEstimatorModal";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import {
  BOB_EVENTS,
  type BobAction,
  type OpenQuoteGeneratorDetail,
  type OpenPropertyEstimatorDetail,
  type OpenRewriterDetail,
} from "@/lib/bob/types";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const [quoteGenOpen, setQuoteGenOpen] = useState(false);
  const [quoteGenInitialText, setQuoteGenInitialText] = useState<string>("");
  const [quoteGenAutoStart, setQuoteGenAutoStart] = useState(false);

  const [rewriterOpen, setRewriterOpen] = useState(false);
  const [rewriterInitialText, setRewriterInitialText] = useState<string>("");

  const [propertyOpen, setPropertyOpen] = useState(false);
  const [propertyInitialAddress, setPropertyInitialAddress] = useState<string>(
    ""
  );

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
      setQuoteGenAutoStart(Boolean(detail.autoStart));
      setQuoteGenOpen(true);
    }
    function onOpenRewriter(e: Event) {
      const detail = (e as CustomEvent<OpenRewriterDetail>).detail ?? {};
      setRewriterInitialText(detail.initialText ?? "");
      setRewriterOpen(true);
    }
    function onOpenPropertyEstimator(e: Event) {
      const detail =
        (e as CustomEvent<OpenPropertyEstimatorDetail>).detail ?? {};
      setPropertyInitialAddress(detail.initialAddress ?? "");
      setPropertyOpen(true);
    }
    window.addEventListener(BOB_EVENTS.openQuoteGenerator, onOpenQuoteGen);
    window.addEventListener(BOB_EVENTS.openRewriter, onOpenRewriter);
    window.addEventListener(
      BOB_EVENTS.openPropertyEstimator,
      onOpenPropertyEstimator
    );
    return () => {
      window.removeEventListener(BOB_EVENTS.openQuoteGenerator, onOpenQuoteGen);
      window.removeEventListener(BOB_EVENTS.openRewriter, onOpenRewriter);
      window.removeEventListener(
        BOB_EVENTS.openPropertyEstimator,
        onOpenPropertyEstimator
      );
    };
  }, []);

  // BobWidget dispatches modal-open actions through the BOB_EVENTS bus
  // (above) so the voice path can carry the transcript as initialText.
  // The only action that still flows through this callback is `navigate`.
  const handleBobAction = useCallback(
    (action: BobAction) => {
      if (action.type === "navigate" && action.payload) {
        router.push(action.payload);
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
        autoStart={quoteGenAutoStart}
        onClose={() => setQuoteGenOpen(false)}
      />
      <RewriterModal
        open={rewriterOpen}
        initialText={rewriterInitialText}
        onClose={() => setRewriterOpen(false)}
      />
      <PropertyEstimatorModal
        open={propertyOpen}
        initialAddress={propertyInitialAddress}
        onClose={() => setPropertyOpen(false)}
      />
    </div>
  );
}
