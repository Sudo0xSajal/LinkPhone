"use client";

import { trpc } from "@/lib/trpc/client";
import { useState } from "react";
import { Activity, Camera, Mic, Download, Zap, Volume2, Vibrate, Smartphone, RefreshCw, Filter } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

const ACTION_META: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  pair_device:         { icon: Smartphone, color: "text-green-400",  label: "Device Paired"   },
  camera_stream_start: { icon: Camera,     color: "text-blue-400",   label: "Camera Started"  },
  camera_stream_stop:  { icon: Camera,     color: "text-slate-400",  label: "Camera Stopped"  },
  mic_stream_start:    { icon: Mic,        color: "text-purple-400", label: "Mic Started"     },
  mic_stream_stop:     { icon: Mic,        color: "text-slate-400",  label: "Mic Stopped"     },
  file_download:       { icon: Download,   color: "text-yellow-400", label: "File Downloaded" },
  flashlight:          { icon: Zap,        color: "text-yellow-300", label: "Flashlight"      },
  volume_up:           { icon: Volume2,    color: "text-blue-300",   label: "Volume Up"       },
  volume_down:         { icon: Volume2,    color: "text-blue-300",   label: "Volume Down"     },
  vibrate:             { icon: Vibrate,    color: "text-orange-400", label: "Vibrate"         },
  screenshot:          { icon: Camera,     color: "text-pink-400",   label: "Screenshot"      },
};

export default function ActivityPage() {
  const [filter, setFilter] = useState("all");

  const { data, isLoading, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    trpc.activity.getAll.useInfiniteQuery(
      { limit: 30 },
      { getNextPageParam: (last) => last.nextCursor, refetchInterval: 30_000 },
    );

  const all      = data?.pages.flatMap((p) => p.activities) ?? [];
  const filtered = filter === "all" ? all : all.filter((a) => a.action === filter);
  const actions  = [...new Set(all.map((a) => a.action))];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="h-7 w-7 text-blue-400" /> Activity Log
          </h1>
          <p className="mt-1 text-sm dark:text-slate-400 text-slate-500">All actions across every paired device.</p>
        </div>
        <button onClick={() => refetch()} className="btn-ghost self-start">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {actions.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 dark:text-slate-500 text-slate-400 flex-shrink-0" />
          {["all", ...actions].map((action) => {
            const meta = ACTION_META[action];
            return (
              <button key={action} onClick={() => setFilter(action)}
                className={`badge cursor-pointer capitalize transition ${
                  filter === action ? "badge-blue" : "dark:bg-white/10 bg-slate-100 dark:text-slate-400 text-slate-600"
                }`}>
                {action === "all" ? "All" : (meta?.label ?? action.replace(/_/g, " "))}
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <div className="glass-card p-6 text-center">
          <p className="text-red-400 mb-3">{error.message}</p>
          <button onClick={() => refetch()} className="btn-ghost"><RefreshCw className="h-4 w-4" /> Retry</button>
        </div>
      )}

      <div className="glass-card overflow-hidden">
        <div className="grid grid-cols-[auto_1fr_auto_auto] gap-4 px-4 py-3 border-b dark:border-white/10 border-slate-200
          text-xs font-medium dark:text-slate-400 text-slate-500 uppercase tracking-wide">
          <span>Action</span><span>Device</span>
          <span className="hidden sm:block">Status</span><span>Time</span>
        </div>

        {isLoading && [...Array(8)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border-b dark:border-white/5 border-slate-100">
            <div className="skeleton h-8 w-8 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2"><div className="skeleton h-4 w-1/3" /><div className="skeleton h-3 w-1/2" /></div>
            <div className="skeleton h-3 w-20" />
          </div>
        ))}

        {!isLoading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Activity className="h-12 w-12 dark:text-slate-700 text-slate-300" />
            <p className="dark:text-slate-400 text-slate-500">
              {filter === "all" ? "No activity yet." : `No "${filter.replace(/_/g, " ")}" events.`}
            </p>
          </div>
        )}

        {filtered.map((activity, idx) => {
          const meta = ACTION_META[activity.action] ?? { icon: Activity, color: "text-slate-400", label: activity.action.replace(/_/g, " ") };
          const Icon = meta.icon;
          return (
            <div key={activity.id}
              className={`grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 px-4 py-3 transition dark:hover:bg-white/3 hover:bg-slate-50
                ${idx < filtered.length - 1 ? "border-b dark:border-white/5 border-slate-100" : ""}`}>
              <div className={`flex h-8 w-8 items-center justify-center rounded-full dark:bg-white/5 bg-slate-100 flex-shrink-0 ${meta.color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium capitalize">{meta.label}</p>
                <p className="text-xs dark:text-slate-400 text-slate-500 truncate">{activity.deviceName}</p>
              </div>
              <div className="hidden sm:block">
                <span className={`badge ${
                  activity.status === "completed" || activity.status === "delivered" ? "badge-green" :
                  activity.status === "queued" ? "badge-yellow" :
                  "dark:bg-white/10 bg-slate-100 dark:text-slate-400 text-slate-500"
                }`}>{activity.status}</span>
              </div>
              <p className="text-xs dark:text-slate-400 text-slate-500 whitespace-nowrap text-right"
                title={format(new Date(activity.createdAt), "PPpp")}>
                {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
              </p>
            </div>
          );
        })}

        {hasNextPage && (
          <div className="flex justify-center p-4 border-t dark:border-white/10 border-slate-200">
            <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage} className="btn-ghost text-sm">
              {isFetchingNextPage ? "Loading…" : "Load more"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}