export type VehicleType = "Motorcycle" | "Car" | "Bicycle" | "Truck" | "Other";

export interface ParkingRecord {
  id: string;
  type: string;
  licensePlate: string;
  location: string;
  floorZone: string;
  building?: string;
  floor?: string;
  zone?: string;
  nearbyLandmark?: string;
  notes?: string;
  timestamp: string;
  createdAt: number;
  status: "active" | "past";
  thumbnailUrl: string;
  photoPath?: string;
  revision?: number;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
}

export const STORAGE_KEY = "parksense_parking_records";
export const ARRIVAL_RADIUS_METERS = 5;

export function formatParkingTimestamp(date: Date = new Date()): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[date.getMonth()];
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const formattedHours = String(hours).padStart(2, "0");
  return `${month} ${day}, ${year} · ${formattedHours}:${minutes} ${ampm}`;
}

export function isValidCoordinate(lat?: number | null, lng?: number | null): boolean {
  if (typeof lat !== "number" || typeof lng !== "number") return false;
  if (isNaN(lat) || isNaN(lng)) return false;
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && (lat !== 0 || lng !== 0);
}

export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.asin(Math.sqrt(Math.min(1, a)));
  return R * c;
}

export function getProximityMessage(distanceMeters: number, accuracyMeters: number): string | null {
  if (!Number.isFinite(accuracyMeters) || accuracyMeters < 0 || accuracyMeters > ARRIVAL_RADIUS_METERS) {
    return `GPS accuracy is insufficient to estimate proximity within ${ARRIVAL_RADIUS_METERS} meters.`;
  }
  return distanceMeters <= ARRIVAL_RADIUS_METERS ? "Kendaraan sudah dekat." : null;
}

export function formatDistanceAndWalkTime(meters: number): { distance: string; walkTime: string } {
  const distance = meters < 1000 ? `${meters} m` : `${(meters / 1000).toFixed(1)} km`;
  const minutes = Math.max(1, Math.round(meters / 80)); // ~80m per min average walking pace
  const walkTime = minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  return { distance, walkTime };
}

export function getGoogleMapsUrl(
  destLat: number,
  destLng: number,
  userLat?: number,
  userLng?: number
): string {
  if (typeof userLat === "number" && typeof userLng === "number" && isValidCoordinate(userLat, userLng)) {
    return `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLng}&destination=${destLat},${destLng}&travelmode=walking`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${destLat},${destLng}`;
}

export function getAppleMapsUrl(
  destLat: number,
  destLng: number,
  userLat?: number,
  userLng?: number
): string {
  if (typeof userLat === "number" && typeof userLng === "number" && isValidCoordinate(userLat, userLng)) {
    return `https://maps.apple.com/?saddr=${userLat},${userLng}&daddr=${destLat},${destLng}&dirflg=w`;
  }
  return `https://maps.apple.com/?q=${destLat},${destLng}&ll=${destLat},${destLng}`;
}
