import { NextRequest, NextResponse } from "next/server";

// Server-side only: GOOGLE_ROUTES_API_KEY is never sent to the browser.
const ROUTES_API_KEY = process.env.GOOGLE_ROUTES_API_KEY?.trim();

export interface WalkingRouteRequest {
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
}

export interface WalkingRouteResponse {
  ok: true;
  distanceMeters: number;
  durationSeconds: number;
  /** Encoded polyline string (Overview Polyline – Level 1 precision) */
  encodedPolyline: string;
}

export interface WalkingRouteError {
  ok: false;
  error: string;
}

function isValidCoord(v: unknown): v is number {
  return typeof v === "number" && isFinite(v) && v !== 0;
}

export async function POST(req: NextRequest) {
  if (!ROUTES_API_KEY) {
    return NextResponse.json<WalkingRouteError>(
      { ok: false, error: "Routes API key not configured on server." },
      { status: 503 }
    );
  }

  let body: WalkingRouteRequest;
  try {
    body = (await req.json()) as WalkingRouteRequest;
  } catch {
    return NextResponse.json<WalkingRouteError>(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const { originLat, originLng, destLat, destLng } = body;

  // Validate coordinate ranges
  if (
    !isValidCoord(originLat) ||
    !isValidCoord(originLng) ||
    !isValidCoord(destLat) ||
    !isValidCoord(destLng) ||
    Math.abs(originLat) > 90 ||
    Math.abs(destLat) > 90 ||
    Math.abs(originLng) > 180 ||
    Math.abs(destLng) > 180
  ) {
    return NextResponse.json<WalkingRouteError>(
      { ok: false, error: "Invalid coordinates supplied." },
      { status: 400 }
    );
  }

  // Google Routes API v2 — computeRoutes
  const payload = {
    origin: { location: { latLng: { latitude: originLat, longitude: originLng } } },
    destination: { location: { latLng: { latitude: destLat, longitude: destLng } } },
    travelMode: "WALK",
    routingPreference: "ROUTING_PREFERENCE_UNSPECIFIED",
    computeAlternativeRoutes: false,
    routeModifiers: { avoidTolls: false, avoidHighways: false, avoidFerries: false },
  };

  let raw: Response;
  try {
    raw = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": ROUTES_API_KEY,
        // Only request the fields we actually need – keeps response small and avoids billing for unused data
        "X-Goog-FieldMask":
          "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline",
      },
      body: JSON.stringify(payload),
    });
  } catch (networkErr) {
    console.error("[walking-route] Network error calling Routes API:", networkErr);
    return NextResponse.json<WalkingRouteError>(
      { ok: false, error: "Failed to reach Google Routes API. Check server network." },
      { status: 502 }
    );
  }

  if (!raw.ok) {
    const errText = await raw.text().catch(() => "(no body)");
    console.error(`[walking-route] Routes API HTTP ${raw.status}:`, errText);
    return NextResponse.json<WalkingRouteError>(
      { ok: false, error: `Routes API error ${raw.status}: ${errText.slice(0, 200)}` },
      { status: raw.status >= 500 ? 502 : 400 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let data: any;
  try {
    data = await raw.json();
  } catch {
    return NextResponse.json<WalkingRouteError>(
      { ok: false, error: "Could not parse Routes API response." },
      { status: 502 }
    );
  }

  const route = data?.routes?.[0];
  if (!route) {
    return NextResponse.json<WalkingRouteError>(
      { ok: false, error: "No walking route found between these coordinates." },
      { status: 404 }
    );
  }

  const distanceMeters: number = route.distanceMeters ?? 0;
  // duration comes back as "123s" string from Routes v2
  const durationRaw: string = route.duration ?? "0s";
  const durationSeconds = parseInt(durationRaw.replace("s", ""), 10) || 0;
  const encodedPolyline: string = route.polyline?.encodedPolyline ?? "";

  if (!encodedPolyline) {
    return NextResponse.json<WalkingRouteError>(
      { ok: false, error: "Route found but polyline data is missing." },
      { status: 500 }
    );
  }

  return NextResponse.json<WalkingRouteResponse>({
    ok: true,
    distanceMeters,
    durationSeconds,
    encodedPolyline,
  });
}
