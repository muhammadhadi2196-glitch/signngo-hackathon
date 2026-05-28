export type BobRole = "user" | "assistant";

export interface BobMessage {
  id: string;
  role: BobRole;
  content: string;
  createdAt: number;
}

export type BobActionType =
  | "navigate"
  | "open_quote_generator"
  | "open_rewriter"
  | "open_property_estimator"
  | "open_dimension_modal";

export interface BobAction {
  type: BobActionType;
  payload?: string;
}

export interface BobChatRequest {
  messages: { role: BobRole; content: string }[];
  context: { page: string; userId: string };
}

export interface BobContext {
  page: string;
  userId: string;
}

// ───────────────────────────── Quote Generator ─────────────────────────────

export interface AIQuoteLineItem {
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
}

export interface AIQuoteDraft {
  title: string;
  customerName: string;
  lineItems: AIQuoteLineItem[];
  scopeOfWork: string;
  exclusions: string;
  paymentTerms: string;
  notes: string;
}

export interface ClarifyTurn {
  question: string;
  answer: string;
}

export interface UserBusinessContext {
  businessName?: string;
  businessType?: string;
  defaultTaxRate?: number;
}

export interface ClarifyRequest {
  stage: "clarify";
  originalInput: string;
  previousAnswers: ClarifyTurn[];
  userContext?: UserBusinessContext;
}

export interface GenerateRequest {
  stage: "generate";
  originalInput: string;
  previousAnswers: ClarifyTurn[];
  variationHint?: string;
  userContext?: UserBusinessContext;
}

export type GenerateQuoteRequest = ClarifyRequest | GenerateRequest;

export const READY_SENTINEL = "READY_TO_GENERATE";

/** Strip markdown code fences from a JSON-y string the model might return. */
export function stripJsonFences(text: string): string {
  let s = text.trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  }
  return s.trim();
}

// ───────────────────────────── Custom events ──────────────────────────────
// Loose coupling between Bob's actions and feature modals mounted at the
// (app) layout level. Anything in the app can dispatch these and the
// layout's listeners will pick them up.

export const BOB_EVENTS = {
  openQuoteGenerator: "bob:open_quote_generator",
  openRewriter: "bob:open_rewriter",
  openPropertyEstimator: "bob:open_property_estimator",
  openDimensionModal: "bob:open_dimension_modal",
  /**
   * Fired by the layout-mounted MapDimensionModal after the user saves a
   * dimension. QuoteEditor listens for this so a dimension measured via
   * Bob's chat appears in any open quote without requiring a navigation.
   */
  dimensionSaved: "bob:dimension_saved",
} as const;

export interface OpenQuoteGeneratorDetail {
  initialText?: string;
  /**
   * If true, the modal auto-clicks "Generate" once it opens. Used by the
   * Voice-to-Quote handoff so the demo flow is one click → speak → quote.
   */
  autoStart?: boolean;
}
export interface OpenRewriterDetail {
  initialText?: string;
}
export interface OpenPropertyEstimatorDetail {
  initialAddress?: string;
}
export interface OpenDimensionModalDetail {
  initialAddress?: string;
}
export interface DimensionSavedDetail {
  title: string;
  sqft: number;
}

/**
 * Stash a dimension for the next QuoteEditor mount to pick up. Used when
 * the user measures something via Bob's chat from a non-quote page —
 * the dimension waits in sessionStorage until they open or create a
 * quote, where it's drained and added to the form.
 */
export const PENDING_DIMENSIONS_KEY = "bob_pending_dimensions";

// ─────────────────────── Property Estimator ───────────────────────────────

export interface PropertyEstimateNumbers {
  lotSize: number;
  lawnArea: number;
  drivewayArea: number;
  roofArea: number;
  unit: "sq_ft";
}

export type PropertyConfidence = "low" | "medium" | "high";

export interface PropertyEstimateResult {
  address: string;
  lat: number;
  lng: number;
  satelliteImageUrl: string;
  estimates: PropertyEstimateNumbers;
  confidence: PropertyConfidence;
  notes: string;
}

export interface EstimatePropertyRequest {
  address: string;
}

/**
 * Build the rough job description we hand off to the Quote Generator
 * after a property scan. Keeps the wording tight and contractor-flavored
 * so the AI has clean inputs to work with.
 */
export function buildQuoteDescriptionFromEstimate(
  estimate: PropertyEstimateResult
): string {
  const e = estimate.estimates;
  const parts: string[] = [
    `Property at ${estimate.address}.`,
    `Measured from satellite — lot ~${e.lotSize.toLocaleString()} sq ft, lawn ~${e.lawnArea.toLocaleString()} sq ft, driveway ~${e.drivewayArea.toLocaleString()} sq ft, roof footprint ~${e.roofArea.toLocaleString()} sq ft.`,
    `Generate a quote suited to this property — typical use case is weekly seasonal lawn care, but include the most relevant services based on the measurements.`,
  ];
  return parts.join(" ");
}

/**
 * Parse [ACTION:type] or [ACTION:type:payload] tokens from a response.
 * Returns the cleaned text (with action lines removed) and the first action found.
 * Only the FIRST action is used per the system prompt contract.
 */
export function parseBobActions(text: string): {
  text: string;
  action: BobAction | null;
} {
  const actionRegex = /\[ACTION:([a-z_]+)(?::([^\]]+))?\]/gi;
  let firstAction: BobAction | null = null;

  const cleaned = text.replace(actionRegex, (_match, type, payload) => {
    if (!firstAction) {
      firstAction = {
        type: type as BobActionType,
        payload: payload?.trim() || undefined,
      };
    }
    return "";
  });

  return {
    text: cleaned.replace(/\n{3,}/g, "\n\n").trim(),
    action: firstAction,
  };
}
