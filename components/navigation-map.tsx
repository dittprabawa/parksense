"use client";

/**
 * NavigationMap – Google Maps component for live walking navigation.
 *
 * Renders:
 *  - Red parking destination marker (custom SVG pin)
 *  - Blue pulsing current-location marker
 *  - Arrival radius around the vehicle and GPS accuracy circle around the user
 *  - Decoded walking route polyline from Google Routes API
 *  - Zoom / Recenter / Fit-route controls
 *
 * Falls back to LiveParkingMap (Leaflet) when Google Maps key is unavailable.
 */

import { useEffect, useRef, useState, useMemo } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { ARRIVAL_RADIUS_METERS, isValidCoordinate } from "@/lib/parking-storage";
import type { LiveParkingMapProps } from "./live-parking-map";

// ─── Polyline decoder (Google Maps Encoded Polyline Algorithm) ───────────────
function decodePolyline(encoded: string): [number, number][] {
  const result: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result_b = 0;
    let b: number;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result_b |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = result_b & 1 ? ~(result_b >> 1) : result_b >> 1;
    lat += dlat;

    shift = 0;
    result_b = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result_b |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = result_b & 1 ? ~(result_b >> 1) : result_b >> 1;
    lng += dlng;

    result.push([lat / 1e5, lng / 1e5]);
  }
  return result;
}

// ─── Shared loader state ─────────────────────────────────────────────────────
const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
const authFailureListeners = new Set<() => void>();
let loaderConfigured = false;
let authorizationFailed = false;

function loadMaps() {
  if (!apiKey) return Promise.reject(new Error("No Maps API key"));
  if (authorizationFailed) return Promise.reject(new Error("Google Maps authorization failed"));
  if (!loaderConfigured) {
    setOptions({ key: apiKey, v: "quarterly" });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).gm_authFailure = () => {
      authorizationFailed = true;
      authFailureListeners.forEach((n) => n());
    };
    loaderConfigured = true;
  }
  return importLibrary("maps");
}

// ─── Marker SVG helpers ──────────────────────────────────────────────────────
function makeDestIcon(): google.maps.Icon {
  // Red parking-pin SVG
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="52" viewBox="0 0 44 52">
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="rgba(255,59,48,0.45)"/>
    </filter>
    <ellipse cx="22" cy="49" rx="8" ry="3" fill="rgba(0,0,0,0.22)"/>
    <path d="M22 2C13.163 2 6 9.163 6 18c0 10.5 16 32 16 32s16-21.5 16-32C38 9.163 30.837 2 22 2z"
      fill="#FF3B30" stroke="#fff" stroke-width="2.5" filter="url(#shadow)"/>
    <text x="22" y="22" text-anchor="middle" dominant-baseline="middle"
      font-family="system-ui,sans-serif" font-weight="800" font-size="13"
      fill="#fff">P</text>
  </svg>`;
  return {
    url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(44, 52),
    anchor: new google.maps.Point(22, 50),
  };
}

function makeUserIcon(): google.maps.Icon {
  // Blue pulsing-dot SVG
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
    <circle cx="18" cy="18" r="16" fill="rgba(0,122,255,0.22)"/>
    <circle cx="18" cy="18" r="9" fill="#007AFF" stroke="#fff" stroke-width="3"/>
  </svg>`;
  return {
    url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(36, 36),
    anchor: new google.maps.Point(18, 18),
  };
}

// ─── Props ───────────────────────────────────────────────────────────────────
export interface NavigationMapProps extends LiveParkingMapProps {
  /** Encoded polyline from Google Routes API (optional) */
  encodedPolyline?: string | null;
  /** Expose imperative recenter control to parent */
  onControlsReady?: (controls: NavigationMapControls) => void;
}

