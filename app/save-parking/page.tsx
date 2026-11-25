"use client";

import React, { useState, useRef, useEffect } from "react";
import { ParkingPhoto } from "@/components/parking-photo";
import { VehiclePhotoScan } from "@/components/vehicle-photo-scan";
import type { VehicleScan } from "@/lib/vehicle-scan";
import dynamic from "next/dynamic";
import type { Pin, Fix } from "@/components/parking-pin-map";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MobileShell } from "@/components/mobile-shell";
import { TopHeader } from "@/components/top-header";
import { Button } from "@/components/ui/button";
import {
  MotorcycleIcon,
  CarIcon,
  LicensePlateIcon,
  LocationPinIcon,
  LayersIcon,
  ClockIcon,
  PhotoCameraIcon,
  PhotoLibraryIcon,
  CheckIcon,
  NoteIcon,
  CompassIcon,
  XIcon,
  ArrowPathIcon,
} from "@/components/icons";
import { useAccount } from "@/components/account-gate";
import { messageOf, supabase } from "@/lib/supabase";
import { readParking, writeParking } from "@/lib/cloud-parking";
import { calculateDistanceMeters, ParkingRecord, VehicleType } from "@/lib/parking-storage";
import { reverseGeocode } from "@/lib/reverse-geocode";

const ParkingPinMap = dynamic(() => import("@/components/parking-pin-map"), { ssr: false });

