import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-internal-secret");
  const valid  = process.env.WEBHOOK_SECRET || process.env.INTERNAL_SECRET;
  if (!valid || secret !== valid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { deviceId, lat, lng, accuracy } = await req.json();
    if (!deviceId || typeof lat !== "number" || typeof lng !== "number") {
      return NextResponse.json({ error: "deviceId, lat, lng required" }, { status: 400 });
    }
    await prisma.device.updateMany({
      where: { id: deviceId },
      data: { location: { lat, lng, accuracy: accuracy ?? null, updatedAt: new Date().toISOString() }, lastSeen: new Date() },
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[device/location]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}