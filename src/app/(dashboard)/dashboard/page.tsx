"use client";

import { trpc } from "@/lib/trpc/client";
import { DeviceCard } from "@/components/dashboard/DeviceCard";
import { Plus, RefreshCw, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

function DeviceSkeleton() {
  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex justify-between">
        <div className="skeleton h-11 w-11 rounded-xl" />
        <div className="skeleton h-6 w-6 rounded-lg" />
      </div>
      <div className="space-y-2 mt-4">
        <div className="skeleton h-5 w-3/4" />
        <div className="skeleton h-4 w-1/2" />
      </div>
      <div className="skeleton h-4 w-full" />
      <div className="flex gap-1">
        <div className="skeleton h-5 w-14 rounded-full" />
        <div className="skeleton h-5 w-14 rounded-full" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: devices, refetch, error, isLoading } =
    trpc.device.getAll.useQuery(undefined, { refetchInterval: 10_000 });

  const [showPairing,  setShowPairing]  = useState(false);
  const [deviceName,   setDeviceName]   = useState("");
  const [pairingCode,  setPairingCode]  = useState("");
  const [qrPayload,    setQrPayload]    = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!showPairing) return;
    const id = setInterval(() => refetch(), 3_000);
    return () => clearInterval(id);
  }, [showPairing, refetch]);

  const generateCode = async () => {
    setIsGenerating(true); setPairingCode(""); setQrPayload("");
    try {
      const res  = await fetch("/api/generate-pairing-code", { method: "POST" });
      const data = await res.json();
      if (res.ok) { setPairingCode(data.code); setQrPayload(data.qrPayload); }
      else toast.error("Could not generate pairing code: " + (data.error ?? res.status));
    } catch { toast.error("Network error while generating pairing code"); }
    finally  { setIsGenerating(false); }
  };

  const pairMutation = trpc.device.pair.useMutation({
    onSuccess: () => { toast.success("Device paired! 🎉"); refetch(); closePairing(); },
    onError:   (err) => toast.error(err.message || "Pairing failed"),
  });

  const closePairing = () => { setShowPairing(false); setDeviceName(""); setPairingCode(""); setQrPayload(""); };
  const openPairing  = () => { setShowPairing(true);  generateCode(); };
  const deviceList   = Array.isArray(devices) ? devices : [];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">My Devices</h1>
          <p className="mt-1 text-sm dark:text-slate-400 text-slate-500">
            {isLoading ? "Loading…" : `${deviceList.length} device${deviceList.length !== 1 ? "s" : ""} paired`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} className="btn-ghost !p-2.5" title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button onClick={openPairing} className="btn-primary">
            <Plus className="h-4 w-4" /> Add Device
          </button>
        </div>
      </div>

      {error && (
        <div className="glass-card p-8 text-center">
          <p className="text-red-400 mb-3">{error.message}</p>
          <button onClick={() => refetch()} className="btn-ghost"><RefreshCw className="h-4 w-4" /> Retry</button>
        </div>
      )}

      {isLoading && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <DeviceSkeleton key={i} />)}
        </div>
      )}

      {!isLoading && !error && deviceList.length === 0 && (
        <div className="glass-card flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl dark:bg-white/5 bg-slate-100 mb-5">
            <Smartphone className="h-10 w-10 dark:text-slate-600 text-slate-400" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No devices yet</h3>
          <p className="dark:text-slate-400 text-slate-500 max-w-xs mb-6">
            Pair your Android phone to monitor and control it remotely.
          </p>
          <button onClick={openPairing} className="btn-primary"><Plus className="h-4 w-4" /> Pair First Device</button>
        </div>
      )}

      {!isLoading && !error && deviceList.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {deviceList.map((device) => (
            <DeviceCard key={device.id} device={device} onRemoved={() => refetch()} />
          ))}
        </div>
      )}

      {showPairing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="glass-card w-full max-w-md overflow-hidden animate-fade-in">
            <div className="px-6 pt-6 pb-4 border-b dark:border-white/10 border-slate-200">
              <h2 className="text-xl font-bold">Pair a New Device</h2>
              <p className="mt-1 text-sm dark:text-slate-400 text-slate-500">
                Open <strong>LinkPhone</strong> on Android and scan the QR code.
              </p>
            </div>
            <div className="p-6">
              <div className="flex justify-center mb-4">
                {isGenerating ? (
                  <div className="flex h-48 w-48 items-center justify-center rounded-xl dark:bg-white/10 bg-slate-100">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 dark:border-white/20 border-slate-300 border-t-blue-500" />
                  </div>
                ) : qrPayload ? (
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrPayload)}`}
                    alt="Pairing QR" className="h-48 w-48 rounded-xl" />
                ) : (
                  <div className="h-48 w-48 animate-pulse rounded-xl dark:bg-white/10 bg-slate-100" />
                )}
              </div>
              <p className="text-center text-xs dark:text-slate-500 text-slate-400 mb-5">
                Expires in 15 minutes ·{" "}
                <button onClick={generateCode} className="text-blue-400 hover:underline">Regenerate</button>
              </p>
              <div className="border-t dark:border-white/10 border-slate-200 pt-4 space-y-3">
                <input className="input" placeholder="Device name (e.g. Pixel 7)"
                  value={deviceName} onChange={(e) => setDeviceName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && pairingCode && deviceName) pairMutation.mutate({ pairingCode, deviceName }); }} />
                <div className="flex gap-3">
                  <button onClick={() => pairMutation.mutate({ pairingCode, deviceName })}
                    disabled={!pairingCode || !deviceName || pairMutation.isPending}
                    className="btn-primary flex-1">
                    {pairMutation.isPending ? "Pairing…" : "Confirm Pair"}
                  </button>
                  <button onClick={closePairing} className="btn-ghost flex-1">Cancel</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}