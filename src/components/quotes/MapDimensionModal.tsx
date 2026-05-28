"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DrawingManager,
  GoogleMap,
  Marker,
  useJsApiLoader,
} from "@react-google-maps/api";
import area from "@turf/area";
import { polygon } from "@turf/helpers";
import { Car, Home, Layers, Leaf, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { AddressSearch } from "./AddressSearch";
import type { PropertyEstimateResult } from "@/lib/bob/types";

const libraries: ("drawing" | "geometry" | "places")[] = [
  "drawing",
  "geometry",
  "places",
];

const mapContainerStyle = { width: "100%", height: "100%" };
const defaultCenter = { lat: 39.8283, lng: -98.5795 };
const propertyZoom = 20;
const SQM_TO_SQFT = 10.7639;

function calculatePolygonAreaSqMeters(poly: google.maps.Polygon): number {
  const path = poly.getPath();
  if (path.getLength() < 3) return 0;

  const coordinates: number[][] = [];
  for (let i = 0; i < path.getLength(); i += 1) {
    const point = path.getAt(i);
    coordinates.push([point.lng(), point.lat()]);
  }
  coordinates.push(coordinates[0]);

  return area(polygon([coordinates]));
}

function calculatePolylineLengthMeters(line: google.maps.Polyline): number {
  const path = line.getPath();
  if (path.getLength() < 2) return 0;

  return google.maps.geometry.spherical.computeLength(path);
}

function getDrawingManagerOptions(): google.maps.drawing.DrawingManagerOptions {
  return {
    drawingControl: true,
    drawingControlOptions: {
      position: google.maps.ControlPosition.TOP_LEFT,
      drawingModes: [
        google.maps.drawing.OverlayType.POLYLINE,
        google.maps.drawing.OverlayType.POLYGON,
      ],
    },
    polylineOptions: {
      strokeColor: "#1d4ed8",
      strokeWeight: 2,
      editable: true,
      draggable: true,
    },
    polygonOptions: {
      fillColor: "#3b82f6",
      fillOpacity: 0.35,
      strokeColor: "#1d4ed8",
      strokeWeight: 2,
      editable: true,
      draggable: true,
    },
  };
}

interface MapDimensionModalProps {
  onClose: () => void;
  onSave: (title: string, sqft: number) => void;
  /** Optional address to seed the modal with (e.g. from Bob's chat handoff). */
  initialAddress?: string;
}

type SurfaceKey = "lawnArea" | "drivewayArea" | "roofArea" | "lotSize";

interface SurfaceCard {
  key: SurfaceKey;
  label: string;
  sqft: number;
  icon: React.ReactNode;
  accent: string;
}

export function MapDimensionModal({
  onClose,
  onSave,
  initialAddress,
}: MapDimensionModalProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries,
  });

  const [title, setTitle] = useState("");
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [mapZoom, setMapZoom] = useState(4);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [areaSqMeters, setAreaSqMeters] = useState<number | null>(null);
  const [lineLengthMeters, setLineLengthMeters] = useState<number | null>(null);

  // AI estimate (fires automatically after an address is selected).
  const [aiLoading, setAiLoading] = useState(false);
  const [aiEstimate, setAiEstimate] = useState<PropertyEstimateResult | null>(
    null
  );
  const [aiError, setAiError] = useState<string | null>(null);
  // When the user accepts an AI card directly (without tracing) we record
  // the chosen sqft here so the Save button can use it. Drawing a polygon
  // afterwards clears this and uses the polygon area instead.
  const [aiAcceptedSqft, setAiAcceptedSqft] = useState<number | null>(null);
  const aiAbortRef = useRef<AbortController | null>(null);

  const mapRef = useRef<google.maps.Map | null>(null);
  const activePolygonRef = useRef<google.maps.Polygon | null>(null);
  const activePolylineRef = useRef<google.maps.Polyline | null>(null);
  const pathListenersRef = useRef<google.maps.MapsEventListener[]>([]);

  const clearPathListeners = useCallback(() => {
    pathListenersRef.current.forEach((listener) => {
      google.maps.event.removeListener(listener);
    });
    pathListenersRef.current = [];
  }, []);

  const updateArea = useCallback((poly: google.maps.Polygon) => {
    setAreaSqMeters(calculatePolygonAreaSqMeters(poly));
  }, []);

  const updateLineLength = useCallback((line: google.maps.Polyline) => {
    setLineLengthMeters(calculatePolylineLengthMeters(line));
  }, []);

  const attachPathListeners = useCallback(
    (path: google.maps.MVCArray<google.maps.LatLng>, onUpdate: () => void) => {
      clearPathListeners();
      const events = ["insert_at", "remove_at", "set_at"] as const;
      pathListenersRef.current = events.map((eventName) =>
        google.maps.event.addListener(path, eventName, onUpdate)
      );
    },
    [clearPathListeners]
  );

  const clearMeasurements = useCallback(() => {
    clearPathListeners();
    activePolygonRef.current?.setMap(null);
    activePolygonRef.current = null;
    activePolylineRef.current?.setMap(null);
    activePolylineRef.current = null;
    setAreaSqMeters(null);
    setLineLengthMeters(null);
  }, [clearPathListeners]);

  const onPolygonComplete = useCallback(
    (poly: google.maps.Polygon) => {
      activePolylineRef.current?.setMap(null);
      activePolylineRef.current = null;
      setLineLengthMeters(null);
      activePolygonRef.current?.setMap(null);
      activePolygonRef.current = poly;
      attachPathListeners(poly.getPath(), () => updateArea(poly));
      updateArea(poly);
      // Drawing a polygon supersedes any AI-accepted estimate.
      setAiAcceptedSqft(null);
    },
    [attachPathListeners, updateArea]
  );

  const onPolylineComplete = useCallback(
    (line: google.maps.Polyline) => {
      activePolygonRef.current?.setMap(null);
      activePolygonRef.current = null;
      setAreaSqMeters(null);
      activePolylineRef.current?.setMap(null);
      activePolylineRef.current = line;
      attachPathListeners(line.getPath(), () => updateLineLength(line));
      updateLineLength(line);
    },
    [attachPathListeners, updateLineLength]
  );

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const runAIEstimate = useCallback(async (address: string) => {
    aiAbortRef.current?.abort();
    const controller = new AbortController();
    aiAbortRef.current = controller;

    setAiLoading(true);
    setAiEstimate(null);
    setAiError(null);

    try {
      const res = await fetch("/api/bob/estimate-property", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(
          data.error || `Estimator returned ${res.status} ${res.statusText}`
        );
      }
      const data = (await res.json()) as PropertyEstimateResult;
      setAiEstimate(data);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      const message =
        err instanceof Error ? err.message : "Couldn't reach Bob's estimator.";
      setAiError(message);
    } finally {
      if (aiAbortRef.current === controller) aiAbortRef.current = null;
      setAiLoading(false);
    }
  }, []);

  const onLocationSelect = useCallback(
    (location: { lat: number; lng: number }, address: string) => {
      setSelectedLocation(location);
      setSelectedAddress(address);
      setMapCenter(location);
      setMapZoom(propertyZoom);
      mapRef.current?.panTo(location);
      mapRef.current?.setZoom(propertyZoom);
      // Clear any prior accepted AI value so the new address starts fresh.
      setAiAcceptedSqft(null);
      void runAIEstimate(address);
    },
    [runAIEstimate]
  );

  // If we were opened with an initialAddress, kick the AI estimate off
  // immediately. The map itself can't auto-pan to the address until the
  // user confirms via AddressSearch (which gives us coords), but the AI
  // estimate is text-only and works straight away.
  useEffect(() => {
    if (!initialAddress) return;
    if (!isLoaded) return;
    setSelectedAddress(initialAddress);
    void runAIEstimate(initialAddress);
  }, [initialAddress, isLoaded, runAIEstimate]);

  useEffect(() => {
    return () => {
      clearPathListeners();
      activePolygonRef.current?.setMap(null);
      activePolylineRef.current?.setMap(null);
      aiAbortRef.current?.abort();
    };
  }, [clearPathListeners]);

  // Helper: select a surface from the AI estimate cards. "Use this" sets
  // the title + sqft so the user can save immediately. The user can still
  // draw a polygon afterwards to override with a verified measurement.
  const handleAcceptAIEstimate = useCallback(
    (card: SurfaceCard) => {
      // Wipe any in-progress trace so it doesn't shadow the AI value.
      clearPathListeners();
      activePolygonRef.current?.setMap(null);
      activePolygonRef.current = null;
      activePolylineRef.current?.setMap(null);
      activePolylineRef.current = null;
      setAreaSqMeters(null);
      setLineLengthMeters(null);

      setTitle((current) => current.trim() || `${card.label} (AI estimate)`);
      setAiAcceptedSqft(card.sqft);
    },
    [clearPathListeners]
  );

  const handleVerifyAIEstimate = useCallback((card: SurfaceCard) => {
    // Pre-fill the title so the user knows which surface they're tracing,
    // but leave sqft blank so the polygon they draw becomes the source of
    // truth.
    setTitle((current) => current.trim() || card.label);
    setAiAcceptedSqft(null);
  }, []);

  // Active sqft prefers the polygon trace (more accurate) when present,
  // otherwise an accepted AI estimate, otherwise nothing.
  const tracedSqft =
    areaSqMeters !== null ? areaSqMeters * SQM_TO_SQFT : null;
  const sqft = tracedSqft ?? aiAcceptedSqft;
  const sqftSource: "traced" | "ai" | null =
    tracedSqft !== null ? "traced" : aiAcceptedSqft !== null ? "ai" : null;
  const lengthFt =
    lineLengthMeters !== null ? lineLengthMeters * 3.28084 : null;
  const canSave = title.trim().length > 0 && sqft !== null && sqft > 0;

  const handleSave = () => {
    if (!canSave || sqft === null) return;
    onSave(title.trim(), Math.round(sqft));
  };

  const aiCards: SurfaceCard[] = aiEstimate
    ? ([
        {
          key: "lawnArea",
          label: "Lawn",
          sqft: aiEstimate.estimates.lawnArea,
          icon: <Leaf className="h-3.5 w-3.5" />,
          accent: "from-emerald-500 to-emerald-700",
        },
        {
          key: "drivewayArea",
          label: "Driveway",
          sqft: aiEstimate.estimates.drivewayArea,
          icon: <Car className="h-3.5 w-3.5" />,
          accent: "from-slate-500 to-slate-700",
        },
        {
          key: "roofArea",
          label: "Roof",
          sqft: aiEstimate.estimates.roofArea,
          icon: <Layers className="h-3.5 w-3.5" />,
          accent: "from-blue-500 to-blue-700",
        },
        {
          key: "lotSize",
          label: "Lot",
          sqft: aiEstimate.estimates.lotSize,
          icon: <Home className="h-3.5 w-3.5" />,
          accent: "from-slate-700 to-slate-900",
        },
      ] as SurfaceCard[]).filter((c) => c.sqft > 0)
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold tracking-tight text-slate-900">
            Add dimension
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Title + summary row */}
        <div className="grid grid-cols-1 gap-4 border-b border-slate-200 bg-slate-50 px-6 py-4 md:grid-cols-[1fr_auto]">
          <Field label="Dimension title" required>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Front lawn, Driveway"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </Field>
          <div className="flex flex-col justify-end gap-1 text-right text-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Calculated area
            </p>
            <p className="font-mono text-base font-semibold text-slate-900">
              {sqft !== null
                ? `${Math.round(sqft).toLocaleString()} sq ft`
                : "—"}
            </p>
            {sqftSource && (
              <p
                className={`text-[10px] font-semibold uppercase tracking-wide ${
                  sqftSource === "traced"
                    ? "text-emerald-600"
                    : "text-blue-600"
                }`}
              >
                {sqftSource === "traced" ? "Verified by trace" : "AI estimate"}
              </p>
            )}
            {lengthFt !== null && (
              <p className="text-xs text-slate-500">
                Line: {lengthFt.toLocaleString(undefined, { maximumFractionDigits: 1 })} ft
              </p>
            )}
          </div>
        </div>

        {/* Map */}
        <div className="relative flex-1">
          {!apiKey && (
            <div className="flex h-full items-center justify-center bg-slate-100 p-8">
              <div className="max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900">
                  Google Maps API key required
                </h3>
                <p className="mt-2 text-xs leading-6 text-slate-600">
                  Add{" "}
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
                    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
                  </code>{" "}
                  to your{" "}
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
                    .env.local
                  </code>{" "}
                  and restart the dev server.
                </p>
              </div>
            </div>
          )}

          {apiKey && loadError && (
            <div className="flex h-full items-center justify-center bg-slate-100 p-8">
              <p className="text-sm text-red-600">Failed to load Google Maps.</p>
            </div>
          )}

          {apiKey && !loadError && !isLoaded && (
            <div className="flex h-full items-center justify-center bg-slate-100">
              <p className="text-sm text-slate-600">Loading map…</p>
            </div>
          )}

          {apiKey && !loadError && isLoaded && (
            <>
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={mapCenter}
                zoom={mapZoom}
                onLoad={onMapLoad}
                options={{
                  mapTypeId: google.maps.MapTypeId.SATELLITE,
                  mapTypeControl: false,
                  streetViewControl: false,
                  fullscreenControl: true,
                }}
              >
                {selectedLocation && <Marker position={selectedLocation} />}
                <DrawingManager
                  options={getDrawingManagerOptions()}
                  onPolygonComplete={onPolygonComplete}
                  onPolylineComplete={onPolylineComplete}
                />
              </GoogleMap>

              {/* Address search overlay */}
              <div className="absolute left-1/2 top-4 z-10 w-full max-w-xl -translate-x-1/2 px-4">
                <div className="rounded-xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
                  <AddressSearch onLocationSelect={onLocationSelect} />
                  {selectedAddress && (
                    <p className="mt-2 truncate px-1 text-xs text-slate-600">
                      Centered on:{" "}
                      <span className="font-medium text-slate-800">
                        {selectedAddress}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              {/* Measurement panel */}
              {(areaSqMeters !== null || lineLengthMeters !== null) && (
                <div className="absolute left-2 top-14 z-10 w-44 rounded-lg border border-slate-200 bg-white/95 p-3 pb-10 shadow-lg backdrop-blur">
                  {lineLengthMeters !== null && (
                    <>
                      <p className="text-xs font-medium text-slate-500">Length</p>
                      <dl className="mt-2 space-y-1.5 text-sm">
                        <div className="flex items-baseline justify-between gap-2">
                          <dt className="text-slate-500">Feet</dt>
                          <dd className="font-medium text-slate-900">
                            {(lineLengthMeters * 3.28084).toLocaleString(
                              undefined,
                              { maximumFractionDigits: 1 }
                            )}
                          </dd>
                        </div>
                        <div className="flex items-baseline justify-between gap-2">
                          <dt className="text-slate-500">Meters</dt>
                          <dd className="font-medium text-slate-900">
                            {lineLengthMeters.toLocaleString(undefined, {
                              maximumFractionDigits: 1,
                            })}
                          </dd>
                        </div>
                      </dl>
                    </>
                  )}

                  {areaSqMeters !== null && (
                    <>
                      <p
                        className={`text-xs font-medium text-slate-500 ${lineLengthMeters !== null ? "mt-4" : ""}`}
                      >
                        Area
                      </p>
                      <dl className="mt-2 space-y-1.5 text-sm">
                        <div className="flex items-baseline justify-between gap-2">
                          <dt className="text-slate-500">Sq ft</dt>
                          <dd className="font-medium text-slate-900">
                            {(areaSqMeters * SQM_TO_SQFT).toLocaleString(
                              undefined,
                              { maximumFractionDigits: 0 }
                            )}
                          </dd>
                        </div>
                        <div className="flex items-baseline justify-between gap-2">
                          <dt className="text-slate-500">Acres</dt>
                          <dd className="font-medium text-slate-900">
                            {(areaSqMeters * 0.000247105).toLocaleString(
                              undefined,
                              { maximumFractionDigits: 2 }
                            )}
                          </dd>
                        </div>
                      </dl>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={clearMeasurements}
                    className="absolute bottom-2 right-2 rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Clear
                  </button>
                </div>
              )}

              {/* AI estimate panel */}
              {(aiLoading || aiEstimate || aiError) && (
                <div className="absolute bottom-3 right-3 z-10 w-[280px] max-w-[calc(100%-1.5rem)] rounded-xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-sm">
                        <Sparkles className="h-3 w-3" />
                      </span>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-600">
                        Bob's estimate
                      </p>
                    </div>
                    {aiEstimate && (
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                        {aiEstimate.confidence}
                      </span>
                    )}
                  </div>

                  {aiLoading && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                      <span className="flex items-center gap-0.5">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-500 [animation-delay:-0.3s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-500 [animation-delay:-0.15s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-500" />
                      </span>
                      Reading the satellite tile…
                    </div>
                  )}

                  {aiError && !aiLoading && (
                    <p className="mt-2 text-xs leading-snug text-amber-700">
                      {aiError}
                    </p>
                  )}

                  {aiEstimate && !aiLoading && aiCards.length > 0 && (
                    <div className="mt-2 grid grid-cols-2 gap-1.5">
                      {aiCards.map((card) => (
                        <div
                          key={card.key}
                          className="rounded-lg border border-slate-200 bg-white p-2"
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br text-white shadow-sm ${card.accent}`}
                            >
                              {card.icon}
                            </span>
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                              {card.label}
                            </p>
                          </div>
                          <p className="mt-1 font-mono text-sm font-semibold text-slate-900">
                            {card.sqft.toLocaleString()}{" "}
                            <span className="text-[10px] font-medium text-slate-400">
                              sq ft
                            </span>
                          </p>
                          <div className="mt-1.5 flex gap-1">
                            <button
                              type="button"
                              onClick={() => handleAcceptAIEstimate(card)}
                              className="flex-1 rounded-md bg-blue-600 px-2 py-1 text-[10px] font-semibold text-white transition hover:bg-blue-700"
                            >
                              Use this
                            </button>
                            <button
                              type="button"
                              onClick={() => handleVerifyAIEstimate(card)}
                              className="rounded-md border border-slate-300 px-2 py-1 text-[10px] font-medium text-slate-600 transition hover:bg-slate-50"
                              title={`Trace ${card.label.toLowerCase()} to verify`}
                            >
                              Verify
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-4">
          <p className="text-xs text-slate-500">
            Draw a polygon on the map to calculate square footage.
          </p>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button
              variant="accent"
              size="sm"
              onClick={handleSave}
              disabled={!canSave}
              type="button"
            >
              Save dimension
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
