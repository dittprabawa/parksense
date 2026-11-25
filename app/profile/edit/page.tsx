"use client";

import { useEffect, useState } from "react";
import { useAccount } from "@/components/account-gate";
import { MobileShell } from "@/components/mobile-shell";
import { TopHeader } from "@/components/top-header";
import { Button } from "@/components/ui/button";
import { UserIcon } from "@/components/icons";
import { loadProfile, saveProfile } from "@/lib/profile-store";

export default function EditProfilePage() {
  const user = useAccount();
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const profile = loadProfile(user.id);
    setDisplayName(profile.displayName);
    setPhone(profile.phone);
    setNote(profile.note);
  }, [user.id]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    saveProfile(user.id, {
      displayName: displayName.trim(),
      phone: phone.trim(),
      note: note.trim(),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const initials = displayName.trim()
    ? displayName
        .trim()
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join("")
    : "";

  return (
    <MobileShell>
      <div className="flex flex-col flex-1 pb-4">
        <TopHeader title="Edit Profile" backHref="/profile" />

        {/* Avatar Preview */}
        <div className="flex flex-col items-center my-4">
          <div className="w-20 h-20 rounded-full bg-[#E1EEFF] text-[#007AFF] flex items-center justify-center shadow-xs font-bold text-2xl">
            {initials || <UserIcon className="w-9 h-9" />}
          </div>
          <p className="text-xs text-[#5E6E82] mt-2">{user.email}</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 gap-4">
          <div className="bg-white rounded-2xl border border-[#EDF2F7] shadow-xs p-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#5E6E82] mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Adit Juni"
                className="w-full rounded-xl border border-[#E3E8EF] bg-white px-3.5 py-3 text-[15px] text-[#0B1222] placeholder:text-[#8E95A5] focus:outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5E6E82] mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={user.email ?? ""}
                disabled
                className="w-full rounded-xl border border-[#EDF2F7] bg-[#F8FAFC] px-3.5 py-3 text-[15px] text-[#8E95A5] cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5E6E82] mb-1.5">
                Phone Number (Optional)
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +62 812 3456 7890"
                className="w-full rounded-xl border border-[#E3E8EF] bg-white px-3.5 py-3 text-[15px] text-[#0B1222] placeholder:text-[#8E95A5] focus:outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5E6E82] mb-1.5">
                Default Parking Note
              </label>
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Prefer shaded spot near elevator"
                className="w-full rounded-xl border border-[#E3E8EF] bg-white px-3.5 py-3 text-[15px] text-[#0B1222] placeholder:text-[#8E95A5] focus:outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15 transition-all resize-none"
              />
            </div>
          </div>

          {saved && (
            <div
              role="status"
              className="rounded-xl bg-[#ECFDF3] border border-[#BBF7D0] px-4 py-3 text-sm font-medium text-[#15803D] text-center"
            >
              Profile changes saved.
            </div>
          )}

          <div className="mt-auto pt-2">
            <Button type="submit" variant="primary">
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </MobileShell>
  );
}