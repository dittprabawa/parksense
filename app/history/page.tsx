"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { MobileShell } from "@/components/mobile-shell";
import { TopHeader } from "@/components/top-header";
import { BottomNav } from "@/components/bottom-nav";
import { ChevronRightIcon, CameraIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { getParkingRecords, ParkingRecord } from "@/lib/parking-storage";

export default function HistoryPage() {
  const [filter, setFilter] = useState<"all" | "active" | "past">("all");
  const [records, setRecords] = useState<ParkingRecord[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load records from localStorage on mount and subscribe to updates
  useEffect(() => {
    const load = () => {
      setRecords(getParkingRecords());
      setIsLoaded(true);
    };

    load();

    const handleStorageChange = () => {
      load();
    };

    window.addEventListener("parksense_storage_change", handleStorageChange);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("parksense_storage_change", handleStorageChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const filteredRecords = records.filter((record) => {
    if (filter === "all") return true;
    return record.status === filter;
  });

  return (
    <MobileShell>
      <div className="flex flex-col flex-1 pb-2">
        <TopHeader title="History" backHref="/home" />

        {/* Filter Segmented Control */}
        <div className="flex bg-[#E8EDF5] rounded-full p-1 mb-5 shrink-0" role="tablist" aria-label="Filter records">
          <button
            type="button"
            role="tab"
            aria-selected={filter === "all"}
            onClick={() => setFilter("all")}
            className={`flex-1 py-2 text-sm font-semibold rounded-full transition-all ${
              filter === "all"
                ? "bg-[#007AFF] text-white shadow-xs"
                : "text-[#5E6E82] hover:text-[#0B1222]"
            }`}
          >
            All
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filter === "active"}
            onClick={() => setFilter("active")}
            className={`flex-1 py-2 text-sm font-semibold rounded-full transition-all ${
              filter === "active"
                ? "bg-[#007AFF] text-white shadow-xs"
                : "text-[#5E6E82] hover:text-[#0B1222]"
            }`}
          >
            Active
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filter === "past"}
            onClick={() => setFilter("past")}
            className={`flex-1 py-2 text-sm font-semibold rounded-full transition-all ${
              filter === "past"
                ? "bg-[#007AFF] text-white shadow-xs"
                : "text-[#5E6E82] hover:text-[#0B1222]"
            }`}
          >
            Past
          </button>
        </div>

        {/* Parking Records List */}
        <div className="flex-1 overflow-y-auto mb-4 min-h-[300px]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-[#0B1222]">
              Parking Records ({isLoaded ? filteredRecords.length : "..."})
            </h2>
            <Link
              href="/save-parking"
              className="text-xs font-semibold text-[#007AFF] hover:underline"
            >
              + Add New
            </Link>
          </div>

          {!isLoaded ? (
            <div className="py-12 flex justify-center text-sm text-[#5E6E82]">
              Loading records...
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-white rounded-2xl border border-[#EDF2F7] shadow-xs my-2">
              <div className="w-12 h-12 rounded-full bg-[#E8EDF5] flex items-center justify-center text-[#007AFF] mb-3">
                <CameraIcon className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-[#0B1222]">No parking records found</p>
              <p className="text-xs text-[#5E6E82] mt-1 mb-4 max-w-[220px]">
                {filter === "active"
                  ? "You do not have an active parking spot right now."
                  : "No records found in this category."}
              </p>
              <Button
                variant="primary"
                href="/save-parking"
                className="!py-2.5 !px-5 !text-sm"
              >
                Save New Parking
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRecords.map((item) => (
                <Link
                  key={item.id}
                  href={`/vehicle-details?id=${item.id}`}
                  className="flex items-center gap-3.5 bg-white rounded-2xl p-3 border border-[#EDF2F7] shadow-xs active:bg-[#F9FAFC] transition-colors group"
                >
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-gray-100 bg-gray-50">
                    <Image
                      src={item.thumbnailUrl || "/motorcycle-b2.png"}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-200"
                      alt={item.licensePlate}
                      unoptimized
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-[#0B1222] leading-tight">
                        {item.licensePlate}
                      </h3>
                      {item.status === "active" && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#34C759]/15 text-[#34C759]">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#5E6E82] mt-0.5 truncate leading-tight">
                      {item.floorZone ? `${item.floorZone} · ` : ""}
                      {item.location}
                    </p>
                    <p className="text-[11px] text-[#8E95A5] mt-1 leading-tight">
                      {item.timestamp}
                    </p>
                  </div>

                  <div className="text-[#8E95A5] shrink-0 group-hover:text-[#007AFF] transition-colors">
                    <ChevronRightIcon className="w-5 h-5" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Bottom Tab Bar */}
        <BottomNav currentTab="history" />
      </div>
    </MobileShell>
  );
}
