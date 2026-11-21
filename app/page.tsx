import Image from "next/image";
import { MobileShell } from "@/components/mobile-shell";
import { Button } from "@/components/ui/button";

export default function WelcomePage() {
  return (
    <MobileShell>
      <div className="flex flex-col flex-1 items-center justify-between text-center py-2">
        {/* Top Header & Branding */}
        <div className="flex flex-col items-center">
          <Image
            src="/parksense-mark.png"
            width={64}
            height={64}
            alt="ParkSense Logo"
            className="block"
            priority
            unoptimized
          />
          <h2 className="text-xl font-bold text-[#0B1222] mt-2 tracking-tight">ParkSense</h2>

          {/* Hero Copy */}
          <h1 className="text-[28px] font-bold text-[#0B1222] leading-tight mt-4">
            Never Lose
            <br />
            Your Parking Spot
          </h1>
          <p className="text-sm text-[#5E6E82] mt-2 max-w-[280px] leading-relaxed">
            Save, find, and navigate to your vehicle easily, indoors or outdoors.
          </p>
        </div>

        {/* Map Artwork Card */}
        <div className="relative w-full max-w-[340px] h-60 my-3 rounded-2xl overflow-hidden shadow-xs border border-[#EDF2F7]">
          <Image
            src="/welcome-map.webp"
            fill
            className="object-cover"
            alt="ParkSense Map Spot"
            priority
            unoptimized
          />
        </div>

        {/* Pagination Dots and Action */}
        <div className="w-full flex flex-col items-center">
          <div className="flex items-center justify-center gap-2.5 mb-5" aria-hidden="true">
            <span className="w-2.5 h-2.5 rounded-full bg-[#007AFF]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#007AFF]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#007AFF]" />
          </div>

          <Button variant="primary" href="/login">
            <span className="mr-1.5 text-lg" aria-hidden="true">→</span>
            Get Started
          </Button>
        </div>
      </div>
    </MobileShell>
  );
}
