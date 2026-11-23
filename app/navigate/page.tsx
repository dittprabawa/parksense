"use client";

import React, { useState, useEffect, Suspense, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import ParkingMap from "@/components/parking-map";
import { useRouter, useSearchParams } from "next/navigation";
import { MobileShell } from "@/components/mobile-shell";
import { TopHeader } from "@/components/top-header";
import { Button } from "@/components/ui/button";
import {
  LocationPinIcon,
  LayersIcon,
  ClockIcon,
  NoteIcon,
  CheckIcon,
  CheckCircleIcon,
  CompassIcon,
  ExternalLinkIcon,
  ExclamationCircleIcon,
  XIcon,
} from "@/components/icons";
import {
  getParkingRecordById,
  getActiveParkingRecord,
  getParkingRecords,
  isValidCoordinate,
  getGoogleMapsUrl,
  getAppleMapsUrl,
  calculateDistanceMeters,
  formatDistanceAndWalkTime,
  ParkingRecord,
} from "@/lib/parking-storage";

function NavigateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const idParam = searchParams.get("id");

  const [record, setRecord] = useState<ParkingRecord | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Geolocation state
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [geoError, setGeoError] = useState<string | null>(null);

  // Arrival Confirmation Modal state
  const [showArrivalModal, setShowArrivalModal] = useState(false);

  // Load record
  useEffect(() => {
    const load = () => {
      let target: ParkingRecord | null = null;
      if (idParam) {
        target = getParkingRecordById(idParam);
      }
      if (!target) {
        target = getActiveParkingRecord();
      }
      if (!target) {
        const all = getParkingRecords();
        target = all.length > 0 ? all[0] : null;
      }
      setRecord(target);
      setIsLoaded(true);
    };

    load();

    const handleStorage = () => load();
    window.addEventListener("parksense_storage_change", handleStorage);
    return () => window.removeEventListener("parksense_storage_change", handleStorage);
  }, [idParam]);

  // Request browser Geolocation ONLY on explicit user button click
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setGeoStatus("error");
      setGeoError("Geolocation is not supported by your browser.");
      return;
    }

    setGeoStatus("loading");
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setGeoStatus("success");
      },
      (err) => {
        setGeoStatus("error");
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setGeoError("Location permission denied. Please allow location access in your browser settings to acquire current coordinates.");
            break;
          case err.POSITION_UNAVAILABLE:
            setGeoError("Location unavailable. GPS signal could not be determined.");
            break;
          case err.TIMEOUT:
            setGeoError("Location request timed out. Please try again.");
            break;
          default:
            setGeoError("An unexpected error occurred while requesting GPS location.");
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  const hasValidCoordinates = record ? isValidCoordinate(record.latitude, record.longitude) : false;

  // Calculate real distance & walking time if both user and dest coordinates exist
  const distanceInfo = useMemo(() => {
    if (!record || !hasValidCoordinates || !userCoords) return null;
    if (typeof record.latitude !== "number" || typeof record.longitude !== "number") return null;

    const meters = calculateDistanceMeters(
      userCoords.lat,
      userCoords.lng,
      record.latitude,
      record.longitude
    );
    return formatDistanceAndWalkTime(meters);
  }, [record, hasValidCoordinates, userCoords]);

  if (!isLoaded) {
    return (
      <MobileShell>
        <div className="flex flex-col flex-1 items-center justify-center text-sm text-[#5E6E82]">
          Loading navigation details...
        </div>
      </MobileShell>
    );
  }

  // Empty state if no parking records exist
  if (!record) {
    return (
      <MobileShell>
        <div className="flex flex-col flex-1 pb-4">
          <TopHeader title="Find My Vehicle" backHref="/home" />
          <div className="flex flex-col flex-1 items-center justify-center text-center px-4">
            <div className="w-16 h-16 rounded-full bg-[#E8EDF5] flex items-center justify-center text-[#007AFF] mb-3">
              <CompassIcon className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-[#0B1222] mb-1">No Saved Parking Spot</h2>
            <p className="text-sm text-[#5E6E82] mb-5 max-w-[250px]">
              You don&apos;t have any saved parking records yet. Save your vehicle location first to use navigation guidance.
            </p>
            <Button variant="primary" href="/save-parking">
              Save Parking
            </Button>
          </div>
        </div>
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <div className="flex flex-col flex-1 pb-4">
        <TopHeader
          title="Find My Vehicle"
          backHref={`/vehicle-details?id=${record.id}`}
        />

        {/* Real Interactive Map OR Clear Fallback */}
        {hasValidCoordinates ? (
          <ParkingMap
            destLat={record.latitude!}
            destLng={record.longitude!}
            userLat={userCoords?.lat}
            userLng={userCoords?.lng}
            userAccuracy={userCoords?.accuracy}
            licensePlate={record.licensePlate}
            vehicleType={record.type}
            locationName={record.location}
            floorZone={record.floorZone}
            className="w-full h-72 mb-4 shrink-0"
          />
        ) : (
          <div className="relative w-full h-52 rounded-2xl overflow-hidden shadow-xs border border-[#EDF2F7] mb-4 bg-slate-100 shrink-0 flex flex-col justify-end">
            <Image
              src="/home-map.png"
              fill
              className="object-cover"
              alt="Parking Location Area Placeholder"
              priority
              unoptimized
            />
            <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-white/95 text-[#0B1222] shadow-xs backdrop-blur-xs border border-black/5">
                No GPS Coordinates Recorded
              </span>
              {record.status === "active" && (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[#34C759] text-white shadow-xs">
                  Active Spot
                </span>
              )}
            </div>
            <div className="relative z-10 m-2.5 bg-white/95 backdrop-blur-md rounded-xl p-2.5 shadow-sm border border-black/5 flex items-center gap-2.5">
              <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-gray-100">
                <Image
                  src={record.thumbnailUrl || "/motorcycle-b2.png"}
                  fill
                  className="object-cover"
                  alt={record.licensePlate}
                  unoptimized
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-[#0B1222] truncate leading-tight">
                  {record.licensePlate} ({record.type})
                </p>
                <p className="text-[11px] text-[#5E6E82] truncate leading-tight mt-0.5">
                  {record.floorZone} · {record.location}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Figma Screen 07: Vehicle Summary Card with Walking Route Estimate */}
        <div className="bg-white rounded-2xl p-4 border border-[#EDF2F7] shadow-xs mb-4">
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-gray-100 bg-[#F6F8FD]">
              <Image
                src={record.thumbnailUrl || "/motorcycle-b2.png"}
                fill
                className="object-cover"
                alt={record.licensePlate}
                unoptimized
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-[#5E6E82]">Your Vehicle</p>
              <h3 className="text-base font-bold text-[#0B1222] truncate leading-tight">
                {record.licensePlate}
              </h3>
              <p className="text-xs text-[#5E6E82] truncate mt-0.5">
                {record.floorZone} · {record.building || record.location}
              </p>
            </div>
            <Link
              href={`/vehicle-details?id=${record.id}`}
              className="w-8 h-8 rounded-full border border-gray-200 text-[#5E6E82] flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all shrink-0"
              aria-label="View vehicle details"
              title="View full vehicle details"
            >
              <span className="text-xs font-bold">ⓘ</span>
            </Link>
          </div>

          {/* Real Walking Time & Distance Badge (Figma Screen 07: "8 min (400 m)") */}
          {distanceInfo ? (
            <div className="mt-3.5 pt-3.5 border-t border-gray-100">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-[#0B1222] tracking-tight">
                  {distanceInfo.walkTime} ({distanceInfo.distance})
                </span>
              </div>
              <p className="text-xs text-[#5E6E82] mt-0.5">
                Walking time estimated from the straight-line distance to your vehicle.
              </p>
            </div>
          ) : hasValidCoordinates ? (
            <div className="mt-3.5 pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-[#5E6E82]">
                Target: {record.latitude?.toFixed(4)}, {record.longitude?.toFixed(4)}
              </span>
              <button
                type="button"
                onClick={handleGetLocation}
                className="text-xs font-bold text-[#007AFF] hover:underline"
              >
                Acquire GPS →
              </button>
            </div>
          ) : null}

          {/* Quick Start Route & Details Buttons */}
          <div className="grid grid-cols-2 gap-2.5 mt-3.5">
            {hasValidCoordinates ? (
              <a
                href={getGoogleMapsUrl(
                  record.latitude!,
                  record.longitude!,
                  userCoords?.lat,
                  userCoords?.lng
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-3 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] text-white text-xs font-bold text-center flex items-center justify-center gap-1.5 shadow-2xs active:scale-[0.98] transition-all"
              >
                <CompassIcon className="w-4 h-4 text-white" />
                <span>Start in Maps</span>
              </a>
            ) : (
              <button
                type="button"
                onClick={() => {
                  const indoorEl = document.getElementById("indoor-guidance-section");
                  indoorEl?.scrollIntoView({ behavior: "smooth" });
                }}
                className="py-2.5 px-3 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] text-white text-xs font-bold text-center flex items-center justify-center gap-1.5 shadow-2xs active:scale-[0.98] transition-all"
              >
                <LayersIcon className="w-4 h-4 text-white" />
                <span>Indoor Guide</span>
              </button>
            )}

            <Link
              href={`/vehicle-details?id=${record.id}`}
              className="py-2.5 px-3 rounded-xl bg-[#F0F4F9] hover:bg-[#E4EBF5] text-[#0B1222] text-xs font-bold text-center flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
            >
              <span>Details</span>
              <span className="text-[#8E95A5]">→</span>
            </Link>
          </div>
        </div>

        {/* SECTION 1: Outdoor Navigation & Geolocation Trigger */}
        {hasValidCoordinates ? (
          <div className="bg-white rounded-2xl p-4 border border-[#EDF2F7] shadow-xs mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <CompassIcon className="w-5 h-5 text-[#007AFF]" />
                <h2 className="text-sm font-bold text-[#0B1222]">Outdoor GPS Navigation</h2>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-[#007AFF]">
                GPS Active
              </span>
            </div>

            <p className="text-xs text-[#5E6E82] mb-3 leading-relaxed">
              Target parking destination coordinates:
            </p>

            {/* Destination Coordinates Pill */}
            <div className="bg-[#F6F8FD] rounded-xl p-2.5 border border-[#EDF2F7] mb-3 text-xs font-mono text-[#0B1222]">
              <span className="font-semibold text-[#5E6E82] font-sans">Destination: </span>
              {record.latitude?.toFixed(5)}, {record.longitude?.toFixed(5)}
            </div>

            {/* Geolocation Button */}
            {geoStatus === "idle" && (
              <button
                type="button"
                onClick={handleGetLocation}
                className="w-full py-2.5 px-4 rounded-xl bg-[#007AFF]/10 hover:bg-[#007AFF]/20 text-[#007AFF] text-xs font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-2 mb-3"
              >
                <CompassIcon className="w-4 h-4" />
                <span>Get My Location (Browser GPS)</span>
              </button>
            )}

            {geoStatus === "loading" && (
              <div className="w-full py-2.5 px-4 rounded-xl bg-gray-50 text-[#5E6E82] text-xs font-medium flex items-center justify-center gap-2 mb-3">
                <span className="w-3.5 h-3.5 border-2 border-[#007AFF] border-t-transparent rounded-full animate-spin" />
                <span>Acquiring GPS position...</span>
              </div>
            )}

            {geoStatus === "success" && userCoords && (
              <div className="bg-[#34C759]/10 border border-[#34C759]/25 rounded-xl p-2.5 mb-3 text-xs text-[#0B1222]">
                <div className="flex items-center gap-1.5 font-semibold text-[#34C759] mb-1">
                  <CheckIcon className="w-4 h-4" />
                  <span>Current Location Acquired</span>
                </div>
                <p className="font-mono text-[11px] text-[#5E6E82]">
                  {userCoords.lat.toFixed(5)}, {userCoords.lng.toFixed(5)}
                  {userCoords.accuracy && ` (±${Math.round(userCoords.accuracy)}m)`}
                </p>
              </div>
            )}

            {geoStatus === "error" && geoError && (
              <div className="bg-[#FF3B30]/10 border border-[#FF3B30]/25 rounded-xl p-2.5 mb-3 text-xs text-[#FF3B30] flex items-start gap-2">
                <ExclamationCircleIcon className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">Location Error</p>
                  <p className="text-[11px] text-[#5E6E82] mt-0.5">{geoError}</p>
                  <button
                    type="button"
                    onClick={handleGetLocation}
                    className="text-[11px] font-bold text-[#007AFF] hover:underline mt-1 block"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}

            {/* External Navigation Links (Validated & Real) */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <a
                href={getGoogleMapsUrl(
                  record.latitude!,
                  record.longitude!,
                  userCoords?.lat,
                  userCoords?.lng
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white border border-[#E3E8EF] hover:border-[#007AFF] text-xs font-semibold text-[#0B1222] shadow-2xs hover:shadow-xs active:scale-[0.98] transition-all"
              >
                <span>Google Maps</span>
                <ExternalLinkIcon className="w-3.5 h-3.5 text-[#8E95A5]" />
              </a>

              <a
                href={getAppleMapsUrl(
                  record.latitude!,
                  record.longitude!,
                  userCoords?.lat,
                  userCoords?.lng
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white border border-[#E3E8EF] hover:border-[#007AFF] text-xs font-semibold text-[#0B1222] shadow-2xs hover:shadow-xs active:scale-[0.98] transition-all"
              >
                <span>Apple Maps</span>
                <ExternalLinkIcon className="w-3.5 h-3.5 text-[#8E95A5]" />
              </a>
            </div>
          </div>
        ) : (
          /* Informational Card When No Coordinates Were Recorded */
          <div className="bg-white rounded-2xl p-4 border border-[#EDF2F7] shadow-xs mb-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <CompassIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-bold text-[#0B1222]">Outdoor GPS Not Recorded</h2>
                <p className="text-xs text-[#5E6E82] mt-1 leading-relaxed">
                  GPS coordinates were not recorded for this parking spot. Use the indoor guidance below to locate your vehicle.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: Indoor Parking Guidance (Step-by-Step Layout) */}
        <div id="indoor-guidance-section" className="bg-white rounded-2xl p-4 border border-[#EDF2F7] shadow-xs mb-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <LayersIcon className="w-5 h-5 text-[#007AFF]" />
              <h2 className="text-sm font-bold text-[#0B1222]">Indoor Parking Guidance</h2>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-[#5E6E82]">
              Saved Details
            </span>
          </div>

          <p className="text-xs text-[#5E6E82] mb-3.5">
            Follow your saved parking record details step-by-step to reach your vehicle:
          </p>

          <ol className="space-y-3 relative before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#EDF2F7]">
            {/* Step 1: Building */}
            <li className="flex items-start gap-3 relative">
              <span className="w-7 h-7 rounded-full bg-[#007AFF] text-white text-xs font-bold flex items-center justify-center shrink-0 ring-4 ring-white">
                1
              </span>
              <div className="bg-[#F6F8FD] rounded-xl p-2.5 flex-1 border border-[#EDF2F7]">
                <p className="text-[11px] font-medium text-[#5E6E82]">Building / Facility</p>
                <p className="text-sm font-bold text-[#0B1222] mt-0.5 flex items-center gap-1.5">
                  <LocationPinIcon className="w-4 h-4 text-[#007AFF]" />
                  {record.building || record.location}
                </p>
              </div>
            </li>

            {/* Step 2: Floor & Zone */}
            <li className="flex items-start gap-3 relative">
              <span className="w-7 h-7 rounded-full bg-[#007AFF] text-white text-xs font-bold flex items-center justify-center shrink-0 ring-4 ring-white">
                2
              </span>
              <div className="bg-[#F6F8FD] rounded-xl p-2.5 flex-1 border border-[#EDF2F7]">
                <p className="text-[11px] font-medium text-[#5E6E82]">Floor Level & Zone</p>
                <p className="text-sm font-bold text-[#0B1222] mt-0.5 flex items-center gap-1.5">
                  <LayersIcon className="w-4 h-4 text-[#007AFF]" />
                  {record.floorZone}
                </p>
              </div>
            </li>

            {/* Step 3: Landmark (if present) */}
            {record.nearbyLandmark && (
              <li className="flex items-start gap-3 relative">
                <span className="w-7 h-7 rounded-full bg-[#007AFF] text-white text-xs font-bold flex items-center justify-center shrink-0 ring-4 ring-white">
                  3
                </span>
                <div className="bg-[#F6F8FD] rounded-xl p-2.5 flex-1 border border-[#EDF2F7]">
                  <p className="text-[11px] font-medium text-[#5E6E82]">Nearby Landmark</p>
                  <p className="text-sm font-bold text-[#0B1222] mt-0.5 flex items-center gap-1.5">
                    <ClockIcon className="w-4 h-4 text-[#007AFF]" />
                    {record.nearbyLandmark}
                  </p>
                </div>
              </li>
            )}

            {/* Step 4: Notes (if present) */}
            {record.notes && (
              <li className="flex items-start gap-3 relative">
                <span className="w-7 h-7 rounded-full bg-[#007AFF] text-white text-xs font-bold flex items-center justify-center shrink-0 ring-4 ring-white">
                  {record.nearbyLandmark ? "4" : "3"}
                </span>
                <div className="bg-[#F6F8FD] rounded-xl p-2.5 flex-1 border border-[#EDF2F7]">
                  <p className="text-[11px] font-medium text-[#5E6E82]">Parking Note</p>
                  <p className="text-xs font-medium text-[#0B1222] mt-0.5 flex items-start gap-1.5 leading-relaxed">
                    <NoteIcon className="w-4 h-4 text-[#007AFF] shrink-0 mt-0.5" />
                    <span>{record.notes}</span>
                  </p>
                </div>
              </li>
            )}

            {/* Step Final: Vehicle Confirmation */}
            <li className="flex items-start gap-3 relative">
              <span className="w-7 h-7 rounded-full bg-[#34C759] text-white text-xs font-bold flex items-center justify-center shrink-0 ring-4 ring-white">
                ✓
              </span>
              <div className="bg-[#F6F8FD] rounded-xl p-2.5 flex-1 border border-[#EDF2F7]">
                <p className="text-[11px] font-medium text-[#5E6E82]">Target Vehicle</p>
                <p className="text-sm font-bold text-[#0B1222] mt-0.5">
                  {record.type} · {record.licensePlate}
                </p>
              </div>
            </li>
          </ol>
        </div>

        {/* SECTION 3: Action Buttons */}
        <div className="mt-auto space-y-2.5 pt-1">
          {/* Arrival Confirmation Trigger */}
          <Button
            variant="primary"
            onClick={() => setShowArrivalModal(true)}
            icon={<CheckCircleIcon className="w-5 h-5 text-white" />}
          >
            I&apos;ve Found My Vehicle
          </Button>

          <Button
            variant="secondary"
            href={`/vehicle-details?id=${record.id}`}
          >
            View Vehicle Details
          </Button>

          {/* Red End Navigation Button matching Figma 11-navigate.png */}
          <button
            type="button"
            onClick={() => router.push("/home")}
            className="w-full py-3.5 px-6 rounded-full bg-[#FF3B30] hover:bg-[#E02E24] text-white font-semibold text-base shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <span>End Navigation & Return Home</span>
          </button>
        </div>

        {/* Arrival Confirmation Modal - Exact Figma design_refs/12-arrived-at-location.png */}
        {showArrivalModal && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="arrived-title"
          >
            <div className="bg-white rounded-3xl p-6 w-full max-w-[360px] shadow-2xl border border-gray-100 flex flex-col items-center text-center relative animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200">
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowArrivalModal(false)}
                className="absolute top-4 right-4 p-1 rounded-full text-[#8E95A5] hover:text-[#0B1222] hover:bg-gray-100 transition-colors"
                aria-label="Close dialog"
              >
                <XIcon className="w-5 h-5" />
              </button>

              {/* Green Circle Checkmark Badge */}
              <div className="w-16 h-16 rounded-full bg-[#34C759] flex items-center justify-center text-white mb-4 shadow-sm">
                <CheckIcon className="w-8 h-8" />
              </div>

              {/* Title & Body */}
              <h3 id="arrived-title" className="text-2xl font-bold text-[#0B1222] mb-1.5">
                You Have Arrived!
              </h3>
              <p className="text-sm text-[#5E6E82] mb-1 max-w-[260px] leading-relaxed">
                You are at the recorded parking location for vehicle:
              </p>
              <p className="text-sm font-bold text-[#0B1222] mb-6">
                {record.licensePlate} ({record.floorZone})
              </p>

              {/* Action Buttons */}
              <div className="w-full space-y-2.5">
                <Button
                  variant="primary"
                  onClick={() => router.push(`/vehicle-details?id=${record.id}`)}
                >
                  View Details
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => router.push("/home")}
                >
                  Return to Home
                </Button>
              </div>

              <p className="text-[11px] text-[#8E95A5] mt-4">
                Note: Parking record is kept in your history.
              </p>
            </div>
          </div>
        )}
      </div>
    </MobileShell>
  );
}

export default function NavigatePage() {
  return (
    <Suspense
      fallback={
        <MobileShell>
          <div className="flex flex-col flex-1 items-center justify-center text-sm text-[#5E6E82]">
            Loading navigation...
          </div>
        </MobileShell>
      }
    >
      <NavigateContent />
    </Suspense>
  );
}
