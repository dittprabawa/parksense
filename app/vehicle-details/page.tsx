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
  ClockIcon,
  PencilIcon,
  TrashIcon,
  NavArrowIcon,
  ChevronRightIcon,
} from "@/components/icons";
import { mockCurrentVehicle } from "@/lib/mock-data";

export default function VehicleDetailsPage() {
  const vehicle = mockCurrentVehicle;

  return (
    <MobileShell>
      <div className="flex flex-col flex-1 pb-3">
        <TopHeader title="Vehicle Details" backHref="/home" />

        {/* Vehicle Photo */}
        <div className="relative w-full h-52 rounded-2xl overflow-hidden shadow-xs border border-[#EDF2F7] mb-4 shrink-0">
          <Image
            src={vehicle.thumbnailUrl}
            fill
            className="object-cover"
            alt={vehicle.licensePlate}
            priority
            unoptimized
          />
        </div>

        {/* Vehicle Information */}
        <div className="mb-3.5">
          <h2 className="text-base font-bold text-[#0B1222] mb-2">Vehicle Information</h2>
          <div className="space-y-2">
            <Card
              icon={<MotorcycleIcon className="w-6 h-6" />}
              label="Type"
              value={vehicle.type}
              trailing={<ChevronRightIcon className="w-5 h-5 text-[#8E95A5]" />}
            />
            <Card
              icon={<LicensePlateIcon className="w-6 h-6" />}
              label="License Plate"
              value={vehicle.licensePlate}
              trailing={<PencilIcon className="w-5 h-5 text-[#0B1222]" />}
            />
          </div>
        </div>

        {/* Parking Location */}
        <div className="mb-5">
          <h2 className="text-base font-bold text-[#0B1222] mb-2">Parking Location</h2>
          <div className="space-y-2">
            <Card
              icon={<LocationPinIcon className="w-6 h-6" />}
              label="Location"
              value={vehicle.location}
              trailing={<ChevronRightIcon className="w-5 h-5 text-[#8E95A5]" />}
            />
            <Card
              icon={<LayersIcon className="w-6 h-6" />}
              label="Floor / Zone"
              value={vehicle.floorZone}
              trailing={<ChevronRightIcon className="w-5 h-5 text-[#8E95A5]" />}
            />
            <Card
              icon={<ClockIcon className="w-6 h-6 text-[#007AFF]" />}
              label="Nearby Landmark"
              value={vehicle.nearbyLandmark}
              trailing={<ChevronRightIcon className="w-5 h-5 text-[#8E95A5]" />}
            />
          </div>
        </div>

        {/* Stacked Action Buttons */}
        <div className="mt-auto space-y-2.5 pt-1">
          <Button
            variant="primary"
            href="/home"
            icon={<NavArrowIcon className="w-5 h-5 text-white" />}
          >
            Navigate
          </Button>

          <Button
            variant="secondary"
            href="/save-parking"
            icon={<PencilIcon className="w-5 h-5 text-[#0B1222]" />}
          >
            Edit Details
          </Button>

          <Button
            variant="danger"
            href="/history"
            icon={<TrashIcon className="w-5 h-5 text-[#FF3B30]" />}
          >
            Delete Record
          </Button>
        </div>
      </div>
    </MobileShell>
  );
}
