"use client";

import { useEffect, useState } from "react";
import { useAccount } from "@/components/account-gate";
import { messageOf, supabase } from "@/lib/supabase";
import Link from "next/link";
import { MobileShell } from "@/components/mobile-shell";
import { TopHeader } from "@/components/top-header";
import { BottomNav } from "@/components/bottom-nav";
import { loadProfile, loadVehicles } from "@/lib/profile-store";
import {
  UserIcon,
  PencilIcon,
  CarIcon,
  SettingsIcon,
  HelpCircleIcon,
  InfoCircleIcon,
  ChevronRightIcon,
} from "@/components/icons";

export default function ProfilePage() {
  const user = useAccount();
  const [error, setError] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [vehicleCount, setVehicleCount] = useState(0);

  useEffect(() => {
    const profile = loadProfile(user.id);
    const vehicles = loadVehicles(user.id);
    setDisplayName(profile.displayName.trim());
    setVehicleCount(vehicles.length);
  }, [user.id]);

  async function logout() {
    try {
      try {
        sessionStorage.removeItem("parksense-photo:" + user.id);
      } catch {}
      const { error } = await supabase().auth.signOut({ scope: "local" });
      if (error) throw error;
    } catch (error) {
      setError(messageOf(error));
    }
  }

  const initials = displayName
    ? displayName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join("")
    : "";

  const menuItems = [
    {
      label: "Edit Profile",
      icon: <PencilIcon className="w-5 h-5 text-[#0B1222]" />,
      href: "/profile/edit",
      badge: null,
    },
    {
      label: "Saved Vehicles",
      icon: <CarIcon className="w-5 h-5 text-[#0B1222]" />,
      href: "/profile/vehicles",
      badge: vehicleCount > 0 ? String(vehicleCount) : null,
    },
    {
      label: "App Settings",
      icon: <SettingsIcon className="w-5 h-5 text-[#0B1222]" />,
      href: "/profile/settings",
      badge: null,
    },
    {
      label: "Help & Support",
      icon: <HelpCircleIcon className="w-5 h-5 text-[#0B1222]" />,
      href: "/profile/help",
      badge: null,
    },
    {
      label: "About ParkSense",
      icon: <InfoCircleIcon className="w-5 h-5 text-[#0B1222]" />,
      href: "/profile/about",
      badge: null,
    },
  ];

  return (
    <MobileShell>
      <div className="flex flex-col flex-1 pb-2">
        <TopHeader title="Profile" />

        {/* User Info Header */}
        <div className="flex items-center gap-4 my-4 px-1">
          <div className="w-16 h-16 rounded-full bg-[#E1EEFF] text-[#007AFF] flex items-center justify-center shrink-0 shadow-xs font-bold text-xl">
            {initials || <UserIcon className="w-8 h-8" />}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold text-[#0B1222] leading-tight truncate">
              {displayName || "Your account"}
            </h2>
            <p className="text-sm text-[#5E6E82] mt-0.5 truncate">
              {user.email}
            </p>
          </div>
        </div>

        {/* Grouped Settings Menu Card */}
        <div className="bg-white rounded-2xl border border-[#EDF2F7] shadow-xs divide-y divide-[#F1F5F9] overflow-hidden my-3">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center justify-between p-4 hover:bg-[#F9FAFC] active:bg-[#F1F5F9] transition-colors"
            >
              <div className="flex items-center gap-3.5">
                <span className="shrink-0">{item.icon}</span>
                <span className="text-[15px] font-semibold text-[#0B1222]">
                  {item.label}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {item.badge && (
                  <span className="text-xs font-semibold bg-[#E1EEFF] text-[#007AFF] px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
                <ChevronRightIcon className="w-5 h-5 text-[#8E95A5]" />
              </div>
            </Link>
          ))}
        </div>

        {/* Log Out Button */}
        <div className="my-3">
          {error && (
            <p role="alert" className="text-sm text-[#FF3B30] mb-2 text-center">
              {error}
            </p>
          )}
          <button
            onClick={logout}
            className="w-full bg-white rounded-full py-3.5 border border-[#EDF2F7] shadow-xs flex items-center justify-center gap-2 text-[#FF3B30] font-semibold hover:bg-red-50/40 active:scale-[0.98] transition-all cursor-pointer"
          >
            <svg
              className="w-5 h-5 text-[#FF3B30]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
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