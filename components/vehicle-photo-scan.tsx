"use client";

import { useEffect, useRef, useState } from "react";
import type { ScanMessage, VehicleScan } from "@/lib/vehicle-scan";

interface Props {
  photo: string;
  onDetect: (details: VehicleScan) => void;
}

export function VehiclePhotoScan({ photo, onDetect }: Props) {
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const cancel = useRef<(() => void) | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    let worker: Worker | undefined;
    function stop() {
      controller.abort();
      worker?.terminate();
    }
    cancel.current = stop;

    function finish(message: ScanMessage) {
      if (signal.aborted) return;
      stop();
      if ("error" in message) {
        setStatus(message.error);
        return;
      }
      const details = message.result;
      onDetect(details);
      const values = [details.vehicleType, details.licensePlate].filter(Boolean).join(" · ");
      setStatus(values
        ? `Detected ${values}. Check the vehicle details before saving.`
        : "No vehicle or plate recognized. Try a clearer photo or enter the details manually.");
    }

    async function scan() {
      const error = "Scan unavailable. Try again or enter the vehicle details manually.";
      try {
        const response = await fetch(photo, { signal });
        const image = await response.blob();
        if (signal.aborted) return;
        worker = new Worker("/vision-runtime/vehicle-scan.js", { type: "module" });
        worker.onerror = () => finish({ error });
        worker.onmessage = (event: MessageEvent<ScanMessage>) => finish(event.data);
        worker.postMessage(image);
      } catch {
        finish({ error });
      }
    }

    void scan();
    return stop;
  }, [photo, attempt, onDetect]);

  return (
    <div className="mb-4 rounded-2xl border border-[#EDF2F7] bg-white p-3.5 text-sm">
      <p role="status" className="text-xs text-[#5E6E82]">
        {status ?? "Reading the vehicle photo on this device…"}
      </p>
      <button type="button" className="mt-2 font-semibold text-[#007AFF]" onClick={() => {
        if (status === null) {
          cancel.current?.();
          setStatus("Scan cancelled. You can enter the details manually.");
        } else {
          setStatus(null);
          setAttempt(value => value + 1);
        }
      }}>
        {status === null ? "Cancel scan" : "Scan again"}
      </button>
    </div>
  );
}
