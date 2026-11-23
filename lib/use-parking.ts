"use client";

import { useEffect, useState } from "react";
import { useAccount } from "@/components/account-gate";
import { readParking } from "./cloud-parking";
import type { ParkingRecord } from "./parking-storage";
import { messageOf } from "./supabase";

export function useParking(scope: "all" | "active" | "details" | { id: string }) {
  const { id: owner } = useAccount();
  const recordId = typeof scope === "object" ? scope.id : null;
  const mode = typeof scope === "object" ? "id" : scope;
  const key = JSON.stringify([owner, mode, recordId]);
  const [state, setState] = useState({ key: "", records: [] as ParkingRecord[], error: "" });
  useEffect(() => {
    let version = 0;
    async function reload() {
      const request = ++version;
      try {
        const query = mode === "id" ? { id: recordId! } : mode === "details" ? "active" : mode;
        let records = await readParking(owner, query);
        if (mode === "details" && !records.length) records = await readParking(owner, "latest");
        if (request === version) setState({ key, records, error: "" });
      } catch (error) {
        if (request === version) setState({ key, records: [], error: messageOf(error) });
      }
    }
    void reload();
    const refreshVisible = () => { if (document.visibilityState === "visible") void reload(); };
    window.addEventListener("focus", refreshVisible);
    window.addEventListener("online", reload);
    document.addEventListener("visibilitychange", refreshVisible);
    window.addEventListener("parksense_storage_change", reload);
    const timer = window.setInterval(refreshVisible, 60000);
    return () => {
      ++version;
      clearInterval(timer);
      window.removeEventListener("focus", refreshVisible);
      window.removeEventListener("online", reload);
      document.removeEventListener("visibilitychange", refreshVisible);
      window.removeEventListener("parksense_storage_change", reload);
    };
  }, [key, owner, mode, recordId]);
  const loaded = state.key === key;
  return { records: loaded ? state.records : [], isLoaded: loaded, error: loaded ? state.error : "" };
}
