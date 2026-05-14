"use client";

import { trpc } from "@/lib/trpc/client";
import { formatDistanceToNow } from "date-fns";
import { Camera, Mic, Download, Zap, Volume2, Vibrate, Smartphone, RefreshCw, Activity } from "lucide-react";

const ACTION_META: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  pair_device:         { icon: Smartphone, color: "text-green-400",  label: "Device Paired"   },
  camera_stream_start: { icon: Camera,     color: "text-blue-400",   label: "Camera Started"  },
  camera_stream_stop:  { icon: Camera,     color: "text-slate-400",  label: "Camera Stopped"  },
  mic_stream_start:    { icon: Mic,        color: "text-purple-400", label: "Mic Started"     },
  mic_stream_stop:     { icon: Mic,        color: "text-slate-400",  label: "Mic Stopped"     },
  file_list:           { icon: Download,   color: "text-yellow-400", label: "Files Listed"    },
  file_download:       { icon: Download,   color: "text-yellow-400", label: "File Downloaded" },
  flashlight:          { icon: Zap,        color: "text-yellow-300", label: "Flashlight"      },
  volume_up:           { icon: Volume2,    color: "text-blue-300",   label: "Volume Up"       },
  volume_down:         { icon: Volume2,    color: "text-blue-300",   label: "Volume Down"     },
  vibrate:             { icon: Vibrate,    color: "text-orange-400", label: "Vibrate"         },
  screenshot:          { icon: Camera,     color: "text-pink-400",   label: "Screenshot"      },
};

export function ActivityTimeline({ deviceId }: { deviceId: string }) {
  const { data: activities, isLoading, error, refetch } =
    trpc.activity.getForDevice.useQuery({ deviceId, limit: 30 }, { refetchInterval: 20_000 });

  if (isLoading) {
    return (
      <div className="glass-card overflow-hidden divide-y dark:divide-white/5 divide-slate-100">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-4">
            <div className="skeleton h-8 w-8 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-4 w-1/2" />
              <div className="skeleton h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-8 text-center space-y-3">
        <p className="text-red-400">{error.message}</p>
        <button onClick={() => refetch()} className="btn-ghost"><RefreshCw className="h-4 w-4" /> Retry</button>
      </div>
    );
  }

  const list = activities ?? [];

  if (list.length === 0) {
    return (
      <div className="glass-card flex flex-col items-center justify-center py-16 gap-3">
        <Activity className="h-12 w-12 dark:text-slate-700 text-slate-300" />
        <p className="dark:text-slate-400 text-slate-500">No activity recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Recent Activity</h3>
        <button onClick={() => refetch()} className="btn-ghost !py-1 !px-2 text-xs">
          <RefreshCw className="h-3 w-3" />
        </button>
      </div>

      <div className="glass-card divide-y dark:divide-white/5 divide-slate-100 overflow-hidden">
        {list.map((activity) => {
          const meta = ACTION_META[activity.action] ?? {
            icon: Activity, color: "text-slate-400",
            label: activity.action.replace(/_/g, " "),
          };
          const Icon = meta.icon;
          return (
            <div key={activity.id}
              className="flex items-start gap-3 p-4 dark:hover:bg-white/3 hover:bg-slate-50 transition">
              <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full dark:bg-white/5 bg-slate-100 ${meta.color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium capitalize">{meta.label}</span>
                  <span className="flex-shrink-0 text-xs dark:text-slate-500 text-slate-400">
                    {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <span className={`inline-block mt-1 badge ${
                  activity.status === "completed" || activity.status === "delivered" ? "badge-green" :
                  activity.status === "queued" ? "badge-yellow" :
                  "dark:bg-white/10 bg-slate-100 dark:text-slate-400 text-slate-500"
                }`}>{activity.status}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}