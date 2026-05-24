"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { NavigationProgress } from "@/components/layout/NavigationProgress";
import { BobWidget } from "@/components/bob/BobWidget";
import { QuoteGeneratorModal } from "@/components/bob/QuoteGeneratorModal";
import { RewriterModal } from "@/components/bob/RewriterModal";
import { PropertyEstimatorModal } from "@/components/bob/PropertyEstimatorModal";
import { useToast } from "@/components/ui/Toast";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import {
  BOB_EVENTS,
  PENDING_DIMENSIONS_KEY,
  type BobAction,
  type DimensionSavedDetail,
  type OpenDimensionModalDetail,
  type OpenQuoteGeneratorDetail,
  type OpenPropertyEstimatorDetail,
  type OpenRewriterDetail,
} from "@/lib/bob/types";

const MapDimensionModal = dynamic(
  () =>
    import("@/components/quotes/MapDimensionModal").then((m) => ({
      default: m.MapDimensionModal,
    })),
  { ssr: false }
);

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { success } = useToast();
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

  const [dimensionOpen, setDimensionOpen] = useState(false);
  const [dimensionInitialAddress, setDimensionInitialAddress] =
    useState<string>("");

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
    function onOpenDimensionModal(e: Event) {
      const detail =
        (e as CustomEvent<OpenDimensionModalDetail>).detail ?? {};
      setDimensionInitialAddress(detail.initialAddress ?? "");
      setDimensionOpen(true);
    }
    window.addEventListener(BOB_EVENTS.openQuoteGenerator, onOpenQuoteGen);
    window.addEventListener(BOB_EVENTS.openRewriter, onOpenRewriter);
    window.addEventListener(
      BOB_EVENTS.openPropertyEstimator,
      onOpenPropertyEstimator
    );
    window.addEventListener(
      BOB_EVENTS.openDimensionModal,
      onOpenDimensionModal
    );
    return () => {
      window.removeEventListener(BOB_EVENTS.openQuoteGenerator, onOpenQuoteGen);
      window.removeEventListener(BOB_EVENTS.openRewriter, onOpenRewriter);
      window.removeEventListener(
        BOB_EVENTS.openPropertyEstimator,
        onOpenPropertyEstimator
      );
      window.removeEventListener(
        BOB_EVENTS.openDimensionModal,
        onOpenDimensionModal
      );
    };
  }, []);

  // ── Dimension save handler ──────────────────────────────────────────
  // Bob's chat can open the measure tool from anywhere in the app, but
  // saved dimensions ultimately need to land on a quote. We:
  //   1) dispatch a `bob:dimension_saved` event for any QuoteEditor
  //      that is currently mounted to pick up immediately,
  //   2) stash the dimension in sessionStorage so the next mount of
  //      QuoteEditor (e.g. after the user clicks "Use in new quote")
  //      drains it, and
  //   3) toast the user with a quick "Use in new quote" shortcut.
  const handleDimensionSavedFromLayout = useCallback(
    (title: string, sqft: number) => {
      const detail: DimensionSavedDetail = { title, sqft };

      try {
        const raw = window.sessionStorage.getItem(PENDING_DIMENSIONS_KEY);
        const queue: DimensionSavedDetail[] = raw ? JSON.parse(raw) : [];
        queue.push(detail);
        window.sessionStorage.setItem(
          PENDING_DIMENSIONS_KEY,
          JSON.stringify(queue)
        );
      } catch {
        // Storage full / disabled — non-fatal, the event still fires.
      }

      window.dispatchEvent(
        new CustomEvent(BOB_EVENTS.dimensionSaved, { detail })
      );

      success(
        `${title}: ${sqft.toLocaleString()} sq ft saved — open a quote to add it`
      );
      setDimensionOpen(false);
    },
    [success]
  );

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
      {dimensionOpen && (
        <MapDimensionModal
          initialAddress={dimensionInitialAddress}
          onClose={() => setDimensionOpen(false)}
          onSave={handleDimensionSavedFromLayout}
        />
      )}
    </div>
  );
}
