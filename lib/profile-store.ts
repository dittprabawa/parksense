export interface UserProfileData {
  displayName: string;
  phone: string;
  note: string;
}

export interface SavedVehicle {
  id: string;
  type: "car" | "motorcycle";
  name: string;
  plate: string;
  color: string;
  isDefault: boolean;
}

export interface AppSettingsData {
  distanceUnit: "meters" | "feet";
  parkingReminder: boolean;
  reminderMinutes: number;
  autoOcrScan: boolean;
}

export const DEFAULT_PROFILE: UserProfileData = {
  displayName: "",
  phone: "",
  note: "",
};

export const DEFAULT_SETTINGS: AppSettingsData = {
  distanceUnit: "meters",
  parkingReminder: true,
  reminderMinutes: 60,
  autoOcrScan: true,
};

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function loadProfile(userId: string): UserProfileData {
  return {
    ...DEFAULT_PROFILE,
    ...readJson<Partial<UserProfileData>>(`parksense:profile:${userId}`, {}),
  };
}

export function saveProfile(userId: string, data: UserProfileData): void {
  writeJson(`parksense:profile:${userId}`, data);
}

export function loadVehicles(userId: string): SavedVehicle[] {
  return readJson<SavedVehicle[]>(`parksense:vehicles:${userId}`, []);
}

export function saveVehicles(userId: string, vehicles: SavedVehicle[]): void {
  writeJson(`parksense:vehicles:${userId}`, vehicles);
}

export function loadSettings(userId: string): AppSettingsData {
  return {
    ...DEFAULT_SETTINGS,
    ...readJson<Partial<AppSettingsData>>(`parksense:settings:${userId}`, {}),
  };
}

export function saveSettings(userId: string, data: AppSettingsData): void {
  writeJson(`parksense:settings:${userId}`, data);
}