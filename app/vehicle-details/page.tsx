"use client";

import React, { useState, useEffect, Suspense, useRef } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { MobileShell } from "@/components/mobile-shell";
import { TopHeader } from "@/components/top-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  MotorcycleIcon,
  CarIcon,
  LicensePlateIcon,
  LocationPinIcon,
  LayersIcon,
  ClockIcon,
  PencilIcon,
  TrashIcon,
  NavArrowIcon,
  ChevronRightIcon,
  PhotoCameraIcon,
  NoteIcon,
  XIcon,
  CompassIcon,
} from "@/components/icons";
import {
  getParkingRecords,
  getParkingRecordById,
  getActiveParkingRecord,
  updateParkingRecord,
  deleteParkingRecord,
  ParkingRecord,
  VehicleType,
} from "@/lib/parking-storage";

function VehicleDetailsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const idParam = searchParams.get("id");

  const [record, setRecord] = useState<ParkingRecord | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Modal / Editing states
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit form state
  const [editType, setEditType] = useState<VehicleType>("Motorcycle");
  const [editPlate, setEditPlate] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editFloor, setEditFloor] = useState("");
  const [editZone, setEditZone] = useState("");
  const [editLandmark, setEditLandmark] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editPhoto, setEditPhoto] = useState("");
  const [editStatus, setEditStatus] = useState<"active" | "past">("active");
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

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
      if (target) {
        setEditType((target.type as VehicleType) || "Motorcycle");
        setEditPlate(target.licensePlate || "");
        setEditLocation(target.location || "");
        setEditFloor(target.floor || (target.floorZone ? target.floorZone.split("–")[0]?.trim() : ""));
        setEditZone(target.zone || (target.floorZone && target.floorZone.includes("–") ? target.floorZone.split("–")[1]?.trim() : ""));
        setEditLandmark(target.nearbyLandmark || "");
        setEditNotes(target.notes || "");
        setEditPhoto(target.thumbnailUrl || "/motorcycle-b2.png");
        setEditStatus(target.status || "active");
      }
      setIsLoaded(true);
    };

    load();

    const handleStorage = () => load();
    window.addEventListener("parksense_storage_change", handleStorage);
    return () => window.removeEventListener("parksense_storage_change", handleStorage);
  }, [idParam]);

  // Handle Photo Upload in Edit Mode
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === "string") {
        setEditPhoto(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Save Edits
  const handleSaveEdits = (e: React.FormEvent) => {
    e.preventDefault();
    if (!record) return;

    const errors: Record<string, string> = {};
    if (!editPlate.trim()) errors.plate = "License plate is required";
    if (!editLocation.trim()) errors.location = "Location is required";
    if (!editFloor.trim() && !editZone.trim()) errors.floorZone = "Floor or Zone is required";

    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      return;
    }

    const floorZoneFormatted =
      editFloor.trim() && editZone.trim()
        ? `${editFloor.trim()} – ${editZone.trim()}`
        : editFloor.trim() || editZone.trim();

    const updated = updateParkingRecord(record.id, {
      type: editType,
      licensePlate: editPlate.trim().toUpperCase(),
      location: editLocation.trim(),
      floorZone: floorZoneFormatted,
      building: editLocation.trim(),
      floor: editFloor.trim(),
      zone: editZone.trim(),
      nearbyLandmark: editLandmark.trim() || undefined,
      notes: editNotes.trim() || undefined,
      thumbnailUrl: editPhoto,
      status: editStatus,
      latitude: record.latitude,
      longitude: record.longitude,
      accuracy: record.accuracy,
    });

    if (updated) {
      setRecord(updated);
      setIsEditing(false);
      setEditErrors({});
    }
  };

  // Confirm Delete
  const handleConfirmDelete = () => {
    if (!record) return;
    deleteParkingRecord(record.id);
    setShowDeleteModal(false);
    router.push("/history");
  };

  if (!isLoaded) {
    return (
      <MobileShell>
        <div className="flex flex-col flex-1 items-center justify-center text-sm text-[#5E6E82]">
          Loading vehicle details...
        </div>
      </MobileShell>
    );
  }

  if (!record) {
    return (
      <MobileShell>
        <div className="flex flex-col flex-1 pb-4">
          <TopHeader title="Vehicle Details" backHref="/history" />
          <div className="flex flex-col flex-1 items-center justify-center text-center px-4">
            <div className="w-16 h-16 rounded-full bg-[#E8EDF5] flex items-center justify-center text-[#007AFF] mb-3">
              <LocationPinIcon className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-[#0B1222] mb-1">No Record Found</h2>
            <p className="text-sm text-[#5E6E82] mb-5 max-w-[240px]">
              The parking spot record you are looking for does not exist or has been removed.
            </p>
            <Button variant="primary" href="/history">
              View History
            </Button>
          </div>
        </div>
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <div className="flex flex-col flex-1 pb-3">
        <TopHeader
          title={isEditing ? "Edit Parking Details" : "Vehicle Details"}
          backHref="/history"
        />

        {!isEditing ? (
          /* View Mode */
          <>
            {/* Vehicle Photo with Status Badge */}
            <div className="relative w-full h-52 rounded-2xl overflow-hidden shadow-xs border border-[#EDF2F7] mb-4 shrink-0 bg-gray-100">
              <Image
                src={record.thumbnailUrl || "/motorcycle-b2.png"}
                fill
                className="object-cover"
                alt={record.licensePlate}
                priority
                unoptimized
              />
              <div className="absolute top-3 right-3">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold shadow-xs ${
                    record.status === "active"
                      ? "bg-[#34C759] text-white"
                      : "bg-[#8E95A5]/90 text-white backdrop-blur-xs"
                  }`}
                >
                  {record.status === "active" ? "Active Spot" : "Past Spot"}
                </span>
              </div>
            </div>

            {/* Vehicle Information */}
            <div className="mb-3.5">
              <h2 className="text-base font-bold text-[#0B1222] mb-2">Vehicle Information</h2>
              <div className="space-y-2">
                <Card
                  icon={
                    record.type === "Car" ? (
                      <CarIcon className="w-6 h-6" />
                    ) : (
                      <MotorcycleIcon className="w-6 h-6" />
                    )
                  }
                  label="Type"
                  value={record.type}
                  trailing={<ChevronRightIcon className="w-5 h-5 text-[#8E95A5]" />}
                  onClick={() => setIsEditing(true)}
                />
                <Card
                  icon={<LicensePlateIcon className="w-6 h-6" />}
                  label="License Plate"
                  value={record.licensePlate}
                  trailing={<PencilIcon className="w-5 h-5 text-[#0B1222]" />}
                  onClick={() => setIsEditing(true)}
                />
              </div>
            </div>

            {/* Parking Location */}
            <div className="mb-4">
              <h2 className="text-base font-bold text-[#0B1222] mb-2">Parking Location</h2>
              <div className="space-y-2">
                <Card
                  icon={<LocationPinIcon className="w-6 h-6" />}
                  label="Location"
                  value={record.location}
                  trailing={<ChevronRightIcon className="w-5 h-5 text-[#8E95A5]" />}
                  onClick={() => setIsEditing(true)}
                />
                <Card
                  icon={<LayersIcon className="w-6 h-6" />}
                  label="Floor / Zone"
                  value={record.floorZone}
                  trailing={<ChevronRightIcon className="w-5 h-5 text-[#8E95A5]" />}
                  onClick={() => setIsEditing(true)}
                />
                {record.nearbyLandmark && (
                  <Card
                    icon={<ClockIcon className="w-6 h-6 text-[#007AFF]" />}
                    label="Nearby Landmark"
                    value={record.nearbyLandmark}
                    trailing={<ChevronRightIcon className="w-5 h-5 text-[#8E95A5]" />}
                    onClick={() => setIsEditing(true)}
                  />
                )}
                {record.notes && (
                  <Card
                    icon={<NoteIcon className="w-6 h-6 text-[#007AFF]" />}
                    label="Parking Note"
                    value={record.notes}
                    trailing={<ChevronRightIcon className="w-5 h-5 text-[#8E95A5]" />}
                    onClick={() => setIsEditing(true)}
                  />
                )}
                {record.latitude && record.longitude && (
                  <Card
                    icon={<CompassIcon className="w-6 h-6 text-[#007AFF]" />}
                    label="GPS Coordinates"
                    value={`${record.latitude.toFixed(5)}, ${record.longitude.toFixed(5)}`}
                    trailing={<ChevronRightIcon className="w-5 h-5 text-[#8E95A5]" />}
                    onClick={() => router.push(`/navigate?id=${record.id}`)}
                  />
                )}
              </div>
            </div>

            {/* Timestamp record notice */}
            <div className="text-center mb-4">
              <p className="text-[11px] text-[#8E95A5]">Saved: {record.timestamp}</p>
            </div>

            {/* Stacked Action Buttons */}
            <div className="mt-auto space-y-2.5 pt-1">
              <Button
                variant="primary"
                href={`/navigate?id=${record.id}`}
                icon={<NavArrowIcon className="w-5 h-5 text-white" />}
              >
                Navigate
              </Button>

              <Button
                variant="secondary"
                onClick={() => setIsEditing(true)}
                icon={<PencilIcon className="w-5 h-5 text-[#0B1222]" />}
              >
                Edit Details
              </Button>

              <Button
                variant="danger"
                onClick={() => setShowDeleteModal(true)}
                icon={<TrashIcon className="w-5 h-5 text-[#FF3B30]" />}
              >
                Delete Record
              </Button>
            </div>
          </>
        ) : (
          /* Edit Mode matching Figma 08 & 15 */
          <form onSubmit={handleSaveEdits} className="flex flex-col flex-1" noValidate>
            {/* Photo & Change Button */}
            <div className="relative w-full h-48 rounded-2xl overflow-hidden shadow-xs border border-[#EDF2F7] mb-3.5 bg-gray-100 shrink-0">
              <Image
                src={editPhoto || "/motorcycle-b2.png"}
                fill
                className="object-cover"
                alt="Edit Vehicle"
                unoptimized
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-[#0B1222] text-xs font-bold shadow-lg active:scale-95 transition-all"
                >
                  <PhotoCameraIcon className="w-4 h-4 text-[#007AFF]" />
                  Change Photo
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </div>

            {/* Editable Fields */}
            <div className="space-y-3 mb-4">
              {/* Vehicle Type */}
              <div className="bg-white rounded-2xl p-3 border border-[#EDF2F7] shadow-xs">
                <label className="block text-xs text-[#5E6E82] mb-1.5 font-medium">Vehicle Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["Motorcycle", "Car", "Bicycle"] as VehicleType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setEditType(type)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-semibold transition-all ${
                        editType === type
                          ? "bg-[#007AFF] text-white"
                          : "bg-[#F6F8FD] text-[#5E6E82] hover:bg-[#EDF2F7]"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* License Plate */}
              <div
                className={`bg-white rounded-2xl p-3 border shadow-xs ${
                  editErrors.plate ? "border-[#FF3B30]" : "border-[#EDF2F7]"
                }`}
              >
                <label className="block text-xs text-[#5E6E82] font-medium leading-tight">
                  License Plate *
                </label>
                <input
                  type="text"
                  value={editPlate}
                  onChange={(e) => setEditPlate(e.target.value.toUpperCase())}
                  className="w-full bg-transparent text-sm font-semibold text-[#0B1222] mt-1 focus:outline-none uppercase"
                  placeholder="e.g. DK 1234 AB"
                  required
                />
              </div>

              {/* Location */}
              <div
                className={`bg-white rounded-2xl p-3 border shadow-xs ${
                  editErrors.location ? "border-[#FF3B30]" : "border-[#EDF2F7]"
                }`}
              >
                <label className="block text-xs text-[#5E6E82] font-medium leading-tight">
                  Building / Location *
                </label>
                <input
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  className="w-full bg-transparent text-sm font-semibold text-[#0B1222] mt-1 focus:outline-none"
                  placeholder="e.g. Campus Parking – Building A"
                  required
                />
              </div>

              {/* Floor & Zone */}
              <div
                className={`bg-white rounded-2xl p-3 border shadow-xs ${
                  editErrors.floorZone ? "border-[#FF3B30]" : "border-[#EDF2F7]"
                }`}
              >
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#5E6E82] font-medium leading-tight">
                      Floor *
                    </label>
                    <input
                      type="text"
                      value={editFloor}
                      onChange={(e) => setEditFloor(e.target.value)}
                      className="w-full bg-transparent text-sm font-semibold text-[#0B1222] mt-1 focus:outline-none"
                      placeholder="e.g. B2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#5E6E82] font-medium leading-tight">
                      Zone *
                    </label>
                    <input
                      type="text"
                      value={editZone}
                      onChange={(e) => setEditZone(e.target.value)}
                      className="w-full bg-transparent text-sm font-semibold text-[#0B1222] mt-1 focus:outline-none"
                      placeholder="e.g. Zone C"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Landmark */}
              <div className="bg-white rounded-2xl p-3 border border-[#EDF2F7] shadow-xs">
                <label className="block text-xs text-[#5E6E82] font-medium leading-tight">
                  Nearby Landmark (Optional)
                </label>
                <input
                  type="text"
                  value={editLandmark}
                  onChange={(e) => setEditLandmark(e.target.value)}
                  className="w-full bg-transparent text-sm font-semibold text-[#0B1222] mt-1 focus:outline-none"
                  placeholder="e.g. Near Elevator & South Exit"
                />
              </div>

              {/* Notes */}
              <div className="bg-white rounded-2xl p-3 border border-[#EDF2F7] shadow-xs">
                <label className="block text-xs text-[#5E6E82] font-medium leading-tight">
                  Parking Note (Optional)
                </label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full bg-transparent text-xs text-[#0B1222] mt-1 focus:outline-none resize-none"
                  placeholder="e.g. Pillar B12"
                />
              </div>

              {/* Active / Past Toggle */}
              <div className="bg-white rounded-2xl p-3 border border-[#EDF2F7] shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-[#0B1222]">Mark as Active Spot</p>
                  <p className="text-[11px] text-[#5E6E82]">Show this spot on Home and Find My Vehicle</p>
                </div>
                <input
                  type="checkbox"
                  checked={editStatus === "active"}
                  onChange={(e) => setEditStatus(e.target.checked ? "active" : "past")}
                  className="w-5 h-5 accent-[#007AFF] rounded cursor-pointer"
                />
              </div>
            </div>

            {/* Edit Actions */}
            <div className="mt-auto space-y-2 pt-2">
              <Button type="submit" variant="primary">
                Save Changes
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setIsEditing(false);
                  setEditErrors({});
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}

        {/* Delete Confirmation Modal - Exact Figma design_refs/10-delete-record.png */}
        {showDeleteModal && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
          >
            <div className="bg-white rounded-3xl p-6 w-full max-w-[360px] shadow-2xl border border-gray-100 flex flex-col items-center text-center relative animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200">
              {/* Close Button Top Right */}
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="absolute top-4 right-4 p-1 rounded-full text-[#8E95A5] hover:text-[#0B1222] hover:bg-gray-100 transition-colors"
                aria-label="Close dialog"
              >
                <XIcon className="w-5 h-5" />
              </button>

              {/* Red Trash Icon in Circle */}
              <div className="w-14 h-14 rounded-full bg-[#FF3B30]/10 flex items-center justify-center text-[#FF3B30] mb-4">
                <TrashIcon className="w-7 h-7" />
              </div>

              {/* Heading & Subtitle */}
              <h3 id="delete-dialog-title" className="text-xl font-bold text-[#0B1222] mb-2">
                Delete This Record?
              </h3>
              <p className="text-sm text-[#5E6E82] mb-6 max-w-[260px] leading-relaxed">
                This parking record will be permanently removed and cannot be restored.
              </p>

              {/* Action Buttons */}
              <div className="w-full space-y-2.5">
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="w-full py-3.5 px-6 rounded-full bg-[#FF3B30] hover:bg-[#E02E24] text-white font-semibold text-base shadow-sm transition-all active:scale-[0.98]"
                >
                  Delete Record
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="w-full py-3.5 px-6 rounded-full bg-[#E8EDF5] hover:bg-[#DDE4F0] text-[#0B1222] font-semibold text-base transition-all active:scale-[0.98]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MobileShell>
  );
}

export default function VehicleDetailsPage() {
  return (
    <Suspense
      fallback={
        <MobileShell>
          <div className="flex flex-col flex-1 items-center justify-center text-sm text-[#5E6E82]">
            Loading vehicle details...
          </div>
        </MobileShell>
      }
    >
      <VehicleDetailsContent />
    </Suspense>
  );
}
