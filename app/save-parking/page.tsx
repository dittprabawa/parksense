import React from "react";
import Image from "next/image";
import { MobileShell } from "@/components/mobile-shell";
import { TopHeader } from "@/components/top-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  MotorcycleIcon,
  LicensePlateIcon,
  LocationPinIcon,
  LayersIcon,
  PencilIcon,
  ChevronRightIcon,
} from "@/components/icons";

export default function SaveParkingPage() {
  return (
    <MobileShell>
      <div className="flex flex-col flex-1 pb-2">
        <TopHeader title="Save Parking" backHref="/home" />

        {/* Captured Vehicle Photo */}
        <div className="relative w-full h-56 rounded-2xl overflow-hidden shadow-xs border border-[#EDF2F7] mb-5">
          <Image
            src="/motorcycle-b2.png"
            fill
            className="object-cover"
            alt="Captured Vehicle in Parking B2"
            priority
            unoptimized
          />
        </div>

        {/* Section 1: AI Detected Vehicle Info */}
        <div className="mb-4">
          <h2 className="text-base font-bold text-[#0B1222] mb-2.5">
            Vehicle Information (AI Detected)
          </h2>
          <div className="space-y-2.5">
            <Card
              icon={<MotorcycleIcon className="w-6 h-6" />}
              label="Vehicle Type"
              value="Motorcycle"
              trailing={<ChevronRightIcon className="w-5 h-5 text-[#8E95A5]" />}
            />
            <Card
              icon={<LicensePlateIcon className="w-6 h-6" />}
              label="License Plate"
              value="DK 1234 AB"
              trailing={<PencilIcon className="w-5 h-5 text-[#0B1222]" />}
            />
          </div>
        </div>

        {/* Section 2: Parking Location Info */}
        <div className="mb-6">
          <h2 className="text-base font-bold text-[#0B1222] mb-2.5">Parking Location</h2>
          <div className="space-y-2.5">
            <Card
              icon={<LocationPinIcon className="w-6 h-6" />}
              label="Location"
              value="Campus Parking – Building A"
              trailing={<ChevronRightIcon className="w-5 h-5 text-[#8E95A5]" />}
            />
            <Card
              icon={<LayersIcon className="w-6 h-6" />}
              label="Floor / Zone"
              value="B2 – Zone C"
              trailing={<ChevronRightIcon className="w-5 h-5 text-[#8E95A5]" />}
            />
          </div>
        </div>

        {/* Bottom Save Action */}
        <div className="mt-auto pt-2">
          <Button variant="primary" href="/vehicle-details">
            Save Parking
          </Button>
        </div>
      </div>
    </MobileShell>
  );
}
