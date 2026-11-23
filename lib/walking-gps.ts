import { calculateDistanceMeters, isValidCoordinate } from "./parking-storage";

type Reading = { lat: number; lng: number; accuracy: number; time: number };
export const MAX_FIX_AGE_MS = 15000;

// A new filter belongs to one walking-navigation watch.
export function createWalkingFilter() {
  let last: Reading | undefined;
  let candidate: Reading | undefined;
  let confirmations = 0;
  let newest = -Infinity;
  const distance = (a: Reading, b: Reading) => calculateDistanceMeters(a.lat, a.lng, b.lat, b.lng);
  return (fix: Reading, now: number): boolean => {
    if (!Number.isFinite(fix.time) || fix.time <= newest || fix.time > now || now - fix.time > MAX_FIX_AGE_MS) return false;
    newest = fix.time;
    if (!isValidCoordinate(fix.lat, fix.lng) || !Number.isFinite(fix.accuracy) || fix.accuracy <= 0 || fix.accuracy > 35) {
      candidate = undefined;
      return false;
    }
    if (last) {
      // Allow GPS jitter plus walking movement. After a long gap require independent confirmation.
      const seconds = Math.min(5, (fix.time - last.time) / 1000);
      const allowance = Math.min(12, last.accuracy + fix.accuracy) + 3 * seconds;
      if (distance(last, fix) > allowance) {
        if (!candidate || fix.time - candidate.time > 15000 || distance(candidate, fix) > 12) {
          candidate = fix;
          confirmations = 1;
          return false;
        }
        confirmations++;
        if (confirmations < 3 || fix.time - candidate.time < 4000) return false;
      }
    }
    last = fix;
    candidate = undefined;
    return true;
  };
}
