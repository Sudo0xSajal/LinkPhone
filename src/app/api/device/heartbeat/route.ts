import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const internalSecret = req.headers.get("x-internal-secret");
  const validSecret =
    process.env.WEBHOOK_SECRET || process.env.INTERNAL_SECRET;

  const isInternalCall =
    validSecret && internalSecret === validSecret;

  if (!isInternalCall) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const body = await req.json();
  const { deviceId, isOnline, batteryLevel } = body as {
    deviceId: string;
    isOnline: boolean;
    batteryLevel?: number;
  };

  if (!deviceId) {
    return NextResponse.json({ error: "deviceId required" }, { status: 400 });
  }

  const data: Record<string, unknown> = {
    isOnline,
    lastSeen: new Date(),
  };
  if (typeof batteryLevel === "number") {
    data.batteryLevel = batteryLevel;
  }

  await prisma.device.updateMany({
    where: { id: deviceId },
    data,
  });

  return NextResponse.json({ success: true });
}