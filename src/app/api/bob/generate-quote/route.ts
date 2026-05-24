import Anthropic from "@anthropic-ai/sdk";
import {
  QUOTE_CLARIFY_SYSTEM_PROMPT,
  QUOTE_GENERATE_SYSTEM_PROMPT,
} from "@/lib/bob/quoteSystemPrompt";
import {
  stripJsonFences,
  type AIQuoteDraft,
  type ClarifyTurn,
  type GenerateQuoteRequest,
  type UserBusinessContext,
} from "@/lib/bob/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QUOTE_MODEL = "claude-sonnet-4-6";

// ── Helpers ───────────────────────────────────────────────────────────────

function badRequest(message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: { "Content-Type": "application/json" },
  });
}

function serverError(message: string, status = 500) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function buildContextPrefix(ctx?: UserBusinessContext): string {
  if (!ctx) return "";
  const lines: string[] = [];
  if (ctx.businessName) lines.push(`Business: ${ctx.businessName}`);
  if (ctx.businessType) lines.push(`Industry: ${ctx.businessType}`);
  if (typeof ctx.defaultTaxRate === "number")
    lines.push(`Default tax rate: ${ctx.defaultTaxRate}%`);
  return lines.length ? `BUSINESS CONTEXT:\n${lines.join("\n")}\n\n` : "";
}

function buildUserMessage(
  originalInput: string,
  previousAnswers: ClarifyTurn[],
  variationHint?: string
): string {
  const parts: string[] = [`ORIGINAL JOB DESCRIPTION:\n${originalInput.trim()}`];

  if (previousAnswers.length > 0) {
    parts.push(
      `\nQ&A SO FAR:\n${previousAnswers
        .map(
          (qa, i) =>
            `${i + 1}. Q: ${qa.question.trim()}\n   A: ${qa.answer.trim()}`
        )
        .join("\n")}`
    );
  }

  if (variationHint) {
    parts.push(
      `\nVARIATION REQUEST: ${variationHint.trim()}\nProduce a meaningfully different version (different pricing tier, scope angle, or service mix) — not a paraphrase.`
    );
  }

  return parts.join("\n");
}

function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

// ── Stage handlers ────────────────────────────────────────────────────────

async function handleClarify(
  client: Anthropic,
  body: Extract<GenerateQuoteRequest, { stage: "clarify" }>
): Promise<Response> {
  const userMessage =
    buildContextPrefix(body.userContext) +
    buildUserMessage(body.originalInput, body.previousAnswers ?? []);

  const stream = client.messages.stream({
    model: QUOTE_MODEL,
    max_tokens: 256,
    system: QUOTE_CLARIFY_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        controller.close();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Streaming error";
        controller.enqueue(encoder.encode(`\n\n[Error: ${message}]`));
        controller.close();
      }
    },
    cancel() {
      stream.controller.abort();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

async function handleGenerate(
  client: Anthropic,
  body: Extract<GenerateQuoteRequest, { stage: "generate" }>
): Promise<Response> {
  const userMessage =
    buildContextPrefix(body.userContext) +
    buildUserMessage(
      body.originalInput,
      body.previousAnswers ?? [],
      body.variationHint
    );

  const result = await client.messages.create({
    model: QUOTE_MODEL,
    max_tokens: 2048,
    system: QUOTE_GENERATE_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const textBlock = result.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return serverError("Model returned no text content", 502);
  }

  const cleaned = stripJsonFences(textBlock.text);
  let parsed: AIQuoteDraft;
  try {
    parsed = JSON.parse(cleaned) as AIQuoteDraft;
  } catch {
    return serverError(
      `Model returned invalid JSON. Raw: ${cleaned.slice(0, 400)}`,
      502
    );
  }

  // Light shape coercion — be forgiving in case the model fudges types.
  const draft: AIQuoteDraft = {
    title: String(parsed.title ?? ""),
    customerName: String(parsed.customerName ?? "TBD - prompt user"),
    lineItems: Array.isArray(parsed.lineItems)
      ? parsed.lineItems.map((li) => ({
          name: String(li?.name ?? ""),
          description: String(li?.description ?? ""),
          quantity: Number(li?.quantity ?? 1) || 1,
          unitPrice: Number(li?.unitPrice ?? 0) || 0,
          taxRate: Number(li?.taxRate ?? 0) || 0,
        }))
      : [],
    scopeOfWork: String(parsed.scopeOfWork ?? ""),
    exclusions: String(parsed.exclusions ?? ""),
    paymentTerms: String(parsed.paymentTerms ?? ""),
    notes: String(parsed.notes ?? ""),
  };

  return new Response(JSON.stringify({ quote: draft }), {
    headers: { "Content-Type": "application/json" },
  });
}

// ── Entry point ───────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const client = getClient();
  if (!client) return serverError("ANTHROPIC_API_KEY is not configured");

  let body: GenerateQuoteRequest;
  try {
    body = (await req.json()) as GenerateQuoteRequest;
  } catch {
    return badRequest("Invalid JSON body");
  }

  if (!body || typeof body !== "object") return badRequest("Empty body");
  if (typeof body.originalInput !== "string" || !body.originalInput.trim()) {
    return badRequest("originalInput is required");
  }
  if (!Array.isArray(body.previousAnswers)) {
    body.previousAnswers = [];
  }

  if (body.stage === "clarify") return handleClarify(client, body);
  if (body.stage === "generate") return handleGenerate(client, body);
  return badRequest("stage must be 'clarify' or 'generate'");
}
