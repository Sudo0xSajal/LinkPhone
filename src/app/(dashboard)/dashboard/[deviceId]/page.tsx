"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { LiveCamera } from "@/components/device/LiveCamera";
import { FileBrowser } from "@/components/device/FileBrowser";
import { RemoteMic } from "@/components/device/RemoteMic";
import { QuickControls } from "@/components/dashboard/QuickControls";
import { ActivityTimeline } from "@/components/dashboard/ActivityTimeline";
import { CallLog } from "@/components/dashboard/CallLog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Wifi, WifiOff, Battery, Info } from "lucide-react";
import { DeviceInfoModal } from "@/components/dashboard/DeviceInfoModal";

export default function DeviceDetailPage() {
  const { deviceId } = useParams() as { deviceId: string };
  const router = useRouter();
  const [showInfo,     setShowInfo]     = useState(false);
  const [liveKitToken, setLiveKitToken] = useState<string | undefined>();

  const { data: device, isLoading, error } = trpc.device.getById.useQuery(
    { deviceId }, { refetchInterval: 10_000 },
  );

  const getTokenMutation = trpc.device.getLiveKitToken.useMutation();

  useEffect(() => {
    if (!deviceId) return;
    getTokenMutation.mutate({ deviceId }, {
      onSuccess: (data) => setLiveKitToken(data.token),
      onError: (err) => console.warn("[DevicePage] LiveKit token:", err.message),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId]);

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="skeleton h-9 w-9 rounded-xl" />
          <div className="space-y-2"><div className="skeleton h-7 w-48" /><div className="skeleton h-4 w-32" /></div>
        </div>
        <div className="skeleton h-10 w-80 rounded-xl" />
        <div className="skeleton h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (error || !device) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="dark:text-slate-400 text-slate-600">{error?.message ?? "Device not found."}</p>
        <button onClick={() => router.push("/dashboard")} className="btn-ghost">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </button>
      </div>
    );
  }

  const battery = device.batteryLevel ?? 0;
  const batteryColor = battery > 50 ? "text-green-400" : battery > 20 ? "text-yellow-400" : "text-red-400";

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/dashboard")} className="btn-ghost !p-2" title="Back">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{device.name}</h1>
              <button onClick={() => setShowInfo(true)} className="btn-ghost !p-1 !rounded-lg opacity-60 hover:opacity-100" title="Device info">
                <Info className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center gap-3 text-sm dark:text-slate-400 text-slate-500 mt-0.5">
              {device.isOnline
                ? <><Wifi className="h-3.5 w-3.5 text-green-400" /><span className="text-green-400">Online</span></>
                : <><WifiOff className="h-3.5 w-3.5 text-red-400" /><span className="text-red-400">Offline</span></>}
              {device.model && <span>· {device.model}</span>}
              <span className="flex items-center gap-1">
                <Battery className={`h-3.5 w-3.5 ${batteryColor}`} />
                <span className={batteryColor}>{battery}%</span>
              </span>
            </div>
          </div>
        </div>
        <QuickControls deviceId={deviceId} isOnline={device.isOnline} />
      </div>

      <Tabs defaultValue="camera" className="w-full">
        <TabsList className="glass-card inline-flex flex-wrap gap-1 p-1">
          <TabsTrigger value="camera">Camera</TabsTrigger>
          <TabsTrigger value="mic">Microphone</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="calls">Calls</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>
        <TabsContent value="camera"   className="mt-4"><LiveCamera deviceId={deviceId} token={liveKitToken} /></TabsContent>
        <TabsContent value="mic"      className="mt-4"><RemoteMic  deviceId={deviceId} token={liveKitToken} /></TabsContent>
        <TabsContent value="files"    className="mt-4"><FileBrowser deviceId={deviceId} /></TabsContent>
        <TabsContent value="calls"    className="mt-4"><CallLog     deviceId={deviceId} /></TabsContent>
        <TabsContent value="activity" className="mt-4"><ActivityTimeline deviceId={deviceId} /></TabsContent>
      </Tabs>

      {showInfo && <DeviceInfoModal device={device as any} onClose={() => setShowInfo(false)} />}
    </div>
  );
}