export interface NavigationMapControls {
  recenterUser(): void;
  recenterDest(): void;
  fitAll(): void;
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function NavigationMap({
  destLat,
  destLng,
  userLat,
  userLng,
  userAccuracy,
  licensePlate = "Parked Vehicle",
  locationName,
  floorZone,
  className = "w-full h-72",
  encodedPolyline,
  onControlsReady,
}: NavigationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [maps, setMaps] = useState<google.maps.MapsLibrary | null>(null);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const accuracyCircleRef = useRef<google.maps.Circle | null>(null);
  const routePolylineRef = useRef<google.maps.Polyline | null>(null);
  const straightLineRef = useRef<google.maps.Polyline | null>(null);
  const failedRef = useRef(false);

  const destination = useMemo(() => ({ lat: destLat, lng: destLng }), [destLat, destLng]);
  const hasUser = isValidCoordinate(userLat, userLng);
  const user = useMemo(
    () =>
      hasUser && userLat != null && userLng != null
        ? { lat: userLat, lng: userLng }
        : null,
    [hasUser, userLat, userLng]
  );

  // ── Initialize map ────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    const onFailure = () => { if (mounted) failedRef.current = true; };
    authFailureListeners.add(onFailure);

    loadMaps()
      .then((lib) => {
        if (mounted) setMaps(lib);
      })
      .catch((err: Error) => {
        console.warn("[NavigationMap] Google Maps failed to load:", err.message);
      });

    return () => {
      mounted = false;
      authFailureListeners.delete(onFailure);
    };
  }, []);

  useEffect(() => {
    if (!maps || !containerRef.current || !isValidCoordinate(destination.lat, destination.lng)) return;
    const map = mapRef.current ?? new maps.Map(containerRef.current, {
      center: destination,
      zoom: 17,
      disableDefaultUI: true,
      zoomControl: false,
      clickableIcons: false,
      gestureHandling: "cooperative",
      mapTypeId: "roadmap",
      styles: [
        { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
        { featureType: "transit", elementType: "labels", stylers: [{ visibility: "off" }] },
      ],
    });
    mapRef.current = map;
    map.setCenter(destination);

    const marker = new google.maps.Marker({
      map,
      position: destination,
      icon: makeDestIcon(),
      title: `${licensePlate} · ${floorZone ?? ""}`,
      zIndex: 10,
    });

    const arrivalCircle = new maps.Circle({
      map,
      center: destination,
      radius: ARRIVAL_RADIUS_METERS,
      strokeColor: "#FF3B30",
      strokeWeight: 2,
      fillColor: "#FF3B30",
      fillOpacity: 0.15,
      clickable: false,
      zIndex: 2,
    });
    const details = document.createElement("div");
    details.className = "text-xs text-[#5E6E82]";
    const plate = document.createElement("strong");
    plate.className = "block text-[#0B1222]";
    plate.textContent = licensePlate;
    const label = document.createElement("span");
    label.className = "block text-[11px] text-[#FF3B30]";
    label.textContent = "🅿 Parking Destination";
    details.append(plate, [floorZone, locationName].filter(Boolean).join(" · "), label);
    const infoWindow = new maps.InfoWindow({ content: details });
    const clickListener = marker.addListener("click", () => infoWindow.open(map, marker));
    return () => {
      clickListener.remove();
      infoWindow.close();
      arrivalCircle.setMap(null);
      marker.setMap(null);
    };
  }, [maps, destination, licensePlate, floorZone, locationName]);

  // ── Expose controls to parent ────────────────────────────────────────────
  useEffect(() => {
    if (!maps || !onControlsReady || !mapRef.current) return;

    onControlsReady({
      recenterUser() {
        if (!mapRef.current || !user) return;
        mapRef.current.panTo(user);
        mapRef.current.setZoom(17);
      },
      recenterDest() {
        if (!mapRef.current) return;
        mapRef.current.panTo(destination);
        mapRef.current.setZoom(17);
      },
      fitAll() {
        const map = mapRef.current;
        if (!map) return;
        if (user) {
          const bounds = new google.maps.LatLngBounds()
            .extend(destination)
            .extend(user);
          map.fitBounds(bounds, 48);
        } else {
          map.panTo(destination);
          map.setZoom(17);
        }
      },
    });
  }, [maps, onControlsReady, user, destination]);

  // ── Update user marker & accuracy circle ─────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (user) {
      if (!userMarkerRef.current) {
        userMarkerRef.current = new google.maps.Marker({
          map,
          position: user,
          icon: makeUserIcon(),
          title: "Your Location",
          zIndex: 20,
        });
      } else {
        userMarkerRef.current.setPosition(user);
      }

      if (userAccuracy != null && Number.isFinite(userAccuracy) && userAccuracy > 0) {
        if (!accuracyCircleRef.current) {
          accuracyCircleRef.current = new google.maps.Circle({
            map,
            center: user,
            radius: userAccuracy,
            strokeColor: "#007AFF",
            strokeOpacity: 0.5,
            strokeWeight: 1,
            fillColor: "#007AFF",
            fillOpacity: 0.1,
            clickable: false,
            zIndex: 1,
          });
        } else {
          accuracyCircleRef.current.setCenter(user);
          accuracyCircleRef.current.setRadius(userAccuracy);
        }
      } else {
        accuracyCircleRef.current?.setMap(null);
        accuracyCircleRef.current = null;
      }
    } else {
      userMarkerRef.current?.setMap(null);
      userMarkerRef.current = null;
      accuracyCircleRef.current?.setMap(null);
      accuracyCircleRef.current = null;
    }
  }, [maps, user, userAccuracy]);

  // ── Draw / update route polyline ──────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing lines
    routePolylineRef.current?.setMap(null);
    routePolylineRef.current = null;
    straightLineRef.current?.setMap(null);
    straightLineRef.current = null;

    if (!user) return;

    if (encodedPolyline) {
      // Draw actual route polyline
      const path = decodePolyline(encodedPolyline).map(([lat, lng]) => ({ lat, lng }));
      if (path.length >= 2) {
        routePolylineRef.current = new google.maps.Polyline({
          map,
          path,
          strokeColor: "#007AFF",
          strokeOpacity: 1,
          strokeWeight: 5,
          geodesic: true,
          zIndex: 5,
        });

        // Fit bounds to the route
        const bounds = new google.maps.LatLngBounds();
        path.forEach((pt) => bounds.extend(pt));
        map.fitBounds(bounds, 48);
      }
    } else {
      // Fallback: dashed straight-line
      straightLineRef.current = new google.maps.Polyline({
        map,
        path: [user, destination],
        geodesic: true,
        strokeOpacity: 0,
        icons: [
          {
            icon: { path: "M 0,-1 0,1", strokeColor: "#007AFF", strokeOpacity: 1, scale: 2.5 },
            repeat: "12px",
          },
        ],
        zIndex: 4,
      });

      // Fit to show both markers
      const bounds = new google.maps.LatLngBounds()
        .extend(destination)
        .extend(user);
      map.fitBounds(bounds, 60);
    }
  }, [maps, encodedPolyline, user, destination]);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-[#EDF2F7] bg-slate-100 ${className}`}
    >
      <div
        ref={containerRef}
        className="h-full w-full"
        aria-label="Live walking navigation map"
      />
    </div>
  );
}
