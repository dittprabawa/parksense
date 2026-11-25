import Image from "next/image";
import { MobileShell } from "@/components/mobile-shell";
import { TopHeader } from "@/components/top-header";

const FEATURES = [
  {
    title: "Indoor & Outdoor Pinning",
    desc: "Save exact GPS coordinates along with floor, zone, and landmark notes.",
  },
  {
    title: "Visual Photo & Plate Capture",
    desc: "Attach a quick snapshot of your vehicle and surrounding pillars.",
  },
  {
    title: "Guided Walking Navigation",
    desc: "Follow live direction and distance back to your parked vehicle.",
  },
  {
    title: "Synced Parking History",
    desc: "Review previous spots anytime across sessions.",
  },
];

export default function AboutParkSensePage() {
  return (
    <MobileShell>
      <div className="flex flex-col flex-1 pb-4 space-y-4">
        <TopHeader title="About ParkSense" backHref="/profile" />

        {/* Brand Hero Card */}
        <div className="bg-white rounded-2xl border border-[#EDF2F7] shadow-xs p-6 flex flex-col items-center text-center">
          <Image
            src="/parksense-horizontal.svg"
            width={190}
            height={44}
            alt="ParkSense"
            className="h-10 w-auto object-contain"
            priority
            unoptimized
          />
          <span className="mt-3 text-xs font-semibold bg-[#E1EEFF] text-[#007AFF] px-3 py-1 rounded-full">
            Version 1.0.0
          </span>
          <p className="text-sm text-[#5E6E82] mt-3 leading-relaxed">
            Smart mobile-first parking assistant designed to help drivers save,
            remember, and navigate back to their vehicle effortlessly.
          </p>
        </div>

        {/* Highlights */}
        <div className="bg-white rounded-2xl border border-[#EDF2F7] shadow-xs divide-y divide-[#F1F5F9]">
          {FEATURES.map((feat) => (
            <div key={feat.title} className="p-4">
              <h3 className="text-sm font-bold text-[#0B1222]">{feat.title}</h3>
              <p className="text-xs text-[#5E6E82] mt-0.5 leading-relaxed">
                {feat.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-[#8E95A5] mt-auto pt-2">
          Built with Next.js, Tailwind CSS & Supabase · ParkSense Team
        </p>
      </div>
    </MobileShell>
  );
}