"use client";

import React, { useState, useRef } from "react";
import { ParkingPhoto } from "@/components/parking-photo";
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
} from "@/components/icons";
import { useAccount } from "@/components/account-gate";
import { messageOf } from "@/lib/supabase";
import { readParking, writeParking } from "@/lib/cloud-parking";
import { ParkingRecord, VehicleType } from "@/lib/parking-storage";

export default function SaveParkingPage() {
  const router = useRouter();
  const user = useAccount();
  const draftKey = "parksense-photo:" + user.id;
  const requestId = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [vehicleType, setVehicleType] = useState<VehicleType>("Motorcycle");
  const [licensePlate, setLicensePlate] = useState("");
  const [building, setBuilding] = useState("");
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
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  // UI state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedRecord, setSavedRecord] = useState<ParkingRecord | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Handle Photo Capture / Upload
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

    if (!floor.trim() && !zone.trim()) {
      newErrors.floorZone = "Floor or Zone is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !validateForm()) return;

    setIsSubmitting(true);

    const floorZoneFormatted =
      floor.trim() && zone.trim()
        ? `${floor.trim()} – ${zone.trim()}`
        : floor.trim() || zone.trim();

    const input = {
      type: vehicleType,
      licensePlate: licensePlate.trim().toUpperCase(),
      location: building.trim(),
      floorZone: floorZoneFormatted,
      building: building.trim(),
      floor: floor.trim(),
      zone: zone.trim(),
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
                errors.licensePlate ? "border-[#FF3B30] ring-1 ring-[#FF3B30]/30" : "border-[#EDF2F7]"
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
            {errors.licensePlate && (
              <p className="text-xs text-[#FF3B30] mt-1 px-1 font-medium" role="alert">
                {errors.licensePlate}
              </p>
            )}
          </div>

          {/* Section 2: Parking Location */}
          <div className="mb-4">
            <h2 className="text-base font-bold text-[#0B1222] mb-2.5">Parking Location</h2>

            {/* Location / Building */}
            <div
              className={`bg-white rounded-2xl p-3.5 border shadow-xs mb-2.5 transition-colors ${
                errors.building ? "border-[#FF3B30] ring-1 ring-[#FF3B30]/30" : "border-[#EDF2F7]"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="text-[#007AFF] shrink-0">
                  <LocationPinIcon className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <label htmlFor="building" className="block text-xs text-[#5E6E82] font-normal leading-tight">
                    Building / Location <span className="text-[#FF3B30]">*</span>
                  </label>
                  <input
                    id="building"
                    type="text"
                    value={building}
                    onChange={(e) => {
                      setBuilding(e.target.value);
                      if (errors.building) {
                        setErrors((prev) => {
                          const next = { ...prev };
                          delete next.building;
                          return next;
                        });
                      }
                    }}
                    placeholder="e.g. Campus Parking – Building A"
                    className="w-full bg-transparent text-[15px] font-semibold text-[#0B1222] mt-0.5 focus:outline-none"
                    required
                  />
                </div>
              </div>
            </div>
            {errors.building && (
              <p className="text-xs text-[#FF3B30] -mt-1.5 mb-2 px-1 font-medium" role="alert">
                {errors.building}
              </p>
            )}

            {/* Floor & Zone Dual Fields */}
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
                    placeholder="e.g. Near Elevator & South Exit"
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
                {gpsCoords ? (
                  <button
                    type="button"
                    onClick={() => setGpsCoords(null)}
                    className="text-[11px] text-[#FF3B30] hover:underline"
                  >
                    Clear GPS
                  </button>
                ) : null}
              </div>
              {gpsCoords ? (
                <p className="text-xs font-mono text-[#34C759]">
                  ✓ Recorded: {gpsCoords.lat.toFixed(5)}, {gpsCoords.lng.toFixed(5)}
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (!navigator.geolocation) return;
                    setGpsLoading(true);
                    navigator.geolocation.getCurrentPosition(
                      (pos) => {
                        setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
                        setGpsLoading(false);
                      },
                      () => setGpsLoading(false),
                      { enableHighAccuracy: true, timeout: 10000 }
                    );
                  }}
                  disabled={gpsLoading}
                  className="text-xs font-semibold text-[#007AFF] hover:underline flex items-center gap-1.5"
                >
                  {gpsLoading ? "Acquiring GPS..." : "+ Record Current GPS Coordinates"}
                </button>
              )}
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
            <Button type="submit" variant="primary" disabled={isSubmitting}>
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
