import { parkingChanged } from "@/lib/cloud-parking";
import { MobileShell } from "./mobile-shell";

export function ParkingError({ message }: { message: string }) {
  return <MobileShell><div role="alert" className="my-auto space-y-3">
    <p>Could not load parking records. {message}</p>
    <button onClick={parkingChanged} className="text-[#007AFF]">Retry</button>
  </div></MobileShell>;
}
