"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { Smartphone, Battery, Wifi, WifiOff, MoreVertical, Info, MapPin, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { DeviceInfoModal } from "./DeviceInfoModal";

interface SerializedDevice {
  id: string; name: string; model: string | null; osVersion: string | null;
  isOnline: boolean; lastSeen: string; batteryLevel: number | null;
  pairedAt: string; allowedFeatures: string[]; location?: unknown;
}

export function DeviceCard({ device, onRemoved }: { device: SerializedDevice; onRemoved?: () => void }) {
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [showInfo,    setShowInfo]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const battery = device.batteryLevel ?? 0;
  const batteryColor = battery > 50 ? "text-green-400" : battery > 20 ? "text-yellow-400" : "text-red-400";

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const removeMutation = trpc.device.remove.useMutation({
    onSuccess: () => { toast.success(`"${device.name}" removed`); setShowConfirm(false); onRemoved?.(); },
    onError:   (e) => { toast.error("Failed to remove: " + e.message); setShowConfirm(false); },
  });

  return (
    <>
      <div className="glass-card group relative flex flex-col p-5 transition-all hover:shadow-xl">
        <div className="flex items-start justify-between">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600/15">
            <Smartphone className="h-6 w-6 text-blue-400" />
          </div>

          <div ref={menuRef} className="relative">
            <button
              onClick={(e) => { e.preventDefault(); setMenuOpen((v) => !v); }}
              className="btn-ghost p-1.5 !rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-8 z-10 w-44 overflow-hidden rounded-xl border shadow-xl
                dark:bg-slate-800 dark:border-white/10 bg-white border-slate-200 animate-fade-in">
                <MenuItem icon={<Info className="h-4 w-4 text-blue-400" />}   label="Device Info"
                  onClick={() => { setShowInfo(true); setMenuOpen(false); }} />
                <MenuItem icon={<MapPin className="h-4 w-4 text-red-400" />}  label="View Location"
                  onClick={() => { setShowInfo(true); setMenuOpen(false); }} />
                <div className="border-t dark:border-white/10 border-slate-100 my-1" />
                <MenuItem icon={<Trash2 className="h-4 w-4 text-red-400" />}  label="Remove Device"
                  className="!text-red-400 hover:!bg-red-500/10"
                  onClick={() => { setShowConfirm(true); setMenuOpen(false); }} />
              </div>
            )}
          </div>
        </div>

        <Link href={`/dashboard/${device.id}`} className="flex-1 mt-4 block">
          <h3 className="text-lg font-semibold leading-tight">{device.name}</h3>
          <p className="text-sm dark:text-slate-400 text-slate-500 mt-0.5">
            {device.model ?? "Android"}{device.osVersion ? ` · ${device.osVersion}` : ""}
          </p>

          <div className="mt-4 flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full flex-shrink-0 ${device.isOnline ? "bg-green-500" : "bg-red-400"}`} />
            <span className={`text-sm font-medium ${device.isOnline ? "text-green-400" : "text-red-400"}`}>
              {device.isOnline ? "Online" : "Offline"}
            </span>
            <span className="ml-auto flex items-center gap-1 text-sm">
              <Battery className={`h-4 w-4 ${batteryColor}`} />
              <span className={batteryColor}>{battery}%</span>
            </span>
          </div>

          {device.allowedFeatures.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {device.allowedFeatures.slice(0, 3).map((f) => (
                <span key={f} className="badge badge-blue capitalize">{f}</span>
              ))}
              {device.allowedFeatures.length > 3 && (
                <span className="badge dark:bg-white/10 bg-slate-100 dark:text-slate-400 text-slate-500">
                  +{device.allowedFeatures.length - 3}
                </span>
              )}
            </div>
          )}
        </Link>
      </div>

      {showInfo && <DeviceInfoModal device={device as any} onClose={() => setShowInfo(false)} />}

      <ConfirmDialog
        open={showConfirm} title="Remove Device" danger
        description={`Are you sure you want to unpair "${device.name}"? This cannot be undone.`}
        confirmLabel="Yes, Remove" loading={removeMutation.isPending}
        onConfirm={() => removeMutation.mutate({ deviceId: device.id })}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  );
}

function MenuItem({ icon, label, onClick, className = "" }: {
  icon: React.ReactNode; label: string; onClick: () => void; className?: string;
}) {
  return (
    <button onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-3 py-2 text-sm transition
        dark:hover:bg-white/10 hover:bg-slate-50 dark:text-slate-300 text-slate-700 ${className}`}>
      {icon}{label}
    </button>
  );
}

function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  loading,
  danger,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  loading?: boolean;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl border bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-slate-900">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{description}</p>
        <div className="mt-5 flex justify-end gap-3">
          <button className="btn-ghost" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${danger ? "bg-red-500 hover:bg-red-600" : "bg-blue-600 hover:bg-blue-700"} disabled:opacity-60`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}