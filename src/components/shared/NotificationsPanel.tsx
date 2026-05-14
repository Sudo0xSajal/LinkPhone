"use client";

import { useEffect, useRef } from "react";
import { X, Bell, Wifi, WifiOff, Zap, Smartphone, Info } from "lucide-react";
import { useNotificationStore, NotifType } from "../../store/notificationStore";
import { formatDistanceToNow } from "date-fns";
import { trpc } from "@/lib/trpc/client";

const ICON_MAP: Record<NotifType, { icon: React.ElementType; color: string }> = {
  online:  { icon: Wifi,       color: "text-green-400"  },
  offline: { icon: WifiOff,    color: "text-red-400"    },
  command: { icon: Zap,        color: "text-yellow-400" },
  pair:    { icon: Smartphone, color: "text-purple-400" },
  error:   { icon: X,          color: "text-red-400"    },
  info:    { icon: Info,       color: "text-blue-400"   },
};

export function NotificationsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { notifications, unreadCount, markAllRead, clear, seedFromActivities } =
    useNotificationStore();
  const panelRef   = useRef<HTMLDivElement>(null);
  const lastSeenTs = useRef<number>(
    typeof window !== "undefined"
      ? parseInt(localStorage.getItem("lp-notif-last-seen") ?? "0", 10)
      : 0,
  );

  const { data: activityData } = trpc.activity.getAll.useQuery(
    { limit: 30 },
    { refetchInterval: open ? 15_000 : false },
  );

  useEffect(() => {
    if (activityData?.activities) {
      seedFromActivities(activityData.activities, lastSeenTs.current);
    }
  }, [activityData, seedFromActivities]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  useEffect(() => {
    if (open && unreadCount > 0) {
      const now = Date.now();
      localStorage.setItem("lp-notif-last-seen", String(now));
      lastSeenTs.current = now;
      setTimeout(markAllRead, 600);
    }
  }, [open, unreadCount, markAllRead]);

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm animate-fade-in" />}

      <div
        ref={panelRef}
        className={`fixed right-0 top-0 z-50 h-full w-80 flex flex-col shadow-2xl
          transition-transform duration-300
          dark:bg-slate-900 bg-white border-l dark:border-white/10 border-slate-200
          ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b dark:border-white/10 border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-blue-600 px-1.5 text-xs font-bold text-white">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {notifications.length > 0 && (
              <button onClick={clear} className="text-xs dark:text-slate-400 text-slate-500 hover:text-red-400">
                Clear all
              </button>
            )}
            <button onClick={onClose} className="btn-ghost p-1.5 !rounded-lg">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y dark:divide-white/5 divide-slate-100">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-8">
              <Bell className="h-10 w-10 dark:text-slate-700 text-slate-300" />
              <p className="text-sm dark:text-slate-500 text-slate-400">
                No notifications yet. They'll appear as device activity occurs.
              </p>
            </div>
          ) : (
            notifications.map((n: (typeof notifications)[number]) => {
              const { icon: Icon, color } = ICON_MAP[n.type];
              return (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 px-4 py-3 transition
                    ${!n.read ? "dark:bg-blue-950/30 bg-blue-50/60" : ""}`}
                >
                  <div className={`mt-0.5 flex-shrink-0 ${color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-xs dark:text-slate-400 text-slate-500 mt-0.5 truncate">{n.message}</p>
                    <p className="text-xs dark:text-slate-600 text-slate-400 mt-1">
                      {formatDistanceToNow(n.timestamp, { addSuffix: true })}
                    </p>
                  </div>
                  {!n.read && <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />}
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}