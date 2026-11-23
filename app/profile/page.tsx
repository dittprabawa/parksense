"use client";

import { useState } from "react";
import { useAccount } from "@/components/account-gate";
import { messageOf, supabase } from "@/lib/supabase";
import Link from "next/link";
import { MobileShell } from "@/components/mobile-shell";
import { TopHeader } from "@/components/top-header";
import { BottomNav } from "@/components/bottom-nav";
import {
  UserIcon,
  PencilIcon,
  CarIcon,
  SettingsIcon,
  HelpCircleIcon,
  InfoCircleIcon,
  TrashIcon,
  ChevronRightIcon,
} from "@/components/icons";

export default function ProfilePage() {
  const user = useAccount();
  const [error, setError] = useState("");
  async function logout() {
    try {
      try { sessionStorage.removeItem("parksense-photo:" + user.id); } catch {}
      const { error } = await supabase().auth.signOut({ scope: "local" });
      if (error) throw error;
    } catch (error) { setError(messageOf(error)); }
  }
  const menuItems = [
    { label: "Edit Profile", icon: <PencilIcon className="w-5 h-5 text-[#0B1222]" />, href: "/profile" },
    { label: "Saved Vehicles", icon: <CarIcon className="w-5 h-5 text-[#0B1222]" />, href: "/vehicle-details" },
    { label: "App Settings", icon: <SettingsIcon className="w-5 h-5 text-[#0B1222]" />, href: "/profile" },
    { label: "Help & Support", icon: <HelpCircleIcon className="w-5 h-5 text-[#0B1222]" />, href: "/profile" },
    { label: "About ParkSense", icon: <InfoCircleIcon className="w-5 h-5 text-[#0B1222]" />, href: "/profile" },
  ];

  return (
    <MobileShell>
      <div className="flex flex-col flex-1 pb-2">
        <TopHeader title="Profile" />

        {/* User Info Header */}
        <div className="flex items-center gap-4 my-4 px-1">
          <div className="w-16 h-16 rounded-full bg-[#E1EEFF] text-[#007AFF] flex items-center justify-center shrink-0 shadow-xs">
            <UserIcon className="w-8 h-8" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold text-[#0B1222] leading-tight truncate">
              Your account
            </h2>
            <p className="text-sm text-[#5E6E82] mt-0.5 truncate">
              {user.email}
            </p>
          </div>
        </div>

        {/* Grouped Settings Menu Card */}
        <div className="bg-white rounded-2xl border border-[#EDF2F7] shadow-xs divide-y divide-[#F1F5F9] overflow-hidden my-3">
          {menuItems.map((item, index) => (
            <Link
              key={index}
              href={item.href}
              className="flex items-center justify-between p-4 hover:bg-[#F9FAFC] active:bg-[#F1F5F9] transition-colors"
            >
              <div className="flex items-center gap-3.5">
                <span className="shrink-0">{item.icon}</span>
                <span className="text-[15px] font-semibold text-[#0B1222]">
                  {item.label}
                </span>
              </div>
              <ChevronRightIcon className="w-5 h-5 text-[#8E95A5] shrink-0" />
            </Link>
          ))}
        </div>

        {/* Log Out Button */}
        <div className="my-3">
          {error && <p role="alert">{error}</p>}
          <button
            onClick={logout}
            className="w-full bg-white rounded-full py-3.5 border border-[#EDF2F7] shadow-xs flex items-center justify-center gap-2 text-[#FF3B30] font-semibold hover:bg-red-50/20 active:scale-[0.98] transition-all no-underline"
          >
            <TrashIcon className="w-5 h-5 text-[#FF3B30]" />
            <span>Log Out</span>
          </button>
        </div>

        {/* Bottom Tab Bar */}
        <div className="mt-auto">
          <BottomNav currentTab="profile" />
        </div>
      </div>
    </MobileShell>
  );
}
