"use client";

import { trpc } from "@/lib/trpc/client";
import { PhoneIncoming, PhoneOutgoing, PhoneMissed, Phone } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

function formatDuration(seconds: number) {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60), s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function CallLog({ deviceId }: { deviceId: string }) {
  const { data, isLoading, error } = trpc.calls.getRecent.useQuery(
    { deviceId }, { refetchInterval: 30_000 },
  );

  if (isLoading) {
    return (
      <div className="glass-card overflow-hidden divide-y dark:divide-white/5 divide-slate-100">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 p-4">
            <div className="skeleton h-8 w-8 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-4 w-1/3" />
              <div className="skeleton h-3 w-1/4" />
            </div>
            <div className="skeleton h-3 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="glass-card p-8 text-center"><p className="text-red-400">{error.message}</p></div>;
  }

  const calls = data?.calls ?? [];

  if (calls.length === 0) {
    return (
      <div className="glass-card flex flex-col items-center justify-center py-16 gap-3">
        <Phone className="h-12 w-12 dark:text-slate-700 text-slate-300" />
        <p className="dark:text-slate-400 text-slate-500">No recent calls on this device.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="font-semibold">Recent Calls</h3>
      <div className="glass-card overflow-hidden divide-y dark:divide-white/5 divide-slate-100">
        {calls.map((call) => {
          const Icon  = call.type === "incoming" ? PhoneIncoming : call.type === "outgoing" ? PhoneOutgoing : PhoneMissed;
          const color = call.type === "incoming" ? "text-green-400" : call.type === "outgoing" ? "text-blue-400" : "text-red-400";
          return (
            <div key={call.id} className="flex items-center gap-4 p-4 dark:hover:bg-white/3 hover:bg-slate-50 transition">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full dark:bg-white/5 bg-slate-100 flex-shrink-0 ${color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-mono text-sm">{call.number}</p>
                <p className="text-xs dark:text-slate-400 text-slate-500 capitalize mt-0.5">{call.type}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">{formatDuration(call.duration)}</p>
                <p className="text-xs dark:text-slate-500 text-slate-400 mt-0.5">
                  {formatDistanceToNow(new Date(call.time), { addSuffix: true })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}