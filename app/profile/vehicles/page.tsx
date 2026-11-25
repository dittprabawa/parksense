"use client";

import { useEffect, useState } from "react";
import { useAccount } from "@/components/account-gate";
import { MobileShell } from "@/components/mobile-shell";
import { TopHeader } from "@/components/top-header";
import { Button } from "@/components/ui/button";
import { CarIcon, TrashIcon } from "@/components/icons";
import {
  loadVehicles,
  saveVehicles,
  type SavedVehicle,
} from "@/lib/profile-store";

export default function SavedVehiclesPage() {
  const user = useAccount();
  const [vehicles, setVehicles] = useState<SavedVehicle[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<"car" | "motorcycle">("car");
  const [name, setName] = useState("");
  const [plate, setPlate] = useState("");
  const [color, setColor] = useState("");

  useEffect(() => {
    setVehicles(loadVehicles(user.id));
  }, [user.id]);

  function updateVehicles(next: SavedVehicle[]) {
    setVehicles(next);
    saveVehicles(user.id, next);
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !plate.trim()) return;

    const newVehicle: SavedVehicle = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      type,
      name: name.trim(),
      plate: plate.trim().toUpperCase(),
      color: color.trim() || "Standard",
      isDefault: vehicles.length === 0,
    };

    updateVehicles([newVehicle, ...vehicles]);
    setName("");
    setPlate("");
    setColor("");
    setShowForm(false);
  }

  function setDefault(id: string) {
    updateVehicles(
      vehicles.map((v) => ({
        ...v,
        isDefault: v.id === id,
      }))
    );
  }

  function removeVehicle(id: string) {
    const filtered = vehicles.filter((v) => v.id !== id);
    if (filtered.length > 0 && !filtered.some((v) => v.isDefault)) {
      filtered[0].isDefault = true;
    }
    updateVehicles(filtered);
  }

  return (
    <MobileShell>
      <div className="flex flex-col flex-1 pb-4">
        <TopHeader
          title="Saved Vehicles"
          backHref="/profile"
          rightAction={
            <button
              type="button"
              onClick={() => setShowForm((prev) => !prev)}
              className="text-sm font-semibold text-[#007AFF] active:opacity-60 cursor-pointer"
            >
              {showForm ? "Cancel" : "+ Add"}
            </button>
          }
        />

        {showForm && (
          <form
            onSubmit={handleAdd}
            className="bg-white rounded-2xl border border-[#EDF2F7] shadow-xs p-4 mb-4 space-y-3"
          >
            <h2 className="text-sm font-bold text-[#0B1222]">
              Add New Vehicle
            </h2>

            {/* Vehicle Type Toggle */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#F1F5F9] rounded-xl">
              <button
                type="button"
                onClick={() => setType("car")}
                className={`py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                  type === "car"
                    ? "bg-white text-[#007AFF] shadow-xs"
                    : "text-[#5E6E82]"
                }`}
              >
                Car
              </button>
              <button
                type="button"
                onClick={() => setType("motorcycle")}
                className={`py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                  type === "motorcycle"
                    ? "bg-white text-[#007AFF] shadow-xs"
                    : "text-[#5E6E82]"
                }`}
              >
                Motorcycle
              </button>
            </div>

            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Vehicle Name (e.g. Honda Vario / Brio)"
              className="w-full rounded-xl border border-[#E3E8EF] px-3.5 py-2.5 text-sm text-[#0B1222] placeholder:text-[#8E95A5] focus:outline-none focus:border-[#007AFF]"
            />

            <div className="grid grid-cols-2 gap-2.5">
              <input
                type="text"
                required
                value={plate}
                onChange={(e) => setPlate(e.target.value)}
                placeholder="Plate (DK 1234 AB)"
                className="w-full rounded-xl border border-[#E3E8EF] px-3.5 py-2.5 text-sm uppercase text-[#0B1222] placeholder:text-[#8E95A5] focus:outline-none focus:border-[#007AFF]"
              />
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="Color (Black)"
                className="w-full rounded-xl border border-[#E3E8EF] px-3.5 py-2.5 text-sm text-[#0B1222] placeholder:text-[#8E95A5] focus:outline-none focus:border-[#007AFF]"
              />
            </div>

            <Button type="submit" variant="primary" className="py-2.5 text-sm">
              Save Vehicle
            </Button>
          </form>
        )}

        {/* Vehicles List */}
        {vehicles.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#EDF2F7] shadow-xs p-8 text-center my-4">
            <div className="w-14 h-14 rounded-full bg-[#E1EEFF] text-[#007AFF] flex items-center justify-center mx-auto mb-3">
              <CarIcon className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-[#0B1222]">
              No saved vehicles yet
            </h3>
            <p className="text-sm text-[#5E6E82] mt-1 mb-5">
              Add your car or motorcycle so saving a parking spot is faster.
            </p>
            <Button
              type="button"
              variant="primary"
              onClick={() => setShowForm(true)}
            >
              Add First Vehicle
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {vehicles.map((vehicle) => (
              <div
                key={vehicle.id}
                className="bg-white rounded-2xl border border-[#EDF2F7] shadow-xs p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-[#E1EEFF] text-[#007AFF] flex items-center justify-center shrink-0">
                      <CarIcon className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-[15px] font-bold text-[#0B1222] truncate">
                          {vehicle.name}
                        </h3>
                        {vehicle.isDefault && (
                          <span className="text-[11px] font-semibold bg-[#E1EEFF] text-[#007AFF] px-2 py-0.5 rounded-full shrink-0">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#5E6E82] mt-0.5">
                        <span className="font-semibold text-[#0B1222]">
                          {vehicle.plate}
                        </span>{" "}
                        · {vehicle.color} ·{" "}
                        {vehicle.type === "car" ? "Car" : "Motorcycle"}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeVehicle(vehicle.id)}
                    aria-label={`Remove ${vehicle.name}`}
                    className="p-2 text-[#8E95A5] hover:text-[#FF3B30] transition-colors cursor-pointer"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>

                {!vehicle.isDefault && (
                  <div className="mt-3 pt-3 border-t border-[#F1F5F9]">
                    <button
                      type="button"
                      onClick={() => setDefault(vehicle.id)}
                      className="text-xs font-semibold text-[#007AFF] hover:underline cursor-pointer"
                    >
                      Set as Default Vehicle
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </MobileShell>
  );
}