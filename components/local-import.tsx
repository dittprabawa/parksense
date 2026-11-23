"use client";

import { useState } from "react";
import { useAccount } from "./account-gate";
import { writeParking } from "@/lib/cloud-parking";
import { STORAGE_KEY, type ParkingRecord } from "@/lib/parking-storage";
import { messageOf } from "@/lib/supabase";

const seedIds = new Set(["rec-1", "rec-2", "rec-3", "rec-4", "rec-5"]);
const stockPhotos = new Set(["/motorcycle-b2.png", "/history-campus.png", "/history-mall.png"]);
type Claim = { owner: string; id: string; done: boolean };
const claimKey = (id: string) => ["parksense-import", process.env.NEXT_PUBLIC_SUPABASE_URL, id].join(":");

function readClaim(id: string): Claim | null {
  const value = localStorage.getItem(claimKey(id));
  if (!value) return null;
  const c = JSON.parse(value);
  if (!c || typeof c.owner !== "string" || typeof c.id !== "string" || typeof c.done !== "boolean")
    throw new Error("Import marker is unreadable. The original record is still on this device.");
  return c;
}

function isLegacy(r: unknown): r is ParkingRecord {
  if (!r || typeof r !== "object") return false;
  const x = r as Partial<ParkingRecord>;
  return typeof x.id === "string" && /^rec-\d+$/.test(x.id) &&
    typeof x.type === "string" && typeof x.licensePlate === "string" && Boolean(x.licensePlate.trim()) &&
    typeof x.location === "string" && Boolean(x.location.trim()) && typeof x.floorZone === "string" &&
    Number.isFinite(new Date(x.createdAt ?? NaN).getTime()) && (x.status === "active" || x.status === "past") &&
    (x.thumbnailUrl == null || typeof x.thumbnailUrl === "string");
}

export function LocalImport() {
  const user = useAccount();
  const [candidates, setCandidates] = useState<ParkingRecord[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function review() {
    setCandidates([]);
    try {
      const raw: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
      if (!Array.isArray(raw)) throw new Error("Unreadable local history. The original data is still on this device.");
      const eligible = raw.filter(isLegacy).filter(r => {
        if (seedIds.has(r.id)) return false;
        const claim = readClaim(r.id);
        return !claim || (claim.owner === user.id && !claim.done);
      });
      const invalid = raw.filter(r => !isLegacy(r)).length;
      setCandidates(eligible);
      setMessage(eligible.length ? "Choose only your own entries. An existing active cloud spot takes priority." :
        "No eligible entries on this device.");
      if (invalid) setMessage(m => m + " Some local entries could not be read and were preserved.");
    } catch (error) { setMessage(messageOf(error)); }
  }

  async function importOne(record: ParkingRecord) {
    setBusy(true);
    try {
      const existing = readClaim(record.id);
      if (existing && (existing.owner !== user.id || existing.done)) throw new Error("Recheck the entries on this device.");
      const claim = existing ?? { owner: user.id, id: crypto.randomUUID(), done: false };
      // Bind this explicitly chosen record to the account before the first network operation.
      localStorage.setItem(claimKey(record.id), JSON.stringify(claim));
      const photo = record.thumbnailUrl ?? "";
      if (photo && !stockPhotos.has(photo) && !photo.startsWith("data:"))
        throw new Error("Unsupported local photo. The record is still on this device.");
      await writeParking(user.id, claim.id, { ...record, thumbnailUrl: stockPhotos.has(photo) ? "" : photo },
        { legacyId: record.id, parkedAt: new Date(record.createdAt).toISOString() });
      localStorage.setItem(claimKey(record.id), JSON.stringify({ ...claim, done: true }));
      setCandidates(items => items.filter(r => r.id !== record.id));
      setMessage("Imported. The original is still on this device.");
    } catch (error) { setMessage(messageOf(error)); }
    finally { setBusy(false); }
  }

  return <section className="mb-4 space-y-2">
    <button onClick={review} disabled={busy} className="text-sm text-[#007AFF]">Review old records on this device</button>
    {message && <p role="status" className="text-xs">{message}</p>}
    {candidates.map(r => <div key={r.id} className="bg-white rounded-xl border p-3 text-sm">
      <p>{r.licensePlate} · {r.location} · {new Date(r.createdAt).toLocaleString()}</p>
      <button disabled={busy} className="text-[#007AFF]" onClick={() => importOne(r)}>Import into {user.email}</button>
    </div>)}
  </section>;
}
