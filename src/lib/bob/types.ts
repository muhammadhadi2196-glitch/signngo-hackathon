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
  | "open_property_estimator";

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
} as const;

export interface OpenQuoteGeneratorDetail {
  initialText?: string;
}
export interface OpenRewriterDetail {
  initialText?: string;
}
export interface OpenPropertyEstimatorDetail {
  initialAddress?: string;
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
