"use client";

import { useEffect, useRef, useState } from "react";
import { Room, RoomEvent, Track } from "livekit-client";
import { Video, VideoOff } from "lucide-react";

interface LiveCameraProps {
  deviceId: string;
  token?: string; // FIX: plain string, not { token: string }
}

export function LiveCamera({ deviceId, token }: LiveCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const roomRef = useRef<Room | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    if (token === "missing-livekit-credentials") return;

    const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
    if (!livekitUrl) {
      setError("NEXT_PUBLIC_LIVEKIT_URL is not set");
      return;
    }

    const room = new Room();
    roomRef.current = room;

    room
      .connect(livekitUrl, token, { autoSubscribe: true })
      .then(() => {
        setIsConnected(true);
        setError(null);
        room.localParticipant.setCameraEnabled(false).catch(() => {});

        room.remoteParticipants.forEach((participant) => {
          participant.trackPublications.forEach((pub) => {
            if (pub.kind === Track.Kind.Video && pub.track && videoRef.current) {
              pub.track.attach(videoRef.current);
            }
          });
        });

        room.on(RoomEvent.TrackSubscribed, (track) => {
          if (track.kind === Track.Kind.Video && videoRef.current) {
            track.attach(videoRef.current);
          }
        });
      })
      .catch((err) => {
        console.error("[LiveCamera] Connection error:", err);
        setError(err.message ?? "Connection failed");
      });

    return () => {
      room.disconnect();
      roomRef.current = null;
    };
  }, [token]);

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
    <div className="relative aspect-video overflow-hidden rounded-2xl bg-black">
      <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-contain" />
      <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-xs">
        <Video className="h-3 w-3 text-green-400" />
        <span className="text-green-400">Live</span>
      </div>
    </div>
  );
}

function Placeholder({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div className="flex aspect-video flex-col items-center justify-center gap-3 rounded-2xl bg-black/50 text-gray-400">
      {icon}
      <p className="max-w-xs text-center text-sm">{message}</p>
    </div>
  );
}