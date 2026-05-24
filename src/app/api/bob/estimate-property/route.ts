import Anthropic from "@anthropic-ai/sdk";
import { PROPERTY_ESTIMATOR_PROMPT } from "@/lib/bob/propertyEstimatorPrompt";
import {
  stripJsonFences,
  type EstimatePropertyRequest,
  type PropertyConfidence,
  type PropertyEstimateResult,
} from "@/lib/bob/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VISION_MODEL = "claude-3-5-sonnet-20241022";
const STATIC_MAP_SIZE = 800;
const STATIC_MAP_ZOOM = 20;

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

interface GeocodeResult {
  lat: number;
  lng: number;
  formattedAddress: string;
}

async function geocodeAddress(
  address: string,
  apiKey: string
): Promise<GeocodeResult> {
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", address);
  url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Geocoding HTTP ${res.status}`);
  }
  const data = (await res.json()) as {
    status: string;
    error_message?: string;
    results: Array<{
      formatted_address: string;
      geometry: { location: { lat: number; lng: number } };
    }>;
  };

  if (data.status !== "OK" || !data.results.length) {
    throw new Error(
      data.error_message ||
        `Couldn't find that address (status: ${data.status})`
    );
  }

  const first = data.results[0];
  return {
    lat: first.geometry.location.lat,
    lng: first.geometry.location.lng,
    formattedAddress: first.formatted_address,
  };
}

function buildStaticMapUrl(
  lat: number,
  lng: number,
  apiKey: string,
  scale = 1
): string {
  const url = new URL("https://maps.googleapis.com/maps/api/staticmap");
  url.searchParams.set("center", `${lat},${lng}`);
  url.searchParams.set("zoom", String(STATIC_MAP_ZOOM));
  url.searchParams.set("size", `${STATIC_MAP_SIZE}x${STATIC_MAP_SIZE}`);
  url.searchParams.set("scale", String(scale));
  url.searchParams.set("maptype", "satellite");
  url.searchParams.set("key", apiKey);
  return url.toString();
}

async function fetchSatelliteImageBase64(
  staticMapUrl: string
): Promise<{ base64: string; mediaType: "image/png" | "image/jpeg" }> {
  const res = await fetch(staticMapUrl, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Static Maps HTTP ${res.status}`);
  }
  const contentType = res.headers.get("content-type") ?? "image/png";
  const buf = Buffer.from(await res.arrayBuffer());
  const mediaType: "image/png" | "image/jpeg" = contentType.includes("jpeg")
    ? "image/jpeg"
    : "image/png";
  return { base64: buf.toString("base64"), mediaType };
}

interface VisionEstimate {
  lotSize: number;
  lawnArea: number;
  drivewayArea: number;
  roofArea: number;
  confidence: PropertyConfidence;
  notes: string;
}

async function estimateWithVision(
  client: Anthropic,
  imageBase64: string,
  mediaType: "image/png" | "image/jpeg"
): Promise<VisionEstimate> {
  const result = await client.messages.create({
    model: VISION_MODEL,
    max_tokens: 512,
    system: PROPERTY_ESTIMATOR_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: imageBase64,
            },
          },
          {
            type: "text",
            text: "Estimate the property measurements from this satellite image. Return only the JSON object specified in your instructions.",
          },
        ],
      },
    ],
  });

  const textBlock = result.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Vision model returned no text");
  }

  const cleaned = stripJsonFences(textBlock.text);
  let parsed: Partial<VisionEstimate>;
  try {
    parsed = JSON.parse(cleaned) as Partial<VisionEstimate>;
  } catch {
    throw new Error(
      `Vision returned invalid JSON: ${cleaned.slice(0, 200)}`
    );
  }

  const confidence: PropertyConfidence =
    parsed.confidence === "low" ||
    parsed.confidence === "medium" ||
    parsed.confidence === "high"
      ? parsed.confidence
      : "medium";

  return {
    lotSize: Math.max(0, Math.round(Number(parsed.lotSize) || 0)),
    lawnArea: Math.max(0, Math.round(Number(parsed.lawnArea) || 0)),
    drivewayArea: Math.max(0, Math.round(Number(parsed.drivewayArea) || 0)),
    roofArea: Math.max(0, Math.round(Number(parsed.roofArea) || 0)),
    confidence,
    notes: typeof parsed.notes === "string" ? parsed.notes : "",
  };
}

export async function POST(req: Request) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return serverError("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not configured");
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return serverError("ANTHROPIC_API_KEY is not configured");
  }

  let body: EstimatePropertyRequest;
  try {
    body = (await req.json()) as EstimatePropertyRequest;
  } catch {
    return badRequest("Invalid JSON body");
  }

  const address = (body?.address ?? "").trim();
  if (!address) return badRequest("address is required");

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    // 1) Geocode.
    const geo = await geocodeAddress(address, apiKey);

    // 2) Build the public satellite URL the browser will display, and a
    //    high-res variant we send to Vision for sharper analysis.
    const displayUrl = buildStaticMapUrl(geo.lat, geo.lng, apiKey, 1);
    const visionFetchUrl = buildStaticMapUrl(geo.lat, geo.lng, apiKey, 2);

    // 3) Fetch the image once (server-side) so we can hand a base64 copy
    //    to Claude Vision.
    const { base64, mediaType } = await fetchSatelliteImageBase64(
      visionFetchUrl
    );

    // 4) Estimate.
    const estimate = await estimateWithVision(client, base64, mediaType);

    const result: PropertyEstimateResult = {
      address: geo.formattedAddress,
      lat: geo.lat,
      lng: geo.lng,
      satelliteImageUrl: displayUrl,
      estimates: {
        lotSize: estimate.lotSize,
        lawnArea: estimate.lawnArea,
        drivewayArea: estimate.drivewayArea,
        roofArea: estimate.roofArea,
        unit: "sq_ft",
      },
      confidence: estimate.confidence,
      notes: estimate.notes,
    };

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown estimator error";
    return serverError(message, 502);
  }
}
