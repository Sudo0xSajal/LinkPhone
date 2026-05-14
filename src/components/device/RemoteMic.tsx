"use client";

import { useEffect, useRef, useState } from "react";
import { Room, RoomEvent, Track } from "livekit-client";
import { Mic, MicOff } from "lucide-react";

interface RemoteMicProps {
  deviceId: string;
  token?: string; // FIX: plain string
}

export function RemoteMic({ deviceId, token }: RemoteMicProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    if (token === "missing-livekit-credentials") return;

    const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
    if (!livekitUrl) { setError("NEXT_PUBLIC_LIVEKIT_URL is not set"); return; }

    const room = new Room();

    room
      .connect(livekitUrl, token, { autoSubscribe: true })
      .then(() => {
        room.localParticipant.setMicrophoneEnabled(false).catch(() => {});

        room.remoteParticipants.forEach((participant) => {
          participant.trackPublications.forEach((pub) => {
            if (pub.kind === Track.Kind.Audio && pub.track && audioRef.current) {
              pub.track.attach(audioRef.current);
              setIsListening(true);
            }
          });
        });

        room.on(RoomEvent.TrackSubscribed, (track) => {
          if (track.kind === Track.Kind.Audio && audioRef.current) {
            track.attach(audioRef.current);
            setIsListening(true);
          }
        });

        room.on(RoomEvent.TrackUnsubscribed, (track) => {
          if (track.kind === Track.Kind.Audio) setIsListening(false);
        });
      })
      .catch((err) => { console.error("[RemoteMic]", err); setError(err.message); });

    return () => {
      void room.disconnect();
    };
  }, [token]);

  const status = () => {
    if (!token) return <p className="text-gray-400">Fetching token…</p>;
    if (token === "missing-livekit-credentials")
      return <p className="text-yellow-400">⚠️ LiveKit not configured</p>;
    if (error) return <p className="text-red-400">Error: {error}</p>;
    if (!isListening) return <p className="text-gray-400">Waiting for microphone stream…</p>;
    return (
      <div className="flex items-center gap-2 text-green-400">
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
        </span>
        Listening to phone microphone
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center justify-center gap-6 rounded-2xl bg-black/30 p-12">
      <audio ref={audioRef} autoPlay />
      <div className={`rounded-full p-8 ${isListening ? "bg-green-500/20" : "bg-white/10"}`}>
        {isListening
          ? <Mic className="h-12 w-12 text-green-400" />
          : <MicOff className="h-12 w-12 text-gray-400" />}
      </div>
      {status()}
    </div>
  );
}