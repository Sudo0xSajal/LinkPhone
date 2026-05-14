"use client";

import { useEffect, useRef, useState } from "react";
import { Room, RoomEvent, Track } from "livekit-client";
import { Video, VideoOff } from "lucide-react";

interface LiveCameraProps {
  deviceId: string;
  token?: string;
}

export function LiveCamera({ deviceId, token }: LiveCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const roomRef = useRef<Room | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Exit early if we have no valid token
    if (!token || token === "missing-livekit-credentials") return;

    const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
    if (!livekitUrl) {
      setError("NEXT_PUBLIC_LIVEKIT_URL is not set");
      return;
    }

    const room = new Room();
    roomRef.current = room;

    // --- 1. Connect to the LiveKit server ---
    room
      .connect(livekitUrl, token, { autoSubscribe: true })
      .then(() => {
        setIsConnected(true);
        setError(null);

        // --- The critical fix: Do not manually enable local camera tracks. ---
        // The phone's camera stream is a *remote* track. We just need to subscribe to it.
        // LiveKit will handle the negotiation. We'll attach the track when it's published.
      })
      .catch((err) => {
        console.error("[LiveCamera] Connection error:", err);
        setError(err.message ?? "Connection failed");
      });

    // --- 2. Handle incoming video tracks ---
    // This event fires when a new remote track (the phone's camera) is published.
    const handleTrackSubscribed = (track: any) => {
      if (track.kind === Track.Kind.Video && videoRef.current) {
        track.attach(videoRef.current);
      }
    };

    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);

    // Cleanup function to disconnect the room when the component unmounts or token changes
    return () => {
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
    };
  }, [token]); // Re-run effect if the token changes

  // --- Rendering logic (unchanged) ---
  if (!token) return <Placeholder icon={<VideoOff />} message="Fetching LiveKit token…" />;
  if (token === "missing-livekit-credentials")
    return <Placeholder icon={<VideoOff />} message="⚠️ LiveKit not configured. Add credentials to .env" />;
  if (error) return <Placeholder icon={<VideoOff />} message={`Error: ${error}`} />;
  if (!isConnected)
    return (
      <Placeholder
        icon={<div className="h-8 w-8 animate-spin rounded-full border-4 border-white/20 border-t-white" />}
        message="Connecting to camera stream…"
      />
    );

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
      <video ref={videoRef} autoPlay playsInline className="h-full w-full object-contain" />
      <div className="absolute bottom-2 left-2 rounded bg-black/50 px-2 py-1 text-xs text-white">
        Live
      </div>
    </div>
  );
}

function Placeholder({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-lg bg-muted">
      {icon}
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}