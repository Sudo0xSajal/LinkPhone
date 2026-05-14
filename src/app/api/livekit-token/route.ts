import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createLiveKitToken } from "@/lib/livekit";

/**
 * GET /api/livekit-token?room=<room>&identity=<identity>
 *
 * FIX: This endpoint previously had no authentication check, meaning anyone
 * who knew the URL could generate arbitrary LiveKit tokens. A session check
 * is now required before a token is issued.
 */
export async function GET(req: Request) {
  // Auth guard – must have a valid session
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const room     = searchParams.get("room");
  const identity = searchParams.get("identity");

  if (!room || !identity) {
    return NextResponse.json(
      { error: "Missing required query params: room, identity" },
      { status: 400 },
    );
  }

  try {
    const token = await createLiveKitToken(room, identity);
    return NextResponse.json({ token });
  } catch (err) {
    console.error("[livekit-token]", err);
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 },
    );
  }
}