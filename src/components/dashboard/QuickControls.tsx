"use client";

import { trpc } from "@/lib/trpc/client";
import { Zap, Volume2, VolumeX, Vibrate, Camera } from "lucide-react";
import { toast } from "sonner";

const COMMANDS = [
  { icon: Zap,     command: "flashlight"  as const, label: "Flashlight"  },
  { icon: Volume2, command: "volume_up"   as const, label: "Vol +"       },
  { icon: VolumeX, command: "volume_down" as const, label: "Vol −"       },
  { icon: Vibrate, command: "vibrate"     as const, label: "Vibrate"     },
  { icon: Camera,  command: "screenshot"  as const, label: "Screenshot"  },
] as const;

export function QuickControls({ deviceId, isOnline }: { deviceId: string; isOnline: boolean }) {
  const sendCommand = trpc.device.sendCommand.useMutation({
    onSuccess: (data) =>
      data.delivered
        ? toast.success("Command delivered to device")
        : toast.warning("Device offline — command queued"),
    onError: (err) => toast.error(`Command failed: ${err.message}`),
  });

  const disabled = !isOnline || sendCommand.isPending;

  return (
    <div className="flex flex-wrap gap-2">
      {!isOnline && (
        <p className="w-full text-xs dark:text-slate-500 text-slate-400 mb-1">
          Commands disabled — device is offline.
        </p>
      )}
      {COMMANDS.map(({ icon: Icon, command, label }) => (
        <button
          key={command}
          onClick={() => sendCommand.mutate({ deviceId, command })}
          disabled={disabled}
          title={!isOnline ? "Device is offline" : label}
          className="btn-ghost !py-1.5 !px-3 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Icon className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}