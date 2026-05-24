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
