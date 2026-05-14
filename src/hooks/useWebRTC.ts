import { useEffect, useRef, useState } from "react";
import { Room } from "livekit-client";
export function useWebRTC(roomName: string, token?: string) {
  const [isConnected, setIsConnected] = useState(false);
  const roomRef = useRef<Room | null>(null);
  useEffect(() => {
    if (!token || token === 'missing-livekit-credentials') return;
    const room = new Room();
    roomRef.current = room;
    room.connect(process.env.NEXT_PUBLIC_LIVEKIT_URL!, token).then(() => setIsConnected(true)).catch(console.error);
    return () => room.disconnect();
  }, [token, roomName]);
  return { room: roomRef.current, isConnected };
}
