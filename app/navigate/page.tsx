"use client";

import Image from "next/image";
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  Suspense,
  useMemo,
} from "react";
import { ParkingPhoto } from "@/components/parking-photo";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useParking } from "@/lib/use-parking";
import { ParkingError } from "@/components/parking-error";
import { useRouter, useSearchParams } from "next/navigation";
import { MobileShell } from "@/components/mobile-shell";
import { TopHeader } from "@/components/top-header";
import { Button } from "@/components/ui/button";
import {
  LocationPinIcon,
  LayersIcon,
  ClockIcon,
  NoteIcon,
  CheckIcon,
  CheckCircleIcon,
  CompassIcon,
  ExternalLinkIcon,
  ExclamationCircleIcon,
  XIcon,
  ArrowPathIcon,
} from "@/components/icons";
import {
  isValidCoordinate,
  getGoogleMapsUrl,
  getAppleMapsUrl,
  calculateDistanceMeters,
  getProximityMessage,
} from "@/lib/parking-storage";
import type { NavigationMapControls } from "@/components/navigation-map";

// ── Lazy-load the Google Maps navigation component (client-only) ──────────────
const NavigationMap = dynamic(() => import("@/components/navigation-map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-72 rounded-2xl bg-slate-100 animate-pulse border border-[#EDF2F7] flex items-center justify-center text-xs text-[#5E6E82]">
      Loading map…
    </div>
  ),
});

// Leaflet fallback (used when Google Maps is unavailable)
const LeafletMap = dynamic(() => import("@/components/live-parking-map"), { ssr: false });

// ── Constants ─────────────────────────────────────────────────────────────────
/** Minimum distance (metres) the user must move before we recalculate the route */
const REROUTE_THRESHOLD_METERS = 25;
/** Minimum ms between route fetch calls */
const REROUTE_THROTTLE_MS = 15_000;

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

// ── Types ─────────────────────────────────────────────────="────────────────────
interface UserCoords {
  lat: number;
  lng: number;
  accuracy: number;
}

type NavPhase = "idle" | "locating" | "navigating";
type RouteStatus = "none" | "loading" | "ok" | "error";

