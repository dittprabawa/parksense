export interface ParkingRecord {
  id: string;
  type: string;
  licensePlate: string;
  location: string;
  floorZone: string;
  building?: string;
  floor?: string;
  zone?: string;
  nearbyLandmark?: string;
  notes?: string;
  timestamp: string;
  createdAt?: number;
  status: "active" | "past";
  thumbnailUrl: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
}

export const mockCurrentVehicle: ParkingRecord = {
  id: "rec-1",
  type: "Motorcycle",
  licensePlate: "DK 1234 AB",
  location: "Campus Parking – Building A",
  floorZone: "B2 – Zone C",
  building: "Campus Parking – Building A",
  floor: "B2",
  zone: "Zone C",
  nearbyLandmark: "Near Elevator & South Exit",
  notes: "Parked near elevator pillar B12. Remember to validate parking ticket at lobby.",
  timestamp: "Nov 20, 2026 · 10:24 AM",
  createdAt: 1795141440000,
  status: "active",
  thumbnailUrl: "/motorcycle-b2.png",
  // Sample outdoor destination coordinates (Denpasar Campus area for testing outdoor maps)
  latitude: -8.670458,
  longitude: 115.212629,
  accuracy: 12,
};

export const mockParkingHistory: ParkingRecord[] = [
  {
    id: "rec-1",
    type: "Motorcycle",
    licensePlate: "DK 1234 AB",
    location: "Campus Parking – Building A",
    floorZone: "B2 – Zone C",
    building: "Campus Parking – Building A",
    floor: "B2",
    zone: "Zone C",
    nearbyLandmark: "Near Elevator & South Exit",
    notes: "Parked near elevator pillar B12. Remember to validate parking ticket at lobby.",
    timestamp: "Nov 20, 2026 · 10:24 AM",
    createdAt: 1795141440000,
    status: "active",
    thumbnailUrl: "/motorcycle-b2.png",
    latitude: -8.670458,
    longitude: 115.212629,
    accuracy: 12,
  },
  {
    id: "rec-2",
    type: "Car",
    licensePlate: "DK 5678 CD",
    location: "Mall Denpasar – L2, Zone B",
    floorZone: "L2 – Zone B",
    building: "Mall Denpasar",
    floor: "L2",
    zone: "Zone B",
    nearbyLandmark: "East Entrance Gate",
    notes: "Near cinema elevator and escalator.",
    timestamp: "Nov 18, 2026 · 02:17 PM",
    createdAt: 1794982620000,
    status: "past",
    thumbnailUrl: "/history-mall.png",
    latitude: -8.678120,
    longitude: 115.207800,
    accuracy: 15,
  },
  {
    id: "rec-3",
    type: "Car",
    licensePlate: "DK 9012 EF",
    location: "Campus Parking – B1",
    floorZone: "B1 – Zone A",
    building: "Campus Parking – B1",
    floor: "B1",
    zone: "Zone A",
    nearbyLandmark: "Central Staircase",
    timestamp: "Nov 15, 2026 · 09:03 AM",
    createdAt: 1794704580000,
    status: "past",
    thumbnailUrl: "/history-campus.png",
    // No GPS coordinates on this record (for testing missing coordinates behavior)
  },
  {
    id: "rec-4",
    type: "Motorcycle",
    licensePlate: "DK 3456 GH",
    location: "Airport Domestic Terminal",
    floorZone: "P1 – Ground",
    building: "Airport Domestic Terminal",
    floor: "P1",
    zone: "Ground",
    nearbyLandmark: "Terminal 2 Lobby",
    timestamp: "Nov 10, 2026 · 08:45 AM",
    createdAt: 1794271500000,
    status: "past",
    thumbnailUrl: "/motorcycle-b2.png",
    latitude: -8.748150,
    longitude: 115.167100,
  },
  {
    id: "rec-5",
    type: "Car",
    licensePlate: "DK 7890 IJ",
    location: "Beachwalk Mall Parking",
    floorZone: "B1 – Yellow",
    building: "Beachwalk Mall Parking",
    floor: "B1",
    zone: "Yellow",
    nearbyLandmark: "Near Cinema Lobby",
    timestamp: "Nov 04, 2026 · 07:15 PM",
    createdAt: 1793752500000,
    status: "past",
    thumbnailUrl: "/history-mall.png",
    // No GPS coordinates
  },
];
