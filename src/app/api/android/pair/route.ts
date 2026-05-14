import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createLiveKitToken } from "@/lib/livekit";

/**
 * Android companion app pairing endpoint.
 * POST /api/android/pair
 * Body: { code, deviceName, model?, osVersion?, publicKey? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, deviceName, model, osVersion, publicKey } = body as {
      code: string;
      deviceName: string;
      model?: string;
      osVersion?: string;
      publicKey?: string;
    };

    if (!code || !deviceName) {
      return NextResponse.json(
        { error: "code and deviceName are required" },
        { status: 400 },
      );
    }

    const stored = globalThis._pairingCodes?.get(code);
    if (!stored) {
      return NextResponse.json(
        { error: "Invalid or expired pairing code" },
        { status: 400 },
      );
    }
    if (stored.expires < Date.now()) {
      globalThis._pairingCodes.delete(code);
      return NextResponse.json(
        { error: "Pairing code expired" },
        { status: 400 },
      );
    }

    const device = await prisma.device.create({
      data: {
        name: deviceName,
        model: model ?? null,
        osVersion: osVersion ?? null,
        publicKey: publicKey ?? null,
        ownerId: stored.ownerId,
        allowedFeatures: ["camera", "mic", "files", "sms", "location"],
      },
    });

    globalThis._pairingCodes.delete(code);

    await prisma.activityLog.create({
      data: {
        deviceId: device.id,
        userId: stored.ownerId,
        action: "pair_device",
        status: "completed",
        metadata: { source: "android", model, osVersion },
        ipAddress:
          req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
          "unknown",
      },
    });

    const serverUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const liveKitUrl =
      process.env.NEXT_PUBLIC_LIVEKIT_URL ?? "wss://localhost:7880";
    const liveKitToken = await createLiveKitToken(device.id, device.id);

    return NextResponse.json({
      deviceId: device.id,
      deviceName: device.name,
      socketUrl: serverUrl,
      liveKitUrl,
      liveKitToken,
      pairedAt: device.pairedAt.toISOString(),
    });
  } catch (err) {
    console.error("[android/pair] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}