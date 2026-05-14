import { create } from "zustand";

/**
 * Serialized device shape returned by tRPC device.getAll / device.getById.
 * Dates are ISO strings because they are serialized on the server before
 * being sent over the wire. Using the raw Prisma `Device` type here caused
 * TypeScript errors because `lastSeen: Date` ≠ `lastSeen: string`.
 */
export interface SerializedDevice {
  id: string;
  name: string;
  model: string | null;
  osVersion: string | null;
  publicKey: string | null;
  isOnline: boolean;
  lastSeen: string;        // ISO string, not Date
  batteryLevel: number | null;
  location: unknown;
  ownerId: string;
  pairedAt: string;        // ISO string, not Date
  isActive: boolean;
  allowedFeatures: string[];
}

interface DeviceStore {
  devices: SerializedDevice[];
  setDevices: (devices: SerializedDevice[]) => void;
  updateDevice: (id: string, updates: Partial<SerializedDevice>) => void;
}

export const useDeviceStore = create<DeviceStore>((set) => ({
  devices: [],
  setDevices: (devices) => set({ devices }),
  updateDevice: (id, updates) =>
    set((state) => ({
      devices: state.devices.map((d) =>
        d.id === id ? { ...d, ...updates } : d,
      ),
    })),
}));