export type ScannedVehicle = "Car" | "Motorcycle" | "Bicycle";

export interface VehicleScan {
  vehicleType: ScannedVehicle | null;
  licensePlate: string | null;
}

export type ScanMessage = { result: VehicleScan } | { error: string };

export function readPlate(lines: { text: string; score: number }[]): string | null {
  for (const line of [...lines].sort((a, b) => b.score - a.score)) {
    if (line.score < 0.75) continue;
    const match = /^([A-Z]{1,2})[ -]*(\d{1,4})[ -]*([A-Z]{0,3})$/.exec(
      line.text.trim().toUpperCase(),
    );
    if (!match) continue;
    const [, prefix, number, suffix] = match;
    // Short labels without a suffix (e.g. B2) also appear on parking signs.
    if (!suffix && number.length < 3) continue;
    // Short, suffixless labels like B2 commonly identify a parking floor.
    if (!suffix && number.length < 3) continue;
    return [prefix, number, suffix].filter(Boolean).join(" ");
  }
  return null;
}
