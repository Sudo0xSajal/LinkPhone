import { create } from "zustand";

export type NotifType = "online" | "offline" | "command" | "pair" | "error" | "info";

export interface AppNotification {
  id: string;
  type: NotifType;
  title: string;
  message: string;
  deviceId?: string;
  deviceName?: string;
  timestamp: number;
  read: boolean;
}

interface NotificationStore {
  notifications: AppNotification[];
  unreadCount: number;
  add: (n: Omit<AppNotification, "id" | "timestamp" | "read">) => void;
  markAllRead: () => void;
  markRead: (id: string) => void;
  clear: () => void;
  seedFromActivities: (
    items: Array<{
      id: string;
      action: string;
      status: string;
      createdAt: string;
      deviceId: string;
      deviceName?: string;
    }>,
    lastSeenTs: number,
  ) => void;
}

const ACTION_LABEL: Record<string, { title: string; type: NotifType }> = {
  pair_device:         { title: "Device Paired",   type: "pair"    },
  flashlight:          { title: "Flashlight",       type: "command" },
  vibrate:             { title: "Vibrate",           type: "command" },
  screenshot:          { title: "Screenshot",        type: "command" },
  volume_up:           { title: "Volume Up",         type: "command" },
  volume_down:         { title: "Volume Down",       type: "command" },
  camera_stream_start: { title: "Camera Stream",     type: "info"    },
  mic_stream_start:    { title: "Mic Stream",        type: "info"    },
};

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,

  add: (n) => {
    const notif: AppNotification = {
      ...n,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      read: false,
    };
    set((s) => ({
      notifications: [notif, ...s.notifications].slice(0, 50),
      unreadCount: s.unreadCount + 1,
    }));
  },

  markRead: (id) =>
    set((s) => {
      const updated = s.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n,
      );
      return { notifications: updated, unreadCount: updated.filter((n) => !n.read).length };
    }),

  markAllRead: () =>
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),

  clear: () => set({ notifications: [], unreadCount: 0 }),

  seedFromActivities: (items, lastSeenTs) => {
    const existing = new Set(get().notifications.map((n) => n.id));
    const fresh: AppNotification[] = [];

    for (const item of items) {
      if (existing.has(item.id)) continue;
      const meta = ACTION_LABEL[item.action];
      if (!meta) continue;
      const ts = new Date(item.createdAt).getTime();
      fresh.push({
        id: item.id,
        type: meta.type,
        title: meta.title,
        message: `${item.deviceName ?? "Device"} · ${item.status}`,
        deviceId: item.deviceId,
        deviceName: item.deviceName,
        timestamp: ts,
        read: ts <= lastSeenTs,
      });
    }

    if (!fresh.length) return;
    set((s) => {
      const merged = [...fresh, ...s.notifications]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 50);
      return { notifications: merged, unreadCount: merged.filter((n) => !n.read).length };
    });
  },
}));