// ════════════════════════════════════════════════════════════════════════════════
//  NavigateContent
// ════════════════════════════════════════════════════════════════════════════════
function NavigateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const idParam = searchParams.get("id");

  // ── Parking record ──────────────────────────────────────────────────────────
  const { records, isLoaded, error } = useParking(idParam ? { id: idParam } : "active");
  const record = records[0];

  const [userCoords, setUserCoords] = useState<UserCoords | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [navPhase, setNavPhase] = useState<NavPhase>("idle");
  const watchIdRef = useRef<number | null>(null);

  // ── Route state ─────────────────────────────────────────────────────────────
  const [encodedPolyline, setEncodedPolyline] = useState<string | null>(null);
  const [routeDistance, setRouteDistance] = useState<number | null>(null);
  const [routeDuration, setRouteDuration] = useState<number | null>(null);
  const [routeStatus, setRouteStatus] = useState<RouteStatus>("none");
  const [routeError, setRouteError] = useState<string | null>(null);

  // Throttle & dedup tracking refs
  const lastRouteFetchRef = useRef<number>(0);
  const lastRouteOriginRef = useRef<UserCoords | null>(null);
  const isFetchingRouteRef = useRef(false);

  // ── Map controls ref (from NavigationMap) ───────────────────────────────────
  const mapControlsRef = useRef<NavigationMapControls | null>(null);

  // ── Arrival modal ───────────────────────────────────────────────────────────
  const [showArrivalModal, setShowArrivalModal] = useState(false);

  // Convenience flag
  const hasValidCoordinates = record
    ? isValidCoordinate(record.latitude, record.longitude)
    : false;

  // ── Fetch walking route from server ────────────────────────────────────────
  const fetchRoute = useCallback(
    async (origin: UserCoords, force = false) => {
      if (!record || !hasValidCoordinates) return;
      if (typeof record.latitude !== "number" || typeof record.longitude !== "number") return;
      if (isFetchingRouteRef.current) return;

      const now = Date.now();
      if (!force && now - lastRouteFetchRef.current < REROUTE_THROTTLE_MS) return;

      // Check whether user moved far enough to justify a new fetch
      if (!force && lastRouteOriginRef.current) {
        const moved = calculateDistanceMeters(
          lastRouteOriginRef.current.lat,
          lastRouteOriginRef.current.lng,
          origin.lat,
          origin.lng
        );
        if (moved < REROUTE_THRESHOLD_METERS) return;
      }

      isFetchingRouteRef.current = true;
      lastRouteFetchRef.current = now;
      lastRouteOriginRef.current = origin;
      setRouteStatus("loading");
      setRouteError(null);

      try {
        const res = await fetch("/api/walking-route", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            originLat: origin.lat,
            originLng: origin.lng,
            destLat: record.latitude,
            destLng: record.longitude,
          }),
        });

        const data = await res.json();

        if (data.ok) {
          setEncodedPolyline(data.encodedPolyline);
          setRouteDistance(data.distanceMeters);
          setRouteDuration(data.durationSeconds);
          setRouteStatus("ok");
        } else {
          // Routes API returned a logical error (no route, bad coords, etc.)
          setRouteStatus("error");
          setRouteError(data.error ?? "Could not calculate route.");
          // Keep showing straight-line polyline / previous route
        }
      } catch (err) {
        console.warn("[navigate] Route fetch error:", err);
        setRouteStatus("error");
        setRouteError("Network error while fetching route. Check your connection.");
      } finally {
        isFetchingRouteRef.current = false;
      }
    },
    [record, hasValidCoordinates]
  );

  // ── Start GPS tracking ──────────────────────────────────────────────────────
  const startNavigation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser.");
      return;
    }
    setGeoError(null);
    setNavPhase("locating");

    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (watchIdRef.current !== watchId) return;
        const coords: UserCoords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        setUserCoords(coords);
        setGeoError(null);

        setNavPhase("navigating");

        // Recalculate route
        fetchRoute(coords);
      },
      (err) => {
        if (watchIdRef.current !== watchId) return;
        setUserCoords(null);
        setNavPhase("idle");
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setGeoError(
              "Location permission denied. Please allow location access in your browser settings."
            );
            break;
          case err.POSITION_UNAVAILABLE:
            setGeoError("GPS signal unavailable. Move to an open area and try again.");
            break;
          case err.TIMEOUT:
            setGeoError("Location request timed out. Please try again.");
            break;
          default:
            setGeoError("An unexpected GPS error occurred.");
        }
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
    watchIdRef.current = watchId;
  }, [fetchRoute]);

  // ── Stop GPS tracking ───────────────────────────────────────────────────────
  const stopNavigation = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setNavPhase("idle");
    setUserCoords(null);
    setEncodedPolyline(null);
    setRouteDistance(null);
    setRouteDuration(null);
    setRouteStatus("none");
    setRouteError(null);
    lastRouteOriginRef.current = null;
  }, []);

  // ── Cleanup on unmount ──────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  // ── Recenter / Fit helpers ──────────────────────────────────────────────────
  const handleRecenter = useCallback(() => {
    if (userCoords) {
      mapControlsRef.current?.recenterUser();
    } else {
      mapControlsRef.current?.recenterDest();
    }
  }, [userCoords]);

  const handleFitAll = useCallback(() => {
    mapControlsRef.current?.fitAll();
  }, []);

  const remainingDistanceMeters = useMemo(() => {
    if (!record || !hasValidCoordinates || !userCoords) return null;
    if (typeof record.latitude !== "number" || typeof record.longitude !== "number") return null;
    return calculateDistanceMeters(
      userCoords.lat,
      userCoords.lng,
      record.latitude,
      record.longitude
    );
  }, [record, hasValidCoordinates, userCoords]);

  // ════════════════════════════════════════════════════════════════════════════
  //  Render: loading
  // ════════════════════════════════════════════════════════════════════════════
  if (error) return <ParkingError message={error} />;
  if (!isLoaded) {
    return (
      <MobileShell>
        <div className="flex flex-col flex-1 items-center justify-center text-sm text-[#5E6E82]">
          Loading navigation details…
        </div>
      </MobileShell>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  Render: empty state
  // ════════════════════════════════════════════════════════════════════════════
  if (!record) {
    return (
      <MobileShell>
        <div className="flex flex-col flex-1 pb-4">
          <TopHeader title="Find My Vehicle" backHref="/home" />
          <div className="flex flex-col flex-1 items-center justify-center text-center px-4">
            <div className="w-16 h-16 rounded-full bg-[#E8EDF5] flex items-center justify-center text-[#007AFF] mb-3">
              <CompassIcon className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-[#0B1222] mb-1">No Saved Parking Spot</h2>
            <p className="text-sm text-[#5E6E82] mb-5 max-w-[250px]">
              You don&apos;t have any saved parking records yet. Save your vehicle location first to
              use navigation guidance.
            </p>
            <Button variant="primary" href="/save-parking">
              Save Parking
            </Button>
          </div>
        </div>
      </MobileShell>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  Render: main navigation screen
  // ════════════════════════════════════════════════════════════════════════════
  const isNavigating = navPhase === "navigating";
  const googleMapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  return (
    <MobileShell>
      <div className="flex flex-col flex-1 pb-4">
        <TopHeader
          title="Find My Vehicle"
          backHref={`/vehicle-details?id=${record.id}`}
        />

        {/* ── MAP SECTION ─────────────────────────────────────────────────── */}
        {hasValidCoordinates ? (
          <div className="relative mb-3 shrink-0">
            {/* Map */}
            {googleMapsKey ? (
              <NavigationMap
                destLat={record.latitude!}
                destLng={record.longitude!}
                userLat={userCoords?.lat}
                userLng={userCoords?.lng}
                userAccuracy={userCoords?.accuracy}
                licensePlate={record.licensePlate}
                vehicleType={record.type}
                locationName={record.location}
                floorZone={record.floorZone}
                encodedPolyline={encodedPolyline}
                className="w-full h-72"
                onControlsReady={(controls) => {
                  mapControlsRef.current = controls;
                }}
              />
            ) : (
              <LeafletMap
                destLat={record.latitude!}
                destLng={record.longitude!}
                userLat={userCoords?.lat}
                userLng={userCoords?.lng}
                userAccuracy={userCoords?.accuracy}
                licensePlate={record.licensePlate}
                vehicleType={record.type}
                locationName={record.location}
                floorZone={record.floorZone}
                className="w-full h-72"
              />
            )}

            {/* Map overlay controls */}
            <div className="absolute top-2 right-2 flex flex-col gap-1.5 z-20">
              {/* Recenter / Fit All */}
              {userCoords && (
                <button
                  type="button"
                  onClick={handleRecenter}
                  className="w-9 h-9 rounded-xl bg-white/95 shadow-sm border border-black/5 flex items-center justify-center text-[#007AFF] active:scale-95 transition-all"
                  title="Recenter on my location"
                  aria-label="Recenter on my location"
                >
                  <span className="w-3 h-3 rounded-full bg-[#007AFF] ring-[3px] ring-blue-200" />
                </button>
              )}
              <button
                type="button"
                onClick={handleFitAll}
                className="w-9 h-9 rounded-xl bg-white/95 shadow-sm border border-black/5 flex items-center justify-center text-[#007AFF] text-sm font-bold active:scale-95 transition-all"
                title="Fit route in view"
                aria-label="Fit route in view"
              >
                ⤢
              </button>

              {/* Route loading spinner on map */}
              {routeStatus === "loading" && (
                <div className="w-9 h-9 rounded-xl bg-white/95 shadow-sm border border-black/5 flex items-center justify-center">
                  <span className="w-4 h-4 border-2 border-[#007AFF] border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* Legend badges */}
            <div className="absolute top-2 left-2 flex flex-col gap-1 pointer-events-none z-20">
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-500 text-white shadow-xs">
                🅿 Parking
              </span>
              {userCoords && (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#007AFF] text-white shadow-xs">
                  📍 You
                </span>
              )}
            </div>
          </div>
        ) : (
          /* No coordinates – static image fallback */
          <div className="relative w-full h-52 rounded-2xl overflow-hidden shadow-xs border border-[#EDF2F7] mb-3 bg-slate-100 shrink-0 flex flex-col justify-end">
            <Image
              src="/home-map.png"
              fill
              className="object-cover"
              alt="Parking Location Area Placeholder"
              priority
              unoptimized
            />
            <div className="relative z-10 m-2.5 bg-white/95 backdrop-blur-md rounded-xl p-2.5 shadow-sm border border-black/5 flex items-center gap-2.5">
              <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-gray-100">
                <ParkingPhoto preview={record.thumbnailUrl} path={record.photoPath}
                  className="object-cover"
                  alt={record.licensePlate}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-[#0B1222] truncate leading-tight">
                  {record.licensePlate} ({record.type})
                </p>
                <p className="text-[11px] text-[#5E6E82] truncate leading-tight mt-0.5">
                  {record.floorZone} · {record.location}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── ROUTE INFO PILL ─────────────────────────────────────────────── */}
        {routeStatus === "ok" && routeDistance !== null && routeDuration !== null && (
          <div className="bg-[#007AFF] rounded-2xl px-4 py-3 mb-3 flex items-center gap-3 shadow-xs shrink-0">
            <CompassIcon className="w-5 h-5 text-white shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-white font-extrabold text-base leading-tight">
                {formatDuration(routeDuration)}
                <span className="font-normal text-sm text-blue-100 ml-2">
                  ({formatDistance(routeDistance)})
                </span>
              </p>
              <p className="text-blue-100 text-[11px]">Walking route via Google Maps</p>
            </div>
            <button
              type="button"
              onClick={() => userCoords && fetchRoute(userCoords, true)}
              className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center active:scale-95 transition-all"
              title="Refresh route"
              aria-label="Refresh route"
            >
              <ArrowPathIcon className="w-4 h-4 text-white" />
            </button>
          </div>
        )}

        {remainingDistanceMeters !== null && userCoords && (
          <div className="bg-[#F6F8FD] rounded-2xl px-4 py-3 mb-3 flex items-center gap-3 border border-[#EDF2F7] shrink-0">
            <CompassIcon className="w-5 h-5 text-[#5E6E82] shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[#0B1222] font-bold text-sm">
                {remainingDistanceMeters.toFixed(1)} m to your vehicle
              </p>
              <p className="text-[#5E6E82] text-[11px]">
                Straight-line GPS estimate{routeStatus === "loading" && " · Walking route loading…"}
              </p>
              <p role="status" className="mt-1 text-xs font-medium text-[#0B1222] empty:hidden">
                {getProximityMessage(remainingDistanceMeters, userCoords.accuracy)}
              </p>
            </div>
          </div>
        )}

        {/* Route error notice */}
        {routeStatus === "error" && routeError && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 mb-3 flex items-start gap-2 shrink-0">
            <ExclamationCircleIcon className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-amber-800">Route unavailable</p>
              <p className="text-[11px] text-amber-700 mt-0.5">{routeError}</p>
            </div>
          </div>
        )}

        {/* ── VEHICLE SUMMARY CARD ─────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-4 border border-[#EDF2F7] shadow-xs mb-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-gray-100 bg-[#F6F8FD]">
              <ParkingPhoto preview={record.thumbnailUrl} path={record.photoPath}
                className="object-cover"
                alt={record.licensePlate}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-[#5E6E82]">Your Vehicle</p>
              <h3 className="text-base font-bold text-[#0B1222] truncate leading-tight">
                {record.licensePlate}
              </h3>
              <p className="text-xs text-[#5E6E82] truncate mt-0.5">
                {record.floorZone} · {record.building || record.location}
              </p>
            </div>
            <Link
              href={`/vehicle-details?id=${record.id}`}
              className="w-8 h-8 rounded-full border border-gray-200 text-[#5E6E82] flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all shrink-0"
              aria-label="View vehicle details"
              title="View full vehicle details"
            >
              <span className="text-xs font-bold">ⓘ</span>
            </Link>
          </div>

          {/* GPS accuracy line */}
          {userCoords && Number.isFinite(userCoords.accuracy) && userCoords.accuracy >= 0 && (
            <p className="text-[11px] text-[#5E6E82] mt-2.5 pt-2.5 border-t border-gray-100 font-mono">
              {/* Round the uncertainty up so a fix over the limit never reads as ±2.0 m. */}
              GPS accuracy: ±{(Math.ceil(userCoords.accuracy * 10) / 10).toFixed(1)} m
            </p>
          )}
        </div>

        {/* ── NAVIGATION CONTROLS ──────────────────────────────────────────── */}
        {hasValidCoordinates && (
          <div className="bg-white rounded-2xl p-4 border border-[#EDF2F7] shadow-xs mb-3 shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <CompassIcon className="w-5 h-5 text-[#007AFF]" />
              <h2 className="text-sm font-bold text-[#0B1222] flex-1">Walking Navigation</h2>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  isNavigating
                    ? "bg-[#34C759]/15 text-[#34C759]"
                    : "bg-blue-50 text-[#007AFF]"
                }`}
              >
                {isNavigating ? "● Live" : "GPS Ready"}
              </span>
            </div>

            {/* GPS error */}
            {geoError && (
              <div className="bg-[#FF3B30]/10 border border-[#FF3B30]/25 rounded-xl p-2.5 mb-3 text-xs text-[#FF3B30] flex items-start gap-2">
                <ExclamationCircleIcon className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">Location Error</p>
                  <p className="text-[11px] text-[#5E6E82] mt-0.5">{geoError}</p>
                </div>
              </div>
            )}

            {/* Destination coords */}
            <div className="bg-[#F6F8FD] rounded-xl p-2.5 border border-[#EDF2F7] mb-3 text-xs font-mono text-[#0B1222]">
              <span className="font-semibold text-[#5E6E82] font-sans text-[11px]">
                Destination:{" "}
              </span>
              {record.latitude?.toFixed(5)}, {record.longitude?.toFixed(5)}
            </div>

            {/* Indoor GPS disclaimer */}
            <p className="text-[11px] text-[#5E6E82] mb-3 leading-relaxed">
              GPS routing ends at the{" "}
              <strong className="text-[#0B1222]">building entrance</strong>. Use the
              indoor guide below to reach the exact parking spot.
            </p>

            {/* Controls: start / stop / recenter */}
            {navPhase === "idle" ? (
              <button
                type="button"
                onClick={startNavigation}
                className="w-full py-2.5 px-4 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] text-white text-sm font-bold flex items-center justify-center gap-2 shadow-xs active:scale-[0.98] transition-all"
              >
                <CompassIcon className="w-4 h-4 text-white" />
                Start Navigation
              </button>
            ) : navPhase === "locating" ? (
              <div className="w-full py-2.5 px-4 rounded-xl bg-gray-50 text-[#5E6E82] text-sm font-medium flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-[#007AFF] border-t-transparent rounded-full animate-spin" />
                Acquiring GPS…
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleRecenter}
                  className="py-2.5 px-3 rounded-xl bg-[#007AFF]/10 hover:bg-[#007AFF]/20 text-[#007AFF] text-xs font-bold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-[#007AFF] ring-2 ring-blue-200" />
                  Recenter
                </button>
                <button
                  type="button"
                  onClick={stopNavigation}
                  className="py-2.5 px-3 rounded-xl bg-[#FF3B30]/10 hover:bg-[#FF3B30]/20 text-[#FF3B30] text-xs font-bold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
                >
                  <XIcon className="w-3.5 h-3.5" />
                  Stop
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── OPEN IN EXTERNAL MAPS ────────────────────────────────────────── */}
        {hasValidCoordinates && (
          <div className="bg-white rounded-2xl p-4 border border-[#EDF2F7] shadow-xs mb-3 shrink-0">
            <p className="text-xs font-semibold text-[#0B1222] mb-2.5">
              Open in External Maps
            </p>
            <p className="text-[11px] text-[#5E6E82] mb-3 leading-relaxed">
              If the embedded map route doesn&apos;t load, continue walking navigation in
              Google Maps or Apple Maps.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <a
                href={getGoogleMapsUrl(
                  record.latitude!,
                  record.longitude!,
                  userCoords?.lat,
                  userCoords?.lng
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white border border-[#E3E8EF] hover:border-[#007AFF] text-xs font-semibold text-[#0B1222] shadow-2xs active:scale-[0.98] transition-all"
              >
                <span>Google Maps</span>
                <ExternalLinkIcon className="w-3.5 h-3.5 text-[#8E95A5]" />
              </a>
              <a
                href={getAppleMapsUrl(
                  record.latitude!,
                  record.longitude!,
                  userCoords?.lat,
                  userCoords?.lng
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white border border-[#E3E8EF] hover:border-[#007AFF] text-xs font-semibold text-[#0B1222] shadow-2xs active:scale-[0.98] transition-all"
              >
                <span>Apple Maps</span>
                <ExternalLinkIcon className="w-3.5 h-3.5 text-[#8E95A5]" />
              </a>
            </div>
          </div>
        )}

        {/* ── INDOOR GUIDANCE ──────────────────────────────────────────────── */}
        <div
          id="indoor-guidance-section"
          className="bg-white rounded-2xl p-4 border border-[#EDF2F7] shadow-xs mb-5 shrink-0"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <LayersIcon className="w-5 h-5 text-[#007AFF]" />
              <h2 className="text-sm font-bold text-[#0B1222]">Indoor Parking Guidance</h2>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-[#5E6E82]">
              Saved Details
            </span>
          </div>

          <p className="text-xs text-[#5E6E82] mb-3.5">
            Follow your saved parking record step-by-step to reach your vehicle:
          </p>

          <ol className="space-y-3 relative before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#EDF2F7]">
            <li className="flex items-start gap-3 relative">
              <span className="w-7 h-7 rounded-full bg-[#007AFF] text-white text-xs font-bold flex items-center justify-center shrink-0 ring-4 ring-white">
                1
              </span>
              <div className="bg-[#F6F8FD] rounded-xl p-2.5 flex-1 border border-[#EDF2F7]">
                <p className="text-[11px] font-medium text-[#5E6E82]">Building / Facility</p>
                <p className="text-sm font-bold text-[#0B1222] mt-0.5 flex items-center gap-1.5">
                  <LocationPinIcon className="w-4 h-4 text-[#007AFF]" />
                  {record.building || record.location}
                </p>
              </div>
            </li>

            <li className="flex items-start gap-3 relative">
              <span className="w-7 h-7 rounded-full bg-[#007AFF] text-white text-xs font-bold flex items-center justify-center shrink-0 ring-4 ring-white">
                2
              </span>
              <div className="bg-[#F6F8FD] rounded-xl p-2.5 flex-1 border border-[#EDF2F7]">
                <p className="text-[11px] font-medium text-[#5E6E82]">Floor Level & Zone</p>
                <p className="text-sm font-bold text-[#0B1222] mt-0.5 flex items-center gap-1.5">
                  <LayersIcon className="w-4 h-4 text-[#007AFF]" />
                  {record.floorZone}
                </p>
              </div>
            </li>

            {record.nearbyLandmark && (
              <li className="flex items-start gap-3 relative">
                <span className="w-7 h-7 rounded-full bg-[#007AFF] text-white text-xs font-bold flex items-center justify-center shrink-0 ring-4 ring-white">
                  3
                </span>
                <div className="bg-[#F6F8FD] rounded-xl p-2.5 flex-1 border border-[#EDF2F7]">
                  <p className="text-[11px] font-medium text-[#5E6E82]">Nearby Landmark</p>
                  <p className="text-sm font-bold text-[#0B1222] mt-0.5 flex items-center gap-1.5">
                    <ClockIcon className="w-4 h-4 text-[#007AFF]" />
                    {record.nearbyLandmark}
                  </p>
                </div>
              </li>
            )}

            {record.notes && (
              <li className="flex items-start gap-3 relative">
                <span className="w-7 h-7 rounded-full bg-[#007AFF] text-white text-xs font-bold flex items-center justify-center shrink-0 ring-4 ring-white">
                  {record.nearbyLandmark ? "4" : "3"}
                </span>
                <div className="bg-[#F6F8FD] rounded-xl p-2.5 flex-1 border border-[#EDF2F7]">
                  <p className="text-[11px] font-medium text-[#5E6E82]">Parking Note</p>
                  <p className="text-xs font-medium text-[#0B1222] mt-0.5 flex items-start gap-1.5 leading-relaxed">
                    <NoteIcon className="w-4 h-4 text-[#007AFF] shrink-0 mt-0.5" />
                    <span>{record.notes}</span>
                  </p>
                </div>
              </li>
            )}

            <li className="flex items-start gap-3 relative">
              <span className="w-7 h-7 rounded-full bg-[#34C759] text-white text-xs font-bold flex items-center justify-center shrink-0 ring-4 ring-white">
                ✓
              </span>
              <div className="bg-[#F6F8FD] rounded-xl p-2.5 flex-1 border border-[#EDF2F7]">
                <p className="text-[11px] font-medium text-[#5E6E82]">Target Vehicle</p>
                <p className="text-sm font-bold text-[#0B1222] mt-0.5">
                  {record.type} · {record.licensePlate}
                </p>
              </div>
            </li>
          </ol>
        </div>

        {/* ── ACTION BUTTONS ───────────────────────────────────────────────── */}
        <div className="mt-auto space-y-2.5 pt-1 shrink-0">
          <Button
            variant="primary"
            onClick={() => setShowArrivalModal(true)}
            icon={<CheckCircleIcon className="w-5 h-5 text-white" />}
          >
            I&apos;ve Found My Vehicle
          </Button>

          <Button variant="secondary" href={`/vehicle-details?id=${record.id}`}>
            View Vehicle Details
          </Button>

          <button
            type="button"
            onClick={() => {
              stopNavigation();
              router.push("/home");
            }}
            className="w-full py-3.5 px-6 rounded-full bg-[#FF3B30] hover:bg-[#E02E24] text-white font-semibold text-base shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <span>End Navigation & Return Home</span>
          </button>
        </div>

        {/* ── ARRIVAL MODAL ────────────────────────────────────────────────── */}
        {showArrivalModal && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="arrived-title"
          >
            <div className="bg-white rounded-3xl p-6 w-full max-w-[360px] shadow-2xl border border-gray-100 flex flex-col items-center text-center relative animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200">
              <button
                type="button"
                onClick={() => setShowArrivalModal(false)}
                className="absolute top-4 right-4 p-1 rounded-full text-[#8E95A5] hover:text-[#0B1222] hover:bg-gray-100 transition-colors"
                aria-label="Close dialog"
              >
                <XIcon className="w-5 h-5" />
              </button>

              <div className="w-16 h-16 rounded-full bg-[#34C759] flex items-center justify-center text-white mb-4 shadow-sm">
                <CheckIcon className="w-8 h-8" />
              </div>

              <h3 id="arrived-title" className="text-2xl font-bold text-[#0B1222] mb-1.5">
                You Have Arrived!
              </h3>
              <p className="text-sm text-[#5E6E82] mb-1 max-w-[260px] leading-relaxed">
                You are at the recorded parking location for vehicle:
              </p>
              <p className="text-sm font-bold text-[#0B1222] mb-6">
                {record.licensePlate} ({record.floorZone})
              </p>

              <div className="w-full space-y-2.5">
                <Button
                  variant="primary"
                  onClick={() => router.push(`/vehicle-details?id=${record.id}`)}
                >
                  View Details
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    stopNavigation();
                    router.push("/home");
                  }}
                >
                  Return to Home
                </Button>
              </div>

              <p className="text-[11px] text-[#8E95A5] mt-4">
                Note: Parking record is kept in your history.
              </p>
            </div>
          </div>
        )}
      </div>
    </MobileShell>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
//  Page export (wrapped in Suspense for useSearchParams)
// ════════════════════════════════════════════════════════════════════════════════
export default function NavigatePage() {
  return (
    <Suspense
      fallback={
        <MobileShell>
          <div className="flex flex-col flex-1 items-center justify-center text-sm text-[#5E6E82]">
            Loading navigation…
          </div>
        </MobileShell>
      }
    >
      <NavigateContent />
    </Suspense>
  );
}
