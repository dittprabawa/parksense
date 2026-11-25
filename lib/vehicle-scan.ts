export type ScannedVehicle = "Car" | "Motorcycle" | "Bicycle";

export interface VehicleScan {
  vehicleType: ScannedVehicle | null;
  licensePlate: string | null;
  plateCandidate?: string;
  alternativePlate?: string;
}

export type ScanMessage = { result: VehicleScan } | { error: string };

interface TextBox {
  text: string;
  score: number;
  poly: [number, number][];
}

export interface PlateResult {
  plate: string;
  alternative?: string;
}

/**
 * Normalizes OCR misread digits in the license plate suffix into letters.
 * On Indonesian license plates, the suffix (after the numbers) is ALWAYS 1-3 letters.
 * OCR commonly mistakes 'O' or 'B' for '8', 'O' for '0', 'I' for '1', etc.
 */
export function normalizePlateSuffix(suffix: string): string {
  const map: Record<string, string> = {
    "0": "O",
    "8": "O", // On Korlantas Polri plates, 'O' is very frequently detected as '8'
    "1": "I",
    "5": "S",
    "2": "Z",
    "4": "A",
    "6": "G",
    "7": "T",
  };
  return suffix.split("").map((c) => map[c] ?? c).join("");
}

export function parsePlateText(raw: string): { plate: string; hasSuffix: boolean; alternative?: string } | null {
  const text = raw.trim().toUpperCase().replace(/\s+/g, " ");

  // 1. Standard format: e.g. "DK 5725 OO" or "DK 5725"
  const standard = /^([A-Z]{1,2})[ -]*(\d{1,4})(?:[ -]*([A-Z]{1,3}))?$/.exec(text);
  if (standard && (standard[3] || standard[2].length >= 3)) {
    const plate = [standard[1], standard[2], standard[3]].filter(Boolean).join(" ");
    return { plate, hasSuffix: Boolean(standard[3]) };
  }

  // 2. Separated format with digits in suffix position: e.g. "DK 5725 88"
  const separated = /^([A-Z]{1,2})[ -]+(\d{1,4})[ -]+([0-9A-Z]{1,3})$/.exec(text);
  if (separated) {
    const region = separated[1];
    const number = separated[2];
    const suffixRaw = separated[3];
    const suffix = normalizePlateSuffix(suffixRaw);
    const plate = `${region} ${number} ${suffix}`;
    const alternative = suffixRaw.includes("8")
      ? `${region} ${number} ${suffixRaw.replace(/8/g, "B")}`
      : undefined;
    return { plate, hasSuffix: true, alternative };
  }

  // 3. Compact digits: e.g. "DK 572588" (5 to 7 digits total after region code)
  const compact = /^([A-Z]{1,2})[ -]*(\d{5,7})$/.exec(text);
  if (compact) {
    const region = compact[1];
    const digits = compact[2];
    // In Indonesia, registration numbers have 1-4 digits.
    const numDigits = Math.min(4, digits.length - 1);
    const number = digits.slice(0, numDigits);
    const suffixRaw = digits.slice(numDigits);
    const suffix = normalizePlateSuffix(suffixRaw);
    const plate = `${region} ${number} ${suffix}`;
    const alternative = suffixRaw.includes("8")
      ? `${region} ${number} ${suffixRaw.replace(/8/g, "B")}`
      : undefined;
    return { plate, hasSuffix: true, alternative };
  }

  return null;
}

export function readPlate(lines: TextBox[]): PlateResult | null {
  const boxes = lines.filter(line => line.score >= 0.75 && line.poly.length === 4).map(line => {
    const [tl, tr, br, bl] = line.poly;
    return {
      text: line.text.trim().toUpperCase(),
      score: line.score,
      left: (tl[0] + bl[0]) / 2,
      right: (tr[0] + br[0]) / 2,
      leftY: (tl[1] + bl[1]) / 2,
      rightY: (tr[1] + br[1]) / 2,
      height: (Math.hypot(bl[0] - tl[0], bl[1] - tl[1]) + Math.hypot(br[0] - tr[0], br[1] - tr[1])) / 2,
    };
  }).sort((a, b) => a.left - b.left);

  const candidates: { result: PlateResult; rank: number }[] = [];
  for (let i = 0; i < boxes.length; i++) {
    let box = boxes[i];
    let text = box.text;
    let confidence = box.score;
    let candidate: { result: PlateResult; rank: number } | undefined;
    // PaddleOCR can return the region code, digits and suffix in separate boxes.
    for (let parts = 1; parts <= 3; parts++) {
      const parsed = parsePlateText(text);
      if (parsed) {
        candidate = {
          result: { plate: parsed.plate, alternative: parsed.alternative },
          rank: boxes[i].height * confidence,
        };
      }
      if (parsed?.hasSuffix || (!parsed && !/^[A-Z]{1,2}$/.test(text))) break;
      const next = boxes.slice(i + 1).find(other => {
        const gap = other.left - box.right;
        return other.left > box.left && gap >= -0.4 * box.height && gap <= 1.5 * box.height
          && Math.abs(other.leftY - box.rightY) <= 0.45 * box.height
          && other.height >= 0.65 * box.height && other.height <= 1.5 * box.height
          && (parsed ? /^[0-9A-Z]{1,3}$/.test(other.text) : /^\d{1,4}([ -]*[0-9A-Z]{1,3})?$/.test(other.text));
      });
      if (!next) break;
      text += " " + next.text;
      confidence = Math.min(confidence, next.score);
      box = next;
    }
    if (candidate) candidates.push(candidate);
  }
  return candidates.sort((a, b) => b.rank - a.rank)[0]?.result ?? null;
}

// OCR can mistake suffix letters for digits. Surface the reading for review.
export function findPlateCandidate(lines: { text: string; score: number }[]): string | undefined {
  for (const line of [...lines].sort((a, b) => b.score - a.score)) {
    const raw = line.text.trim().toUpperCase();
    if (line.score >= 0.75) {
      const parsed = parsePlateText(raw);
      if (parsed) return parsed.plate;
    }
    if (line.score >= 0.75 && /^[A-Z]{1,2}\d{5,7}$/.test(raw.replace(/[ -]/g, ""))) {
      return raw;
    }
  }
}
