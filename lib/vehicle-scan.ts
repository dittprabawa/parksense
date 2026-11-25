export type ScannedVehicle = "Car" | "Motorcycle" | "Bicycle";

export interface VehicleScan {
  vehicleType: ScannedVehicle | null;
  licensePlate: string | null;
  plateCandidate?: string;
}

export type ScanMessage = { result: VehicleScan } | { error: string };

interface TextBox {
  text: string;
  score: number;
  poly: [number, number][];
}

export function readPlate(lines: TextBox[]): string | null {
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

  const candidates: { plate: string; rank: number }[] = [];
  for (let i = 0; i < boxes.length; i++) {
    let box = boxes[i];
    let text = box.text;
    let confidence = box.score;
    let candidate: { plate: string; rank: number } | undefined;
    // PaddleOCR can return the region code, digits and suffix in separate boxes.
    for (let parts = 1; parts <= 3; parts++) {
      const match = /^([A-Z]{1,2})[ -]*(\d{1,4})[ -]*([A-Z]{0,3})$/.exec(text);
      if (match && (match[3] || match[2].length >= 3)) {
        const plate = match.slice(1).filter(Boolean).join(" ");
        candidate = { plate, rank: boxes[i].height * confidence };
      }
      if (match?.[3] || (!match && !/^[A-Z]{1,2}$/.test(text))) break;
      const next = boxes.slice(i + 1).find(other => {
        const gap = other.left - box.right;
        return other.left > box.left && gap >= -0.4 * box.height && gap <= 1.5 * box.height
          && Math.abs(other.leftY - box.rightY) <= 0.45 * box.height
          && other.height >= 0.65 * box.height && other.height <= 1.5 * box.height
          && (match ? /^[A-Z]{1,3}$/.test(other.text) : /^\d{1,4}([ -]*[A-Z]{1,3})?$/.test(other.text));
      });
      if (!next) break;
      text += " " + next.text;
      confidence = Math.min(confidence, next.score);
      box = next;
    }
    if (candidate) candidates.push(candidate);
  }
  return candidates.sort((a, b) => b.rank - a.rank)[0]?.plate ?? null;
}

// OCR can mistake suffix letters for digits. Surface the raw reading for review.
export function findPlateCandidate(lines: { text: string; score: number }[]): string | undefined {
  for (const line of [...lines].sort((a, b) => b.score - a.score)) {
    const raw = line.text.trim().toUpperCase();
    if (line.score >= 0.75 && /^[A-Z]{1,2}\d{5,7}$/.test(raw.replace(/[ -]/g, ""))) {
      return raw;
    }
  }
}
