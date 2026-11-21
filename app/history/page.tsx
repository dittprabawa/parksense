"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { MobileShell } from "@/components/mobile-shell";
import { TopHeader } from "@/components/top-header";
import { BottomNav } from "@/components/bottom-nav";
import { ChevronRightIcon } from "@/components/icons";
import { mockParkingHistory } from "@/lib/mock-data";

export default function HistoryPage() {
  const [filter, setFilter] = useState<"all" | "active" | "past">("all");

  const filteredRecords = mockParkingHistory.filter((record) => {
    if (filter === "all") return true;
    return record.status === filter;
  });

  return (
    <MobileShell>
      <div className="flex flex-col flex-1">
        <TopHeader title="History" />

        {/* Filter Segmented Control */}
        <div className="flex bg-[#E8EDF5] rounded-full p-1 mb-5">
          <button
            type="button"
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
        <div className="flex-1 overflow-y-auto mb-4">
          <h2 className="text-base font-bold text-[#0B1222] mb-3">
            Parking Records ({filteredRecords.length})
          </h2>

          <div className="space-y-3">
            {filteredRecords.map((item) => (
              <Link
                key={item.id}
                href="/vehicle-details"
                className="flex items-center gap-3.5 bg-white rounded-2xl p-3 border border-[#EDF2F7] shadow-xs active:bg-[#F9FAFC] transition-colors"
              >
                <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-gray-100">
                  <Image
                    src={item.thumbnailUrl}
                    fill
                    className="object-cover"
                    alt={item.licensePlate}
                    unoptimized
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-[#0B1222] leading-tight">
                    {item.licensePlate}
                  </h3>
                  <p className="text-xs text-[#5E6E82] mt-0.5 truncate leading-tight">
                    {item.location}
                  </p>
                  <p className="text-[11px] text-[#8E95A5] mt-1 leading-tight">
                    {item.timestamp}
                  </p>
                </div>

                <div className="text-[#8E95A5] shrink-0">
                  <ChevronRightIcon className="w-5 h-5" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Bottom Tab Bar */}
        <BottomNav currentTab="history" />
      </div>
    </MobileShell>
  );
}
