"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { MobileShell } from "@/components/mobile-shell";
import { BottomNav } from "@/components/bottom-nav";
import { Card } from "@/components/ui/card";
import ParkingMap from "@/components/parking-map";
import {
  BellIcon,
  CameraIcon,
  NavArrowIcon,
  ClockIcon,
  TrashIcon,
  XIcon,
} from "@/components/icons";
import {
  getActiveParkingRecord,
  isValidCoordinate,
  updateParkingRecord,
  ParkingRecord,
} from "@/lib/parking-storage";

export default function HomePage() {
  const [activeRecord, setActiveRecord] = useState<ParkingRecord | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);

  useEffect(() => {
    const syncActive = () => {
      setActiveRecord(getActiveParkingRecord());
      setIsLoaded(true);
    };

    syncActive();

    window.addEventListener("parksense_storage_change", syncActive);
    window.addEventListener("storage", syncActive);
    return () => {
      window.removeEventListener("parksense_storage_change", syncActive);
      window.removeEventListener("storage", syncActive);
    };
  }, []);

  const handleConfirmEndParking = () => {
    if (!activeRecord) return;
    updateParkingRecord(activeRecord.id, { status: "past" });
    setShowEndModal(false);
    setActiveRecord(null);
  };

  const activeHref = activeRecord ? `/navigate?id=${activeRecord.id}` : "/save-parking";
  const hasParkingGps = activeRecord && isValidCoordinate(activeRecord.latitude, activeRecord.longitude);

  return (
    <MobileShell>
      <div className="flex flex-col flex-1">
        {/* Top App Bar */}
        <header className="flex items-center justify-between pt-1 pb-3">
          <div className="flex items-center gap-2">
            <Image
              src="/parksense-mark.png"
              width={34}
              height={34}
              alt="ParkSense"
              unoptimized
            />
            <span className="text-xl font-bold text-[#0B1222] tracking-tight">ParkSense</span>
          </div>

          <button
            type="button"
            className="p-2 text-[#0B1222] hover:text-[#007AFF] active:scale-95 transition-all"
            aria-label="Notifications"
          >
            <BellIcon className="w-6 h-6" />
          </button>
        </header>

        {/* Greetings */}
        <div className="mt-1 mb-3">
          <h1 className="text-2xl font-bold text-[#0B1222]">Hello, User 👋</h1>
          <p className="text-sm text-[#5E6E82] mt-0.5">What do you want to do today?</p>
        </div>

        {/* Live Vehicle Map Card */}
        <div className={`relative w-full rounded-2xl overflow-hidden shadow-xs border border-[#EDF2F7] mb-3 bg-[#F6F8FD] ${hasParkingGps ? "" : "h-52"}`}>
          {hasParkingGps ? (
            <ParkingMap
              destLat={activeRecord.latitude!}
              destLng={activeRecord.longitude!}
              licensePlate={activeRecord.licensePlate}
              vehicleType={activeRecord.type}
              locationName={activeRecord.location}
              floorZone={activeRecord.floorZone}
              className="h-52 w-full"
            />
          ) : (
            <Image
              src="/home-map.png"
              fill
              className="object-cover"
              alt=""
              priority
              unoptimized
            />
          )}

          {/* Active Parking Status Badge Overlay */}
          {isLoaded && activeRecord ? (
            <div className={`${hasParkingGps ? "relative" : "absolute bottom-3 left-3 right-3 rounded-xl"} bg-white/95 backdrop-blur-md p-2.5 shadow-sm border border-black/5 flex items-center justify-between`}>
              <Link href={activeHref} className="flex items-center gap-2.5 min-w-0 flex-1 group">
                <span className="w-2.5 h-2.5 rounded-full bg-[#34C759] shrink-0 animate-pulse" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#0B1222] truncate group-hover:text-[#007AFF]">
                    {activeRecord.licensePlate} ({activeRecord.type})
                  </p>
                  <p className="text-[11px] text-[#5E6E82] truncate">
                    {activeRecord.floorZone} · {activeRecord.location}
                  </p>
                </div>
              </Link>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <Link
                  href={activeHref}
                  className="text-[11px] font-semibold text-[#007AFF] hover:underline"
                >
                  View Spot →
                </Link>
                {/* Red button on map overlay */}
                <button
                  type="button"
                  onClick={() => setShowEndModal(true)}
                  className="px-2.5 py-1 rounded-full bg-[#FF3B30] hover:bg-[#E02E24] text-white text-[11px] font-bold shadow-xs active:scale-95 transition-all"
                  aria-label="End parking"
                >
                  End
                </button>
              </div>
            </div>
          ) : isLoaded ? (
            <Link href="/take-photo" className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur-md rounded-xl p-2.5 shadow-sm border border-black/5 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-[#8E95A5] shrink-0" />
                <p className="text-xs text-[#5E6E82] truncate">No active vehicle parked</p>
              </div>
              <span className="text-[11px] font-semibold text-[#007AFF] shrink-0">
                Save Spot →
              </span>
            </Link>
          ) : null}
        </div>

        {/* Dedicated Active Session Banner with UI Red Button */}
        {isLoaded && activeRecord && (
          <div className="bg-white rounded-2xl p-3.5 border border-[#EDF2F7] shadow-xs mb-3 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="w-2 h-2 rounded-full bg-[#34C759] animate-pulse" />
                <span className="text-[10px] font-bold text-[#34C759] uppercase tracking-wide">
                  Active Parking Session
                </span>
              </div>
              <p className="text-sm font-bold text-[#0B1222] truncate">
                {activeRecord.licensePlate} · {activeRecord.floorZone}
              </p>
              <p className="text-xs text-[#5E6E82] truncate">
                {activeRecord.location}
              </p>
            </div>

            {/* UI Red Button: End Parking on Home */}
            <button
              type="button"
              onClick={() => setShowEndModal(true)}
              className="py-2 px-3.5 rounded-full bg-[#FF3B30] hover:bg-[#E02E24] text-white text-xs font-bold shadow-xs active:scale-95 transition-all shrink-0 flex items-center gap-1.5"
              aria-label="End active parking"
            >
              <span>End Parking</span>
            </button>
          </div>
        )}

        {/* Action Menu Cards */}
        <div className="space-y-3 mb-6">
          <Card
            icon={<CameraIcon className="w-7 h-7" />}
            title="Save Parking"
            subtitle="Capture your vehicle and parking location"
            href="/take-photo"
          />

          <Card
            icon={<NavArrowIcon className="w-7 h-7" />}
            title="Find My Vehicle"
            subtitle="Get directions to your parked vehicle"
            href={activeHref}
          />

          <Card
            icon={<ClockIcon className="w-7 h-7 text-[#007AFF]" />}
            title="Parking History"
            subtitle="View and manage your saved parking records"
            href="/history"
          />
        </div>

        {/* Bottom Tab Bar */}
        <BottomNav currentTab="home" />

        {/* End Parking Confirmation Modal on Home */}
        {showEndModal && activeRecord && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="end-dialog-title"
          >
            <div className="bg-white rounded-3xl p-6 w-full max-w-[360px] shadow-2xl border border-gray-100 flex flex-col items-center text-center relative animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200">
              <button
                type="button"
                onClick={() => setShowEndModal(false)}
                className="absolute top-4 right-4 p-1 rounded-full text-[#8E95A5] hover:text-[#0B1222] hover:bg-gray-100 transition-colors"
                aria-label="Close dialog"
              >
                <XIcon className="w-5 h-5" />
              </button>

              <div className="w-14 h-14 rounded-full bg-[#FF3B30]/10 flex items-center justify-center text-[#FF3B30] mb-4">
                <TrashIcon className="w-7 h-7" />
              </div>

              <h3 id="end-dialog-title" className="text-xl font-bold text-[#0B1222] mb-2">
                End Active Parking?
              </h3>
              <p className="text-sm text-[#5E6E82] mb-6 max-w-[260px] leading-relaxed">
                This will complete your active session for <span className="font-semibold text-[#0B1222]">{activeRecord.licensePlate}</span>. The record will remain stored in your Parking History.
              </p>

              <div className="w-full space-y-2.5">
                <button
                  type="button"
                  onClick={handleConfirmEndParking}
                  className="w-full py-3.5 px-6 rounded-full bg-[#FF3B30] hover:bg-[#E02E24] text-white font-semibold text-base shadow-sm transition-all active:scale-[0.98]"
                >
                  End Parking
                </button>
                <button
                  type="button"
                  onClick={() => setShowEndModal(false)}
                  className="w-full py-3.5 px-6 rounded-full bg-[#E8EDF5] hover:bg-[#DDE4F0] text-[#0B1222] font-semibold text-base transition-all active:scale-[0.98]"
                >
                  Keep Parking Active
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MobileShell>
  );
}
