"use client";

import { useEffect, useRef, useState } from "react";
import { Room, RoomEvent, Track } from "livekit-client";
import { Mic, MicOff } from "lucide-react";

interface RemoteMicProps {
  deviceId: string;
  token?: string;
}

export function RemoteMic({ deviceId, token }: RemoteMicProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const roomRef = useRef<Room | null>(null);

  useEffect(() => {
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
        setError(null);
        // No local microphone manipulation needed. The phone's mic is a remote track.
      })
      .catch((err) => {
        console.error("[RemoteMic] Connection error:", err);
        setError(err.message);
      });

    // --- 2. Handle incoming audio tracks ---
    const handleTrackSubscribed = (track: any) => {
      if (track.kind === Track.Kind.Audio && audioRef.current) {
        track.attach(audioRef.current);
        setIsListening(true);
      }
    };

    const handleTrackUnsubscribed = (track: any) => {
      if (track.kind === Track.Kind.Audio) {
        setIsListening(false);
      }
    };

    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    room.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);

    // Cleanup function
    return () => {
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
    };
  }, [token]);

  // --- Rendering logic (unchanged) ---
  const status = () => {
    if (!token) return <span className="text-sm text-muted-foreground">Fetching token…</span>;
    if (token === "missing-livekit-credentials")
      return <span className="text-sm text-destructive">⚠️ LiveKit not configured</span>;
    if (error) return <span className="text-sm text-destructive">Error: {error}</span>;
    if (!isListening) return <span className="text-sm text-muted-foreground">Waiting for microphone stream…</span>;
    return <span className="text-sm text-green-600">Listening to phone microphone</span>;
  };

  return (
    <div className="flex items-center gap-2">
      {isListening ? <Mic className="h-4 w-4 text-green-600" /> : <MicOff className="h-4 w-4 text-muted-foreground" />}
      {status()}
      <audio ref={audioRef} autoPlay playsInline className="hidden" />
    </div>
  );
}