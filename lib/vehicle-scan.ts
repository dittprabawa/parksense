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
 * OCR commonly mistakes 'O' or 'B' for '8' / '3' / '0', 'I' or 'L' for '1', etc.
 */
export function normalizePlateSuffix(suffix: string): string {
  const map: Record<string, string> = {
    "0": "O",
    "1": "I",
    "2": "Z",
    "3": "O", // e.g. center screw/bolt cutting oval 'O' into a '3'
    "4": "A",
    "5": "S",
    "6": "G",
    "7": "T",
    "8": "O", // On Korlantas Polri plates, 'O' is very frequently detected as '8'
    "9": "B",
  };
  return suffix.split("").map((c) => map[c] ?? c).join("");
}

export function getAlternativePlate(region: string, number: string, suffixRaw: string): string | undefined {
  const norm = normalizePlateSuffix(suffixRaw);
  // 1. Digits 8, 3, 0 often get confused between O and B
  if (/[830]/.test(suffixRaw)) {
    const altSuffix = suffixRaw.replace(/[830]/g, "B");
    const altNorm = normalizePlateSuffix(altSuffix);
    if (altNorm !== norm) {
      return `${region} ${number} ${altNorm}`;
    }
  }
  // 2. Digit 1 or letter I often gets confused with L
  if (/[1I]/.test(suffixRaw)) {
    const altSuffix = suffixRaw.replace(/[1I]/g, "L");
    const altNorm = normalizePlateSuffix(altSuffix);
    if (altNorm !== norm) {
      return `${region} ${number} ${altNorm}`;
    }
  }
  return undefined;
}

export function parsePlateText(raw: string): { plate: string; hasSuffix: boolean; alternative?: string } | null {
  let text = raw.trim().toUpperCase().replace(/\s+/g, " ");

  // Strip trailing expiration date like "07 29", "07.29", "07-29", "06/27"
  text = text.replace(/(?<!\d)(?:0[1-9]|1[0-2])[.\s\/-]+(?:\d{2})$/, "").trim();
  // Strip non-alphanumeric noise at boundaries
  text = text.replace(/^[^A-Z0-9]+|[^A-Z0-9]+$/g, "");

  // 1. Standard or separated/compact format with 1-4 digits
  const match = /^([A-Z]{1,2})[ -]*(\d{1,4})(?:[ -]*([A-Z0-9]{1,3}))?$/.exec(text);
  if (match) {
    const region = match[1];
    const number = match[2];
    const suffixRaw = match[3];

    if (suffixRaw || number.length >= 3) {
      if (suffixRaw) {
        const suffix = normalizePlateSuffix(suffixRaw);
        const plate = `${region} ${number} ${suffix}`;
        const alternative = getAlternativePlate(region, number, suffixRaw);
        return { plate, hasSuffix: true, alternative };
      } else {
        return { plate: `${region} ${number}`, hasSuffix: false };
      }
    }
  }

  // 2. Compact digits: e.g. "DK 572588" or "DK572588" (5 to 7 digits total after region code)
  const compact = /^([A-Z]{1,2})[ -]*(\d{5,7})$/.exec(text);
  if (compact) {
    const region = compact[1];
    const digits = compact[2];
    const numDigits = Math.min(4, digits.length - 1);
    const number = digits.slice(0, numDigits);
    const suffixRaw = digits.slice(numDigits);
    const suffix = normalizePlateSuffix(suffixRaw);
    const plate = `${region} ${number} ${suffix}`;
    const alternative = getAlternativePlate(region, number, suffixRaw);
    return { plate, hasSuffix: true, alternative };
  }

  return null;
}

export function readPlate(lines: TextBox[]): PlateResult | null {
  const boxes = lines.filter(line => line.score >= 0.45 && line.poly.length === 4).map(line => {
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
  }).filter(box => {
    // Ignore pure expiration date boxes
    return !/^(0[1-9]|1[0-2])[.\s\/-]+(?:\d{2})$/.test(box.text);
  }).sort((a, b) => a.left - b.left);

  const candidates: { result: PlateResult; rank: number }[] = [];
  for (let i = 0; i < boxes.length; i++) {
    let box = boxes[i];
    let text = box.text;
    let confidence = box.score;
    let candidate: { result: PlateResult; rank: number } | undefined;

    // Check if the current box itself is already a plate
    const single = parsePlateText(text);
    if (single) {
      candidates.push({
        result: { plate: single.plate, alternative: single.alternative },
        rank: box.height * confidence * (single.hasSuffix ? 1.5 : 1.0),
      });
      if (single.hasSuffix) continue;
    }

    // PaddleOCR can return the region code, digits and suffix in separate boxes.
    for (let parts = 1; parts <= 3; parts++) {
      const parsed = parsePlateText(text);
      if (parsed) {
        candidate = {
          result: { plate: parsed.plate, alternative: parsed.alternative },
          rank: boxes[i].height * confidence * (parsed.hasSuffix ? 1.5 : 1.0),
        };
      }
      if (parsed?.hasSuffix) break;
      const next = boxes.slice(i + 1).find(other => {
        const gap = other.left - box.right;
        return other.left > box.left && gap >= -0.5 * box.height && gap <= 3.5 * box.height
          && Math.abs(other.leftY - box.rightY) <= 0.85 * box.height
          && other.height >= 0.45 * box.height && other.height <= 2.2 * box.height
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
    if (line.score >= 0.45) {
      const parsed = parsePlateText(raw);
      if (parsed) return parsed.plate;
    }
    if (line.score >= 0.45 && /^[A-Z]{1,2}\d{5,7}$/.test(raw.replace(/[ -]/g, ""))) {
      return raw;
    }
  }
}
