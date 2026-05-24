import Anthropic from "@anthropic-ai/sdk";
import { BOB_SYSTEM_PROMPT } from "@/lib/bob/systemPrompt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BOB_MODEL = "claude-3-5-sonnet-20241022";
const MAX_TOKENS = 1024;
const MAX_HISTORY = 30;

interface IncomingMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequestBody {
  messages?: IncomingMessage[];
  context?: { page?: string; userId?: string };
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY is not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: ChatRequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const messages = (body.messages ?? [])
    .filter(
      (m): m is IncomingMessage =>
        !!m &&
        typeof m.content === "string" &&
        (m.role === "user" || m.role === "assistant") &&
        m.content.trim().length > 0
    )
    .slice(-MAX_HISTORY);

  if (messages.length === 0 || messages[messages.length - 1]?.role !== "user") {
    return new Response(
      JSON.stringify({ error: "Last message must be from the user" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const pageContext = body.context?.page
    ? `\n\nCURRENT PAGE: ${body.context.page}`
    : "";

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const stream = client.messages.stream({
    model: BOB_MODEL,
    max_tokens: MAX_TOKENS,
    system: BOB_SYSTEM_PROMPT + pageContext,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
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
          err instanceof Error ? err.message : "Unknown streaming error";
        controller.enqueue(
          encoder.encode(`\n\n[Bob hit a snag: ${message}]`)
        );
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
