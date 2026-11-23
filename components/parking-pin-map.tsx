"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type Pin = { lat: number; lng: number; accuracy?: number };
export type Fix = Pin & { accuracy: number };

export default function ParkingPinMap({ fix, onMove }: { fix: Fix; onMove: (pin: Pin) => void }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!host.current) return;
    const map = L.map(host.current).setView(fix, 19);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    L.circle(fix, { radius: fix.accuracy, weight: 1, color: "#007aff" }).addTo(map);
    const marker = L.marker(fix, {
      draggable: true, title: "Parking pin", icon: L.divIcon({
        className: "", iconSize: [30, 30], iconAnchor: [15, 15],
        html: '<span style="display:grid;place-items:center;width:30px;height:30px;border-radius:50%;background:#d32f2f;color:white;border:2px solid white;font-weight:bold">P</span>',
      }),
    }).addTo(map);
    function move(position: L.LatLng) {
      const point = position.wrap();
      marker.setLatLng(point);
      onMove({ lat: point.lat, lng: point.lng });
    }
    marker.on("dragend", () => move(marker.getLatLng()));
    map.on("click", event => move(event.latlng));
    return () => { map.remove(); };
  }, [fix, onMove]);
  return <div ref={host} aria-label="Adjust parking pin" style={{ height: "14rem" }} className="relative w-full rounded-xl" />;
}
