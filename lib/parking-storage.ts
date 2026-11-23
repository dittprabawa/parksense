import { mockParkingHistory, mockCurrentVehicle } from "./mock-data";

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
  latitude?: number;
  longitude?: number;
  accuracy?: number;
}

export const STORAGE_KEY = "parksense_parking_records";

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
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
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

export function getInitialSeedRecords(): ParkingRecord[] {
  const now = Date.now();
  return [
    {
      ...mockCurrentVehicle,
      createdAt: now - 1000 * 60 * 60 * 2, // 2 hours ago
      building: "Campus Parking – Building A",
      floor: "B2",
      zone: "Zone C",
      notes: "Parked near elevator pillar B12. Remember to validate parking ticket at lobby.",
    },
    ...mockParkingHistory
      .filter((rec) => rec.id !== mockCurrentVehicle.id)
      .map((rec, index) => ({
        ...rec,
        createdAt: now - 1000 * 60 * 60 * 24 * (index + 2),
      })),
  ];
}

export function getParkingRecords(): ParkingRecord[] {
  if (typeof window === "undefined") {
    return getInitialSeedRecords();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = getInitialSeedRecords();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw) as ParkingRecord[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const initial = getInitialSeedRecords();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    return parsed.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  } catch (error) {
    console.error("Failed to read parking records from localStorage:", error);
    return getInitialSeedRecords();
  }
}

export function getParkingRecordById(id: string): ParkingRecord | null {
  const records = getParkingRecords();
  return records.find((r) => r.id === id) || null;
}

export function getActiveParkingRecord(): ParkingRecord | null {
  return getParkingRecords().find((record) => record.status === "active") ?? null;
}

export function saveParkingRecord(
  data: Omit<ParkingRecord, "id" | "timestamp" | "createdAt"> & {
    id?: string;
    timestamp?: string;
    createdAt?: number;
  }
): ParkingRecord {
  const records = getParkingRecords();
  const now = new Date();
  const recordId = data.id || `rec-${Date.now()}`;
  const timestamp = data.timestamp || formatParkingTimestamp(now);
  const createdAt = data.createdAt || now.getTime();

  const newRecord: ParkingRecord = {
    ...data,
    id: recordId,
    timestamp,
    createdAt,
    status: data.status || "active",
  };

  // If this record is marked active, mark any other records as past
  const updatedRecords = newRecord.status === "active"
    ? records.map((r) => (r.id === newRecord.id ? newRecord : { ...r, status: "past" as const }))
    : records.map((r) => (r.id === newRecord.id ? newRecord : r));

  if (!updatedRecords.some((r) => r.id === newRecord.id)) {
    updatedRecords.unshift(newRecord);
  }

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedRecords));
      window.dispatchEvent(new Event("parksense_storage_change"));
    } catch (error) {
      console.error("Failed to save parking record to localStorage:", error);
    }
  }

  return newRecord;
}

export function updateParkingRecord(
  id: string,
  updates: Partial<Omit<ParkingRecord, "id">>
): ParkingRecord | null {
  const records = getParkingRecords();
  const index = records.findIndex((r) => r.id === id);
  if (index === -1) return null;

  const current = records[index];
  const updated: ParkingRecord = {
    ...current,
    ...updates,
    id: current.id,
  };

  let updatedList = [...records];
  if (updated.status === "active" && current.status !== "active") {
    updatedList = updatedList.map((r) => (r.id === id ? updated : { ...r, status: "past" as const }));
  } else {
    updatedList[index] = updated;
  }

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
      window.dispatchEvent(new Event("parksense_storage_change"));
    } catch (error) {
      console.error("Failed to update parking record in localStorage:", error);
    }
  }

  return updated;
}

export function deleteParkingRecord(id: string): boolean {
  const records = getParkingRecords();
  const filtered = records.filter((r) => r.id !== id);

  if (filtered.length === records.length) {
    return false;
  }

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      window.dispatchEvent(new Event("parksense_storage_change"));
    } catch (error) {
      console.error("Failed to delete parking record from localStorage:", error);
    }
  }

  return true;
}
