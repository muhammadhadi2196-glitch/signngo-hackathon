export const REWRITER_TONES = [
  "neutral",
  "formal",
  "friendly",
  "apologetic",
  "firm",
] as const;

export type RewriterTone = (typeof REWRITER_TONES)[number];

export const REWRITER_TONE_LABELS: Record<RewriterTone, string> = {
  neutral: "Neutral",
  formal: "Formal",
  friendly: "Friendly",
  apologetic: "Apologetic",
  firm: "Firm",
};

export const REWRITER_CONTEXTS = [
  "quote_notes",
  "invoice_notes",
  "email_subject",
  "general",
] as const;

export type RewriterContext = (typeof REWRITER_CONTEXTS)[number];

const CONTEXT_HINTS: Record<RewriterContext, string> = {
  quote_notes:
    "This text will appear on a quote PDF — likely a thank-you, payment instructions, or scope clarification.",
  invoice_notes:
    "This text will appear on an invoice PDF — likely a thank-you, payment reminder, or service note.",
  email_subject:
    "This text is an email subject line — keep it short (under 70 characters), no trailing punctuation, no emoji unless the original has one.",
  general:
    "This text is general business communication from a contractor to a customer.",
};

const TONE_GUIDE = `TONE GUIDE:
- Neutral: professional and clear, no extra warmth or sternness
- Formal: more polished, business-letter style
- Friendly: warm and personable, but still professional
- Apologetic: take responsibility, express genuine regret
- Firm: clear boundaries, no softening, polite but direct`;

const EXAMPLES = `EXAMPLES:

Input (neutral): "cant make it today"
Output: Unfortunately I won't be able to make it today. I'll be in touch shortly to reschedule.

Input (apologetic): "sorry forgot to send invoice"
Output: My apologies for the delayed invoice — I missed sending it yesterday. Attached now for your review. Thanks for your patience.

Input (firm): "u still havent paid"
Output: Following up on the outstanding balance — payment was due last week. Please remit at your earliest convenience or let me know if there's an issue I can help with.

Input (friendly): "thanks for the job"
Output: Thanks so much for choosing us for this project — we really appreciate the opportunity and are looking forward to getting started.`;

export function buildRewriterSystemPrompt(
  tone: RewriterTone,
  context: RewriterContext = "general"
): string {
  const contextHint = CONTEXT_HINTS[context] ?? CONTEXT_HINTS.general;
  return `You are a professional business writing assistant for small contractors and service businesses. You rewrite rough, casual, or unclear text into polished, professional business communication.

CONTEXT: ${contextHint}

REQUESTED TONE: ${tone}

RULES:
- Preserve the original MEANING — never change what they're trying to say
- Match the requested tone (neutral, formal, friendly, apologetic, firm)
- Use contractor-appropriate language (not corporate stuffy, not casual texting)
- Fix typos and grammar
- Maintain the same length range (don't 10x the length of a short message)
- No markdown, no headers — return clean prose only

${TONE_GUIDE}

${EXAMPLES}

OUTPUT:
Return ONLY the rewritten text. No quotes, no labels, no explanations, no preamble. Just the polished version.`;
}
