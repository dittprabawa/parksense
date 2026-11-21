export interface ParkingRecord {
  id: string;
  type: string;
  licensePlate: string;
  location: string;
  floorZone: string;
  nearbyLandmark?: string;
  timestamp: string;
  status: "active" | "past";
  thumbnailUrl: string;
}

export const mockCurrentVehicle: ParkingRecord = {
  id: "rec-1",
  type: "Motorcycle",
  licensePlate: "DK 1234 AB",
  location: "Campus Parking – Building A",
  floorZone: "B2 – Zone C",
  nearbyLandmark: "Near Elevator & South Exit",
  timestamp: "Nov 20, 2026 · 10:24 AM",
  status: "active",
  thumbnailUrl: "/motorcycle-b2.png",
};

export const mockParkingHistory: ParkingRecord[] = [
  {
    id: "rec-1",
    type: "Motorcycle",
    licensePlate: "DK 1234 AB",
    location: "Campus Parking – Building A",
    floorZone: "B2 – Zone C",
    nearbyLandmark: "Near Elevator & South Exit",
    timestamp: "Nov 20, 2026 · 10:24 AM",
    status: "active",
    thumbnailUrl: "/motorcycle-b2.png",
  },
  {
    id: "rec-2",
    type: "Car",
    licensePlate: "DK 5678 CD",
    location: "Mall Denpasar – L2, Zone B",
    floorZone: "L2 – Zone B",
    nearbyLandmark: "East Entrance Gate",
    timestamp: "Nov 18, 2026 · 02:17 PM",
    status: "past",
    thumbnailUrl: "/history-mall.png",
  },
  {
    id: "rec-3",
    type: "Car",
    licensePlate: "DK 9012 EF",
    location: "Campus Parking – B1",
    floorZone: "B1 – Zone A",
    nearbyLandmark: "Central Staircase",
    timestamp: "Nov 15, 2026 · 09:03 AM",
    status: "past",
    thumbnailUrl: "/history-campus.png",
  },
  {
    id: "rec-4",
    type: "Motorcycle",
    licensePlate: "DK 3456 GH",
    location: "Airport Domestic Terminal",
    floorZone: "P1 – Ground",
    nearbyLandmark: "Terminal 2 Lobby",
    timestamp: "Nov 10, 2026 · 08:45 AM",
    status: "past",
    thumbnailUrl: "/motorcycle-b2.png",
  },
  {
    id: "rec-5",
    type: "Car",
    licensePlate: "DK 7890 IJ",
    location: "Beachwalk Mall Parking",
    floorZone: "B1 – Yellow",
    nearbyLandmark: "Near Cinema Lobby",
    timestamp: "Nov 04, 2026 · 07:15 PM",
    status: "past",
    thumbnailUrl: "/history-mall.png",
  },
];
