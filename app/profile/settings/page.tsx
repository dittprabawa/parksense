"use client";

import { useEffect, useState } from "react";
import { useAccount } from "@/components/account-gate";
import { MobileShell } from "@/components/mobile-shell";
import { TopHeader } from "@/components/top-header";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type AppSettingsData,
} from "@/lib/profile-store";

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
        checked ? "bg-[#007AFF]" : "bg-[#D5DDE8]"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition-transform ${
          checked ? "translate-x-5.5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export default function AppSettingsPage() {
  const user = useAccount();
  const [settings, setSettings] = useState<AppSettingsData>(DEFAULT_SETTINGS);
  const [status, setStatus] = useState("");

  useEffect(() => {
    setSettings(loadSettings(user.id));
  }, [user.id]);

  function update(patch: Partial<AppSettingsData>) {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSettings(user.id, next);
    setStatus("Preferences updated");
    setTimeout(() => setStatus(""), 1800);
  }

  function resetAll() {
    setSettings(DEFAULT_SETTINGS);
    saveSettings(user.id, DEFAULT_SETTINGS);
    setStatus("Reset to default settings");
    setTimeout(() => setStatus(""), 2000);
  }

  return (
    <MobileShell>
      <div className="flex flex-col flex-1 pb-4">
        <TopHeader title="App Settings" backHref="/profile" />

        <div className="space-y-4">
          {/* Distance Unit */}
          <div className="bg-white rounded-2xl border border-[#EDF2F7] shadow-xs p-4">
            <p className="text-sm font-bold text-[#0B1222]">Distance Unit</p>
            <p className="text-xs text-[#5E6E82] mt-0.5 mb-3">
              Used when showing walking distance to your vehicle.
            </p>
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#F1F5F9] rounded-xl">
              <button
                type="button"
                onClick={() => update({ distanceUnit: "meters" })}
                className={`py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                  settings.distanceUnit === "meters"
                    ? "bg-white text-[#007AFF] shadow-xs"
                    : "text-[#5E6E82]"
                }`}
              >
                Meters (m)
              </button>
              <button
                type="button"
                onClick={() => update({ distanceUnit: "feet" })}
                className={`py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                  settings.distanceUnit === "feet"
                    ? "bg-white text-[#007AFF] shadow-xs"
                    : "text-[#5E6E82]"
                }`}
              >
                Feet (ft)
              </button>
            </div>
          </div>

          {/* Toggles Card */}
          <div className="bg-white rounded-2xl border border-[#EDF2F7] shadow-xs divide-y divide-[#F1F5F9]">
            <div className="p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-[15px] font-semibold text-[#0B1222]">
                  Auto Plate OCR Scan
                </p>
                <p className="text-xs text-[#5E6E82] mt-0.5">
                  Automatically detect license plates when taking a photo.
                </p>
              </div>
              <ToggleSwitch
                checked={settings.autoOcrScan}
                onChange={(v) => update({ autoOcrScan: v })}
                label="Toggle Auto Plate OCR Scan"
              />
            </div>

            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[15px] font-semibold text-[#0B1222]">
                    Parking Timer Reminder
                  </p>
                  <p className="text-xs text-[#5E6E82] mt-0.5">
                    Alert before your estimated parking duration ends.
                  </p>
                </div>
                <ToggleSwitch
                  checked={settings.parkingReminder}
                  onChange={(v) => update({ parkingReminder: v })}
                  label="Toggle Parking Timer Reminder"
                />
              </div>

              {settings.parkingReminder && (
                <div className="flex items-center gap-2 pt-1">
                  {[30, 60, 120, 240].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => update({ reminderMinutes: mins })}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                        settings.reminderMinutes === mins
                          ? "bg-[#E1EEFF] border-[#007AFF] text-[#007AFF]"
                          : "bg-white border-[#E3E8EF] text-[#5E6E82]"
                      }`}
                    >
                      {mins < 60 ? `${mins}m` : `${mins / 60}h`}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {status && (
            <p
              role="status"
              className="text-xs font-semibold text-[#007AFF] text-center"
            >
              {status}
            </p>
          )}
        </div>

        <div className="mt-auto pt-4">
          <Button type="button" variant="outline" onClick={resetAll}>
            Reset to Default
          </Button>
        </div>
      </div>
    </MobileShell>
  );
}