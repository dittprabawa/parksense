"use client";

import dynamic from "next/dynamic";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { useEffect, useRef, useState } from "react";
import { isValidCoordinate } from "@/lib/parking-storage";
import type { LiveParkingMapProps } from "./live-parking-map";

const LeafletMap = dynamic(() => import("./live-parking-map"), { ssr: false });
const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
const authFailureListeners = new Set<() => void>();
let configured = false;
let authorizationFailed = false;

function loadMaps(key: string) {
  if (authorizationFailed) return Promise.reject(new Error("Google Maps authorization failed"));
  if (!configured) {
    setOptions({ key, v: "quarterly" });
    Object.assign(window, {
      gm_authFailure() {
        authorizationFailed = true;
        authFailureListeners.forEach((notify) => notify());
      },
    });
    configured = true;
  }
  return importLibrary("maps");
}

export default function ParkingMap(props: LiveParkingMapProps) {
  const [maps, setMaps] = useState<google.maps.MapsLibrary | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!apiKey) return;
    let mounted = true;
    const onFailure = () => {
      if (mounted) setFailed(true);
    };
    authFailureListeners.add(onFailure);
    loadMaps(apiKey).then((library) => {
      if (mounted) setMaps(library);
    }).catch(onFailure);
    return () => {
      mounted = false;
      authFailureListeners.delete(onFailure);
    };
  }, []);

  if (!apiKey || failed) return <LeafletMap {...props} />;
  if (maps) return <GoogleParkingMap {...props} maps={maps} />;
  return (
    <div role="status" className={`grid place-items-center bg-slate-100 rounded-2xl text-xs text-slate-600 ${props.className ?? "h-72 w-full"}`}>
      Loading Google Maps…
    </div>
  );
}

function GoogleParkingMap({
  maps,
  destLat,
  destLng,
  userLat,
  userLng,
  userAccuracy,
  licensePlate,
  vehicleType,
  locationName,
  floorZone,
  className = "h-72 w-full",
}: LiveParkingMapProps & { maps: google.maps.MapsLibrary }) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const controls = useRef<{ vehicle(): void; user(): void; fit(): void } | null>(null);
  const hasUser = isValidCoordinate(userLat, userLng);

  useEffect(() => {
    if (!container.current) return;
    const destination = { lat: destLat, lng: destLng };
    const user = hasUser && userLat != null && userLng != null ? { lat: userLat, lng: userLng } : null;
    if (!mapRef.current) {
      mapRef.current = new maps.Map(container.current, {
        center: destination,
        zoom: 17,
        disableDefaultUI: true,
        zoomControl: true,
        clickableIcons: false,
        gestureHandling: "cooperative",
      });
    }
    const map = mapRef.current;
    const vehicleTitle = [licensePlate, vehicleType].filter(Boolean).join(" · ") || "Parked vehicle";
    const vehicle = map.data.add({ geometry: destination });
    map.data.overrideStyle(vehicle, { title: vehicleTitle, label: { text: "P", color: "white" } });
    const info = new maps.InfoWindow();
    function showInfo(position: google.maps.LatLngLiteral, text: string) {
      const details = document.createElement("div");
      details.className = "whitespace-pre-line text-xs";
      details.textContent = text;
      info.setContent(details);
      info.setPosition(position);
      info.open({ map, shouldFocus: false });
    }

    const vehicleText = [vehicleTitle, floorZone, locationName].filter(Boolean).join("\n");
    const userMarker = user ? map.data.add({ geometry: user }) : null;
    if (userMarker) {
      map.data.overrideStyle(userMarker, {
        title: "Your location",
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: "#007aff",
          fillOpacity: 1,
          strokeColor: "white",
          strokeWeight: 3,
        },
      });
    }
    const accuracy = user && userAccuracy != null && userAccuracy > 0 ? new maps.Circle({
      map,
      center: user,
      radius: userAccuracy,
      strokeWeight: 1,
      strokeColor: "#007aff",
      fillColor: "#007aff",
      fillOpacity: 0.12,
      clickable: false,
    }) : null;
    const line = user ? new maps.Polyline({
      map,
      path: [user, destination],
      geodesic: true,
      clickable: false,
      strokeOpacity: 0,
      icons: [{
        icon: { path: "M 0,-1 0,1", strokeColor: "#007aff", strokeOpacity: 1, scale: 2 },
        repeat: "10px",
      }],
    }) : null;

    const onMarkerClick = map.data.addListener("click", ({ feature }: google.maps.Data.MouseEvent) => {
      if (feature === vehicle) showInfo(destination, vehicleText);
      if (feature === userMarker && user) showInfo(user, "Your location");
    });
    const fit = () => {
      info.close();
      if (user && (user.lat !== destLat || user.lng !== destLng)) {
        map.fitBounds(new google.maps.LatLngBounds().extend(destination).extend(user), 44);
      } else {
        map.setCenter(destination);
        map.setZoom(17);
      }
    };
    function focus(position: google.maps.LatLngLiteral, text: string) {
      map.setZoom(17);
      map.panTo(position);
      showInfo(position, text);
    }
    controls.current = {
      vehicle: () => focus(destination, vehicleText),
      user: () => {
        if (user) focus(user, "Your location");
      },
      fit,
    };
    fit();
    return () => {
      controls.current = null;
      onMarkerClick.remove();
      info.close();
      map.data.remove(vehicle);
      if (userMarker) map.data.remove(userMarker);
      accuracy?.setMap(null);
      line?.setMap(null);
    };
  }, [maps, destLat, destLng, hasUser, userLat, userLng, userAccuracy, licensePlate, vehicleType, floorZone, locationName]);

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-[#EDF2F7] bg-slate-100 ${className}`}>
      <div ref={container} className="h-full w-full" aria-label="Parking location on Google Maps" />
      <div className="absolute top-2 left-2 flex gap-1 rounded-lg bg-white p-1 text-xs font-semibold text-[#007AFF] shadow">
        <button type="button" className="rounded px-2 py-1.5 hover:bg-blue-50" onClick={() => controls.current?.vehicle()}>Vehicle</button>
        {hasUser && (
          <>
            <button type="button" className="rounded px-2 py-1.5 hover:bg-blue-50" onClick={() => controls.current?.user()}>My location</button>
            <button type="button" className="rounded px-2 py-1.5 hover:bg-blue-50" onClick={() => controls.current?.fit()}>Show both</button>
          </>
        )}
      </div>
    </div>
  );
}
