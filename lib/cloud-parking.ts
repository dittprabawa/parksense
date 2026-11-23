import { supabase } from "./supabase";
import { formatParkingTimestamp, type ParkingRecord } from "./parking-storage";

export type ParkingInput = Omit<ParkingRecord, "id" | "timestamp" | "createdAt" | "revision">;
const bucket = "parking-photos";
export const parkingChanged = () => window.dispatchEvent(new Event("parksense_storage_change"));

interface ParkingRow {
  id: string; plate: string; vehicle_type: string; location: string; floor_zone: string;
  building: string; floor: string; zone: string; landmark: string | null; notes: string | null;
  parked_at: string; status: ParkingRecord["status"]; revision: number; photo_path: string | null;
  latitude: number | null; longitude: number | null; accuracy: number | null;
}

export async function readParking(userId: string, scope: "all" | "active" | "latest" | { id: string }) {
  const records: ParkingRecord[] = [];
  const pageSize = 100;
  for (let offset = 0; ; offset += pageSize) {
    let query = supabase().from("parking_records").select("*").eq("user_id", userId)
      .order("parked_at", { ascending: false }).order("id", { ascending: false });
    if (scope === "active") query = query.eq("status", "active");
    if (typeof scope === "object") query = query.eq(/^rec-\d+$/.test(scope.id) ? "legacy_id" : "id", scope.id);
    const { data, error } = await query.range(offset, scope === "all" ? offset + pageSize - 1 : offset);
    if (error) throw error;
    const rows = data as ParkingRow[];
    for (const row of rows) {
      const date = new Date(row.parked_at);
      records.push({
        id: row.id, licensePlate: row.plate, type: row.vehicle_type, location: row.location,
        floorZone: row.floor_zone, building: row.building, floor: row.floor, zone: row.zone,
        nearbyLandmark: row.landmark ?? undefined, notes: row.notes ?? undefined,
        latitude: row.latitude ?? undefined, longitude: row.longitude ?? undefined, accuracy: row.accuracy ?? undefined,
        status: row.status, createdAt: date.getTime(), timestamp: formatParkingTimestamp(date), revision: row.revision,
        photoPath: row.photo_path ?? undefined, thumbnailUrl: "",
      });
    }
    if (scope !== "all" || rows.length < pageSize) return records;
  }
}

async function uploadPhoto(userId: string, id: string, dataUrl: string) {
  const allowed = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const;
  if (!/^data:image\/(jpeg|png|webp);base64,/i.test(dataUrl)) throw new Error("Choose a JPEG, PNG or WebP photo.");
  const blob = await (await fetch(dataUrl)).blob();
  if (blob.size > 5242880) throw new Error("Choose a photo under 5 MB.");
  const hash = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  const hex = Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, "0")).join("");
  const path = [userId, id, hex + "." + allowed[blob.type as keyof typeof allowed]].join("/");
  const { error } = await supabase().storage.from(bucket).upload(path, blob, { upsert: false, contentType: blob.type });
  if (error && !["ResourceAlreadyExists", "KeyAlreadyExists", "Duplicate"].includes(error.name) &&
      !("statusCode" in error && String(error.statusCode) === "409")) throw error;
  return path;
}

async function removeUnused(path?: string) {
  if (!path) return;
  const { error } = await supabase().storage.from(bucket).remove([path]);
  if (error) throw new Error("The record was updated, but the old photo could not be removed from private storage.");
}

export async function writeParking(userId: string, id: string, input: ParkingInput,
  options: { previous?: ParkingRecord; legacyId?: string; parkedAt?: string } = {}) {
  const { previous, legacyId, parkedAt } = options;
  const action = previous ? "edit" : legacyId ? "import" : "save";
  let path = previous?.photoPath;
  if (input.thumbnailUrl.startsWith("data:")) path = await uploadPhoto(userId, id, input.thumbnailUrl);
  const fields = {
    type: input.type, licensePlate: input.licensePlate, location: input.location,
    floorZone: input.floorZone, building: input.building, floor: input.floor, zone: input.zone,
    nearbyLandmark: input.nearbyLandmark, notes: input.notes, status: input.status,
    latitude: input.latitude, longitude: input.longitude, accuracy: input.accuracy,
  };
  const result = await supabase().rpc("write_parking", {
    p_id: id, p_action: action, p_data: { ...fields, ownerId: userId, photoPath: path, legacyId, parkedAt }, p_revision: previous?.revision ?? null,
  });
  if (result.error) {
    // Only a definitive database rejection warrants cleanup. On transport loss, a retry uses the same path.
    if (path && path !== previous?.photoPath && /^[A-Z0-9]{5}$/.test(result.error.code)) await removeUnused(path);
    throw result.error;
  }
  parkingChanged();
  // Another device may have already imported this local ID under a different session UUID.
  if (legacyId && result.data !== id) await removeUnused(path);
  if (previous?.photoPath && previous.photoPath !== path) await removeUnused(previous.photoPath);
  return result.data as string;
}

export async function changeParking(record: ParkingRecord, action: "end" | "delete") {
  const { error } = await supabase().rpc("write_parking", {
    p_id: record.id, p_action: action, p_data: {}, p_revision: record.revision,
  });
  if (error) throw error;
  parkingChanged();
  if (action === "delete") await removeUnused(record.photoPath);
}
