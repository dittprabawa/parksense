import React from "react";
import Link from "next/link";
import { HomeIcon, ClockIcon, UserIcon } from "./icons";

interface BottomNavProps {
  currentTab: "home" | "history" | "profile";
}

export function BottomNav({ currentTab }: BottomNavProps) {
  return (
    <nav className="mt-auto pt-3 border-t border-[#EDF2F7] bg-[#F6F8FD] shrink-0">
      <div className="flex items-center justify-around">
        <Link
          href="/home"
          className={`flex flex-col items-center gap-1 py-1 px-4 transition-colors ${
            currentTab === "home" ? "text-[#007AFF] font-semibold" : "text-[#8E95A5] hover:text-[#5E6E82]"
          }`}
        >
          <HomeIcon className="w-6 h-6" />
          <span className="text-xs">Home</span>
        </Link>

        <Link
          href="/history"
          className={`flex flex-col items-center gap-1 py-1 px-4 transition-colors ${
            currentTab === "history" ? "text-[#007AFF] font-semibold" : "text-[#8E95A5] hover:text-[#5E6E82]"
          }`}
        >
          <ClockIcon className="w-6 h-6" />
          <span className="text-xs">History</span>
        </Link>

        <Link
          href="/profile"
          className={`flex flex-col items-center gap-1 py-1 px-4 transition-colors ${
            currentTab === "profile" ? "text-[#007AFF] font-semibold" : "text-[#8E95A5] hover:text-[#5E6E82]"
          }`}
        >
          <UserIcon className="w-6 h-6" />
          <span className="text-xs">Profile</span>
        </Link>
      </div>
    </nav>
  );
}
