"use client";

import React, { useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { isValidCoordinate } from "@/lib/parking-storage";

export interface LiveParkingMapProps {
  destLat: number;
  destLng: number;
  userLat?: number | null;
  userLng?: number | null;
  userAccuracy?: number;
  licensePlate?: string;
  vehicleType?: string;
  locationName?: string;
  floorZone?: string;
  className?: string;
}

export default function LiveParkingMap({
  destLat,
  destLng,
  userLat,
  userLng,
  userAccuracy,
  licensePlate = "Your Vehicle",
  vehicleType = "Motorcycle",
  locationName = "Parking Area",
  floorZone = "Level B2",
  className = "w-full h-72",
}: LiveParkingMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);

  // Determine icon SVG based on vehicle type
  const isCar = vehicleType?.toLowerCase().includes("car");
  const vehicleSvg = isCar
    ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.85 7h10.29l1.04 3H5.81l1.04-3zM19 17H5v-4.66l.12-.34h13.77l.11.34V17z"/><circle cx="7.5" cy="14.5" r="1.5"/><circle cx="16.5" cy="14.5" r="1.5"/></svg>`
    : `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19.44 9.03L15.41 5H11v2h3.59l2 2H5c-2.8 0-5 2.2-5 5s2.2 5 5 5c2.46 0 4.45-1.69 4.9-4h4.2c.45 2.31 2.44 4 4.9 4 2.8 0 5-2.2 5-5 0-2.5-1.84-4.57-4.26-4.94l-.3-.03zM5 17c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm14 0c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/></svg>`;

  // Create Destination Icon (Apple Maps style ParkSense blue teardrop pin)
  const createDestIcon = useCallback(() => {
    return L.divIcon({
      className: "parksense-dest-pin-wrapper",
      html: `
        <div style="position: relative; width: 44px; height: 50px; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
          <div style="
            background: #007AFF;
            width: 40px;
            height: 40px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 14px rgba(0, 122, 255, 0.45);
            border: 2.5px solid #FFFFFF;
          ">
            <div style="transform: rotate(45deg); color: #FFFFFF; display: flex; align-items: center; justify-content: center;">
              ${vehicleSvg}
            </div>
          </div>
          <div style="
            width: 16px;
            height: 5px;
            background: rgba(0, 0, 0, 0.28);
            border-radius: 50%;
            filter: blur(1.5px);
            margin-top: 3px;
          "></div>
        </div>
      `,
      iconSize: [44, 50],
      iconAnchor: [22, 47],
      popupAnchor: [0, -45],
    });
  }, [vehicleSvg]);

  // Create User Location Icon (Apple Maps style pulsing blue dot)
  const createUserIcon = useCallback(() => {
    return L.divIcon({
      className: "parksense-user-dot-wrapper",
      html: `
        <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
          <div class="animate-pulse-ring" style="
            position: absolute;
            width: 32px;
            height: 32px;
            background: rgba(0, 122, 255, 0.28);
            border-radius: 50%;
          "></div>
          <div style="
            position: absolute;
            width: 18px;
            height: 18px;
            background: #007AFF;
            border: 3px solid #FFFFFF;
            border-radius: 50%;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
          "></div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -18],
    });
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    if (!isValidCoordinate(destLat, destLng)) return;

    // Create Map Instance with clean options
    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
      fadeAnimation: true,
      zoomAnimation: true,
    }).setView([destLat, destLng], 17);

    // CartoDB Voyager tiles (clean, light, Apple Maps-like pastel colors)
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      {
        subdomains: "abcd",
        maxZoom: 20,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
      }
    ).addTo(map);

    // Create destination marker
    const destMarker = L.marker([destLat, destLng], {
      icon: createDestIcon(),
      title: `${licensePlate} (${floorZone})`,
    }).addTo(map);

    const details = document.createElement("div");
    details.className = "whitespace-pre-line text-xs";
    details.textContent = [licensePlate, floorZone, locationName].join("\n");
    destMarker.bindPopup(details);

    mapRef.current = map;
    destMarkerRef.current = destMarker;

    // Invalidate size after mount to prevent grey tiles
    const resizeTimer = window.setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      window.clearTimeout(resizeTimer);
      map.remove();
      mapRef.current = null;
      destMarkerRef.current = null;
      userMarkerRef.current = null;
      accuracyCircleRef.current = null;
      routeLineRef.current = null;
    };
  }, [destLat, destLng, licensePlate, floorZone, locationName, createDestIcon]);

  // Update User Location & Route line when user coordinates change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const hasUser = isValidCoordinate(userLat, userLng);

    // Update or remove user marker
    if (hasUser && typeof userLat === "number" && typeof userLng === "number") {
      if (!userMarkerRef.current) {
        userMarkerRef.current = L.marker([userLat, userLng], {
          icon: createUserIcon(),
          title: "Your Location",
        }).addTo(map);

        userMarkerRef.current.bindPopup(`
          <div style="font-family: inherit; font-size: 12px; padding: 2px;">
            <div style="font-weight: 700; color: #007AFF;">You Are Here</div>
            <div style="color: #5E6E82; font-size: 11px;">Current GPS Position</div>
          </div>
        `);
      } else {
        userMarkerRef.current.setLatLng([userLat, userLng]);
      }

      // Accuracy circle
      if (userAccuracy && userAccuracy > 0) {
        const radius = Math.min(Math.max(userAccuracy, 8), 100);
        if (!accuracyCircleRef.current) {
          accuracyCircleRef.current = L.circle([userLat, userLng], {
            radius,
            color: "#007AFF",
            fillColor: "#007AFF",
            fillOpacity: 0.12,
            weight: 1,
            dashArray: "4, 4",
          }).addTo(map);
        } else {
          accuracyCircleRef.current.setLatLng([userLat, userLng]);
          accuracyCircleRef.current.setRadius(radius);
        }
      }

      // Draw dashed connecting path between user and parked spot
      const routePoints: [number, number][] = [
        [userLat, userLng],
        [destLat, destLng],
      ];

      if (!routeLineRef.current) {
        routeLineRef.current = L.polyline(routePoints, {
          color: "#007AFF",
          weight: 4,
          opacity: 0.85,
          dashArray: "6, 8",
          lineCap: "round",
          lineJoin: "round",
        }).addTo(map);
      } else {
        routeLineRef.current.setLatLngs(routePoints);
      }

      // Smoothly zoom/fit bounds to show both user and parked spot
      map.fitBounds(
        [
          [userLat, userLng],
          [destLat, destLng],
        ],
        {
          padding: [50, 50],
          maxZoom: 17,
          animate: true,
        }
      );
    } else {
      // Clean up user layers if coordinates removed
      if (userMarkerRef.current) {
        map.removeLayer(userMarkerRef.current);
        userMarkerRef.current = null;
      }
      if (accuracyCircleRef.current) {
        map.removeLayer(accuracyCircleRef.current);
        accuracyCircleRef.current = null;
      }
      if (routeLineRef.current) {
        map.removeLayer(routeLineRef.current);
        routeLineRef.current = null;
      }
    }
  }, [userLat, userLng, userAccuracy, destLat, destLng, licensePlate, floorZone, locationName, createDestIcon, createUserIcon]);

  // Recenter actions
  const handleRecenterDestination = () => {
    if (!mapRef.current) return;
    mapRef.current.flyTo([destLat, destLng], 17, { duration: 0.8 });
    destMarkerRef.current?.openPopup();
  };

  const handleRecenterUser = () => {
    if (!mapRef.current || !isValidCoordinate(userLat, userLng)) return;
    mapRef.current.flyTo([userLat!, userLng!], 17, { duration: 0.8 });
    userMarkerRef.current?.openPopup();
  };

  const handleFitAll = () => {
    if (!mapRef.current) return;
    if (isValidCoordinate(userLat, userLng)) {
      mapRef.current.fitBounds(
        [
          [userLat!, userLng!],
          [destLat, destLng],
        ],
        { padding: [50, 50], maxZoom: 17, animate: true }
      );
    } else {
      handleRecenterDestination();
    }
  };

  const handleZoomIn = () => {
    if (mapRef.current) mapRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (mapRef.current) mapRef.current.zoomOut();
  };

  return (
    <div className={`relative rounded-2xl overflow-hidden shadow-xs border border-[#EDF2F7] bg-slate-100 ${className}`}>
      {/* Map DOM Container */}
      <div ref={containerRef} className="w-full h-full" tabIndex={0} aria-label="Interactive Live Parking Map" />

      {/* Top Floating Badges */}
      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none z-20">
        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/95 text-[#007AFF] shadow-xs backdrop-blur-md border border-black/5 flex items-center gap-1.5 pointer-events-auto">
          Backup map
        </span>
        <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-white/90 text-[#5E6E82] shadow-2xs backdrop-blur-xs pointer-events-auto">
          OSM · CartoDB
        </span>
      </div>

      {/* Floating Map Controls (Right Side) */}
      <div className="absolute top-12 right-2.5 flex flex-col gap-1.5 z-20">
        <button
          type="button"
          onClick={handleZoomIn}
          className="w-8 h-8 rounded-xl bg-white/95 hover:bg-white text-[#0B1222] font-bold shadow-sm border border-black/5 flex items-center justify-center text-sm active:scale-95 transition-all"
          title="Zoom In"
          aria-label="Zoom In"
        >
          +
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          className="w-8 h-8 rounded-xl bg-white/95 hover:bg-white text-[#0B1222] font-bold shadow-sm border border-black/5 flex items-center justify-center text-sm active:scale-95 transition-all"
          title="Zoom Out"
          aria-label="Zoom Out"
        >
          −
        </button>
        <button
          type="button"
          onClick={handleFitAll}
          className="w-8 h-8 rounded-xl bg-white/95 hover:bg-white text-[#007AFF] font-bold shadow-sm border border-black/5 flex items-center justify-center text-xs active:scale-95 transition-all mt-1"
          title="Fit Route View"
          aria-label="Fit Route View"
        >
          ⤢
        </button>
        {isValidCoordinate(userLat, userLng) && (
          <button
            type="button"
            onClick={handleRecenterUser}
            className="w-8 h-8 rounded-xl bg-white/95 hover:bg-white text-[#007AFF] shadow-sm border border-black/5 flex items-center justify-center active:scale-95 transition-all"
            title="My Location"
            aria-label="Center on My Location"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#007AFF] ring-2 ring-blue-200" />
          </button>
        )}
        <button
          type="button"
          onClick={handleRecenterDestination}
          className="w-8 h-8 rounded-xl bg-[#007AFF] text-white shadow-sm flex items-center justify-center active:scale-95 transition-all"
          title="Center on Vehicle"
          aria-label="Center on Parked Vehicle"
        >
          📍
        </button>
      </div>
    </div>
  );
}
