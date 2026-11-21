import React from "react";
import Image from "next/image";
import Link from "next/link";
import { MobileShell } from "@/components/mobile-shell";
import { BottomNav } from "@/components/bottom-nav";
import { Card } from "@/components/ui/card";
import { BellIcon, CameraIcon, NavArrowIcon, ClockIcon } from "@/components/icons";

export default function HomePage() {
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
        <div className="mt-1 mb-4">
          <h1 className="text-2xl font-bold text-[#0B1222]">Hello, User 👋</h1>
          <p className="text-sm text-[#5E6E82] mt-0.5">What do you want to do today?</p>
        </div>

        {/* Live Vehicle Map Card */}
        <Link href="/vehicle-details" className="block mb-5 group">
          <div className="relative w-full h-52 rounded-2xl overflow-hidden shadow-xs border border-[#EDF2F7] transition-transform duration-200 group-hover:scale-[1.01]">
            <Image
              src="/home-map.png"
              fill
              className="object-cover"
              alt="Live Parking Location"
              priority
              unoptimized
            />
          </div>
        </Link>

        {/* Action Menu Cards */}
        <div className="space-y-3 mb-6">
          <Card
            icon={<CameraIcon className="w-7 h-7" />}
            title="Save Parking"
            subtitle="Capture your vehicle and parking location"
            href="/save-parking"
          />

          <Card
            icon={<NavArrowIcon className="w-7 h-7" />}
            title="Find My Vehicle"
            subtitle="Get directions to your parked vehicle"
            href="/vehicle-details"
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
      </div>
    </MobileShell>
  );
}
