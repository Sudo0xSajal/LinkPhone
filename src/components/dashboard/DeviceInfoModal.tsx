"use client";

import { X, Smartphone, Battery, Wifi, WifiOff, MapPin, Clock, Shield, ExternalLink, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

interface Device {
  id: string; name: string; model: string | null; osVersion: string | null;
  isOnline: boolean; lastSeen: string; batteryLevel: number | null;
  allowedFeatures: string[];
  location?: { lat: number; lng: number; accuracy?: number; updatedAt?: string } | null;
}

export function DeviceInfoModal({ device, onClose }: { device: Device; onClose: () => void }) {
  const requestLocation = trpc.device.requestLocation.useMutation({
    onSuccess: () => toast.success("Location request sent to device"),
    onError:   (e) => toast.error("Failed to request location: " + e.message),
  });

  const battery = device.batteryLevel ?? 0;
  const batteryColor = battery > 50 ? "text-green-400" : battery > 20 ? "text-yellow-400" : "text-red-400";
  const loc = device.location as { lat: number; lng: number; accuracy?: number; updatedAt?: string } | null | undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4"
      onClick={onClose}
    >
      <div className="glass-card w-full max-w-md overflow-hidden animate-fade-in" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b dark:border-white/10 border-slate-200 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/20">
              <Smartphone className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h2 className="font-semibold">{device.name}</h2>
              <p className="text-xs dark:text-slate-400 text-slate-500">{device.model ?? "Android Device"}</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5 !rounded-lg"><X className="h-4 w-4" /></button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <InfoTile
              icon={device.isOnline ? <Wifi className="h-4 w-4 text-green-400" /> : <WifiOff className="h-4 w-4 text-red-400" />}
              label="Status" value={device.isOnline ? "Online" : "Offline"}
              valueClass={device.isOnline ? "text-green-400" : "text-red-400"}
            />
            <InfoTile
              icon={<Battery className={`h-4 w-4 ${batteryColor}`} />}
              label="Battery" value={`${battery}%`} valueClass={batteryColor}
            />
            <InfoTile
              icon={<Smartphone className="h-4 w-4 text-blue-400" />}
              label="OS Version" value={device.osVersion ?? "Unknown"}
            />
            <InfoTile
              icon={<Clock className="h-4 w-4 dark:text-slate-400 text-slate-500" />}
              label="Last Seen"
              value={formatDistanceToNow(new Date(device.lastSeen), { addSuffix: true })}
            />
          </div>

          <div>
            <p className="text-xs font-medium dark:text-slate-400 text-slate-500 mb-2 flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5" /> Allowed Features
            </p>
            <div className="flex flex-wrap gap-1.5">
              {device.allowedFeatures.map((f) => (
                <span key={f} className="badge badge-blue capitalize">{f}</span>
              ))}
            </div>
          </div>

          {/* Location */}
          <div className="rounded-xl dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-red-400" /> Location
              </p>
              <button
                onClick={() => requestLocation.mutate({ deviceId: device.id })}
                disabled={requestLocation.isPending || !device.isOnline}
                title={device.isOnline ? "Request fresh location" : "Device is offline"}
                className="btn-ghost !py-1 !px-2 text-xs disabled:opacity-40"
              >
                {requestLocation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Refresh"}
              </button>
            </div>

            {loc ? (
              <div className="space-y-2">
                <p className="text-sm font-mono dark:text-slate-300 text-slate-700">
                  {loc.lat.toFixed(6)}, {loc.lng.toFixed(6)}
                </p>
                {loc.accuracy && (
                  <p className="text-xs dark:text-slate-500 text-slate-400">Accuracy ±{Math.round(loc.accuracy)}m</p>
                )}
                {loc.updatedAt && (
                  <p className="text-xs dark:text-slate-500 text-slate-400">
                    Updated {formatDistanceToNow(new Date(loc.updatedAt), { addSuffix: true })}
                  </p>
                )}
                <a
                  href={`https://www.google.com/maps?q=${loc.lat},${loc.lng}`}
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:underline mt-1" 
                  >
                  <ExternalLink className="h-3 w-3" /> Open in Google Maps
                </a>
              </div>
            ) : (
              <p className="text-sm dark:text-slate-500 text-slate-400">
                {device.isOnline
                  ? `Click "Refresh" to request the current location.`
                  : "Device is offline. Location unavailable."}
              </p>
            )}
          </div>
        </div>

        <div className="border-t dark:border-white/10 border-slate-200 px-5 py-3">
          <p className="text-xs dark:text-slate-500 text-slate-400">
            Device ID: <span className="font-mono">{device.id}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function InfoTile({ icon, label, value, valueClass = "" }: {
  icon: React.ReactNode; label: string; value: string; valueClass?: string;
}) {
  return (
    <div className="rounded-xl dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200 p-3">
      <div className="flex items-center gap-1.5 mb-1.5">{icon}
        <span className="text-xs dark:text-slate-400 text-slate-500">{label}</span>
      </div>
      <p className={`text-sm font-semibold ${valueClass}`}>{value}</p>
    </div>
  );
}