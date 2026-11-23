import { calculateDistanceMeters, isValidCoordinate } from "./parking-storage";

type Reading = { lat: number; lng: number; accuracy: number; time: number };
export const MAX_FIX_AGE_MS = 15000;

// A new filter belongs to one walking-navigation watch.
export function createWalkingFilter(maxAccuracy = 55) {
  let last: Reading | undefined;
  let candidate: Reading | undefined;
  let confirmations = 0;
  let newest = -Infinity;
  const distance = (a: Reading, b: Reading) => calculateDistanceMeters(a.lat, a.lng, b.lat, b.lng);
  return (fix: Reading, now: number): boolean => {
    if (!Number.isFinite(fix.time) || fix.time <= newest || fix.time > now || now - fix.time > MAX_FIX_AGE_MS) return false;
    newest = fix.time;
    // Allow up to maxAccuracy (e.g. 55m in indoor/mall) for instant first fix, refine as user moves
    const allowedAccuracy = last ? Math.max(35, Math.min(maxAccuracy, last.accuracy + 15)) : maxAccuracy;
    if (!isValidCoordinate(fix.lat, fix.lng) || !Number.isFinite(fix.accuracy) || fix.accuracy <= 0 || fix.accuracy > allowedAccuracy) {
      candidate = undefined;
      return false;
    }
    if (last) {
      // Allow GPS jitter plus walking movement.
      const seconds = Math.min(5, (fix.time - last.time) / 1000);
      const allowance = Math.min(25, last.accuracy + fix.accuracy) + 3 * seconds;
      if (distance(last, fix) > allowance) {
        if (!candidate || fix.time - candidate.time > 15000 || distance(candidate, fix) > 15) {
          candidate = fix;
          confirmations = 1;
          return false;
        }
        confirmations++;
        if (confirmations < 2 || fix.time - candidate.time < 2000) return false;
      }
    }
    last = fix;
    candidate = undefined;
    return true;
  };
}