export default function SaveParkingPage() {
  const router = useRouter();
  const user = useAccount();
  const draftKey = "parksense-photo:" + user.id;
  const requestId = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [manualVehicleType, setVehicleType] = useState<VehicleType | null>(null);
  const [manualPlate, setLicensePlate] = useState<string | null>(null);
  const [detected, setDetected] = useState<VehicleScan | null>(null);
  const vehicleType = manualVehicleType ?? detected?.vehicleType ?? "Motorcycle";
  const licensePlate = manualPlate ?? detected?.licensePlate ?? "";
  const [parkingArea, setParkingArea] = useState<"Indoor" | "Outdoor">("Indoor");
  const locationEdits = useRef(0);
  const [manualLocation, setManualLocation] = useState<string | null>(null);
  const [floor, setFloor] = useState("");
  const [zone, setZone] = useState("");
  const [nearbyLandmark, setNearbyLandmark] = useState("");
  const [notes, setNotes] = useState("");
  const [photoUrl, setPhotoUrl] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const captured = sessionStorage.getItem(draftKey);
        if (captured) return captured;
      } catch {}
    }
    return "";
  });
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsCoords, setGpsCoords] = useState<Pin | null>(null);
  const [place, setPlace] = useState<{
    key: string;
    name: string;
    source?: "history" | "geocoded" | "coords";
    altName?: string;
  } | null>(null);
  const [lookupAttempt, setLookupAttempt] = useState(0);
  const pinLabel = gpsCoords ? gpsCoords.lat.toFixed(6) + ", " + gpsCoords.lng.toFixed(6) : "";
  const lookupKey = pinLabel + "/" + lookupAttempt;
  const autoPlace = place?.key === lookupKey ? place.name : undefined;
  const building = manualLocation ?? (autoPlace || (gpsLoading ? "" : pinLabel));
  const useAutoName = manualLocation === null;

  useEffect(() => {
    if (!pinLabel || !useAutoName) return;
    const controller = new AbortController();
    let current = true;
    const timer = window.setTimeout(async () => {
      const [lat, lng] = pinLabel.split(", ").map(Number);
      let foundName = "";
      let source: "history" | "geocoded" | "coords" = "coords";

      try {
        const geoPromise = reverseGeocode(lat, lng, { signal: controller.signal });

        let historyName = "";
        const { data, error } = await supabase()
          .from("parking_records")
          .select("location,latitude,longitude")
          .eq("user_id", user.id)
          .not("latitude", "is", null)
          .order("parked_at", { ascending: false })
          .limit(100)
          .abortSignal(controller.signal);

        if (!error && data) {
          let nearest = 25;
          for (const row of data) {
            if (
              typeof row.latitude !== "number" ||
              typeof row.longitude !== "number" ||
              typeof row.location !== "string" ||
              !row.location.trim() ||
              /^-?\d+\.\d+,\s*-?\d+\.\d+$/.test(row.location.trim())
            )
              continue;

            const trimmed = row.location.trim();
            if (/campus parking|building a|zone c/i.test(trimmed)) {
              continue;
            }

            const distance = calculateDistanceMeters(lat, lng, row.latitude, row.longitude);
            if (distance < nearest) {
              nearest = distance;
              historyName = row.location;
            }
          }
        }

        const geoName = await geoPromise;

        if (geoName) {
          foundName = geoName;
          source = "geocoded";
        } else if (historyName) {
          foundName = historyName;
          source = "history";
        }

        const alt = foundName && historyName && historyName !== foundName ? historyName : undefined;

        if (current) {
          setPlace({
            key: lookupKey,
            name: foundName,
            source: foundName ? source : "coords",
            altName: alt,
          });
        }
      } catch {
        if (current) {
          try {
            const geo = await reverseGeocode(lat, lng, { signal: controller.signal });
            setPlace({ key: lookupKey, name: geo || "", source: geo ? "geocoded" : "coords" });
          } catch {
            setPlace({ key: lookupKey, name: "", source: "coords" });
          }
        }
      }
    }, 250);

    return () => {
      current = false;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [pinLabel, lookupKey, useAutoName, user.id]);

  const [gpsFix, setGpsFix] = useState<Fix | null>(null);
  const [gpsMessage, setGpsMessage] = useState("");
  const cancelGps = useRef<(() => void) | null>(null);
  useEffect(() => () => cancelGps.current?.(), []);

  function sampleGps(useLocationName = false) {
    const editsAtStart = locationEdits.current;
    if (!navigator.geolocation) {
      setGpsMessage("GPS is unavailable. You can enter location manually.");
      return;
    }
    cancelGps.current?.();
    setGpsLoading(true);
    setGpsMessage("Detecting your parking location…");
    let best: Fix | null = null;
    const times = new Set<number>();
    let active = true;
    let next = 0;
    const deadline = window.setTimeout(() => finish(), 12000);

    function stop() {
      active = false;
      window.clearTimeout(deadline);
      window.clearTimeout(next);
      cancelGps.current = null;
    }

    function finish(message?: string) {
      if (!active) return;
      stop();
      setGpsLoading(false);
      if (best) {
        if (useLocationName && editsAtStart === locationEdits.current) setManualLocation(null);
        setGpsFix(best);
        setGpsCoords(best);
        setGpsMessage(`Location locked (±${Math.ceil(best.accuracy)}m).`);
      } else {
        setGpsMessage(message ?? "Too few fresh GPS readings. You can enter location manually.");
      }
    }

    cancelGps.current = stop;

    function read() {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!active) return;
          const { latitude: lat, longitude: lng, accuracy } = position.coords;
          if (
            !times.has(position.timestamp) &&
            Number.isFinite(accuracy) &&
            accuracy >= 0 &&
            Number.isFinite(lat) &&
            Number.isFinite(lng) &&
            Math.abs(lat) <= 90 &&
            Math.abs(lng) <= 180
          ) {
            times.add(position.timestamp);
            if (!best || accuracy <= best.accuracy) {
              best = { lat, lng, accuracy };
              if (useLocationName && editsAtStart === locationEdits.current && manualLocation === null) {
                setGpsFix(best);
                setGpsCoords(best);
              }
            }
          }

          if ((times.size >= 2 && best && best.accuracy <= 15) || times.size >= 4) {
            return finish();
          }

          setGpsMessage(`Detecting location (${times.size}/4)…`);
          next = window.setTimeout(read, 800);
        },
        (error) => {
          if (!active) return;
          if (error.code === 1) {
            finish("Location permission denied. You can enter location manually.");
          } else if (best) {
            finish();
          } else {
            next = window.setTimeout(read, 1000);
          }
        },
        { maximumAge: 10000, enableHighAccuracy: true, timeout: 5000 }
      );
    }

    read();
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      sampleGps(true);
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // UI state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedRecord, setSavedRecord] = useState<ParkingRecord | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrors((prev) => ({ ...prev, photo: "Please select a valid image file" }));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === "string") {
        if (photoUrl !== event.target.result) setDetected(null);
        setPhotoUrl(event.target.result);
        setErrors((prev) => {
          const next = { ...prev };
          delete next.photo;
          return next;
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const triggerCamera = () => {
    fileInputRef.current?.click();
  };

  // Validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!licensePlate.trim()) {
      newErrors.licensePlate = "License plate number is required";
    }

    if (!building.trim()) {
      newErrors.building = "Parking building or location is required";
    }

    if (parkingArea === "Indoor" && !floor.trim() && !zone.trim()) {
      newErrors.floorZone = "Floor or Zone is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (gpsLoading || isSubmitting || !validateForm()) return;

    setIsSubmitting(true);

    const floorZoneFormatted =
      parkingArea === "Outdoor"
        ? "Outdoor"
        : floor.trim() && zone.trim()
        ? `${floor.trim()} – ${zone.trim()}`
        : floor.trim() || zone.trim();

    const input = {
      type: vehicleType,
      licensePlate: licensePlate.trim().toUpperCase(),
      location: building.trim(),
      floorZone: floorZoneFormatted,
      building: building.trim(),
      floor: parkingArea === "Outdoor" ? "" : floor.trim(),
      zone: parkingArea === "Outdoor" ? "" : zone.trim(),
      nearbyLandmark: nearbyLandmark.trim() || undefined,
      notes: notes.trim() || undefined,
      latitude: gpsCoords?.lat,
      longitude: gpsCoords?.lng,
      accuracy: gpsCoords?.accuracy,
      status: "active" as const,
      thumbnailUrl: photoUrl,
    };
    try {
      requestId.current ??= crypto.randomUUID();
      const id = await writeParking(user.id, requestId.current, input);
      const [saved] = await readParking(user.id, { id });
      if (!saved) throw new Error("The saved record could not be confirmed. Check History before retrying.");
      try { sessionStorage.removeItem(draftKey); } catch {}
      setSavedRecord(saved);
      setShowSuccessModal(true);
    } catch (error) { setErrors({ submit: messageOf(error) }); }
    finally { setIsSubmitting(false); }
  };

  return (
    <MobileShell>
      <div className="flex flex-col flex-1 pb-4">
        <TopHeader title="Save Parking" backHref="/home" />

        <form onSubmit={handleSubmit} className="flex flex-col flex-1" noValidate>
          {/* Captured Vehicle Photo Box */}
          <div className="relative w-full h-56 rounded-2xl overflow-hidden shadow-xs border border-[#EDF2F7] mb-5 bg-[#0B1222]/5 shrink-0 group">
            <ParkingPhoto preview={photoUrl}
              className="object-cover"
              alt="Vehicle preview"
            />

            {/* Photo Action Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end justify-between p-3.5">
              <span className="text-xs font-medium text-white/90 drop-shadow-sm">
                Vehicle Photo
              </span>
              <div className="flex items-center gap-2">
                <Link
                  href="/take-photo"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 hover:bg-white text-[#0B1222] text-xs font-semibold shadow-md backdrop-blur-sm transition-all active:scale-95"
                  aria-label="Retake photo using camera"
                >
                  <PhotoCameraIcon className="w-3.5 h-3.5 text-[#007AFF]" />
                  <span>Retake</span>
                </Link>
                <button
                  type="button"
                  onClick={triggerCamera}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 hover:bg-white text-[#0B1222] text-xs font-semibold shadow-md backdrop-blur-sm transition-all active:scale-95"
                  aria-label="Upload photo from files"
                >
                  <PhotoLibraryIcon className="w-3.5 h-3.5 text-[#007AFF]" />
                  <span>Upload</span>
                </button>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handlePhotoUpload}
              aria-label="Upload vehicle photo"
            />
          </div>

          {errors.photo && (
            <p className="text-xs text-[#FF3B30] -mt-3 mb-3 px-1" role="alert">
              {errors.photo}
            </p>
          )}

          {photoUrl && !isSubmitting && !showSuccessModal && (
            <VehiclePhotoScan key={photoUrl} photo={photoUrl} onDetect={setDetected} />
          )}

          {/* Section 1: Vehicle Information */}
          <div className="mb-4">
            <h2 className="text-base font-bold text-[#0B1222] mb-2.5">
              Vehicle Information
            </h2>

            {/* Vehicle Type Picker */}
            <div className="bg-white rounded-2xl p-3.5 border border-[#EDF2F7] shadow-xs mb-2.5">
              <label className="block text-xs text-[#5E6E82] font-normal mb-2">
                Vehicle Type <span className="text-[#FF3B30]">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["Motorcycle", "Car", "Bicycle"] as VehicleType[]).map((type) => {
                  const isSelected = vehicleType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setVehicleType(type)}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-semibold transition-all ${
                        isSelected
                          ? "bg-[#007AFF] text-white shadow-xs"
                          : "bg-[#F6F8FD] text-[#5E6E82] hover:bg-[#EDF2F7] hover:text-[#0B1222]"
                      }`}
                    >
                      {type === "Motorcycle" && <MotorcycleIcon className="w-4 h-4 shrink-0" />}
                      {type === "Car" && <CarIcon className="w-4 h-4 shrink-0" />}
                      {type === "Bicycle" && <MotorcycleIcon className="w-4 h-4 shrink-0" />}
                      <span>{type}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* License Plate Input */}
            <div
              className={`bg-white rounded-2xl p-3.5 border shadow-xs transition-colors ${
                errors.licensePlate && !licensePlate.trim() ? "border-[#FF3B30] ring-1 ring-[#FF3B30]/30" : "border-[#EDF2F7]"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="text-[#007AFF] shrink-0">
                  <LicensePlateIcon className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <label htmlFor="licensePlate" className="block text-xs text-[#5E6E82] font-normal leading-tight">
                    License Plate <span className="text-[#FF3B30]">*</span>
                  </label>
                  <input
                    id="licensePlate"
                    type="text"
                    value={licensePlate}
                    onChange={(e) => {
                      setLicensePlate(e.target.value.toUpperCase());
                      if (errors.licensePlate) {
                        setErrors((prev) => {
                          const next = { ...prev };
                          delete next.licensePlate;
                          return next;
                        });
                      }
                    }}
                    placeholder="e.g. DK 1234 AB"
                    className="w-full bg-transparent text-[15px] font-semibold text-[#0B1222] mt-0.5 focus:outline-none uppercase"
                    required
                  />
                </div>
              </div>
            </div>
            {errors.licensePlate && !licensePlate.trim() && (
              <p className="text-xs text-[#FF3B30] mt-1 px-1 font-medium" role="alert">
                {errors.licensePlate}
              </p>
            )}
          </div>

          {/* Section 2: Parking Location */}
          <div className="mb-4">
            <h2 className="text-base font-bold text-[#0B1222] mb-2.5">Parking Location</h2>

            {/* Indoor / Outdoor Picker */}
            <div className="bg-white rounded-2xl p-3.5 border border-[#EDF2F7] shadow-xs mb-2.5">
              <label className="block text-xs text-[#5E6E82] font-normal mb-2">
                Parking Area <span className="text-[#FF3B30]">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(["Indoor", "Outdoor"] as const).map((area) => {
                  const isSelected = parkingArea === area;
                  return (
                    <button
                      key={area}
                      type="button"
                      onClick={() => {
                        setParkingArea(area);
                        if (area === "Outdoor" && errors.floorZone) {
                          setErrors((prev) => {
                            const next = { ...prev };
                            delete next.floorZone;
                            return next;
                          });
                        }
                      }}
                      className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[#007AFF] text-white shadow-xs"
                          : "bg-[#F6F8FD] text-[#5E6E82] hover:bg-[#EDF2F7] hover:text-[#0B1222]"
                      }`}
                    >
                      {area === "Indoor" ? (
                        <svg
                          className="w-4 h-4 shrink-0"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <rect x="4" y="2" width="16" height="20" rx="2" />
                          <path d="M9 22v-4h6v4" />
                          <path d="M8 6h.01" />
                          <path d="M16 6h.01" />
                          <path d="M12 6h.01" />
                          <path d="M12 10h.01" />
                          <path d="M12 14h.01" />
                          <path d="M16 10h.01" />
                          <path d="M16 14h.01" />
                          <path d="M8 10h.01" />
                          <path d="M8 14h.01" />
                        </svg>
                      ) : (
                        <svg
                          className="w-4 h-4 shrink-0"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <circle cx="12" cy="12" r="4" />
                          <path d="M12 2v2" />
                          <path d="M12 20v2" />
                          <path d="m4.93 4.93 1.41 1.41" />
                          <path d="m17.66 17.66 1.41 1.41" />
                          <path d="M2 12h2" />
                          <path d="M20 12h2" />
                          <path d="m6.34 17.66-1.41 1.41" />
                          <path d="m19.07 4.93-1.41 1.41" />
                        </svg>
                      )}
                      <span>{area}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-[#5E6E82] mt-2">
                {parkingArea === "Indoor"
                  ? "Includes Floor & Zone fields for malls, basements, or parking buildings."
                  : "Open-air parking — Floor & Zone are not required."}
              </p>
            </div>

            {/* Floor & Zone Dual Fields (Indoor Only) */}
            {parkingArea === "Indoor" && (
              <>
                <div
                  className={`bg-white rounded-2xl p-3.5 border shadow-xs mb-2.5 transition-colors ${
                    errors.floorZone ? "border-[#FF3B30] ring-1 ring-[#FF3B30]/30" : "border-[#EDF2F7]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-[#007AFF] shrink-0">
                      <LayersIcon className="w-6 h-6" />
                    </div>
                    <div className="min-w-0 flex-1 grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="floor" className="block text-xs text-[#5E6E82] font-normal leading-tight">
                          Floor <span className="text-[#FF3B30]">*</span>
                        </label>
                        <input
                          id="floor"
                          type="text"
                          value={floor}
                          onChange={(e) => {
                            setFloor(e.target.value);
                            if (errors.floorZone) {
                              setErrors((prev) => {
                                const next = { ...prev };
                                delete next.floorZone;
                                return next;
                              });
                            }
                          }}
                          placeholder="e.g. B2"
                          className="w-full bg-transparent text-[15px] font-semibold text-[#0B1222] mt-0.5 focus:outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="zone" className="block text-xs text-[#5E6E82] font-normal leading-tight">
                          Zone <span className="text-[#FF3B30]">*</span>
                        </label>
                        <input
                          id="zone"
                          type="text"
                          value={zone}
                          onChange={(e) => {
                            setZone(e.target.value);
                            if (errors.floorZone) {
                              setErrors((prev) => {
                                const next = { ...prev };
                                delete next.floorZone;
                                return next;
                              });
                            }
                          }}
                          placeholder="e.g. Zone C"
                          className="w-full bg-transparent text-[15px] font-semibold text-[#0B1222] mt-0.5 focus:outline-none"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>
                {errors.floorZone && (
                  <p className="text-xs text-[#FF3B30] -mt-1.5 mb-2 px-1 font-medium" role="alert">
                    {errors.floorZone}
                  </p>
                )}
              </>
            )}

            {/* Location / Building */}
            <div
              className={`bg-white rounded-2xl p-3.5 border shadow-xs mb-2.5 transition-colors ${
                errors.building && !building.trim() ? "border-[#FF3B30] ring-1 ring-[#FF3B30]/30" : "border-[#EDF2F7]"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="text-[#007AFF] shrink-0">
                  <LocationPinIcon className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between mb-0.5">
                    <label htmlFor="building" className="block text-xs text-[#5E6E82] font-normal leading-tight">
                      {parkingArea === "Indoor" ? "Building / Location" : "Location Name"}{" "}
                      <span className="text-[#FF3B30]">*</span>
                    </label>
                    {useAutoName && autoPlace && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#007AFF]/10 text-[#007AFF]">
                        <CompassIcon className="w-3 h-3" />
                        {place?.source === "history" ? "From History" : "Auto-detected"}
                      </span>
                    )}
                  </div>
                  <input
                    id="building"
                    type="text"
                    value={building}
                    onChange={(e) => {
                      locationEdits.current++;
                      setManualLocation(e.target.value);
                      if (errors.building) {
                        setErrors((prev) => {
                          const next = { ...prev };
                          delete next.building;
                          return next;
                        });
                      }
                    }}
                    placeholder={
                      gpsLoading
                        ? "Detecting parking location…"
                        : parkingArea === "Indoor"
                        ? "e.g. Campus Parking – Building A"
                        : "e.g. Open Lot near Main Gate"
                    }
                    className="w-full bg-transparent text-[15px] font-semibold text-[#0B1222] mt-0.5 focus:outline-none"
                    required
                  />
                </div>
              </div>
            </div>
            <div className="px-1 mb-3 text-xs flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 text-[#007AFF] font-semibold hover:underline"
                  disabled={gpsLoading || isSubmitting}
                  onClick={() => {
                    setManualLocation(null);
                    sampleGps(true);
                    setLookupAttempt((n) => n + 1);
                  }}
                >
                  <ArrowPathIcon className={`w-3.5 h-3.5 ${gpsLoading ? "animate-spin" : ""}`} />
                  <span>{gpsLoading ? "Detecting location…" : "Refresh Auto Location"}</span>
                </button>

                {!useAutoName && (
                  <button
                    type="button"
                    className="text-[11px] text-[#007AFF] font-medium hover:underline"
                    onClick={() => {
                      setManualLocation(null);
                      setLookupAttempt((n) => n + 1);
                    }}
                  >
                    Revert to auto-detected
                  </button>
                )}
              </div>

              <p className="text-[11px] text-[#5E6E82]" role="status">
                {gpsLoading
                  ? gpsMessage
                  : useAutoName && autoPlace
                  ? place?.source === "history"
                    ? "Auto-filled from your previous parking history at this spot."
                    : "Auto-detected using GPS. You can edit this name anytime."
                  : useAutoName && pinLabel && !autoPlace
                  ? "Location coordinates locked. Resolving place name…"
                  : !gpsCoords && gpsMessage
                  ? gpsMessage
                  : "Your parking location is automatically detected via GPS."}
              </p>

              {place?.altName && useAutoName && (
                <button
                  type="button"
                  className="text-[11px] text-left text-[#5E6E82] hover:text-[#007AFF] underline mt-0.5"
                  onClick={() => {
                    locationEdits.current++;
                    setManualLocation(place.altName!);
                  }}
                >
                  Use previous name: &ldquo;{place.altName}&rdquo;
                </button>
              )}
            </div>
            {errors.building && !building.trim() && (
              <p className="text-xs text-[#FF3B30] -mt-1.5 mb-2 px-1 font-medium" role="alert">
                {errors.building}
              </p>
            )}

            {/* Nearby Landmark */}
            <div className="bg-white rounded-2xl p-3.5 border border-[#EDF2F7] shadow-xs mb-2.5">
              <div className="flex items-center gap-3">
                <div className="text-[#007AFF] shrink-0">
                  <ClockIcon className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <label htmlFor="landmark" className="block text-xs text-[#5E6E82] font-normal leading-tight">
                    Nearby Landmark (Optional)
                  </label>
                  <input
                    id="landmark"
                    type="text"
                    value={nearbyLandmark}
                    onChange={(e) => setNearbyLandmark(e.target.value)}
                    placeholder={
                      parkingArea === "Indoor"
                        ? "e.g. Near Elevator & South Exit"
                        : "e.g. Near Security Post & Main Gate"
                    }
                    className="w-full bg-transparent text-[15px] font-semibold text-[#0B1222] mt-0.5 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Optional GPS Location Capture */}
            <div className="bg-white rounded-2xl p-3.5 border border-[#EDF2F7] shadow-xs mb-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <CompassIcon className="w-5 h-5 text-[#007AFF]" />
                  <span className="text-xs text-[#0B1222] font-semibold">GPS Coordinates (Optional)</span>
                </div>
              </div>
              <p role="status" className="text-xs mb-2">{gpsMessage}</p>
              {gpsFix && gpsCoords && <>
                <ParkingPinMap fix={gpsFix} onMove={setGpsCoords} />
                <p className="mt-2 text-xs">GPS estimate ±{Math.ceil(gpsFix.accuracy)} m (blue circle). Drag the pin or tap the map to adjust.</p>
                <p className="text-xs">{gpsCoords.accuracy === undefined ? "Manual pin" : "GPS pin"} · {gpsCoords.lat.toFixed(6)}, {gpsCoords.lng.toFixed(6)}</p>
              </>}
              <div className="flex gap-4 mt-2 text-sm text-[#007AFF]">
                <button type="button" disabled={gpsLoading || isSubmitting} onClick={() => sampleGps()}>
                  {gpsFix ? "Retake GPS" : "Record GPS"}
                </button>
                {gpsLoading && <button type="button" onClick={() => {
                  cancelGps.current?.(); setGpsLoading(false); setGpsMessage("GPS capture cancelled.");
                }}>Cancel</button>}
                {gpsFix && !gpsLoading && <button type="button" disabled={isSubmitting} onClick={() => {
                  setGpsFix(null); setGpsCoords(null); setGpsMessage("");
                }}>Clear GPS</button>}
              </div>
            </div>

            {/* Optional Parking Note */}
            <div className="bg-white rounded-2xl p-3.5 border border-[#EDF2F7] shadow-xs">
              <div className="flex items-start gap-3">
                <div className="text-[#007AFF] shrink-0 mt-0.5">
                  <NoteIcon className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <label htmlFor="notes" className="block text-xs text-[#5E6E82] font-normal leading-tight">
                    Parking Note (Optional)
                  </label>
                  <textarea
                    id="notes"
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Remember parking ticket on dashboard, near pillar 24"
                    className="w-full bg-transparent text-[14px] text-[#0B1222] mt-1 focus:outline-none resize-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {errors.submit && <p role="alert">{errors.submit}</p>}
          {/* Submit Action */}
          <div className="mt-auto pt-2">
            <Button type="submit" variant="primary" disabled={isSubmitting || gpsLoading}>
              {isSubmitting ? "Saving Parking..." : "Save Parking"}
            </Button>
          </div>
        </form>

        {/* Success Confirmation Modal */}
        {showSuccessModal && savedRecord && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="success-title"
          >
            <div className="bg-white rounded-3xl p-6 w-full max-w-[340px] shadow-2xl border border-gray-100 flex flex-col items-center text-center relative">
              {/* Close / Fallback to Home Top-Right Button */}
              <button
                type="button"
                onClick={() => router.push("/home")}
                className="absolute top-4 right-4 p-1 rounded-full text-[#8E95A5] hover:text-[#0B1222] hover:bg-gray-100 transition-colors"
                aria-label="Close and return to Home"
              >
                <XIcon className="w-5 h-5" />
              </button>

              {/* Green Success Badge */}
              <div className="w-14 h-14 rounded-full bg-[#34C759]/15 flex items-center justify-center text-[#34C759] mb-4">
                <CheckIcon className="w-8 h-8" />
              </div>

              <h3 id="success-title" className="text-xl font-bold text-[#0B1222] mb-1">
                Parking Saved!
              </h3>
              <p className="text-xs text-[#5E6E82] mb-4 max-w-[240px]">
                Your vehicle location has been stored to your active parking spots.
              </p>

              {/* Record Summary Card */}
              <div className="w-full bg-[#F6F8FD] rounded-2xl p-3 border border-[#EDF2F7] flex items-center gap-3 text-left mb-5">
                <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-gray-200">
                  <ParkingPhoto preview={savedRecord.thumbnailUrl} path={savedRecord.photoPath}
                    className="object-cover"
                    alt={savedRecord.licensePlate}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-[#0B1222] truncate">
                    {savedRecord.licensePlate}
                  </p>
                  <p className="text-xs text-[#5E6E82] truncate">
                    {savedRecord.floorZone} · {savedRecord.location}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="w-full space-y-2">
                <Button
                  variant="primary"
                  onClick={() => router.push(`/navigate?id=${savedRecord.id}`)}
                >
                  Find My Vehicle
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => router.push("/home")}
                >
                  Return to Home
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push(`/vehicle-details?id=${savedRecord.id}`)}
                >
                  View Details
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push("/history")}
                >
                  View in History
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MobileShell>
  );
}