import Anthropic from "@anthropic-ai/sdk";
import {
  REWRITER_CONTEXTS,
  REWRITER_TONES,
  buildRewriterSystemPrompt,
  type RewriterContext,
  type RewriterTone,
} from "@/lib/bob/rewriterSystemPrompt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REWRITER_MODEL = "claude-sonnet-4-6";
const MAX_INPUT_CHARS = 4000;

interface RewriteRequestBody {
  text?: string;
  tone?: string;
  context?: string;
}

function badRequest(message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY is not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: RewriteRequestBody;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const text = (body.text ?? "").trim();
  if (!text) return badRequest("text is required");
  if (text.length > MAX_INPUT_CHARS) {
    return badRequest(`text must be ${MAX_INPUT_CHARS} characters or fewer`);
  }

  const tone: RewriterTone = REWRITER_TONES.includes(body.tone as RewriterTone)
    ? (body.tone as RewriterTone)
    : "neutral";

  const context: RewriterContext = REWRITER_CONTEXTS.includes(
    body.context as RewriterContext
  )
    ? (body.context as RewriterContext)
    : "general";

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Cap output at roughly 2x the input length (in tokens, approximated by
  // chars/3 plus a floor) to enforce the "don't 10x the length" rule.
  const maxTokens = Math.min(
    1024,
    Math.max(256, Math.ceil((text.length * 2) / 3))
  );

  const stream = client.messages.stream({
    model: REWRITER_MODEL,
    max_tokens: maxTokens,
    system: buildRewriterSystemPrompt(tone, context),
    messages: [{ role: "user", content: text }],
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
